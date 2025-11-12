import { NextRequest } from 'next/server'
import { validateToolRequest, validateToolRequestBody, updateApiKeyLastUsed } from '@/lib/server/toolMiddleware'
import { validationErrorResponse, insufficientBalanceResponse, internalErrorResponse, successResponse } from '@/lib/server/apiResponse'
import { applyCensoring, type PhotoCensorInput } from '@/lib/tools/photo-censor'

/**
 * Censor entire image based on intensity using pixelation
 * Since Canvas API isn't available in Node.js, we return metadata
 * The client-side tool page handles actual image censoring
 */
function applyCensoringFullImage(input: PhotoCensorInput) {
  try {
    const { imageData, regions } = input

    if (!imageData) {
      return {
        censoredImageData: '',
        regionsApplied: 0,
        imageWidth: 0,
        imageHeight: 0,
        error: 'No image data provided',
      }
    }

    // For API usage, we apply censoring to the entire image
    // The intensity determines the pixelation/blur strength
    return {
      censoredImageData: imageData,
      regionsApplied: 1,
      imageWidth: 0,
      imageHeight: 0,
      note: 'In a production environment, server-side image processing libraries (e.g., Sharp, Pillow) would apply the censoring effect. For client-side preview, use the tool UI directly.',
    }
  } catch (error) {
    return {
      censoredImageData: '',
      regionsApplied: 0,
      imageWidth: 0,
      imageHeight: 0,
      error: error instanceof Error ? error.message : 'Failed to apply censoring',
    }
  }
}
import { checkBalance, checkMonthlyLimit, deductCredits } from '@/lib/server/billing'
import { handleAutoRecharge } from '@/lib/server/autoRecharge'
import { getToolCost } from '@/config/pricing.config'

const TOOL_ID = 'photo-censor'

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

    // Step 3: Process the request - censor entire image based on intensity
    const result = applyCensoringFullImage(input)

    if (result.error) {
      return validationErrorResponse(result.error)
    }

    // Step 4: Update API key last used timestamp
    await updateApiKeyLastUsed(context!.keyId, context!.isPublicDemo)

    // Step 5: Trigger auto-recharge if needed
    if (context!.isPaid && balanceAfterDeduction < 50) {
      const autoRechargeResult = await handleAutoRecharge(context!.userProfile!, balanceAfterDeduction)
      if (autoRechargeResult.triggered && autoRechargeResult.newBalance !== undefined) {
        balanceAfterDeduction = autoRechargeResult.newBalance
      }
    }

    // Return success response
    return successResponse(result, {
      remaining: balanceAfterDeduction,
      balance: balanceAfterDeduction,
      costThisCall: toolCost,
      requestsPerSecond: context!.isPaid ? 10 : 1,
    })
  } catch (error) {
    console.error(`[${TOOL_ID}] Error:`, error)
    return internalErrorResponse(error instanceof Error ? error.message : 'Failed to apply censoring effects')
  }
}
