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
