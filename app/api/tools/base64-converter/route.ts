import { NextRequest } from 'next/server'
import { validateToolRequest, validateToolRequestBody, updateApiKeyLastUsed } from '@/lib/server/toolMiddleware'
import { validationErrorResponse, insufficientBalanceResponse, internalErrorResponse, successResponse } from '@/lib/server/apiResponse'
import { convertBase64 } from '@/lib/tools/base64-converter'
import { checkBalance, checkMonthlyLimit, deductCredits } from '@/lib/server/billing'
import { handleAutoRecharge } from '@/lib/server/autoRecharge'
import { getToolCost } from '@/config/pricing.config'

const TOOL_ID = 'base64-converter'

export async function POST(request: NextRequest) {
  try {
    // Step 1: Validate tool request and get context
    const { context, error } = await validateToolRequest(request, TOOL_ID)
    if (error) {
      return error
    }

    const body = await request.json().catch(() => null)
    const bodyValidation = validateToolRequestBody(body, ['text', 'mode'])
    if (!bodyValidation.valid) {
      return bodyValidation.error
    }

    const { text, mode } = bodyValidation.data!

    // Validate mode is valid
    if (!['encode', 'decode'].includes(mode)) {
      return validationErrorResponse('Invalid mode: must be encode or decode')
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
    const result = convertBase64(text, mode as 'encode' | 'decode')

    return successResponse(result, {
      remaining: context!.isPaid ? balanceAfterDeduction : context!.rateLimitResult.remainingDaily || 0,
      balance: balanceAfterDeduction,
      costThisCall: toolCost,
      requestsPerSecond: context!.isPaid ? 10 : 1,
    })
  } catch (error) {
    console.error('Base64 converter error:', error)
    return internalErrorResponse('Failed to process Base64 conversion')
  }
}

export async function GET() {
  return successResponse({
    name: 'Base64 Encoder/Decoder',
    description: 'Encode text to Base64 or decode from Base64',
    endpoint: '/api/tools/base64-converter',
    method: 'POST',
    parameters: {
      text: { type: 'string', required: true, description: 'Text to encode/decode' },
      mode: { type: 'string', required: true, description: 'encode or decode' },
    },
  })
}
