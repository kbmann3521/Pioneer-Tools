/**
 * OpenAI API utility for server-side calls
 */

export interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface OpenAIOptions {
  maxTokens?: number
  temperature?: number
}

/**
 * Call OpenAI API from server
 * @param messages - Chat messages
 * @param options - API options
 * @returns Generated text response
 */
export async function callOpenAI(
  messages: OpenAIMessage[],
  options: OpenAIOptions = {}
): Promise<string> {
  try {
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY environment variable not set')
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages,
        max_tokens: options.maxTokens || 500,
        temperature: options.temperature ?? 0.7,
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(`OpenAI API error: ${error.error?.message || 'Unknown error'}`)
    }

    const data = await response.json()
    return data.choices[0].message.content.trim()
  } catch (error) {
    console.error('OpenAI call failed:', error)
    throw error
  }
}
