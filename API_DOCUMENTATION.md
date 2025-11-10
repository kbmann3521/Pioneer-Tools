# API Documentation

Complete reference for the Tools Hub API system.

## Authentication

All API requests require an API key passed in the Authorization header:

```
Authorization: Bearer pk_your_api_key_here
```

Get your API key from your Dashboard → API Keys section.

## Base URL

```
https://toolshub.com  (production)
http://localhost:3000 (development)
```

## Response Format

All responses are JSON. Success responses include:

```json
{
  "tool": "tool-name",
  "status": "ok",
  "result": { /* tool-specific output */ },
  "rateLimit": {
    "remaining": 195,
    "resetTime": 1234567890
  }
}
```

Error responses:

```json
{
  "error": "Error message"
}
```

## Rate Limiting

- **Free Plan:** 200 requests per minute
- **Pro Plan:** 2000 requests per minute

When rate limit exceeded, API returns `429 Too Many Requests`:

```json
{
  "error": "Rate limit exceeded. Limit: 200/minute"
}
```

Check `rateLimit.remaining` in successful responses to know how many requests you have left.

---

## Endpoints

### Account Endpoints

#### GET /api/account/api-keys

List all API keys for the current user.

**Authentication:** Required

**Response:**

```json
[
  {
    "id": "uuid",
    "label": "Production",
    "key": "pk_abc123...",
    "created_at": "2024-01-15T10:00:00Z",
    "last_used": "2024-01-15T12:30:00Z"
  }
]
```

#### POST /api/account/api-keys

Create a new API key.

**Authentication:** Required

**Body:**

```json
{
  "label": "My API Key"
}
```

**Response:**

```json
{
  "id": "uuid",
  "key": "pk_abc123def456...",
  "label": "My API Key",
  "created_at": "2024-01-15T10:00:00Z"
}
```

⚠️ **Important:** The full key is only returned once. Save it immediately, as you won't be able to see it again. If lost, delete and create a new key.

#### DELETE /api/account/api-keys/{keyId}

Delete an API key.

**Authentication:** Required

**Parameters:**
- `keyId` (path): The ID of the key to delete

**Response:**

```json
{
  "success": true
}
```

---

### Tool Endpoints

#### POST /api/tools/case-converter

Convert text between different case formats.

**Authentication:** Required

**Body:**

```json
{
  "text": "hello world"
}
```

**Response:**

```json
{
  "tool": "case-converter",
  "status": "ok",
  "result": {
    "camelCase": "helloWorld",
    "pascalCase": "HelloWorld",
    "snake_case": "hello_world",
    "kebab-case": "hello-world",
    "UPPER_CASE": "HELLO_WORLD",
    "Title Case": "Hello World"
  },
  "rateLimit": {
    "remaining": 199,
    "resetTime": 1234567890
  }
}
```

#### POST /api/tools/word-counter

Count characters, words, sentences, and more.

**Authentication:** Required

**Body:**

```json
{
  "text": "Hello world. This is a test."
}
```

**Response:**

```json
{
  "tool": "word-counter",
  "status": "ok",
  "result": {
    "characters": 28,
    "charactersNoSpaces": 22,
    "words": 5,
    "sentences": 2,
    "paragraphs": 1,
    "lines": 1
  },
  "rateLimit": {
    "remaining": 199,
    "resetTime": 1234567890
  }
}
```

#### POST /api/tools/hex-rgba-converter

Convert between HEX, RGB, and RGBA color formats.

**Authentication:** Required

**Body:**

```json
{
  "hex": "#FF6B6B",
  "alpha": 0.8
}
```

**Response:**

```json
{
  "tool": "hex-rgba-converter",
  "status": "ok",
  "result": {
    "hex": "#FF6B6B",
    "rgb": "rgb(255, 107, 107)",
    "rgba": "rgba(255, 107, 107, 0.8)"
  },
  "rateLimit": {
    "remaining": 199,
    "resetTime": 1234567890
  }
}
```

#### POST /api/tools/og-generator

Generate Open Graph meta tags for social media sharing.

**Authentication:** Required

**Body:**

```json
{
  "title": "My Awesome Website",
  "description": "Check out my website",
  "url": "https://example.com",
  "image": "https://example.com/og-image.jpg",
  "type": "website",
  "siteName": "My Site"
}
```

**Response:**

```json
{
  "tool": "og-generator",
  "status": "ok",
  "result": {
    "metaTags": "<meta property=\"og:title\" content=\"My Awesome Website\" />\n<meta property=\"og:description\" content=\"Check out my website\" />\n..."
  },
  "rateLimit": {
    "remaining": 199,
    "resetTime": 1234567890
  }
}
```

