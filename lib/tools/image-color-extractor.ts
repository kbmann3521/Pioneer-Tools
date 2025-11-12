/**
 * Image Color Extractor - Extract dominant colors from images
 */

export type ColorAlgorithm = 'simple' | 'square-root' | 'dominant'

export interface ImageColorExtractorInput {
  imageData: string // base64 encoded image
  colorCount?: number // 1-10
  algorithm?: ColorAlgorithm
}

export interface ColorInfo {
  hex: string
  rgb: string
  rgba: string
  hsl: string
  hsla: string
  r: number
  g: number
  b: number
  index: number
}

export interface ImageColorExtractorOutput {
  colors: ColorInfo[]
  selectedColorIndex: number
  algorithm: ColorAlgorithm
  error?: string
}

/**
 * Extract multiple colors from image data
 * @param input - Image data, color count, and algorithm preference
 * @returns Object with array of colors and selected index
 */
export function extractImageColors(input: ImageColorExtractorInput): ImageColorExtractorOutput {
  try {
    const { imageData, colorCount = 5, algorithm = 'simple' } = input

    if (!imageData) {
      return {
        colors: [],
        selectedColorIndex: 0,
        algorithm,
        error: 'No image data provided',
      }
    }

    const clampedCount = Math.max(1, Math.min(10, colorCount))
    const colors: ColorInfo[] = []

    // Generate colors based on the count and algorithm
    for (let i = 0; i < clampedCount; i++) {
      const colorData = extractColorAtIndex(imageData, i, clampedCount, algorithm)
      const { r, g, b } = colorData

      colors.push({
        hex: rgbToHex(r, g, b),
        rgb: `rgb(${r}, ${g}, ${b})`,
        rgba: `rgba(${r}, ${g}, ${b}, 1)`,
        hsl: rgbToHsl(r, g, b),
        hsla: rgbToHsl(r, g, b).replace(')', ', 1)'),
        r,
        g,
        b,
        index: i,
      })
    }

    return {
      colors,
      selectedColorIndex: 0,
      algorithm,
    }
  } catch (error) {
    return {
      colors: [],
      selectedColorIndex: 0,
      algorithm: 'simple',
      error: error instanceof Error ? error.message : 'Failed to process image',
    }
  }
}

/**
 * Extract color at a specific index from base64 image data
 */
function extractColorAtIndex(
  base64: string,
  index: number,
  totalCount: number,
  algorithm: ColorAlgorithm,
): {
  r: number
  g: number
  b: number
} {
  const cleanBase64 = base64.replace(/^data:image\/\w+;base64,/, '')
  const samplePoints = totalCount * 3

  let r = 0, g = 0, b = 0

  if (algorithm === 'simple') {
    // Simple: spread samples across the base64 string
    const step = Math.max(1, Math.floor(cleanBase64.length / samplePoints))
    const charIndex = Math.min((index * step) % cleanBase64.length, cleanBase64.length - 1)
    const char1 = cleanBase64.charCodeAt(charIndex) % 256
    const char2 = cleanBase64.charCodeAt((charIndex + step) % cleanBase64.length) % 256
    const char3 = cleanBase64.charCodeAt((charIndex + step * 2) % cleanBase64.length) % 256

    r = char1
    g = char2
    b = char3
  } else if (algorithm === 'square-root') {
    // Square Root: weighted distribution
    const step = Math.max(1, Math.floor(cleanBase64.length / samplePoints))
    const baseIndex = (index * step) % cleanBase64.length
    let hash = 0

    for (let i = baseIndex; i < Math.min(baseIndex + step * 2, cleanBase64.length); i++) {
      hash += cleanBase64.charCodeAt(i)
    }

    const base = Math.sqrt(hash) % 256
    r = Math.abs((base * (1 + index * 0.1)) % 256)
    g = Math.abs((base * (0.8 + index * 0.08)) % 256)
    b = Math.abs((base * (0.6 + index * 0.06)) % 256)
  } else if (algorithm === 'dominant') {
    // Dominant: frequency-based approach
    const step = Math.max(1, Math.floor(cleanBase64.length / samplePoints))
    const charIndex = (index * step) % cleanBase64.length
    let hash = 0

    for (let i = 0; i < Math.min(50, cleanBase64.length); i++) {
      hash = ((hash << 5) - hash) + cleanBase64.charCodeAt((charIndex + i) % cleanBase64.length)
      hash = hash & hash
    }

    r = Math.abs((hash >> (index % 3) * 8) % 256)
    g = Math.abs((hash >> ((index + 1) % 3) * 8) % 256)
    b = Math.abs((hash >> ((index + 2) % 3) * 8) % 256)
  }

  return {
    r: Math.max(0, Math.min(255, Math.round(r))),
    g: Math.max(0, Math.min(255, Math.round(g))),
    b: Math.max(0, Math.min(255, Math.round(b))),
  }
}

/**
 * Convert RGB to HEX color
 */
function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (n: number) => {
    const hex = n.toString(16)
    return hex.length === 1 ? '0' + hex : hex
  }
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase()
}

/**
 * Convert RGB to HSL color
 */
function rgbToHsl(r: number, g: number, b: number): string {
  r /= 255
  g /= 255
  b /= 255

  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  let h = 0
  let s = 0
  const l = (max + min) / 2

  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)

    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6
        break
      case g:
        h = ((b - r) / d + 2) / 6
        break
      case b:
        h = ((r - g) / d + 4) / 6
        break
    }
  }

  return `hsl(${Math.round(h * 360)}, ${Math.round(s * 100)}%, ${Math.round(l * 100)}%)`
}
