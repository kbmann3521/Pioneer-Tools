import { NextRequest, NextResponse } from 'next/server'
import { validateAndLimitApiKey } from '@/lib/middleware/rateLimit'

/**
 * Example API endpoint for a tool
 *
 * This demonstrates:
 * 1. API key validation via Authorization header
 * 2. Rate limiting based on user plan and tool cost
 * 3. Credit deduction for paid users
 *
 * Usage:
 * curl -X POST https://yoursite.com/api/tools/example \
 *   -H "Authorization: Bearer pk_your_api_key_here" \
 *   -H "Content-Type: application/json" \
 *   -d '{"input": "test"}'
 */

const TOOL_ID = 'example'

export async function POST(request: NextRequest) {
  try {
    // Get Authorization header
    const authHeader = request.headers.get('Authorization')

    if (!authHeader) {
      return NextResponse.json(
        { error: 'Missing Authorization header' },
        { status: 401 }
      )
    }

    // Validate API key, check rate limit, and deduct credits
    const rateLimit = await validateAndLimitApiKey(authHeader, TOOL_ID)

    if (!rateLimit.success) {
      return NextResponse.json(
        { error: rateLimit.message },
        { status: rateLimit.balance !== null ? 429 : 401 }
      )
    }

    // Parse request body
    const body = await request.json()
    const { input } = body

    // Return successful response with rate limit info
    return NextResponse.json({
      tool: TOOL_ID,
      status: 'ok',
      input,
      result: {
        processed: input ? input.toUpperCase() : null,
      },
      rateLimit: {
        remaining: rateLimit.remaining,
        balance: rateLimit.balance,
        costThisCall: rateLimit.toolCost,
      },
    })
  } catch (error: any) {
    console.error('Error processing request:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json({
    message: 'This endpoint requires POST with Authorization header',
    example: {
      method: 'POST',
      headers: {
        Authorization: 'Bearer pk_your_api_key_here',
        'Content-Type': 'application/json',
      },
      body: {
        input: 'your input here',
      },
    },
  })
}
