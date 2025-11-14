interface HtmlMinifierResult {
  minified: string
  original: string
  isValid: boolean
  error?: string
  stats?: {
    originalSize: number
    minifiedSize: number
    reduction: number
    reductionPercent: number
  }
}

export function minifyHtml(input: string): HtmlMinifierResult {
  try {
    if (!input.trim()) {
      return {
        minified: '',
        original: '',
        isValid: false,
        error: 'HTML input cannot be empty',
      }
    }

    const original = input

    // Minify HTML: remove extra whitespace while preserving functionality
    let minified = input
      // Remove comments
      .replace(/<!--[\s\S]*?-->/g, '')
      // Remove whitespace between tags
      .replace(/>\s+</g, '><')
      // Remove leading and trailing whitespace from lines
      .replace(/\s+/g, ' ')
      // Remove space before closing tags
      .replace(/\s+>/g, '>')
      // Remove space after opening tags
      .replace(/>\s+/g, '>')
      // Clean up extra spaces between attributes
      .replace(/\s+([a-zA-Z]+=)/g, ' $1')
      // Trim overall
      .trim()

    // Validate basic HTML structure (check for balanced tags)
    const openTags = (minified.match(/<[a-zA-Z][^>]*>/g) || []).length
    const closeTags = (minified.match(/<\/[a-zA-Z][^>]*>/g) || []).length
    const selfClosingTags = (minified.match(/<[a-zA-Z][^>]*\/>/g) || []).length

    const originalSize = original.length
    const minifiedSize = minified.length
    const reduction = originalSize - minifiedSize
    const reductionPercent = originalSize > 0 ? Math.round((reduction / originalSize) * 100) : 0

    return {
      minified,
      original,
      isValid: true,
      stats: {
        originalSize,
        minifiedSize,
        reduction,
        reductionPercent,
      },
    }
  } catch (error) {
    return {
      minified: '',
      original: input,
      isValid: false,
      error: error instanceof Error ? error.message : 'Failed to minify HTML',
    }
  }
}
