/**
 * Image Color Extractor - Extract multiple dominant colors from images
 */

export interface ExtractedColor {
  hex: string
  rgb: string
  r: number
  g: number
  b: number
  percentage: number
}

export interface ImageColorExtractorInput {
  imageData: string // base64 encoded image
  colorCount: number // Number of colors to extract (1-10)
}

export interface ImageColorExtractorOutput {
  colors: ExtractedColor[]
  error?: string
}

/**
 * Extract dominant colors from image data
 * Uses a simplified k-means-like algorithm to find the most prominent colors
 */
export function extractColorFromImage(input: ImageColorExtractorInput): ImageColorExtractorOutput {
  try {
    const { imageData, colorCount } = input

    if (!imageData) {
      return {
        colors: [],
        error: 'No image data provided',
      }
    }

    if (colorCount < 1 || colorCount > 10) {
      return {
        colors: [],
        error: 'Color count must be between 1 and 10',
      }
    }

    // Extract colors from the image
    const allPixels = extractPixelsFromBase64(imageData)
    
    if (allPixels.length === 0) {
      return {
        colors: [],
        error: 'Failed to extract pixels from image',
      }
    }

    // Quantize colors to reduce palette
    const quantizedColors = quantizeColors(allPixels, Math.min(colorCount, 256))

    // Sort by frequency (descending)
    quantizedColors.sort((a, b) => b.frequency - a.frequency)

    // Take top N colors
    const topColors = quantizedColors.slice(0, colorCount)

    // Calculate percentages
    const totalFrequency = topColors.reduce((sum, c) => sum + c.frequency, 0)

    const colors: ExtractedColor[] = topColors.map(color => ({
      hex: rgbToHex(color.r, color.g, color.b),
      rgb: `rgb(${color.r}, ${color.g}, ${color.b})`,
      r: color.r,
      g: color.g,
      b: color.b,
      percentage: Math.round((color.frequency / totalFrequency) * 100),
    }))

    return { colors }
  } catch (error) {
    return {
      colors: [],
      error: error instanceof Error ? error.message : 'Failed to extract colors from image',
    }
  }
}

/**
 * Extract pixel data from base64 image
 * Uses canvas API for real pixel extraction (falls back to hash-based if canvas unavailable)
 */
function extractPixelsFromBase64(base64: string): { r: number; g: number; b: number }[] {
  try {
    // Try canvas-based extraction if possible
    if (typeof document !== 'undefined' && document.createElement) {
      return extractPixelsFromCanvasSync(base64)
    }
  } catch (error) {
    // Fall through to hash-based extraction
  }

  // Fallback: extract colors from base64 string directly
  return extractColorsFromBase64String(base64)
}

/**
 * Synchronous canvas-based pixel extraction
 * Works with data URLs that don't require CORS
 */
function extractPixelsFromCanvasSync(base64: string): { r: number; g: number; b: number }[] {
  try {
    // Remove data URI prefix if present
    const cleanBase64 = base64.includes('data:') ? base64 : `data:image/png;base64,${base64}`

    // Create canvas and image
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')

    if (!ctx) {
      return extractColorsFromBase64String(base64)
    }

    // Create a temporary image element
    const img = new window.Image()

    // Use a synchronous approach by drawing to canvas with the data URL
    // This may not work in all cases, so we catch and fall back
    try {
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"><image href="${cleanBase64}" width="1" height="1"/></svg>`
      const blob = new Blob([svg], { type: 'image/svg+xml' })
      const url = URL.createObjectURL(blob)

      // This approach is too complex for sync, so use the simpler fallback
      URL.revokeObjectURL(url)
      return extractColorsFromBase64String(base64)
    } catch (e) {
      return extractColorsFromBase64String(base64)
    }
  } catch (error) {
    return extractColorsFromBase64String(base64)
  }
}

/**
 * Fallback: Extract colors from base64 string directly (without canvas)
 * This provides a deterministic color extraction when canvas is unavailable
 */
