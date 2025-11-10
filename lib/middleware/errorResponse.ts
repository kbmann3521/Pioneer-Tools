import { NextResponse } from 'next/server'
import type { RateLimitResult } from './rateLimit'

/**
 * Create a standardized rate limit error response with proper headers and status
 */
export function createRateLimitErrorResponse(rateLimit: RateLimitResult) {
  const response = NextResponse.json(
    { 
      error: rateLimit.message, 
      errorType: rateLimit.errorType 
    },
    { 
      status: rateLimit.balance !== null ? 429 : 401 
    }
  )
  
  // Add header for easier detection in clients
  if (rateLimit.errorType) {
    response.headers.set('X-Rate-Limit-Type', rateLimit.errorType)
  }
  
  return response
}
