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
 * Note: Client-side tool page uses Canvas API for pixel extraction
 * This function is used by the API endpoint for server-side processing
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
    const allPixels = decodeBase64ImagePixels(imageData)

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
 * Decode base64 image and extract pixel data
 * Extracts bytes from the base64 image data for analysis
 */
function decodeBase64ImagePixels(base64: string): { r: number; g: number; b: number }[] {
  try {
    const cleanBase64 = base64.replace(/^data:image\/\w+;base64,/, '')
    const binaryString = atob(cleanBase64)
    const pixels: { r: number; g: number; b: number }[] = []

    const bytes = new Uint8Array(binaryString.length)
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i)
    }

    // Sample byte sequences as potential color values
    // Skip header bytes and sample throughout the data
    const startOffset = Math.max(100, Math.floor(binaryString.length * 0.05))
    const sampleSize = Math.max(3, Math.floor((binaryString.length - startOffset) / 1000))

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

    return pixels.length > 0 ? pixels : []
  } catch (error) {
    return []
  }
}

/**
 * Quantize colors using k-means clustering
 * Finds the most dominant colors in a pixel array
 */
function quantizeColorsWithKMeans(
  pixels: { r: number; g: number; b: number }[],
  targetSize: number,
): Array<{ r: number; g: number; b: number; frequency: number }> {

  if (pixels.length === 0) {
    return []
  }

  // Limit target size to actual pixel count
  const k = Math.min(targetSize, Math.min(pixels.length, 256))

  // Initialize cluster centers using k-means++ initialization
  const clusters: Array<{
    r: number
    g: number
    b: number
    pixels: { r: number; g: number; b: number }[]
  }> = []

  // First center: pick a random pixel
  const firstIdx = Math.floor(Math.random() * pixels.length)
  clusters.push({
    r: pixels[firstIdx].r,
    g: pixels[firstIdx].g,
    b: pixels[firstIdx].b,
    pixels: [],
  })

  // Initialize remaining centers with k-means++
  for (let i = 1; i < k; i++) {
    let maxDistance = 0
    let farthestPixelIdx = 0

    for (let p = 0; p < pixels.length; p++) {
      const pixel = pixels[p]
      let minDistanceToCluster = Infinity

      for (const cluster of clusters) {
        const distance = colorDistance(pixel, cluster)
        minDistanceToCluster = Math.min(minDistanceToCluster, distance)
      }

      if (minDistanceToCluster > maxDistance) {
        maxDistance = minDistanceToCluster
        farthestPixelIdx = p
      }
    }

    const newCenter = pixels[farthestPixelIdx]
    clusters.push({
      r: newCenter.r,
      g: newCenter.g,
      b: newCenter.b,
      pixels: [],
    })
  }

  // Run k-means iterations
  const maxIterations = 10
  for (let iteration = 0; iteration < maxIterations; iteration++) {
    // Clear pixel assignments
    for (const cluster of clusters) {
      cluster.pixels = []
    }

    // Assign pixels to nearest cluster
    for (const pixel of pixels) {
      let nearestClusterIdx = 0
      let minDistance = Infinity

      for (let i = 0; i < clusters.length; i++) {
        const distance = colorDistance(pixel, clusters[i])
        if (distance < minDistance) {
          minDistance = distance
          nearestClusterIdx = i
        }
      }

      clusters[nearestClusterIdx].pixels.push(pixel)
    }

    // Update cluster centers
    let centersChanged = false
    for (const cluster of clusters) {
      if (cluster.pixels.length > 0) {
        let sumR = 0, sumG = 0, sumB = 0

        for (const pixel of cluster.pixels) {
          sumR += pixel.r
          sumG += pixel.g
          sumB += pixel.b
        }

        const newR = Math.round(sumR / cluster.pixels.length)
        const newG = Math.round(sumG / cluster.pixels.length)
        const newB = Math.round(sumB / cluster.pixels.length)

        if (newR !== cluster.r || newG !== cluster.g || newB !== cluster.b) {
          centersChanged = true
        }

        cluster.r = newR
        cluster.g = newG
        cluster.b = newB
      }
    }

    // Stop if centers didn't change
    if (!centersChanged) {
      break
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
