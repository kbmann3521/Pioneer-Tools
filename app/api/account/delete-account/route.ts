'use server'

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Missing authorization token' },
        { status: 401 }
      )
    }

    const token = authHeader.slice(7)

    // Decode JWT to get user ID
    const parts = token.split('.')
    if (parts.length !== 3) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      )
    }

    let decoded: any
    try {
      decoded = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf-8'))
    } catch (err) {
      return NextResponse.json(
        { error: 'Invalid token format' },
        { status: 401 }
      )
    }

    const userId = decoded.sub
    if (!userId) {
      return NextResponse.json(
        { error: 'Invalid token: missing user ID' },
        { status: 401 }
      )
    }

    // Delete user's API keys
    const { error: keysError } = await supabaseAdmin
      .from('api_keys')
      .delete()
      .eq('user_id', userId)

    if (keysError) {
      console.error('Error deleting API keys:', keysError)
      return NextResponse.json(
        { error: 'Failed to delete API keys' },
        { status: 500 }
      )
    }

    // Delete user's billing transactions
    const { error: txError } = await supabaseAdmin
      .from('billing_transactions')
      .delete()
      .eq('user_id', userId)

    if (txError) {
      console.error('Error deleting billing transactions:', txError)
      return NextResponse.json(
        { error: 'Failed to delete billing transactions' },
        { status: 500 }
      )
    }

    // Delete user profile
    const { error: profileError } = await supabaseAdmin
      .from('users_profile')
      .delete()
      .eq('id', userId)

    if (profileError) {
      console.error('Error deleting user profile:', profileError)
      return NextResponse.json(
        { error: 'Failed to delete user profile' },
        { status: 500 }
      )
    }

    // Delete the Supabase auth user
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId)

    if (authError) {
      console.error('Error deleting auth user:', authError)
      return NextResponse.json(
        { error: 'Failed to delete user account' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { message: 'Account deleted successfully' },
      { status: 200 }
    )
  } catch (error) {
    console.error('Unexpected error in delete account:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}
