import { NextRequest } from 'next/server'
import { validateToolRequest, validateToolRequestBody, updateApiKeyLastUsed } from '@/lib/server/toolMiddleware'
import { insufficientBalanceResponse, internalErrorResponse, successResponse } from '@/lib/server/apiResponse'
import { createSlug } from '@/lib/tools/slug-generator'
import { checkBalance, checkMonthlyLimit, deductCredits } from '@/lib/server/billing'
import { handleAutoRecharge } from '@/lib/server/autoRecharge'
import { getToolCost } from '@/config/pricing.config'

const TOOL_ID = 'slug-generator'

export async function POST(request: NextRequest) {
  try {
    // Validate tool request and get context
    const { context, error } = await validateToolRequest(request, TOOL_ID)
    if (error) {
      return error
    }

    const { keyId, userProfile, isPaid, isPublicDemo, rateLimitResult } = context!

    // Validate request body
    const body = await request.json().catch(() => null)
    const bodyValidation = validateToolRequestBody(body, ['text'])
    if (!bodyValidation.valid) {
      return bodyValidation.error
    }

    const { text, separator } = body
    const sep = separator || '-'

    // Handle billing for paid users
    let balanceAfterDeduction = userProfile?.balance || 0
    let toolCost = 0

    if (isPaid && userProfile) {
      toolCost = getToolCost(TOOL_ID)
      const balanceCheckResult = await checkBalance(userProfile, TOOL_ID)

      if (!balanceCheckResult.allowed) {
        return insufficientBalanceResponse(balanceCheckResult.error!)
      }

      // Check monthly limit
      const monthlyCheckResult = await checkMonthlyLimit(userProfile, balanceCheckResult.centsDeducted)
      if (!monthlyCheckResult.allowed) {
        return insufficientBalanceResponse(monthlyCheckResult.error!)
      }

      // Deduct credits
      const deductResult = await deductCredits(
        userProfile,
        balanceCheckResult.centsDeducted,
        balanceCheckResult.remainingFractional,
        TOOL_ID
      )

      if (!deductResult.success) {
        return internalErrorResponse(deductResult.error!)
      }

      balanceAfterDeduction = deductResult.newBalance!

      // Handle auto-recharge if triggered
      const autoRechargeResult = await handleAutoRecharge(userProfile, balanceAfterDeduction)
      if (autoRechargeResult.triggered && autoRechargeResult.newBalance !== undefined) {
        balanceAfterDeduction = autoRechargeResult.newBalance
      }
    }

    // Update last_used timestamp
    await updateApiKeyLastUsed(keyId, isPublicDemo)

    // Process the tool request
    const result = createSlug(text, sep)

    return successResponse(result, {
      remaining: isPaid ? balanceAfterDeduction : rateLimitResult.remainingDaily || 0,
      balance: balanceAfterDeduction,
      costThisCall: toolCost,
      requestsPerSecond: isPaid ? 10 : 1,
    })
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('Slug generator error:', errorMessage)
    return internalErrorResponse('Failed to generate slug')
  }
}

export async function GET() {
  return successResponse({
    name: 'Slug Generator',
    description: 'Convert text to URL-friendly slugs',
    endpoint: '/api/tools/slug-generator',
    method: 'POST',
    parameters: {
      text: { type: 'string', required: true, description: 'Text to convert to slug' },
      separator: { type: 'string', required: false, description: 'Separator character (default: -)' },
    },
  })
}
