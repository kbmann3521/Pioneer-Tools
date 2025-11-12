import { NextRequest } from 'next/server'

/**
 * Initialize storage bucket
 * Can be called once on deployment or app startup
 */
export async function GET(request: NextRequest) {
  try {
    // Dynamic import to avoid issues at build time
    const { ensureStorageBucket } = await import('@/lib/server/storageManager')

    await ensureStorageBucket()

    return new Response(JSON.stringify({ success: true, message: 'Storage bucket initialized' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('[Init Storage] Error:', errorMessage)

    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      },
    )
  }
}
