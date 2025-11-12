import { NextRequest } from 'next/server'
import { validateToolRequest, validateToolRequestBody, updateApiKeyLastUsed } from '@/lib/server/toolMiddleware'
import { validationErrorResponse, insufficientBalanceResponse, internalErrorResponse, successResponse } from '@/lib/server/apiResponse'
import { extractColorFromImage, type ImageColorExtractorInput } from '@/lib/tools/image-color-extractor'
import { checkBalance, checkMonthlyLimit, deductCredits } from '@/lib/server/billing'
import { handleAutoRecharge } from '@/lib/server/autoRecharge'
import { getToolCost } from '@/config/pricing.config'

const TOOL_ID = 'image-color-extractor'

export async function POST(request: NextRequest) {
  try {
    // Step 1: Validate tool request and get context
    const { context, error } = await validateToolRequest(request, TOOL_ID)
    if (error) {
      return error
    }

    const body = await request.json().catch(() => null)
    const bodyValidation = validateToolRequestBody(body, ['imageData', 'colorCount'])
    if (!bodyValidation.valid) {
      return bodyValidation.error
    }

    const input = bodyValidation.data as ImageColorExtractorInput

    // Validate image data format
    if (typeof input.imageData !== 'string' || input.imageData.length === 0) {
      return validationErrorResponse('imageData must be a non-empty string (base64 encoded image)')
    }

    // Limit image size to 5MB
    if (input.imageData.length > 5000000) {
      return validationErrorResponse('Image data exceeds maximum size of 5MB')
    }

    // Validate color count
    if (typeof input.colorCount !== 'number' || input.colorCount < 1 || input.colorCount > 10) {
      return validationErrorResponse('colorCount must be a number between 1 and 10')
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

    // Step 3: Process the request
    const result = extractColorFromImage(input)

    if (result.error) {
      return validationErrorResponse(result.error)
    }

    // Step 4: Update API key last used timestamp
    await updateApiKeyLastUsed(context!.keyId, context!.isPublicDemo)

    // Step 5: Trigger auto-recharge if needed
    if (context!.isPaid && balanceAfterDeduction < 50) {
      await handleAutoRecharge(context!.userProfile!)
    }

    // Return success response
    return successResponse(result, {
      toolId: TOOL_ID,
      costInCents: toolCost,
      newBalance: balanceAfterDeduction,
      isPaid: context!.isPaid,
    })
  } catch (error) {
    console.error(`[${TOOL_ID}] Error:`, error)
    return internalErrorResponse(error instanceof Error ? error.message : 'Failed to extract colors from image')
  }
}
