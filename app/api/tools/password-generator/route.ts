import { NextRequest } from 'next/server'
import { validateToolRequest, updateApiKeyLastUsed } from '@/lib/server/toolMiddleware'
import { validationErrorResponse, insufficientBalanceResponse, internalErrorResponse, successResponse } from '@/lib/server/apiResponse'
import { createPassword } from '@/lib/tools/password-generator'
import { checkBalance, checkMonthlyLimit, deductCredits } from '@/lib/server/billing'
import { handleAutoRecharge } from '@/lib/server/autoRecharge'
import { getToolCost } from '@/config/pricing.config'

const TOOL_ID = 'password-generator'

export async function POST(request: NextRequest) {
  try {
    // Step 1: Validate tool request and get context
    const { context, error } = await validateToolRequest(request, TOOL_ID)
    if (error) {
      return error
    }

    // Step 2: Validate request body
    const body = await request.json().catch(() => null)
    if (!body) {
      return validationErrorResponse('Invalid request body')
    }

    const {
      length = 16,
      useUppercase = true,
      useLowercase = true,
      useNumbers = true,
      useSpecialChars = true,
    } = body

    if (!length || length < 4 || length > 128) {
      return validationErrorResponse('Password length must be between 4 and 128')
    }

    // Step 3: For paid users, check balance and deduct credits
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

      // Step 4: Handle auto-recharge if triggered
      const autoRechargeResult = await handleAutoRecharge(context!.userProfile, balanceAfterDeduction)
      if (autoRechargeResult.triggered && autoRechargeResult.newBalance !== undefined) {
        balanceAfterDeduction = autoRechargeResult.newBalance
      }

      // Update last_used timestamp
      await updateApiKeyLastUsed(context!.keyId, context!.isPublicDemo)
    }

    // Step 5: Process the tool request
    const result = createPassword({
      length,
      useUppercase,
      useLowercase,
      useNumbers,
      useSpecialChars,
    })

    return successResponse(result, {
      remaining: context!.isPaid ? balanceAfterDeduction : context!.rateLimitResult.remainingDaily || 0,
      balance: balanceAfterDeduction,
      costThisCall: toolCost,
      requestsPerSecond: context!.isPaid ? 10 : 1,
    })
  } catch (error) {
    console.error('Password generator error:', error)
    return internalErrorResponse('Failed to generate password')
  }
}

export async function GET() {
  return successResponse({
    name: 'Password Generator',
    description: 'Generate secure random passwords with custom options',
    endpoint: '/api/tools/password-generator',
    method: 'POST',
    parameters: {
      length: { type: 'number', required: false, description: 'Password length (4-128, default 16)' },
      useUppercase: { type: 'boolean', required: false, description: 'Include uppercase letters' },
      useLowercase: { type: 'boolean', required: false, description: 'Include lowercase letters' },
      useNumbers: { type: 'boolean', required: false, description: 'Include numbers' },
      useSpecialChars: { type: 'boolean', required: false, description: 'Include special characters' },
    },
  })
}
