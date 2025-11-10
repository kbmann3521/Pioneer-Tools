# Tools Hub - API-Powered Online Tools

A Next.js 14 application with 6 powerful tools, each with a working UI and a production-ready REST API endpoint.

## 🎯 Features

- **6 Production-Ready Tools** with UI and APIs
- **Live API Code Preview** - See and copy API calls in Fetch, cURL, Axios, or Python
- **Modular Architecture** - Reusable pure functions in `/lib/tools/`
- **REST API Endpoints** - Each tool has a dedicated API at `/api/tools/[slug]`
- **TypeScript** - Full type safety throughout
- **Vercel Ready** - Deploy with zero configuration changes
- **Environment Configurable** - Works locally and in production

## 📦 Tools Included

1. **Case Converter** - Transform text between different case formats
2. **Word Counter** - Count characters, words, sentences, paragraphs
3. **HEX ↔ RGBA Converter** - Convert between color formats
4. **Image Resizer** - Calculate image dimensions and scale factors
5. **OG Meta Tag Generator** - Generate Open Graph and Twitter meta tags
6. **Blog Title Generator** - AI-powered blog title generation (requires OpenAI API)

## 🚀 Quick Start

### Local Development
```bash
npm install
npm run dev
```

Visit: `http://localhost:3000`

### Environment Setup
Create `.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:3000
OPENAI_API_KEY=your_key_here
```

## 📡 API Usage

### Example: Case Converter
```bash
curl -X POST http://localhost:3000/api/tools/case-converter \
  -H "Content-Type: application/json" \
  -d '{"text":"hello world"}'
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
    "kebabCase": "hello-world",
    "capitalize": "Hello World",
    "toggleCase": "HELLO WORLD"
  }
}
```

### All API Endpoints
- `POST /api/tools/case-converter`
- `POST /api/tools/word-counter`
- `POST /api/tools/hex-rgba-converter`
- `POST /api/tools/image-resizer`
- `POST /api/tools/og-generator`
- `POST /api/tools/blog-generator`

Get API docs: `GET /api/tools/[slug]`

## 🏗️ Project Structure

```
app/
├─�� api/tools/[slug]/route.ts    ← REST API endpoints
├── tools/[slug]/page.tsx        ← Tool UIs with API Preview
├── components/ApiPreview.tsx    ← Live code generator
├── layout.tsx
├── page.tsx                     ← Home/tool listing
└── globals.css

lib/
├── tools/[slug].ts              ← Pure functions
└── utils/openai.ts              ← API utilities
```

## 💾 Building & Deployment

### Build for Production
```bash
npm run build
npm start
```

### Deploy to Vercel
1. Push to GitHub
2. Import repo at https://vercel.com/new
3. Set environment variables
4. Deploy!

## 📖 Documentation

See [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md) for:
- Detailed architecture explanation
- How to add new tools
- API endpoint specifications
- Deployment instructions
- Usage examples

## 🔧 Technology Stack

- **Next.js 14** - React framework with App Router
- **TypeScript** - Type-safe code
- **React 18** - UI library
- **CSS** - Styled components with gradient effects

## 📝 API Documentation

Each endpoint includes RapidAPI-style documentation comments for easy integration with API documentation platforms.

### Example Structure
```typescript
/**
 * @api {post} /api/tools/case-converter Convert Text Case
 * @apiName ConvertCase
 * @apiGroup Tools
 * @apiDescription Transform text between different case formats
 * @apiBody {string} text The text to convert
 * @apiSuccess {object} data Converted text in all formats
 * @apiExample {curl} Example usage:
 * curl -X POST http://localhost:3000/api/tools/case-converter \
 *   -H "Content-Type: application/json" \
 *   -d '{"text":"hello world"}'
 */
```

## 🎨 UI Features

- Dark/light theme ready
- Responsive design (mobile, tablet, desktop)
- Real-time API code generation
- Copy-to-clipboard for results and code
- Gradient accents and animations
- Loading states for async operations

## 🔐 Security

- Input validation on all endpoints
- Error handling and graceful failures
- Environment variable protection
- No hardcoded secrets
- CORS-ready (add headers as needed)

## 📊 Performance

- Server-side API logic with instant processing
- Client-side UI feedback without API calls
- Optimized bundle size
- Static generation where possible
- Edge function ready

## 🐛 Known Limitations

- Image resizer calculates dimensions (actual image processing done client-side)
- Blog generator requires valid OpenAI API key
- Supabase integration prepared but not implemented (optional)

## 🚦 Next Steps

1. Test tools locally at http://localhost:3000
2. Review API endpoints in the right sidebar preview
3. Deploy to Vercel
4. Add authentication if needed
5. Integrate with your application

## 📞 Support

For Next.js documentation: https://nextjs.org/docs
For Vercel deployment: https://vercel.com/docs

---

Built with ❤️ for developers. Each tool is a complete, API-ready solution.
