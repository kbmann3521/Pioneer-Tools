interface JsonResult {
  formatted: string
  minified: string
  isValid: boolean
  error?: string
  stats?: {
    size: number
    minifiedSize: number
  }
}

export function formatJson(input: string): JsonResult {
  try {
    // Parse the JSON
    const parsed = JSON.parse(input)

    // Format with 2-space indentation
    const formatted = JSON.stringify(parsed, null, 2)

    // Minify
    const minified = JSON.stringify(parsed)

    return {
      formatted,
      minified,
      isValid: true,
      stats: {
        size: formatted.length,
        minifiedSize: minified.length,
      },
    }
  } catch (error) {
    return {
      formatted: '',
      minified: '',
      isValid: false,
      error: error instanceof Error ? error.message : 'Invalid JSON',
    }
  }
}
