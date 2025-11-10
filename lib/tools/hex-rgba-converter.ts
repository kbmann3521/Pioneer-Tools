/**
 * HEX ↔ RGBA Converter - Convert between color formats
 * Pure function for color conversion
 */

export interface ColorConversionInput {
  hex?: string
  r?: number
  g?: number
  b?: number
  alpha?: number
}

export interface RGBColor {
  r: number
  g: number
  b: number
}

export interface ColorConversionOutput {
  input: ColorConversionInput
  hex: string
  rgb: string
  rgba: string
  colors: {
    r: number
    g: number
    b: number
    alpha: number
  }
}

/**
 * Parse hex color string
 * @param hex - Hex color code (e.g., "#FF6B6B" or "FF6B6B")
 * @returns RGB object or null if invalid
 */
function hexToRgb(hex: string): RGBColor | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  if (result) {
    return {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16),
    }
  }
  return null
}

/**
 * Convert RGB to hex
 * @param r - Red (0-255)
 * @param g - Green (0-255)
 * @param b - Blue (0-255)
 * @returns Hex color code
 */
function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0').toUpperCase()).join('')
}

/**
 * Convert colors between HEX and RGBA formats
 * @param input - Color values (hex or RGB components)
 * @returns Object with all color format variations
 */
export function convertColor(input: ColorConversionInput): ColorConversionOutput {
  let r = input.r ?? 255
  let g = input.g ?? 107
  let b = input.b ?? 107
  let alpha = input.alpha ?? 1
  let hex = input.hex ?? '#FF6B6B'

  // If hex is provided, convert to RGB
  if (input.hex) {
    const rgb = hexToRgb(input.hex)
    if (rgb) {
      r = rgb.r
      g = rgb.g
      b = rgb.b
      hex = input.hex
    }
  } else {
    // Convert RGB to hex
    hex = rgbToHex(r, g, b)
  }

  // Clamp values
  r = Math.max(0, Math.min(255, r))
  g = Math.max(0, Math.min(255, g))
  b = Math.max(0, Math.min(255, b))
  alpha = Math.max(0, Math.min(1, alpha))

  return {
    input,
    hex,
    rgb: `rgb(${r}, ${g}, ${b})`,
    rgba: `rgba(${r}, ${g}, ${b}, ${alpha})`,
    colors: {
      r,
      g,
      b,
      alpha,
    },
  }
}
