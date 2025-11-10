import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export async function DELETE(
  request: NextRequest,
  { params }: { params: { keyId: string } }
) {
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

    // Verify the key belongs to the user before deleting
    const { data: apiKey, error: fetchError } = await supabaseAdmin
      .from('api_keys')
      .select('user_id')
      .eq('id', params.keyId)
      .single()

    if (fetchError || !apiKey || apiKey.user_id !== userId) {
      return NextResponse.json({ error: 'Key not found' }, { status: 404 })
    }

    // Delete the key
    const { error: deleteError } = await supabaseAdmin
      .from('api_keys')
      .delete()
      .eq('id', params.keyId)

    if (deleteError) {
      throw deleteError
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error deleting API key:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
