import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

/**
 * Generate a random API key
 */
function generateApiKey(): string {
  const chars = '0123456789abcdef'
  let key = 'pk_'
  for (let i = 0; i < 32; i++) {
    key += chars[Math.floor(Math.random() * chars.length)]
  }
  return key
}

/**
 * Ensure user profile exists in the database.
 * This endpoint uses the service role to bypass RLS policies.
 * Also auto-generates a default API key for the user.
 *
 * POST /api/account/ensure-profile
 * Headers: Authorization: Bearer <access_token>
 */
export async function POST(request: NextRequest) {
  try {
    // Verify the request has authorization header with JWT
    const authHeader = request.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Extract user ID from JWT token
    // The token format is: eyJ...header...eyJ...payload...signature
    // The payload contains the user ID in the 'sub' claim
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
      return NextResponse.json({ error: 'Could not extract user ID from token' }, { status: 401 })
    }

    // Check if profile already exists
    const { data: existingProfile } = await supabaseAdmin
      .from('users_profile')
      .select('id')
      .eq('id', userId)

    let profileCreated = false

    // If profile doesn't exist, create it
    if (!existingProfile || existingProfile.length === 0) {
      const { error: createError } = await supabaseAdmin
        .from('users_profile')
        .insert({
          id: userId,
          balance: 0,
        })

      if (createError) {
        console.error('Failed to create profile:', createError)
        return NextResponse.json(
          { error: `Failed to create profile: ${createError.message}` },
          { status: 500 }
        )
      }
      profileCreated = true
    }

    // Auto-generate a default API key for the user only if one doesn't already exist
    let keyGenerated = false

    // Check if user already has a "Default Key"
    const { data: existingDefaultKey } = await supabaseAdmin
      .from('api_keys')
      .select('id')
      .eq('user_id', userId)
      .eq('label', 'Default Key')
      .single()

    // Only create if default key doesn't exist
    if (!existingDefaultKey) {
      let defaultApiKey = generateApiKey()
      let attempts = 0

      // Ensure uniqueness
      while (attempts < 10) {
        const { count, error: countError } = await supabaseAdmin
          .from('api_keys')
          .select('id', { count: 'exact', head: true })
          .eq('key', defaultApiKey)

        if (countError) {
          console.error('Error checking key uniqueness:', countError)
        }

        if (count === 0 || countError) {
          // Key is unique (or we can't check, so try to insert anyway)
          break
        }

        // Key already exists, generate a new one
        defaultApiKey = generateApiKey()
        attempts++
      }

      // Create the default API key
      if (attempts < 10) {
        const { error: keyError, data: keyData } = await supabaseAdmin
          .from('api_keys')
          .insert({
            user_id: userId,
            key: defaultApiKey,
            label: 'Default Key',
          })
          .select()
          .single()

        if (keyError) {
          console.error('Failed to create default API key:', keyError)
          // Don't fail the signup, just log the error
        } else if (keyData) {
          keyGenerated = true
          console.log('Auto-generated API key for new user:', userId)
        }
      } else {
        console.error('Failed to generate unique API key for new user after 10 attempts')
      }
    }

    return NextResponse.json({
      success: true,
      created: profileCreated,
      apiKeyGenerated: keyGenerated,
    })
  } catch (error: any) {
    console.error('Error in ensure-profile:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
