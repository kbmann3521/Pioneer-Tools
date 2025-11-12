import { NextRequest } from 'next/server'

/**
 * Cleanup endpoint for expired censored images
 * Can be called by a cron job service like GitHub Actions, Vercel Cron, or EasyCron
 * 
 * Expected header: Authorization: Bearer <CLEANUP_SECRET>
 */
export async function GET(request: NextRequest) {
  try {
    // Verify cleanup secret
    const authHeader = request.headers.get('Authorization')
    const cleanupSecret = process.env.CLEANUP_SECRET

    if (!cleanupSecret || authHeader !== `Bearer ${cleanupSecret}`) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Dynamic import to avoid issues at build time
    const { cleanupExpiredImages } = await import('@/lib/server/storageManager')

    const result = await cleanupExpiredImages()

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('[Cleanup] Error:', errorMessage)

    return new Response(
      JSON.stringify({
        error: errorMessage,
        deleted: 0,
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      },
    )
  }
}

/**
 * POST endpoint for cleanup (alternative to GET)
 */
export async function POST(request: NextRequest) {
  return GET(request)
}
