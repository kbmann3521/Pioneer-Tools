import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { validateApiKeyAndGetUser } from '@/lib/server/auth'
import { getUserProfile, checkBalance, checkMonthlyLimit } from '@/lib/server/billing'
import { checkRateLimits } from '@/lib/server/rateLimit'
import { unauthorizedResponse, validationErrorResponse, internalErrorResponse } from '@/lib/server/apiResponse'

export interface ToolRequestContext {
  keyId: string
  userId: string
  isPublicDemo: boolean
  userProfile: any | null
  isPaid: boolean
  rateLimitResult: any
}

/**
 * Middleware to validate tool requests
 * Handles API key validation, user profile lookup, and rate limiting
 * Returns context object or error response
 */
export async function validateToolRequest(
  request: NextRequest,
  toolId: string
): Promise<{ context: ToolRequestContext | null; error: any }> {
  try {
    // Step 1: Extract and validate API key
    const authHeader = request.headers.get('Authorization')
    const keyRecord = await validateApiKeyAndGetUser(authHeader, supabaseAdmin)

    if (!keyRecord) {
      return { context: null, error: unauthorizedResponse('Invalid or missing API key') }
    }

    const { id: keyId, userId, isPublicDemo } = keyRecord

    // Step 2: For demo key, return minimal context
    if (isPublicDemo) {
      return {
        context: {
          keyId,
          userId,
          isPublicDemo: true,
          userProfile: null,
          isPaid: false,
          rateLimitResult: { allowed: true, remainingDaily: 100 },
        },
        error: null,
      }
    }

    // Step 3: Get user profile with billing info
    const userProfile = await getUserProfile(userId)
    if (!userProfile) {
      return { context: null, error: unauthorizedResponse('User profile not found') }
    }

    const isPaid = userProfile.balance > 0

    // Step 4: Check rate limits
    const rateLimitResult = await checkRateLimits(keyId, isPaid)
    if (!rateLimitResult.allowed) {
      return { context: null, error: internalErrorResponse(rateLimitResult.message || 'Rate limit exceeded') }
    }

    return {
      context: {
        keyId,
        userId,
        isPublicDemo: false,
        userProfile,
        isPaid,
        rateLimitResult,
      },
      error: null,
    }
  } catch (err) {
    console.error('Error validating tool request:', err)
    return { context: null, error: internalErrorResponse('Failed to validate request') }
  }
}

/**
 * Helper to extract and validate request body for tool endpoints
 */
export function validateToolRequestBody(body: any, requiredFields: string[]): { valid: boolean; error?: any; data?: any } {
  if (!body) {
    return { valid: false, error: validationErrorResponse('Request body is required') }
  }

  // Check required fields
  for (const field of requiredFields) {
    if (!(field in body) || body[field] === undefined) {
      return { valid: false, error: validationErrorResponse(`Missing required field: ${field}`) }
    }
  }

  return { valid: true, data: body }
}

/**
 * Update last_used timestamp for API key (skip for demo key)
 */
export async function updateApiKeyLastUsed(keyId: string, isPublicDemo: boolean): Promise<void> {
  if (!isPublicDemo) {
    await supabaseAdmin
      .from('api_keys')
      .update({ last_used: new Date().toISOString() })
      .eq('id', keyId)
  }
}
