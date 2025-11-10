# AI Tools Setup Guide

## OpenAI API Configuration

The OpenAI API key has been configured as an environment variable for secure use across AI tools.

### Current Configuration
- **Model**: `gpt-4o-mini` (cheapest + best for most use cases)
- **Environment Variable**: `VITE_OPENAI_API_KEY`
- **Status**: Configured

### Using OpenAI in Your Tools

Import the utility functions in your tool components:

```javascript
import { callOpenAI, streamOpenAI } from '../utils/openai'

// For simple requests
const result = await callOpenAI(
  [{ role: 'user', content: 'Your prompt here' }],
  { temperature: 0.7, maxTokens: 1000 }
)

// For streaming responses
for await (const chunk of streamOpenAI(messages, options)) {
  // Process each chunk as it arrives
  console.log(chunk)
}
```

### Function Signatures

#### `callOpenAI(messages, options)`
- **messages**: Array of message objects `{ role: 'user'|'assistant', content: string }`
- **options**: Optional configuration
  - `temperature` (0-2): Controls randomness. Default: 0.7
  - `maxTokens`: Maximum response length. Default: 1000
  - `stream`: Enable streaming. Default: false
- **Returns**: Promise<string> with the model's response

#### `streamOpenAI(messages, options)`
- **messages**: Same as above
- **options**: Same as above (stream is forced to true)
- **Returns**: AsyncGenerator yielding response chunks
- **Usage**: Use with `for await...of` loop

### Example: Simple AI Tool

```javascript
import { useState } from 'react'
import { callOpenAI } from '../utils/openai'

export default function MyAITool() {
  const [input, setInput] = useState('')
  const [result, setResult] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const response = await callOpenAI(
        [{ role: 'user', content: input }],
        { maxTokens: 500 }
      )
      setResult(response)
    } catch (error) {
      console.error('Error:', error)
      setResult('Error: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="tool-container">
      {/* Your UI here */}
    </div>
  )
}
```

### Example: Streaming AI Tool

```javascript
const [stream, setStream] = useState('')
const [loading, setLoading] = useState(false)

const handleStream = async () => {
  setLoading(true)
  setStream('')
  try {
    for await (const chunk of streamOpenAI(
      [{ role: 'user', content: 'Your prompt' }]
    )) {
      setStream(prev => prev + chunk)
    }
  } catch (error) {
    setStream('Error: ' + error.message)
  } finally {
    setLoading(false)
  }
}
```

### Cost Optimization

The `gpt-4o-mini` model is optimized for cost while maintaining quality:
- **Input**: $0.15 per 1M tokens
- **Output**: $0.60 per 1M tokens
- **Best for**: Most text processing, analysis, and generation tasks

### Changing the Model

To use a different model, edit `src/utils/openai.js`:

```javascript
const OPENAI_MODEL = 'gpt-3.5-turbo' // Cheaper but lower quality
// or
const OPENAI_MODEL = 'gpt-4' // More capable but more expensive
// or
const OPENAI_MODEL = 'gpt-4-turbo' // Best of both worlds
```

### Security Notes

- Never commit API keys to version control
- The key is stored in environment variables only
- CORS may require a backend proxy for production
- Consider rate limiting when deployed

### Testing the Setup

Check if the API key is configured:

```javascript
import { OPENAI_CONFIG } from '../utils/openai'
console.log(OPENAI_CONFIG) // { model: 'gpt-4o-mini', apiKey: 'configured' }
```
