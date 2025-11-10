import { NextRequest } from 'next/server'
import { extractApiKey } from '@/lib/server/auth'
import { unauthorizedResponse, validationErrorResponse, insufficientBalanceResponse, internalErrorResponse, successResponse } from '@/lib/server/apiResponse'
import { countWords, WordCounterInput } from '@/lib/tools/word-counter'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { checkRateLimits } from '@/lib/server/rateLimit'
import { getUserProfile, checkBalance, checkMonthlyLimit, deductCredits } from '@/lib/server/billing'
import { handleAutoRecharge } from '@/lib/server/autoRecharge'
import { getToolCost } from '@/config/pricing.config'

const TOOL_ID = 'word-counter'

export async function POST(request: NextRequest) {
  try {
    // Step 1: Validate authentication
    const authHeader = request.headers.get('Authorization')
    const apiKey = extractApiKey(authHeader)

    if (!apiKey) {
      return unauthorizedResponse('Invalid or missing Authorization header')
    }

    // Step 2: Validate request body
    const body = await request.json().catch(() => null)
    if (!body || body.text === undefined || typeof body.text !== 'string') {
      return validationErrorResponse('Missing or invalid text parameter')
    }

    const { text } = body as WordCounterInput

    // Step 3: Look up API key
    const { data: keyRecord, error: keyError } = await supabaseAdmin
      .from('api_keys')
      .select('id, user_id')
      .eq('key', apiKey)
      .single()

    if (keyError || !keyRecord) {
      return unauthorizedResponse('Invalid API key')
    }

    // Step 4: Get user profile with billing info
    const userProfile = await getUserProfile(keyRecord.user_id)
    if (!userProfile) {
      return unauthorizedResponse('User profile not found')
    }

    const isPaid = userProfile.balance > 0

    // Step 5: Check rate limits
    const rateLimitResult = await checkRateLimits(keyRecord.id, isPaid)
    if (!rateLimitResult.allowed) {
      return internalErrorResponse(rateLimitResult.message || 'Rate limit exceeded')
    }

    // Step 6: For paid users, check balance and deduct credits
    let balanceAfterDeduction = userProfile.balance
    let toolCost = 0

    if (isPaid) {
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

      // Step 7: Handle auto-recharge if triggered
      const autoRechargeResult = await handleAutoRecharge(userProfile, balanceAfterDeduction)
      if (autoRechargeResult.triggered && autoRechargeResult.newBalance !== undefined) {
        balanceAfterDeduction = autoRechargeResult.newBalance
      }

      // Update last_used timestamp
      await supabaseAdmin
        .from('api_keys')
        .update({ last_used: new Date().toISOString() })
        .eq('id', keyRecord.id)
    }

    // Step 8: Process the tool request
    const result = countWords({ text })

    return successResponse(result, {
      remaining: isPaid ? balanceAfterDeduction : rateLimitResult.remainingDaily || 0,
      balance: balanceAfterDeduction,
      costThisCall: toolCost,
      requestsPerSecond: isPaid ? 10 : 1,
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
