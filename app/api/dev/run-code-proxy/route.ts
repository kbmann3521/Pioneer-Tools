import { NextRequest, NextResponse } from 'next/server'

interface ProxyRequest {
  endpoint: string
  method: string
  params: Record<string, any>
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
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
