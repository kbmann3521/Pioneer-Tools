/**
 * Image Resizer - Resize images to specified dimensions
 * Logic for calculating dimensions and aspect ratios
 */

export interface ImageResizerInput {
  width: number
  height: number
  keepAspectRatio?: boolean
  originalWidth?: number
  originalHeight?: number
}

export interface ImageResizerOutput {
  input: ImageResizerInput
  width: number
  height: number
  aspectRatio: number
  scaleFactor: number
  dimensions: string
}

/**
 * Calculate resized dimensions while maintaining aspect ratio if needed
 * @param input - Dimensions and resize options
 * @returns Object with calculated dimensions and metadata
 */
export function resizeImage(input: ImageResizerInput): ImageResizerOutput {
  let { width, height, keepAspectRatio = true, originalWidth, originalHeight } = input

  // Ensure positive values
  width = Math.max(1, width)
  height = Math.max(1, height)

  // Calculate aspect ratio based on original dimensions if provided
  let aspectRatio = originalWidth && originalHeight ? originalHeight / originalWidth : height / width

  // Calculate scale factor if original dimensions provided
  let scaleFactor = 1
  if (originalWidth && originalHeight) {
    scaleFactor = width / originalWidth
  }

  return {
    input,
    width,
    height,
    aspectRatio: Math.round(aspectRatio * 10000) / 10000,
    scaleFactor: Math.round(scaleFactor * 10000) / 10000,
    dimensions: `${width}px × ${height}px`,
  }
}

/**
 * Calculate new height based on width while maintaining aspect ratio
 * @param newWidth - New width in pixels
 * @param originalWidth - Original width in pixels
 * @param originalHeight - Original height in pixels
 * @returns New height in pixels
 */
export function calculateHeightFromWidth(
  newWidth: number,
  originalWidth: number,
  originalHeight: number
): number {
  return Math.round((newWidth * originalHeight) / originalWidth)
}

/**
 * Calculate new width based on height while maintaining aspect ratio
 * @param newHeight - New height in pixels
 * @param originalWidth - Original width in pixels
 * @param originalHeight - Original height in pixels
 * @returns New width in pixels
 */
export function calculateWidthFromHeight(
  newHeight: number,
  originalWidth: number,
  originalHeight: number
): number {
  return Math.round((newHeight * originalWidth) / originalHeight)
}
