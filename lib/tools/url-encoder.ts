export function encodeUrl(input: string): string {
  try {
    return encodeURIComponent(input)
  } catch (error) {
    throw new Error('Failed to encode URL')
  }
}

export function decodeUrl(input: string): string {
  try {
    return decodeURIComponent(input)
  } catch (error) {
    throw new Error('Invalid URL encoding')
  }
}

export function convertUrl(input: string, mode: 'encode' | 'decode') {
  try {
    const result = mode === 'encode' ? encodeUrl(input) : decodeUrl(input)
    return {
      success: true,
      result,
      size: {
        original: input.length,
        converted: result.length,
      },
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Conversion failed',
      result: '',
      size: { original: 0, converted: 0 },
    }
  }
}
