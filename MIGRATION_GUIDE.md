# Next.js 14 Migration Guide

## ✅ Migration Complete!

Your Tools Hub project has been successfully migrated from Vite React to **Next.js 14** with a full REST API layer.

## 📁 Project Structure

```
tools-hub/
├── app/
│   ├── api/
│   │   └── tools/
│   │       ├── case-converter/route.ts       ← API endpoint
│   │       ├── word-counter/route.ts
│   │       ├── hex-rgba-converter/route.ts
│   │       ├── image-resizer/route.ts
│   │       ├── og-generator/route.ts
│   │       └── blog-generator/route.ts
│   ├── tools/
│   │   ├── case-converter/page.tsx           ← Tool UI + API Preview
│   │   ├── word-counter/page.tsx
│   │   ├── hex-rgba-converter/page.tsx
│   │   ├── image-resizer/page.tsx
│   │   ├── og-generator/page.tsx
│   │   └── blog-generator/page.tsx
│   ├── components/
│   │   └── ApiPreview.tsx                    ← Live API code generator
│   ├── layout.tsx
│   ├── page.tsx                              ← Home/Tool listing
│   └── globals.css
├── lib/
│   ├── tools/
│   │   ├── case-converter.ts                 ← Pure functions
│   │   ├── word-counter.ts
│   │   ├── hex-rgba-converter.ts
│   │   ├── image-resizer.ts
│   │   ├── og-generator.ts
│   │   └── blog-generator.ts
│   └── utils/
│       └── openai.ts                         ← API utilities
├── package.json
├── tsconfig.json
├── next.config.js
└── .env.local                                ← Environment variables
```

## 🚀 Key Features

### 1. **Pure Tool Functions** (`/lib/tools/[slug].ts`)
Each tool is now a pure TypeScript function that handles the core logic:
```typescript
import { convertCase } from '@/lib/tools/case-converter'

const result = convertCase({ text: 'hello world' })
```

### 2. **REST API Endpoints** (`/app/api/tools/[slug]/route.ts`)
Every tool has a production-ready API endpoint:
```bash
POST /api/tools/case-converter
Content-Type: application/json

{ "text": "hello world" }
```

Response:
```json
{
  "success": true,
  "data": {
    "input": "hello world",
    "lowercase": "hello world",
    "uppercase": "HELLO WORLD",
    "camelCase": "helloWorld",
    "snakeCase": "hello_world",
    "kebabCase": "hello-world"
  }
}
```

### 3. **Live API Preview Component**
Each tool page has a right sidebar that:
- Shows live API call examples
- Updates automatically as you change tool settings
- Supports multiple languages: Fetch, cURL, Axios, Python
- Copy-to-clipboard functionality

### 4. **API Documentation Comments**
Each endpoint includes RapidAPI-style documentation comments for easy upload to documentation platforms:
```typescript
/**
 * @api {post} /api/tools/case-converter Convert Text Case
 * @apiName ConvertCase
 * @apiGroup Tools
 * @apiDescription Transform text between different case formats
 */
```

## 🔧 Environment Variables

Create `.env.local` in the project root:

```env
# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:3000

# OpenAI (only needed for blog generator)
OPENAI_API_KEY=your_api_key_here

# Optional
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

## 🎯 How It Works

### Local Development
```bash
npm install
npm run dev
```

Visit: `http://localhost:3000`

### Folder Structure Explanation

**`/lib/tools/`** - Core logic (no React, no HTTP)
- Pure TypeScript functions
- Reusable in frontend, backend, or API
- Can be imported anywhere

**`/app/api/tools/`** - HTTP endpoints
- Accepts JSON POST requests
- Calls functions from `/lib/tools/`
- Returns JSON responses
- Includes error handling

**`/app/tools/`** - User Interface
- React components with 'use client'
- Uses `/lib/tools/` functions directly for instant UI feedback
- Shows live API code in sidebar via ApiPreview component
- Calls API endpoints to demonstrate them

### Example: Case Converter Flow

1. **User enters text** in `/app/tools/case-converter/page.tsx`
2. **UI updates instantly** using `convertCase()` from `/lib/tools/case-converter.ts`
3. **API Preview sidebar** shows live fetch/cURL code
4. **User can call the API** via `POST /api/tools/case-converter`
5. **API endpoint** (`/app/api/tools/case-converter/route.ts`) calls the same `convertCase()` function

## 📡 API Endpoints Summary