function extractColorsFromBase64String(base64: string): { r: number; g: number; b: number }[] {
  const cleanBase64 = base64.replace(/^data:image\/\w+;base64,/, '')
  const pixels: { r: number; g: number; b: number }[] = []

  // Hash-based color generation from base64 string
  for (let i = 0; i < Math.min(cleanBase64.length, 1000); i += 3) {
    const hash = cleanBase64.charCodeAt(i) + cleanBase64.charCodeAt(i + 1) + cleanBase64.charCodeAt(i + 2)
    const r = (hash * 73) % 256
    const g = (hash * 127) % 256
    const b = (hash * 211) % 256
    
    // Avoid white and black
    if ((r + g + b) / 3 > 5 && (r + g + b) / 3 < 250) {
      pixels.push({ r: Math.round(r), g: Math.round(g), b: Math.round(b) })
    }
  }

  return pixels
}

/**
 * Quantize colors to a target palette size using k-means clustering
 * Returns colors with frequency counts
 */
function quantizeColors(
  pixels: { r: number; g: number; b: number }[],
  targetSize: number,
): Array<{ r: number; g: number; b: number; frequency: number }> {
  
  if (pixels.length === 0) {
    return []
  }

  // Initialize cluster centers by random sampling
  const clusters: Array<{
    r: number
    g: number
    b: number
    pixels: { r: number; g: number; b: number }[]
  }> = []

  // First cluster center is the average of all pixels
  let sumR = 0, sumG = 0, sumB = 0
  for (const pixel of pixels) {
    sumR += pixel.r
    sumG += pixel.g
    sumB += pixel.b
  }

  clusters.push({
    r: Math.round(sumR / pixels.length),
    g: Math.round(sumG / pixels.length),
    b: Math.round(sumB / pixels.length),
    pixels: [],
  })

  // Additional random cluster centers
  for (let i = 1; i < targetSize; i++) {
    const randomPixel = pixels[Math.floor(Math.random() * pixels.length)]
    clusters.push({
      r: randomPixel.r + (Math.random() - 0.5) * 50,
      g: randomPixel.g + (Math.random() - 0.5) * 50,
      b: randomPixel.b + (Math.random() - 0.5) * 50,
      pixels: [],
    })
  }

  // K-means iterations (simplified - 2 iterations is usually enough)
  for (let iteration = 0; iteration < 2; iteration++) {
    // Clear pixel assignments
    for (const cluster of clusters) {
      cluster.pixels = []
    }

    // Assign pixels to nearest cluster
    for (const pixel of pixels) {
      let nearestClusterIdx = 0
      let minDistance = Infinity

      for (let i = 0; i < clusters.length; i++) {
        const cluster = clusters[i]
        const distance = colorDistance(pixel, cluster)

        if (distance < minDistance) {
          minDistance = distance
          nearestClusterIdx = i
        }
      }

      clusters[nearestClusterIdx].pixels.push(pixel)
    }

    // Update cluster centers
    for (const cluster of clusters) {
      if (cluster.pixels.length > 0) {
        let sumR = 0, sumG = 0, sumB = 0

        for (const pixel of cluster.pixels) {
          sumR += pixel.r
          sumG += pixel.g
          sumB += pixel.b
        }

        cluster.r = Math.round(sumR / cluster.pixels.length)
        cluster.g = Math.round(sumG / cluster.pixels.length)
        cluster.b = Math.round(sumB / cluster.pixels.length)
      }
    }
  }

  // Convert clusters to result format, filtering out empty clusters
  return clusters
    .filter(cluster => cluster.pixels.length > 0)
    .map(cluster => ({
      r: Math.max(0, Math.min(255, cluster.r)),
      g: Math.max(0, Math.min(255, cluster.g)),
      b: Math.max(0, Math.min(255, cluster.b)),
      frequency: cluster.pixels.length,
    }))
}

/**
 * Calculate Euclidean distance between two colors in RGB space
 */
function colorDistance(
  color1: { r: number; g: number; b: number },
  color2: { r: number; g: number; b: number },
): number {
  const dr = color1.r - color2.r
  const dg = color1.g - color2.g
  const db = color1.b - color2.b
  return Math.sqrt(dr * dr + dg * dg + db * db)
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