#### POST /api/tools/image-resizer

Resize images to specific dimensions.

**Authentication:** Required

**Body:**

```json
{
  "imageBase64": "data:image/png;base64,...",
  "width": 400,
  "height": 300,
  "keepAspectRatio": true
}
```

**Response:**

```json
{
  "tool": "image-resizer",
  "status": "ok",
  "result": {
    "imageBase64": "data:image/png;base64,...",
    "width": 400,
    "height": 300
  },
  "rateLimit": {
    "remaining": 199,
    "resetTime": 1234567890
  }
}
```

#### POST /api/tools/blog-generator

Generate catchy blog titles using AI.

**Authentication:** Required

**Body:**

```json
{
  "topic": "Productivity tips for remote workers"
}
```

**Response:**

```json
{
  "tool": "blog-generator",
  "status": "ok",
  "result": {
    "titles": [
      {
        "id": "1",
        "style": "SEO Optimized",
        "title": "10 Productivity Tips for Remote Workers in 2024",
        "icon": "🎯"
      },
      {
        "id": "2",
        "style": "Trendy & Viral",
        "title": "POV: You're a Remote Worker and These 5 Tips Changed Everything",
        "icon": "🔥"
      }
    ]
  },
  "rateLimit": {
    "remaining": 199,
    "resetTime": 1234567890
  }
}
```

---

## Error Codes

| Code | Message | Cause |
|------|---------|-------|
| 400 | Bad Request | Invalid request body or parameters |
| 401 | Unauthorized | Missing or invalid API key |
| 404 | Not Found | Endpoint or resource doesn't exist |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server error (try again later) |

---

## Code Examples

### JavaScript/Node.js

```javascript
const apiKey = 'pk_your_api_key'
const baseUrl = 'https://toolshub.com'

async function convertCase(text) {
  const response = await fetch(`${baseUrl}/api/tools/case-converter`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ text }),
  })

  if (!response.ok) {
    throw new Error(`API error: ${response.statusText}`)
  }

  return response.json()
}

// Usage
convertCase('hello world').then(result => {
  console.log(result.result.camelCase) // 'helloWorld'
})
```

### Python

```python
import requests
import json

API_KEY = 'pk_your_api_key'
BASE_URL = 'https://toolshub.com'

def convert_case(text):
    response = requests.post(
        f'{BASE_URL}/api/tools/case-converter',
        headers={
            'Authorization': f'Bearer {API_KEY}',
            'Content-Type': 'application/json',
        },
        json={'text': text}
    )
    response.raise_for_status()
    return response.json()

# Usage
result = convert_case('hello world')
print(result['result']['camelCase'])  # 'helloWorld'
```

### cURL

```bash
curl -X POST https://toolshub.com/api/tools/case-converter \
  -H "Authorization: Bearer pk_your_api_key" \
  -H "Content-Type: application/json" \
  -d '{"text": "hello world"}'
```

### Axios

```javascript
import axios from 'axios'

const client = axios.create({
  baseURL: 'https://toolshub.com',
  headers: {
    'Authorization': 'Bearer pk_your_api_key',
    'Content-Type': 'application/json',
  },
})

async function countWords(text) {
  const response = await client.post('/api/tools/word-counter', {
    text,
  })
  return response.data
}
```

---

## Status Codes Reference

**2xx Success**
- `200 OK` - Request successful
- `201 Created` - Resource created successfully

**4xx Client Error**
- `400 Bad Request` - Invalid request
- `401 Unauthorized` - Missing or invalid authentication
- `404 Not Found` - Resource not found
- `429 Too Many Requests` - Rate limit exceeded

**5xx Server Error**
- `500 Internal Server Error` - Server error

---

## Webhooks

Subscribe to events in your account settings (coming soon).

Current events supported:
- `payment.succeeded` - When user upgrades to Pro
- `payment.failed` - When payment fails

---

## Versioning

Currently on API v1. Breaking changes will be announced with a new version prefix (e.g., `/api/v2/`).

Current version: `v1` (default)

---

## Rate Limit Headers

Successful responses include rate limit information:

```
X-RateLimit-Limit: 200
X-RateLimit-Remaining: 195
X-RateLimit-Reset: 1234567890
```

---

## Support & Contact

- Documentation: https://docs.toolshub.com
- Email: support@toolshub.com
- Status: https://status.toolshub.com
