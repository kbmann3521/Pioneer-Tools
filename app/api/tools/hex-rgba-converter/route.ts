import { NextRequest } from 'next/server'
import { extractApiKey } from '@/lib/server/auth'
import { unauthorizedResponse, validationErrorResponse, insufficientBalanceResponse, internalErrorResponse, successResponse } from '@/lib/server/apiResponse'
import { convertColor, ColorConversionInput } from '@/lib/tools/hex-rgba-converter'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { checkRateLimits } from '@/lib/server/rateLimit'
import { getUserProfile, checkBalance, checkMonthlyLimit, deductCredits } from '@/lib/server/billing'
import { handleAutoRecharge } from '@/lib/server/autoRecharge'
import { getToolCost } from '@/config/pricing.config'

const TOOL_ID = 'hex-rgba-converter'

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
    if (!body) {
      return validationErrorResponse('Invalid request body')
    }

    const input = body as ColorConversionInput

    // Validate input
    if (!input.hex && (input.r === undefined || input.g === undefined || input.b === undefined)) {
      return validationErrorResponse('Provide either hex or RGB values (r, g, b)')
    }

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
    const result = convertColor(input)

    return successResponse(result, {
      remaining: isPaid ? balanceAfterDeduction : rateLimitResult.remainingDaily || 0,
      balance: balanceAfterDeduction,
      costThisCall: toolCost,
      requestsPerSecond: isPaid ? 10 : 1,
    })
  } catch (error) {
    console.error('Color converter error:', error)
    return internalErrorResponse('Failed to convert color')
  }
}

export async function GET() {
  return successResponse({
    name: 'HEX ↔ RGBA Converter',
    description: 'Convert between HEX, RGB, and RGBA color formats',
    endpoint: '/api/tools/hex-rgba-converter',
    method: 'POST',
    parameters: {
      hex: { type: 'string', required: false, description: 'HEX color code' },
      r: { type: 'number', required: false, description: 'Red value (0-255)' },
      g: { type: 'number', required: false, description: 'Green value (0-255)' },
      b: { type: 'number', required: false, description: 'Blue value (0-255)' },
      alpha: { type: 'number', required: false, description: 'Alpha value (0-1)' },
    },
    outputs: ['hex', 'rgb', 'rgba', 'colors'],
  })
}
