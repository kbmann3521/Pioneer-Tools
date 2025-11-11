import { NextRequest } from 'next/server'
import { validateToolRequest, validateToolRequestBody, updateApiKeyLastUsed } from '@/lib/server/toolMiddleware'
import { insufficientBalanceResponse, internalErrorResponse, successResponse } from '@/lib/server/apiResponse'
import { countWords } from '@/lib/tools/word-counter'
import { checkBalance, checkMonthlyLimit, deductCredits } from '@/lib/server/billing'
import { handleAutoRecharge } from '@/lib/server/autoRecharge'
import { getToolCost } from '@/config/pricing.config'

const TOOL_ID = 'word-counter'

export async function POST(request: NextRequest) {
  try {
    // Step 1: Validate tool request and get context
    const { context, error } = await validateToolRequest(request, TOOL_ID)
    if (error) {
      return error
    }

    const body = await request.json().catch(() => null)
    const bodyValidation = validateToolRequestBody(body, ['text'])
    if (!bodyValidation.valid) {
      return bodyValidation.error
    }

    const { text } = bodyValidation.data!

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
    const result = countWords({ text })

    return successResponse(result, {
      remaining: context!.isPaid ? balanceAfterDeduction : context!.rateLimitResult.remainingDaily || 0,
      balance: balanceAfterDeduction,
      costThisCall: toolCost,
      requestsPerSecond: context!.isPaid ? 10 : 1,
    })
  } catch (error) {
    console.error('Word counter error:', error)
    return internalErrorResponse('Failed to count words')
  }
}

export async function GET() {
  return successResponse({
    name: 'Word Counter',
    description: 'Count characters, words, sentences, paragraphs, and lines in text',
    endpoint: '/api/tools/word-counter',
    method: 'POST',
    parameters: {
      text: { type: 'string', required: true, description: 'Text to analyze' },
    },
    outputs: ['characters', 'charactersNoSpaces', 'words', 'sentences', 'paragraphs', 'lines'],
  })
}
