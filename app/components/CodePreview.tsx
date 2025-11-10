'use client'

import { useClipboard } from '@/app/hooks/useClipboard'
import CopyFeedback from '@/app/components/CopyFeedback'

interface CodePreviewProps {
  code: string
  endpoint: string
  method: string
  params: Record<string, any>
}

export default function CodePreview({ code, endpoint, method, params }: CodePreviewProps) {
  const { copyMessage, copyPosition, copyToClipboard } = useClipboard()

  return (
    <>
      <div className="api-preview-code">
        <pre>
          <code>{code}</code>
        </pre>
        <button
          className="copy-code-btn"
          onClick={(e) => copyToClipboard(code, e)}
        >
          Copy Code
        </button>
      </div>

      <CopyFeedback message={copyMessage} position={copyPosition} />
    </>
  )
}
