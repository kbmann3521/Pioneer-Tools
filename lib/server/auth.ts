/**
 * Centralized authentication utilities for API routes
 * Eliminates repeated JWT parsing across multiple endpoints
 */

interface DecodedToken {
  sub: string
  aud: string
  iat: number
  exp: number
  [key: string]: any
}

/**
 * Decode JWT token from Authorization header
 * Expected format: "Bearer eyJhbGc..."
 */
export function decodeJwtFromHeader(authHeader: string | null): { userId: string } | null {
  if (!authHeader?.startsWith('Bearer ')) {
    return null
  }

  const token = authHeader.slice(7)
  const parts = token.split('.')

  if (parts.length !== 3) {
    return null
  }

  try {
    const decoded = JSON.parse(
      Buffer.from(parts[1], 'base64').toString('utf-8')
    ) as DecodedToken

    if (!decoded.sub) {
      return null
    }

    return { userId: decoded.sub }
  } catch (err) {
    return null
  }
}

/**
 * Validate Authorization header and extract user ID
 * Returns { userId } on success, null on failure
 */
export function validateAuthHeader(authHeader: string | null) {
  return decodeJwtFromHeader(authHeader)
}

/**
 * Extract API key from Authorization header
 * Expected format: "Bearer pk_xxx..."
 */
export function extractApiKey(authHeader: string | null): string | null {
  if (!authHeader?.startsWith('Bearer ')) {
    return null
  }
  return authHeader.slice(7)
}

/**
 * Public demo API key - doesn't require database lookup
 */
const PUBLIC_DEMO_KEY = 'pk_demo_sandbox_ea3f199fe'

/**
 * Validate API key and return key record or demo user
 * Returns { id, userId, isPublicDemo } on success, null on failure
 */
export async function validateApiKeyAndGetUser(
  authHeader: string | null,
  supabaseAdmin: any
): Promise<{ id: string; userId: string; isPublicDemo: boolean } | null> {
  const apiKey = extractApiKey(authHeader)
  if (!apiKey) {
    return null
  }

  // Special handling for public demo key
  if (apiKey === PUBLIC_DEMO_KEY) {
    return {
      id: 'test',
      userId: 'test',
      isPublicDemo: true,
    }
  }

  // Look up real API key in database
  try {
    const { data, error } = await supabaseAdmin
      .from('api_keys')
      .select('id, user_id')
      .eq('key', apiKey)
      .single()

    if (error || !data) {
      return null
    }

    return {
      id: data.id,
      userId: data.user_id,
      isPublicDemo: false,
    }
  } catch (err) {
    console.error('Error validating API key:', err)
    return null
  }
}
