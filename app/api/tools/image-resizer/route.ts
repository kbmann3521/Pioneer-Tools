import { NextRequest } from 'next/server'
import { validateToolRequest, validateToolRequestBody, updateApiKeyLastUsed } from '@/lib/server/toolMiddleware'
import { validationErrorResponse, insufficientBalanceResponse, internalErrorResponse, successResponse } from '@/lib/server/apiResponse'
import { resizeImage, ImageResizerInput } from '@/lib/tools/image-resizer'
import { checkBalance, checkMonthlyLimit, deductCredits } from '@/lib/server/billing'
import { handleAutoRecharge } from '@/lib/server/autoRecharge'
import { getToolCost } from '@/config/pricing.config'

const TOOL_ID = 'image-resizer'

export async function POST(request: NextRequest) {
  try {
    // Step 1: Validate tool request and get context
    const { context, error } = await validateToolRequest(request, TOOL_ID)
    if (error) {
      return error
    }

    const body = await request.json().catch(() => null)
    const bodyValidation = validateToolRequestBody(body, ['width', 'height'])
    if (!bodyValidation.valid) {
      return bodyValidation.error
    }

    const input = bodyValidation.data as ImageResizerInput

    // Validate dimensions are positive
    if (input.width <= 0 || input.height <= 0) {
      return validationErrorResponse('Width and height must be positive numbers')
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
        TOOL_ID
      )

      if (!deductResult.success) {
        return internalErrorResponse(deductResult.error!)
      }

      balanceAfterDeduction = deductResult.newBalance!

      // Step 3: Handle auto-recharge if triggered
      const autoRechargeResult = await handleAutoRecharge(context!.userProfile, balanceAfterDeduction)
      if (autoRechargeResult.triggered && autoRechargeResult.newBalance !== undefined) {
        balanceAfterDeduction = autoRechargeResult.newBalance
      }

      // Update last_used timestamp
      await updateApiKeyLastUsed(context!.keyId, context!.isPublicDemo)
    }

    // Step 4: Process the tool request
    const result = resizeImage(input)

    return successResponse(result, {
      remaining: context!.isPaid ? balanceAfterDeduction : context!.rateLimitResult.remainingDaily || 0,
      balance: balanceAfterDeduction,
      costThisCall: toolCost,
      requestsPerSecond: context!.isPaid ? 10 : 1,
    })
  } catch (error) {
    console.error('Image resizer error:', error)
    return internalErrorResponse('Failed to resize image')
  }
}

export async function GET() {
  return successResponse({
    name: 'Image Resizer',
    description: 'Calculate image resize dimensions and aspect ratios',
    endpoint: '/api/tools/image-resizer',
    method: 'POST',
    parameters: {
      width: { type: 'number', required: true, description: 'Target width in pixels' },
      height: { type: 'number', required: true, description: 'Target height in pixels' },
      keepAspectRatio: { type: 'boolean', required: false, description: 'Maintain aspect ratio' },
      originalWidth: { type: 'number', required: false, description: 'Original width for ratio calculation' },
      originalHeight: { type: 'number', required: false, description: 'Original height for ratio calculation' },
    },
    outputs: ['width', 'height', 'aspectRatio', 'scaleFactor', 'dimensions'],
  })
}
