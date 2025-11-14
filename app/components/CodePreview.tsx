'use client'

import { useClipboard } from '@/app/hooks/useClipboard'

interface CodePreviewProps {
  code: string
  endpoint: string
  method: string
  params: Record<string, any>
}

export default function CodePreview({ code, endpoint, method, params }: CodePreviewProps) {
  const { isCopied, copyToClipboard } = useClipboard()

  return (
    <div className="api-preview-code">
      <pre>
        <code>{code}</code>
      </pre>
      <button
        className="copy-code-btn"
        onClick={() => copyToClipboard(code)}
      >
        {isCopied ? 'Copied!' : 'Copy Code'}
      </button>
    </div>
  )
}
