export function encodeToBase64(input: string): string {
  try {
    return Buffer.from(input, 'utf-8').toString('base64')
  } catch (error) {
    throw new Error('Failed to encode to Base64')
  }
}

export function decodeFromBase64(input: string): string {
  try {
    return Buffer.from(input, 'base64').toString('utf-8')
  } catch (error) {
    throw new Error('Invalid Base64 input')
  }
}

export function convertBase64(input: string, mode: 'encode' | 'decode') {
  try {
    const result = mode === 'encode' ? encodeToBase64(input) : decodeFromBase64(input)
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
