/**
 * Word Counter - Count characters, words, sentences, and more
 * Pure function for text analysis
 */

export interface WordCounterInput {
  text: string
}

export interface WordCounterOutput {
  input: string
  characters: number
  charactersNoSpaces: number
  words: number
  sentences: number
  paragraphs: number
  lines: number
}

/**
 * Count and analyze text statistics
 * @param input - Text to analyze
 * @returns Object with character, word, sentence, paragraph, and line counts
 */
export function countWords(input: WordCounterInput): WordCounterOutput {
  const { text } = input

  return {
    input: text,
    characters: text.length,
    charactersNoSpaces: text.replace(/\s/g, '').length,
    words: text.trim() ? text.trim().split(/\s+/).length : 0,
    sentences: text.trim() ? (text.match(/[.!?]+/g) || []).length : 0,
    paragraphs: text.trim() ? text.split(/\n\n+/).length : 0,
    lines: text.trim() ? text.split('\n').length : 0,
  }
}
