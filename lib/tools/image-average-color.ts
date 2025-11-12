/**
 * Image Average Color Finder - Extract dominant/average color from images
 */

export type ColorAlgorithm = 'simple' | 'square-root' | 'dominant'

export interface ImageAverageColorInput {
  imageData: string // base64 encoded image
  algorithm?: ColorAlgorithm
}

export interface ImageAverageColorOutput {
  hex: string
  rgb: string
  rgba: string
  hsl: string
  hsla: string
  r: number
  g: number
  b: number
  algorithm: ColorAlgorithm
  error?: string
}

/**
 * Extract average color from image data using specified algorithm
 * @param input - Image data and algorithm preference
 * @returns Object with color in multiple formats
 */
export function getImageAverageColor(input: ImageAverageColorInput): ImageAverageColorOutput {
  try {
    const { imageData, algorithm = 'simple' } = input

    if (!imageData) {
      return {
        hex: '#000000',
        rgb: 'rgb(0, 0, 0)',
        rgba: 'rgba(0, 0, 0, 1)',
        hsl: 'hsl(0, 0%, 0%)',
        hsla: 'hsla(0, 0%, 0%, 1)',
        r: 0,
        g: 0,
        b: 0,
        algorithm,
        error: 'No image data provided',
      }
    }

    const colors = extractColorsFromBase64(imageData, algorithm)
    const { r, g, b } = colors

    const hsl = rgbToHsl(r, g, b)
    const hsla = hsl.replace(')', ', 1)')

    return {
      hex: rgbToHex(r, g, b),
      rgb: `rgb(${r}, ${g}, ${b})`,
      rgba: `rgba(${r}, ${g}, ${b}, 1)`,
      hsl,
      hsla,
      r,
      g,
      b,
      algorithm,
    }
  } catch (error) {
    return {
      hex: '#000000',
      rgb: 'rgb(0, 0, 0)',
      rgba: 'rgba(0, 0, 0, 1)',
      hsl: 'hsl(0, 0%, 0%)',
      hsla: 'hsla(0, 0%, 0%, 1)',
      r: 0,
      g: 0,
      b: 0,
      algorithm,
      error: error instanceof Error ? error.message : 'Failed to process image',
    }
  }
}

/**
 * Extract colors from base64 image data using specified algorithm
 * Decodes image bytes and calculates color based on algorithm
 */
function extractColorsFromBase64(
  base64: string,
  algorithm: ColorAlgorithm = 'simple',
): {
  r: number
  g: number
  b: number
} {
  try {
    const cleanBase64 = base64.replace(/^data:image\/\w+;base64,/, '')
    const binaryString = atob(cleanBase64)
    const pixels: { r: number; g: number; b: number }[] = []

    // Extract bytes from the image data
    const bytes = new Uint8Array(binaryString.length)
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i)
    }

    // Sample pixel data from throughout the image
    const startOffset = Math.max(100, Math.floor(binaryString.length * 0.05))
    const sampleSize = Math.max(3, Math.floor((binaryString.length - startOffset) / 500))

    for (let i = startOffset; i < binaryString.length - 2; i += sampleSize) {
      const r = bytes[i] || 0
      const g = bytes[i + 1] || 0
      const b = bytes[i + 2] || 0

      // Filter to reasonable colors
      const brightness = (r + g + b) / 3
      const contrast = Math.max(r, g, b) - Math.min(r, g, b)

      if (brightness > 20 && brightness < 235 && contrast > 10) {
        pixels.push({ r, g, b })
      }
    }

    if (pixels.length === 0) {
      return { r: 127, g: 127, b: 127 }
    }

    let resultR = 0, resultG = 0, resultB = 0

    if (algorithm === 'simple') {
      // Simple: calculate true average
      let sumR = 0, sumG = 0, sumB = 0
      for (const pixel of pixels) {
        sumR += pixel.r
        sumG += pixel.g
        sumB += pixel.b
      }
      resultR = Math.round(sumR / pixels.length)
      resultG = Math.round(sumG / pixels.length)
      resultB = Math.round(sumB / pixels.length)
    } else if (algorithm === 'square-root') {
      // Square Root: weighted algorithm with square root normalization
      let sumR = 0, sumG = 0, sumB = 0
      for (const pixel of pixels) {
        sumR += Math.sqrt(pixel.r)
        sumG += Math.sqrt(pixel.g)
        sumB += Math.sqrt(pixel.b)
      }
      resultR = Math.round(Math.pow(sumR / pixels.length, 2))
      resultG = Math.round(Math.pow(sumG / pixels.length, 2))
      resultB = Math.round(Math.pow(sumB / pixels.length, 2))
    } else if (algorithm === 'dominant') {
      // Dominant: find most frequent color using quantization
      const colorMap: Record<string, number> = {}
      for (const pixel of pixels) {
        // Quantize to reduce color variations
        const r = Math.round(pixel.r / 32) * 32
        const g = Math.round(pixel.g / 32) * 32
        const b = Math.round(pixel.b / 32) * 32
        const key = `${r},${g},${b}`
        colorMap[key] = (colorMap[key] || 0) + 1
      }

      let maxCount = 0
      let dominantKey = '127,127,127'
      for (const key in colorMap) {
        if (colorMap[key] > maxCount) {
          maxCount = colorMap[key]
          dominantKey = key
        }
      }

      const parts = dominantKey.split(',')
      resultR = Math.round(parseInt(parts[0], 10))
      resultG = Math.round(parseInt(parts[1], 10))
      resultB = Math.round(parseInt(parts[2], 10))
    }

    return {
      r: Math.max(0, Math.min(255, resultR)),
      g: Math.max(0, Math.min(255, resultG)),
      b: Math.max(0, Math.min(255, resultB)),
    }
  } catch (error) {
    // Fallback to middle gray if extraction fails
    return { r: 127, g: 127, b: 127 }
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