| Tool | POST Endpoint | Parameters | Response |
|------|--------------|-----------|----------|
| Case Converter | `/api/tools/case-converter` | `{ text }` | All case formats |
| Word Counter | `/api/tools/word-counter` | `{ text }` | Character/word/sentence counts |
| HEX↔RGBA | `/api/tools/hex-rgba-converter` | `{ hex }` or `{ r, g, b, alpha }` | All color formats |
| Image Resizer | `/api/tools/image-resizer` | `{ width, height, originalWidth?, originalHeight? }` | Dimensions & scale |
| OG Generator | `/api/tools/og-generator` | `{ title, description, url, image, type?, siteName? }` | Meta tags |
| Blog Generator | `/api/tools/blog-generator` | `{ topic }` | 5 AI-generated titles |

### Get API Docs
```bash
GET /api/tools/case-converter  # Returns endpoint documentation
```

## 🚀 Deploying to Vercel

### Step 1: Prepare for Deployment
```bash
# Update environment variables for production
NEXT_PUBLIC_API_URL=https://your-app.vercel.app
OPENAI_API_KEY=your_actual_key
```

### Step 2: Push to GitHub
```bash
git add .
git commit -m "Next.js 14 migration with API endpoints"
git push origin main
```

### Step 3: Connect to Vercel
1. Go to https://vercel.com/new
2. Import your GitHub repository
3. Set environment variables in Vercel dashboard:
   - `OPENAI_API_KEY` (if using blog generator)
   - `NEXT_PUBLIC_API_URL` (Vercel auto-sets this)
4. Deploy!

### Step 4: Test APIs
```bash
curl -X POST https://your-app.vercel.app/api/tools/case-converter \
  -H "Content-Type: application/json" \
  -d '{"text":"hello world"}'
```

## 💡 Usage Examples

### JavaScript Fetch
```javascript
const response = await fetch('https://your-app.vercel.app/api/tools/case-converter', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ text: 'hello world' })
})
const data = await response.json()
console.log(data.data.camelCase) // helloWorld
```

### Python Requests
```python
import requests

response = requests.post(
    'https://your-app.vercel.app/api/tools/case-converter',
    json={'text': 'hello world'}
)
print(response.json()['data']['snakeCase'])  # hello_world
```

### cURL
```bash
curl -X POST https://your-app.vercel.app/api/tools/word-counter \
  -H "Content-Type: application/json" \
  -d '{"text":"This is a test. Multiple sentences."}'
```

## 🔐 Security Notes

- API endpoints validate input and return errors gracefully
- Use environment variables for sensitive keys (OPENAI_API_KEY)
- All endpoints are public (no authentication required by default)
- To add auth, modify `/app/api/tools/[slug]/route.ts` to check headers/tokens

## 📚 Adding New Tools

To add a new tool:

1. **Create the function** (`/lib/tools/my-tool.ts`):
```typescript
export interface MyToolInput { /* ... */ }
export interface MyToolOutput { /* ... */ }

export function myTool(input: MyToolInput): MyToolOutput {
  return { /* ... */ }
}
```

2. **Create the API endpoint** (`/app/api/tools/my-tool/route.ts`):
```typescript
import { myTool } from '@/lib/tools/my-tool'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const body = await request.json()
  const result = myTool(body)
  return NextResponse.json({ success: true, data: result })
}
```

3. **Create the UI page** (`/app/tools/my-tool/page.tsx`):
```typescript
'use client'
import ApiPreview from '@/app/components/ApiPreview'
import { myTool } from '@/lib/tools/my-tool'

export default function MyToolPage() {
  // Use myTool() for instant UI feedback
  // Use <ApiPreview /> to show API code
}
```

4. **Add to home page** (`/app/page.tsx`):
```typescript
const tools = [
  // ...
  { id: 'my-tool', name: 'My Tool', /* ... */ }
]
```

## 🐛 Troubleshooting

### API returns 404
- Check the endpoint URL matches the file structure
- Verify POST vs GET method

### Environment variables not loading
- Restart dev server after updating `.env.local`
- Use `NEXT_PUBLIC_` prefix for frontend-accessible vars
- Don't commit `.env.local` (it's in `.gitignore`)

### OpenAI API errors
- Verify `OPENAI_API_KEY` is set correctly
- Check OpenAI account has available credits
- Ensure API key has permission for gpt-3.5-turbo model

### TypeScript errors in IDE
- Run `npm run build` to check for errors
- Restart your code editor's TypeScript server

## 📝 Next Steps

1. **Test locally**: Visit http://localhost:3000 and try each tool
2. **Try the APIs**: Use the ApiPreview sidebar to test endpoints
3. **Deploy**: Follow the Vercel deployment steps above
4. **Share**: Your APIs are now available at your deployment URL

## 🎓 Learning Resources

- [Next.js 14 Docs](https://nextjs.org/docs)
- [App Router Guide](https://nextjs.org/docs/app)
- [API Routes](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)
- [Deployment to Vercel](https://vercel.com/docs)

---

**Your migration is complete!** All tools now have both a working UI and production-ready REST APIs. 🎉
