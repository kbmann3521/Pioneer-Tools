import { NextRequest, NextResponse } from 'next/server'

interface ProxyRequest {
  endpoint: string
  method: string
  params: Record<string, any>
}

// Rate limit: 30 requests per minute for demo key
const DEMO_RATE_LIMIT = 30
const DEMO_RATE_WINDOW = 60 // seconds

const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN

async function redisCommand(command: string[]): Promise<any> {
  if (!UPSTASH_URL || !UPSTASH_TOKEN) {
    return null
  }

  try {
    const body = JSON.stringify(command)
    const response = await fetch(UPSTASH_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${UPSTASH_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body,
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`Upstash error [${response.status}]: ${errorText}`)
      throw new Error(`Redis error: ${response.statusText}`)
    }

    const data = await response.json()
    return data.result !== undefined ? data.result : data
  } catch (error) {
    console.error('Redis command error:', error)
    return null
  }
}

async function checkDemoKeyRateLimit(ip: string): Promise<boolean> {
  try {
    const key = `demo-api-limit:${ip}`
    const current = await redisCommand(['INCR', key])
    const count = (current ? parseInt(current) : 0)

    if (count === 1) {
      // First request in this window, set expiration
      await redisCommand(['EXPIRE', key, DEMO_RATE_WINDOW.toString()])
    }

    return count <= DEMO_RATE_LIMIT
  } catch (err) {
    console.error('Rate limit check failed:', err)
    // If Redis fails, allow the request but log it
    return true
  }
}

function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')
  const ip = forwarded ? forwarded.split(',')[0] : request.ip || 'unknown'
  return ip.trim()
}

function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return false

  const allowedOrigins = [
    process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
    process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000',
  ]

  return allowedOrigins.some(allowed => origin.startsWith(allowed.replace(/\/$/, '')))
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Check origin for same-site requests only
    const origin = request.headers.get('origin')
    if (!isAllowedOrigin(origin)) {
      console.warn(`Rejected request from unauthorized origin: ${origin}`)
      return NextResponse.json(
        {
          success: false,
          error: 'Origin not allowed',
        },
        { status: 403 }
      )
    }

    // Check rate limit for demo key
    const clientIp = getClientIp(request)
    const withinRateLimit = await checkDemoKeyRateLimit(clientIp)
    if (!withinRateLimit) {
      return NextResponse.json(
        {
          success: false,
          error: `Rate limit exceeded. Maximum ${DEMO_RATE_LIMIT} requests per ${DEMO_RATE_WINDOW} seconds.`,
        },
        { status: 429 }
      )
    }

    const body: ProxyRequest = await request.json()
    const { endpoint, method, params } = body

    // Validate required fields
    if (!endpoint || !method || !params) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: endpoint, method, params',
        },
        { status: 400 }
      )
    }

    // Get demo API key from environment
    const demoApiKey = process.env.DEMO_API_KEY
    if (!demoApiKey) {
      return NextResponse.json(
        {
          success: false,
          error: 'Demo API key not configured on server',
        },
        { status: 500 }
      )
    }

    // Build absolute URL for the endpoint
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
    const absoluteEndpoint = endpoint.startsWith('http') ? endpoint : `${baseUrl}${endpoint}`

    // Make the API call with the demo API key
    const response = await fetch(absoluteEndpoint, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${demoApiKey}`,
      },
      body: JSON.stringify(params),
    })

    const data = await response.json()

    // If the API call was successful, return the data
    if (response.ok) {
      return NextResponse.json({
        success: true,
        result: data,
      })
    }

    // If there was an error, return it
    return NextResponse.json({
      success: false,
      error: data.error || `API error: ${response.statusText}`,
      result: data,
    })
  } catch (err) {
    console.error('Error in /api/dev/run-code-proxy:', err)
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : 'Internal server error',
      },
      { status: 500 }
    )
  }
}
