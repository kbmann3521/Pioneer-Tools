/**
 * Case Converter - Transform text between different cases
 * Pure function for text case conversions
 */

export interface CaseConversionInput {
  text: string
}

export interface CaseConversionOutput {
  text: string
  lowercase: string
  uppercase: string
  capitalize: string
  toggleCase: string
  camelCase: string
  snakeCase: string
  kebabCase: string
}

/**
 * Convert text to all case formats
 * @param input - Text to convert
 * @returns Object with all case variations
 */
export function convertCase(input: CaseConversionInput): CaseConversionOutput {
  const { text } = input

  return {
    text: text,
    lowercase: text.toLowerCase(),
    uppercase: text.toUpperCase(),
    capitalize: text
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' '),
    toggleCase: text
      .split('')
      .map(char => (char === char.toUpperCase() ? char.toLowerCase() : char.toUpperCase()))
      .join(''),
    camelCase: text
      .split(/[\s_-]+/)
      .reduce(
        (result, word, index) =>
          result + (index === 0 ? word.toLowerCase() : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()),
        ''
      ),
    snakeCase: text.toLowerCase().replace(/\s+/g, '_').replace(/[^\w_]/g, ''),
    kebabCase: text.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, ''),
  }
}
