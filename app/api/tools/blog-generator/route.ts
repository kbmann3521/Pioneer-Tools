import { NextRequest } from 'next/server'
import { validateToolRequest, validateToolRequestBody, updateApiKeyLastUsed } from '@/lib/server/toolMiddleware'
import { validationErrorResponse, insufficientBalanceResponse, internalErrorResponse, successResponse } from '@/lib/server/apiResponse'
import { getBlogStyles, TITLE_STYLES, BlogGeneratorInput } from '@/lib/tools/blog-generator'
import { callOpenAI } from '@/lib/utils/openai'
import { checkBalance, checkMonthlyLimit, deductCredits } from '@/lib/server/billing'
import { handleAutoRecharge } from '@/lib/server/autoRecharge'
import { getToolCost } from '@/config/pricing.config'

const TOOL_ID = 'blog-generator'

interface BlogGeneratorResponse {
  topic: string
  titles: Array<{
    id: string
    style: string
    icon: string
    color: string
    title: string
  }>
}

export async function POST(request: NextRequest) {
  try {
    // Step 1: Validate tool request and get context
    const { context, error } = await validateToolRequest(request, TOOL_ID)
    if (error) {
      return error
    }

    const body = await request.json().catch(() => null)
    const bodyValidation = validateToolRequestBody(body, ['topic'])
    if (!bodyValidation.valid) {
      return bodyValidation.error
    }

    const { topic } = bodyValidation.data as BlogGeneratorInput

    // Check if OpenAI API key is configured
    if (!process.env.OPENAI_API_KEY) {
      return internalErrorResponse('OpenAI API key not configured')
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

    // Step 8: Generate blog titles
    const titles = []

    for (const style of TITLE_STYLES) {
      try {
        const messages = [
          {
            role: 'system' as const,
            content:
              'You are an expert copywriter and content strategist. Generate ONE compelling, unique blog title only. No explanations, just the title.',
          },
          {
            role: 'user' as const,
            content: `Topic: "${topic}". ${style.prompt} Generate only ONE blog title.`,
          },
        ]

        const content = await callOpenAI(messages, {
          maxTokens: 100,
          temperature: 0.9,
        })

        const cleanTitle = content
          .trim()
          .replace(/^["']|["']$/g, '')
          .replace(/^\*+|\*+$/g, '')
          .split('\n')[0]

        titles.push({
          id: style.id,
          style: style.name,
          icon: style.icon,
          color: style.color,
          title: cleanTitle,
        })
      } catch (styleError) {
        console.error(`Failed to generate title for style ${style.id}:`, styleError)
        titles.push({
          id: style.id,
          style: style.name,
          icon: style.icon,
          color: style.color,
          title: `${style.name}: [Generation failed]`,
        })
      }
    }

    const result: BlogGeneratorResponse = {
      topic,
      titles,
    }

    return successResponse(result, {
      remaining: isPaid ? balanceAfterDeduction : rateLimitResult.remainingDaily || 0,
      balance: balanceAfterDeduction,
      costThisCall: toolCost,
      requestsPerSecond: isPaid ? 10 : 1,
    })
  } catch (error) {
    console.error('Blog generator error:', error)
    return internalErrorResponse('Failed to generate blog titles')
  }
}

export async function GET() {
  const styles = getBlogStyles({ topic: 'example' })

  return successResponse({
    name: 'Blog Title Generator',
    description: 'Generate 5 catchy blog titles in different styles using AI',
    endpoint: '/api/tools/blog-generator',
    method: 'POST',
    parameters: {
      topic: { type: 'string', required: true, description: 'Blog topic' },
    },
    styles: styles.styles.map(s => ({
      id: s.id,
      name: s.name,
      description: s.prompt,
    })),
    outputs: ['topic', 'titles'],
  })
}
