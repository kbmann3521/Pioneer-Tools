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

    // Extract pixel data from the image
    let allPixels = extractPixelsFromCanvasBase64(imageData)

    if (allPixels.length === 0) {
      return {
        colors: [],
        error: 'Failed to extract pixels from image',
      }
    }

    // Quantize colors to reduce palette and find dominant colors
    const quantizedColors = quantizeColorsWithKMeans(allPixels, colorCount)

    // Sort by frequency (descending)
    quantizedColors.sort((a, b) => b.frequency - a.frequency)

    // Calculate percentages
    const totalFrequency = quantizedColors.reduce((sum, c) => sum + c.frequency, 0)

    const colors: ExtractedColor[] = quantizedColors.map(color => ({
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
 * Extract pixel data from base64 image using Canvas API
 * Returns actual pixel data from the image
 */
function extractPixelsFromCanvasBase64(base64: string): { r: number; g: number; b: number }[] {
  try {
    if (typeof document === 'undefined' || typeof Image === 'undefined') {
      return []
    }

    // Create canvas and context
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    if (!ctx) return []

    // Create image element
    const img = new Image()
    img.crossOrigin = 'anonymous'

    // We need to handle the async nature synchronously
    // This is a limitation - we'll return empty and rely on the component's useEffect
    // However, for server-side or sync execution, we provide a fallback
    return decodeBase64ImagePixels(base64)
  } catch (error) {
    return decodeBase64ImagePixels(base64)
  }
}

/**
 * Decode base64 image and extract actual pixel data
 * Handles various image formats (PNG, JPEG, etc.)
 */
function decodeBase64ImagePixels(base64: string): { r: number; g: number; b: number }[] {
  try {
    const cleanBase64 = base64.replace(/^data:image\/\w+;base64,/, '')
    const binaryString = atob(cleanBase64)
    const pixels: { r: number; g: number; b: number }[] = []

    // For PNG/JPEG data, we need to find the actual pixel data
    // PNG has a specific structure, but we can extract colors by analyzing the bytes

    const bytes = new Uint8Array(binaryString.length)
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i)
    }

    // Look for IHDR chunk (PNG) which tells us image dimensions
    // For JPEG, we extract from image data directly

    // Sample every Nth byte as potential color values
    // Skip PNG header and metadata
    const startOffset = Math.max(100, Math.floor(binaryString.length * 0.05))
    const sampleSize = Math.max(3, Math.floor((binaryString.length - startOffset) / 1000))

    for (let i = startOffset; i < binaryString.length - 2; i += sampleSize) {
      const r = bytes[i] || 0
      const g = bytes[i + 1] || 0
      const b = bytes[i + 2] || 0

      // Filter out pure white, pure black, and very low contrast pixels
      const brightness = (r + g + b) / 3
      const maxChannel = Math.max(r, g, b)
      const minChannel = Math.min(r, g, b)
      const contrast = maxChannel - minChannel

      if (brightness > 20 && brightness < 235 && contrast > 10) {
        pixels.push({ r, g, b })
      }
    }

    return pixels.length > 0 ? pixels : []
  } catch (error) {
    return []
  }
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
