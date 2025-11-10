interface SlugOptions {
  separator: string
  toLowerCase: boolean
  removeSpecialChars: boolean
}

export function generateSlug(input: string, options: SlugOptions): string {
  let slug = input.trim()

  // Convert to lowercase if enabled
  if (options.toLowerCase) {
    slug = slug.toLowerCase()
  }

  // Remove special characters if enabled
  if (options.removeSpecialChars) {
    slug = slug.replace(/[^\w\s-]/g, '')
  }

  // Replace spaces and multiple separators with the chosen separator
  slug = slug.replace(/\s+/g, options.separator)
  slug = slug.replace(new RegExp(`${options.separator}{2,}`, 'g'), options.separator)

  // Remove leading/trailing separators
  slug = slug.replace(new RegExp(`^${options.separator}+|${options.separator}+$`, 'g'), '')

  return slug
}

export function createSlug(input: string, separator: string = '-') {
  const result = generateSlug(input, {
    separator,
    toLowerCase: true,
    removeSpecialChars: true,
  })

  return {
    slug: result,
    length: result.length,
    original: input,
  }
}
