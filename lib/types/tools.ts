/**
 * Comprehensive type definitions for all tools
 * Used in tool pages, API routes, and contexts
 */

/* ============================================
   INPUT TYPES (Tool Parameters)
   ============================================ */

export interface CaseConverterParams {
  text: string
}

export interface CaseConverterResult {
  text: string
  lowercase: string
  uppercase: string
  capitalize: string
  toggleCase: string
  camelCase: string
  snakeCase: string
  kebabCase: string
}

export interface Base64ConverterParams {
  text: string
  mode: 'encode' | 'decode'
}

export interface Base64ConverterResult {
  success: boolean
  result: string
  error?: string
  size: {
    original: number
    converted: number
  }
}

export interface JsonFormatterParams {
  json: string
}

export interface JsonFormatterResult {
  isValid: boolean
  formatted?: string
  minified?: string
  error?: string
  stats?: {
    size: number
    minifiedSize: number
  }
}

export interface SlugGeneratorParams {
  text: string
  separator?: string
}

export interface SlugGeneratorResult {
  slug: string
}

export interface PasswordGeneratorParams {
  length?: number
  useUppercase?: boolean
  useLowercase?: boolean
  useNumbers?: boolean
  useSpecialChars?: boolean
}

export interface PasswordGeneratorResult {
  password: string
  strength: 'weak' | 'fair' | 'good' | 'strong' | 'very-strong'
  score: number
  metrics: {
    length: number
    hasUppercase: boolean
    hasLowercase: boolean
    hasNumbers: boolean
    hasSpecialChars: boolean
  }
}

export interface UrlEncoderParams {
  url: string
  mode: 'encode' | 'decode'
}

export interface UrlEncoderResult {
  result: string
  success: boolean
  error?: string
}

export interface HexRgbaConverterParams {
  hex?: string
  r?: number
  g?: number
  b?: number
  alpha?: number
}

export interface HexRgbaConverterResult {
  success: boolean
  hex?: string
  rgb?: string
  rgba?: string
  error?: string
}

export interface OGGeneratorParams {
  title: string
  description: string
  url: string
  image: string
  type?: string
  siteName?: string
}

export interface OGGeneratorResult {
  metaTags: string
  ogTags: string
  twitterTags: string
}

export interface ImageResizerParams {
  width: number
  height: number
  keepAspectRatio?: boolean
  originalWidth?: number
  originalHeight?: number
}

export interface ImageResizerResult {
  width: number
  height: number
  aspectRatio: string
  scaleFactor: number
}

export interface WordCounterParams {
  text: string
}

export interface WordCounterResult {
  characters: number
  charactersNoSpaces: number
  words: number
  sentences: number
  paragraphs: number
  lines: number
}

export interface BlogGeneratorParams {
  topic: string
}

export interface BlogGeneratorResult {
  topic: string
  titles: Array<{
    id: string
    style: string
    icon: string
    color: string
    title: string
  }>
}

/* ============================================
   GENERIC TOOL TYPES
   ============================================ */

export type ToolParams = 
  | CaseConverterParams
  | Base64ConverterParams
  | JsonFormatterParams
  | SlugGeneratorParams
  | PasswordGeneratorParams
  | UrlEncoderParams
  | HexRgbaConverterParams
  | OGGeneratorParams
  | ImageResizerParams
  | WordCounterParams
  | BlogGeneratorParams

export type ToolResult =
  | CaseConverterResult
  | Base64ConverterResult
  | JsonFormatterResult
  | SlugGeneratorResult
  | PasswordGeneratorResult
  | UrlEncoderResult
  | HexRgbaConverterResult
  | OGGeneratorResult
  | ImageResizerResult
  | WordCounterResult
  | BlogGeneratorResult

/* ============================================
   API RESPONSE TYPES
   ============================================ */

export interface ApiErrorObject {
  code: string
  message: string
  details?: string
}

export interface ApiMeta {
  timestamp: string
  rateLimit?: {
    remaining: number | null
    balance: number | null
    costThisCall: number
    requestsPerSecond: number
  }
  [key: string]: any
}

export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: ApiErrorObject
  meta?: ApiMeta
}

/* ============================================
   CONTEXT TYPES
   ============================================ */

export interface ApiParamsContextValue {
  updateParams: (params: Partial<ToolParams>) => void
  currentParams: Partial<ToolParams>
}

export interface ToolSettingsContextValue {
  setToolParams: (params: Partial<ToolParams>) => void
  toolParams: Partial<ToolParams>
}

/* ============================================
   COMPONENT PROP TYPES
   ============================================ */

export interface ToolPageProps {
  isSaved?: boolean
  toggleSave?: () => void
}

export interface ApiPreviewProps {
  endpoint: string
  method?: string
  params?: Partial<ToolParams>
  toolName: string
}
