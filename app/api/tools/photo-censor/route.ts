import { NextRequest } from 'next/server'
import sharp from 'sharp'
import { validateToolRequest, validateToolRequestBody, updateApiKeyLastUsed } from '@/lib/server/toolMiddleware'
import { validationErrorResponse, insufficientBalanceResponse, internalErrorResponse, successResponse } from '@/lib/server/apiResponse'
import { type PhotoCensorInput } from '@/lib/tools/photo-censor'
import { checkBalance, checkMonthlyLimit, deductCredits } from '@/lib/server/billing'
import { handleAutoRecharge } from '@/lib/server/autoRecharge'
import { getToolCost } from '@/config/pricing.config'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

const TOOL_ID = 'photo-censor'
const STORAGE_BUCKET = 'censored-images'
const SIGNED_URL_EXPIRY_SECONDS = 86400 // 1 day

/**
 * Apply censoring effects to image using Sharp
 */
async function applyCensoringWithSharp(input: PhotoCensorInput): Promise<{
  processedImageBuffer: Buffer
  imageWidth: number
  imageHeight: number
  error?: string
}> {
  try {
    const { imageData, regions } = input

    if (!imageData) {
      return {
        processedImageBuffer: Buffer.alloc(0),
        imageWidth: 0,
        imageHeight: 0,
        error: 'No image data provided',
      }
    }

    // Convert base64 to buffer
    const base64Data = imageData.replace(/^data:image\/\w+;base64,/, '')
    const imageBuffer = Buffer.from(base64Data, 'base64')

    // Get image metadata
    const metadata = await sharp(imageBuffer).metadata()
    if (!metadata.width || !metadata.height) {
      return {
        processedImageBuffer: Buffer.alloc(0),
        imageWidth: 0,
        imageHeight: 0,
        error: 'Unable to read image dimensions',
      }
    }

    let processedImage = sharp(imageBuffer)

    // Apply censoring to each region
    for (const region of regions) {
      const { x, y, width, height, type, intensity = 5 } = region

      // Extract the region to censor
      const regionBuffer = await sharp(imageBuffer)
        .extract({
          left: Math.max(0, x),
          top: Math.max(0, y),
          width: Math.min(width, metadata.width - x),
          height: Math.min(height, metadata.height - y),
        })
        .toBuffer()

      let censoredRegion: Buffer

      if (type === 'pixelate') {
        // Pixelate by reducing quality and scaling back up
        const pixelSize = Math.max(2, Math.ceil(intensity * 1.5))
        censoredRegion = await sharp(regionBuffer)
          .resize(Math.ceil(width / pixelSize), Math.ceil(height / pixelSize), {
            fit: 'fill',
            kernel: 'nearest',
          })
          .resize(width, height, {
            fit: 'fill',
            kernel: 'nearest',
          })
          .toBuffer()
      } else if (type === 'blur') {
        // Apply blur filter
        const blurAmount = Math.ceil(intensity * 2)
        censoredRegion = await sharp(regionBuffer)
          .blur(blurAmount)
          .toBuffer()
      } else if (type === 'blackbar') {
        // Create solid black image
        censoredRegion = await sharp({
          create: {
            width,
            height,
            channels: 3,
            background: { r: 0, g: 0, b: 0 },
          },
        }).toBuffer()
      } else {
        continue
      }

      // Composite the censored region back onto the main image
      processedImage = processedImage.composite([
        {
          input: censoredRegion,
          left: Math.max(0, x),
          top: Math.max(0, y),
        },
      ])
    }

    const processedImageBuffer = await processedImage.png().toBuffer()

    return {
      processedImageBuffer,
      imageWidth: metadata.width,
      imageHeight: metadata.height,
    }
  } catch (error) {
    return {
      processedImageBuffer: Buffer.alloc(0),
      imageWidth: 0,
      imageHeight: 0,
      error: error instanceof Error ? error.message : 'Failed to process image',
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    // Step 1: Validate tool request and get context
    const { context, error } = await validateToolRequest(request, TOOL_ID)
    if (error) {
      return error
    }

    const body = await request.json().catch(() => null)
    const bodyValidation = validateToolRequestBody(body, ['imageData', 'regions'])
    if (!bodyValidation.valid) {
      return bodyValidation.error
    }

    const input = bodyValidation.data as PhotoCensorInput

    // Validate image data format
    if (typeof input.imageData !== 'string' || input.imageData.length === 0) {
      return validationErrorResponse('imageData must be a non-empty string (base64 encoded image)')
    }

    // Limit image size to 5MB
    if (input.imageData.length > 5000000) {
      return validationErrorResponse('Image data exceeds maximum size of 5MB')
    }

    // Validate regions
    if (!Array.isArray(input.regions) || input.regions.length === 0) {
      return validationErrorResponse('regions must be a non-empty array of censor regions')
    }

    if (input.regions.length > 50) {
      return validationErrorResponse('Maximum 50 censor regions allowed per request')
    }

    // Step 2: For paid users, check balance and deduct credits
    let balanceAfterDeduction = context!.userProfile?.balance || 0
    let toolCost = 0

    if (context!.isPaid) {
      toolCost = getToolCost(TOOL_ID)
      const balanceCheckResult = await checkBalance(context!.userProfile, TOOL_ID)

      if (!balanceCheckResult.allowed) {
        return insufficientBalanceResponse(balanceCheckResult.error!)
      }

      // Check monthly limit
      const monthlyCheckResult = await checkMonthlyLimit(context!.userProfile, balanceCheckResult.centsDeducted)
      if (!monthlyCheckResult.allowed) {
        return insufficientBalanceResponse(monthlyCheckResult.error!)
      }

      // Deduct credits
      const deductResult = await deductCredits(
        context!.userProfile,
        balanceCheckResult.centsDeducted,
        balanceCheckResult.remainingFractional,
        TOOL_ID,
      )

      if (!deductResult.success) {
        return internalErrorResponse(deductResult.error!)
      }

      balanceAfterDeduction = deductResult.newBalance
    }

    // Step 3: Process the image with Sharp
    const processingResult = await applyCensoringWithSharp(input)

    if (processingResult.error) {
      return validationErrorResponse(processingResult.error)
    }

    // Step 4: Upload processed image to Supabase Storage
    const fileName = `${context!.userId}-${Date.now()}.png`
    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from(STORAGE_BUCKET)
      .upload(fileName, processingResult.processedImageBuffer, {
        contentType: 'image/png',
        upsert: false,
      })

    if (uploadError) {
      console.error('[photo-censor] Upload error:', uploadError)
      return internalErrorResponse('Failed to upload processed image')
    }

    // Step 5: Generate signed URL (expires in 1 day)
    const { data: signedUrlData, error: signedUrlError } = await supabaseAdmin.storage
      .from(STORAGE_BUCKET)
      .createSignedUrl(fileName, SIGNED_URL_EXPIRY_SECONDS)

    if (signedUrlError || !signedUrlData?.signedUrl) {
      console.error('[photo-censor] Signed URL error:', signedUrlError)
      return internalErrorResponse('Failed to generate download URL')
    }

    // Step 6: Update API key last used timestamp
    await updateApiKeyLastUsed(context!.keyId, context!.isPublicDemo)

    // Step 7: Trigger auto-recharge if needed
    if (context!.isPaid && balanceAfterDeduction < 50) {
      const autoRechargeResult = await handleAutoRecharge(context!.userProfile!, balanceAfterDeduction)
      if (autoRechargeResult.triggered && autoRechargeResult.newBalance !== undefined) {
        balanceAfterDeduction = autoRechargeResult.newBalance
      }
    }

    // Return success response with signed URL
    return successResponse(
      {
        censoredImageUrl: signedUrlData.signedUrl,
        regionsApplied: input.regions.length,
        imageWidth: processingResult.imageWidth,
        imageHeight: processingResult.imageHeight,
        expiresIn: SIGNED_URL_EXPIRY_SECONDS,
      },
      {
        remaining: balanceAfterDeduction,
        balance: balanceAfterDeduction,
        costThisCall: toolCost,
        requestsPerSecond: context!.isPaid ? 10 : 1,
      },
    )
  } catch (error) {
    console.error(`[${TOOL_ID}] Error:`, error)
    return internalErrorResponse(error instanceof Error ? error.message : 'Failed to apply censoring effects')
  }
}
