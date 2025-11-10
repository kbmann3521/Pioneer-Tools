import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

// Generate a random API key
function generateApiKey(): string {
  const chars = '0123456789abcdef'
  let key = 'pk_'
  for (let i = 0; i < 32; i++) {
    key += chars[Math.floor(Math.random() * chars.length)]
  }
  return key
}

export async function GET(request: NextRequest) {
  try {
    // Get auth token from request headers
    const authHeader = request.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Extract user ID from JWT token
    let userId: string | null = null
    try {
      const parts = authHeader.replace('Bearer ', '').split('.')
      if (parts.length === 3) {
        // Decode the payload (second part)
        const decoded = JSON.parse(
          Buffer.from(parts[1], 'base64').toString('utf-8')
        )
        userId = decoded.sub // 'sub' is the user ID claim in Supabase JWT
      }
    } catch (e) {
      return NextResponse.json({ error: 'Invalid token format' }, { status: 401 })
    }

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch user's API keys
    const { data: apiKeys, error } = await supabaseAdmin
      .from('api_keys')
      .select('id, label, key, created_at, last_used')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) {
      throw error
    }

    return NextResponse.json(apiKeys || [])
  } catch (error: any) {
    console.error('Error fetching API keys:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    // Get auth token from request headers
    const authHeader = request.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Extract user ID from JWT token
    let userId: string | null = null
    try {
      const parts = authHeader.replace('Bearer ', '').split('.')
      if (parts.length === 3) {
        // Decode the payload (second part)
        const decoded = JSON.parse(
          Buffer.from(parts[1], 'base64').toString('utf-8')
        )
        userId = decoded.sub // 'sub' is the user ID claim in Supabase JWT
      }
    } catch (e) {
      return NextResponse.json({ error: 'Invalid token format' }, { status: 401 })
    }

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { label } = body

    if (!label || typeof label !== 'string') {
      return NextResponse.json({ error: 'Label is required' }, { status: 400 })
    }

    // Generate unique API key
    let key = generateApiKey()
    let attempts = 0
    while (attempts < 10) {
      const { count } = await supabaseAdmin
        .from('api_keys')
        .select('id', { count: 'exact' })
        .eq('key', key)

      if (count === 0) break
      key = generateApiKey()
      attempts++
    }

    if (attempts >= 10) {
      return NextResponse.json({ error: 'Failed to generate unique key' }, { status: 500 })
    }

    // Insert into database
    const { data, error } = await supabaseAdmin
      .from('api_keys')
      .insert({
        user_id: userId,
        key,
        label,
      })
      .select()
      .single()

    if (error) {
      throw error
    }

    // Return the full key (only time it will be visible)
    return NextResponse.json({
      id: data.id,
      key,
      label: data.label,
      created_at: data.created_at,
    })
  } catch (error: any) {
    console.error('Error creating API key:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
