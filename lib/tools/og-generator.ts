/**
 * Open Graph Meta Tag Generator - Generate meta tags for social media
 * Pure function for meta tag generation
 */

export interface OGGeneratorInput {
  title: string
  description: string
  url: string
  image: string
  type?: string
  siteName?: string
}

export interface OGGeneratorOutput {
  input: OGGeneratorInput
  metaTags: string
  ogTags: string[]
  twitterTags: string[]
  allTags: string[]
}

/**
 * Generate Open Graph and Twitter meta tags
 * @param input - OG metadata
 * @returns Object with generated meta tags
 */
export function generateOGTags(input: OGGeneratorInput): OGGeneratorOutput {
  const {
    title,
    description,
    url,
    image,
    type = 'website',
    siteName = '',
  } = input

  const ogTags = [
    `<meta property="og:title" content="${title}" />`,
    `<meta property="og:description" content="${description}" />`,
    `<meta property="og:url" content="${url}" />`,
    `<meta property="og:image" content="${image}" />`,
    `<meta property="og:type" content="${type}" />`,
    ...(siteName ? [`<meta property="og:site_name" content="${siteName}" />`] : []),
  ]

  const twitterTags = [
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${title}" />`,
    `<meta name="twitter:description" content="${description}" />`,
    `<meta name="twitter:image" content="${image}" />`,
  ]

  const allTags = [...ogTags, ...twitterTags]

  return {
    input,
    metaTags: allTags.join('\n'),
    ogTags,
    twitterTags,
    allTags,
  }
}
