import { NextRequest } from 'next/server'
import { validateToolRequest, validateToolRequestBody, updateApiKeyLastUsed } from '@/lib/server/toolMiddleware'
import { validationErrorResponse, insufficientBalanceResponse, internalErrorResponse, successResponse } from '@/lib/server/apiResponse'
import { generateOGTags, OGGeneratorInput } from '@/lib/tools/og-generator'
import { checkBalance, checkMonthlyLimit, deductCredits } from '@/lib/server/billing'
import { handleAutoRecharge } from '@/lib/server/autoRecharge'
import { getToolCost } from '@/config/pricing.config'

const TOOL_ID = 'og-generator'

export async function POST(request: NextRequest) {
  try {
    // Step 1: Validate tool request and get context
    const { context, error } = await validateToolRequest(request, TOOL_ID)
    if (error) {
      return error
    }

    const body = await request.json().catch(() => null)
    const bodyValidation = validateToolRequestBody(body, ['title', 'description', 'url', 'image'])
    if (!bodyValidation.valid) {
      return bodyValidation.error
    }

    const input = bodyValidation.data as OGGeneratorInput

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
    const result = generateOGTags(input)

    return successResponse(result, {
      remaining: context!.isPaid ? balanceAfterDeduction : context!.rateLimitResult.remainingDaily || 0,
      balance: balanceAfterDeduction,
      costThisCall: toolCost,
      requestsPerSecond: context!.isPaid ? 10 : 1,
    })
  } catch (error) {
    console.error('OG generator error:', error)
    return internalErrorResponse('Failed to generate meta tags')
  }
}

export async function GET() {
  return successResponse({
    name: 'OG Meta Tag Generator',
    description: 'Generate Open Graph and Twitter meta tags for social sharing',
    endpoint: '/api/tools/og-generator',
    method: 'POST',
    parameters: {
      title: { type: 'string', required: true, description: 'Page title' },
      description: { type: 'string', required: true, description: 'Page description' },
      url: { type: 'string', required: true, description: 'Page URL' },
      image: { type: 'string', required: true, description: 'Image URL' },
      type: { type: 'string', required: false, description: 'Content type' },
      siteName: { type: 'string', required: false, description: 'Website name' },
    },
    outputs: ['metaTags', 'ogTags', 'twitterTags', 'allTags'],
  })
}
