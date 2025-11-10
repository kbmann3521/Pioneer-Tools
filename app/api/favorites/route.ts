import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { validateAuthHeader } from '@/lib/server/auth'
import { unauthorizedResponse, internalErrorResponse, successResponse, validationErrorResponse, conflictResponse } from '@/lib/server/apiResponse'

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization')
    const auth = validateAuthHeader(authHeader)

    if (!auth) {
      return unauthorizedResponse()
    }

    const userId = auth.userId

    // Get user's favorites
    const { data, error } = await supabaseAdmin
      .from('favorites')
      .select('tool_id')
      .eq('user_id', userId)

    if (error) {
      console.error('Error fetching favorites:', error)
      return internalErrorResponse('Failed to fetch favorites', error.message)
    }

    const favorites = data.map(fav => fav.tool_id)
    return successResponse({ favorites })
  } catch (error) {
    console.error('Error in GET /api/favorites:', error)
    return internalErrorResponse()
  }
}

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization')
    const auth = validateAuthHeader(authHeader)

    if (!auth) {
      return unauthorizedResponse()
    }

    const userId = auth.userId

    const body = await req.json()
    const { toolId } = body

    if (!toolId) {
      return validationErrorResponse('Tool ID is required')
    }

    // Add favorite
    const { data, error } = await supabaseAdmin
      .from('favorites')
      .insert([
        {
          user_id: userId,
          tool_id: toolId,
        },
      ])
      .select()

    if (error) {
      console.error('Error adding favorite:', error)
      // Check if it's a unique constraint violation
      if (error.code === '23505') {
        return conflictResponse('Tool already in favorites')
      }
      return internalErrorResponse('Failed to add favorite', error.message)
    }

    return successResponse({ favorite: data[0] }, undefined, 201)
  } catch (error) {
    console.error('Error in POST /api/favorites:', error)
    return internalErrorResponse()
  }
}
