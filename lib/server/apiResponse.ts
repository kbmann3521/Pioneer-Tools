import { NextResponse } from 'next/server'

/**
 * Unified API response structure across all endpoints
 */
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: {
    code: string
    message: string
    details?: string
  }
  meta?: {
    timestamp: string
    [key: string]: any
  }
}

/**
 * Rate limit information included in responses
 */
export interface RateLimitMeta {
  remaining: number | null
  balance: number | null
  costThisCall: number
  requestsPerSecond: number
}

/**
 * Success response with optional rate limit info
 */
export function successResponse<T>(
  data: T,
  rateLimitMeta?: RateLimitMeta,
  status = 200
) {
  const response: ApiResponse<T> = {
    success: true,
    data,
    meta: {
      timestamp: new Date().toISOString(),
      ...(rateLimitMeta && { rateLimit: rateLimitMeta }),
    },
  }

  return NextResponse.json(response, { status })
}

/**
 * Error response with consistent structure
 */
export function errorResponse(
  code: string,
  message: string,
  status = 400,
  details?: string
) {
  const response: ApiResponse = {
    success: false,
    error: {
      code,
      message,
      ...(details && { details }),
    },
    meta: {
      timestamp: new Date().toISOString(),
    },
  }

  return NextResponse.json(response, { status })
}

/**
 * Specific error response types
 */

export function unauthorizedResponse(message = 'Unauthorized') {
  return errorResponse('UNAUTHORIZED', message, 401)
}

export function forbiddenResponse(message = 'Forbidden') {
  return errorResponse('FORBIDDEN', message, 403)
}

export function badRequestResponse(message: string, details?: string) {
  return errorResponse('BAD_REQUEST', message, 400, details)
}

export function notFoundResponse(message = 'Not found') {
  return errorResponse('NOT_FOUND', message, 404)
}

export function rateLimitExceededResponse(message: string, details?: string) {
  return errorResponse('RATE_LIMIT_EXCEEDED', message, 429, details)
}

export function internalErrorResponse(message = 'Internal server error', details?: string) {
  return errorResponse('INTERNAL_ERROR', message, 500, details)
}

/**
 * Validation error response
 */
export function validationErrorResponse(message: string, details?: string) {
  return errorResponse('VALIDATION_ERROR', message, 400, details)
}

/**
 * Insufficient balance response
 */
export function insufficientBalanceResponse(message: string, details?: string) {
  return errorResponse('INSUFFICIENT_BALANCE', message, 402, details)
}

/**
 * Conflict response (e.g., duplicate entry)
 */
export function conflictResponse(message: string, details?: string) {
  return errorResponse('CONFLICT', message, 409, details)
}
