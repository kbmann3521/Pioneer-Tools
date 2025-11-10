/**
 * Blog Title Generator - Generate catchy blog titles in different styles
 * Pure function for title generation setup
 */

export interface BlogTitleStyle {
  id: string
  name: string
  icon: string
  prompt: string
  color: string
}

export interface BlogGeneratorInput {
  topic: string
}

export interface BlogGeneratorOutput {
  input: BlogGeneratorInput
  styles: BlogTitleStyle[]
}

export const TITLE_STYLES: BlogTitleStyle[] = [
  {
    id: 'trendy',
    name: 'Trendy & Viral',
    icon: '🚀',
    prompt:
      'Generate a trendy, clickable blog title that feels current and shareable. Make it catchy and modern.',
    color: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
  },
  {
    id: 'seo',
    name: 'SEO Optimized',
    icon: '🔍',
    prompt:
      'Generate an SEO-friendly blog title with keywords that rank well. Make it informative and clear.',
    color: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  },
  {
    id: 'curious',
    name: 'Curiosity Gap',
    icon: '❓',
    prompt:
      'Generate a blog title that creates curiosity and makes readers want to click. Use intrigue and questions.',
    color: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
  },
  {
    id: 'bold',
    name: 'Bold & Direct',
    icon: '💪',
    prompt:
      'Generate a bold, direct, and confident blog title. Make strong claims that stand out.',
    color: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
  },
  {
    id: 'storytelling',
    name: 'Story-Driven',
    icon: '📖',
    prompt:
      'Generate a blog title that tells a story or invites a narrative. Make it emotional and engaging.',
    color: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
  },
]

/**
 * Get blog title generation styles
 * @param input - Blog topic
 * @returns Object with topic and available styles
 */
export function getBlogStyles(input: BlogGeneratorInput): BlogGeneratorOutput {
  return {
    input,
    styles: TITLE_STYLES,
  }
}
