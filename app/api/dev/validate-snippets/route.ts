import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

interface ValidationResult {
  toolId: string
  language: string
  status: 'success' | 'failure' | 'pending'
  errorMessage?: string
}

/**
 * POST /api/dev/validate-snippets
 * Receives validation results from GitHub Actions workflow
 * Requires: GITHUB_ACTIONS_TOKEN header for authentication
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Verify the request is from GitHub Actions
    const token = request.headers.get('Authorization')?.replace('Bearer ', '')
    const expectedToken = process.env.GITHUB_ACTIONS_TOKEN

    if (!expectedToken || token !== expectedToken) {
      console.warn('Unauthorized validation request - invalid token')
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Parse the validation results
    const validations: ValidationResult[] = await request.json()

    if (!Array.isArray(validations) || validations.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid request body - expected array of validation results' },
        { status: 400 }
      )
    }

    // Validate each result has required fields
    for (const validation of validations) {
      if (!validation.toolId || !validation.language || !validation.status) {
        return NextResponse.json(
          { success: false, error: 'Each validation must have toolId, language, and status' },
          { status: 400 }
        )
      }
    }

    // Upsert validation results using service role key
    const results = await Promise.all(
      validations.map(v =>
        supabaseAdmin
          .from('api_snippet_validations')
          .upsert(
            {
              tool_id: v.toolId,
              language: v.language,
              status: v.status,
              error_message: v.errorMessage || null,
              last_validated_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'tool_id,language' }
          )
          .select()
      )
    )

    // Check for any errors
    const errors = results.filter(r => r.error)
    if (errors.length > 0) {
      console.error('Upsert errors:', errors)
      return NextResponse.json(
        { success: false, error: 'Failed to store some validation results', details: errors },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: `Updated ${validations.length} validation results`,
      count: validations.length,
    })
  } catch (err) {
    console.error('Error in /api/dev/validate-snippets:', err)
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : 'Internal server error',
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/dev/validate-snippets?toolId=case-converter&language=python
 * Retrieves validation results for a specific tool/language combo
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url)
    const toolId = searchParams.get('toolId')
    const language = searchParams.get('language')

    if (!toolId || !language) {
      return NextResponse.json(
        { success: false, error: 'Missing required parameters: toolId, language' },
        { status: 400 }
      )
    }

    const { data, error } = await supabaseAdmin
      .from('api_snippet_validations')
      .select('*')
      .eq('tool_id', toolId)
      .eq('language', language)
      .single()

    if (error && error.code !== 'PGRST116') {
      // PGRST116 = no rows found (not an error, just return null)
      console.error('Database error:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch validation status' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: data || null,
    })
  } catch (err) {
    console.error('Error fetching validation status:', err)
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : 'Internal server error',
      },
      { status: 500 }
    )
  }
}
