'use client'

import { useState, useEffect } from 'react'
import ToolHeader from '@/app/components/ToolHeader'
import AboutToolAccordion from '@/app/components/AboutToolAccordion'
import { convertCase } from '@/lib/tools/case-converter'
import { useFavorites } from '@/app/hooks/useFavorites'
import { useClipboard } from '@/app/hooks/useClipboard'
import { useApiParams } from '@/app/context/ApiParamsContext'
import { toolDescriptions } from '@/config/tool-descriptions'
import type { ToolPageProps, CaseConverterResult } from '@/lib/types/tools'

export default function CaseConverterPage(): JSX.Element {
  const { updateParams } = useApiParams()
  const { isSaved, toggleSave } = useFavorites('case-converter')
  const [text, setText] = useState<string>('')
  const [results, setResults] = useState<CaseConverterResult | null>(null)
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const { isCopied, copyToClipboard } = useClipboard()

  // Update API params and convert cases in real-time whenever text changes
  useEffect(() => {
    updateParams({ text: text || 'hello world' })

    if (text.trim()) {
      const result = convertCase({ text })
      setResults(result)
    } else {
      setResults(null)
    }
  }, [text, updateParams])


  return (
    <div className="tool-container">
      <ToolHeader
        title="Case Converter"
        description="Transform text between different case formats instantly"
        isSaved={isSaved}
        onToggleSave={toggleSave}
        toolId="case-converter"
        showApiToggle={true}
      />

      <div className="tool-content">
        <div className="input-section">
          <label htmlFor="text-input">Enter your text:</label>
          <textarea
            id="text-input"
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="Type something..."
            className="text-input"
            rows={5}
          />
        </div>

        {results && (
          <div className="conversions-grid">
            {Object.entries(results)
              .filter(([key]) => key !== 'input')
              .map(([key, value]) => (
                <div key={key} className="conversion-item">
                  <div className="conversion-label">
                    {key
                      .split(/(?=[A-Z])/)
                      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                      .join(' ')}
                  </div>
                  <div className="conversion-output">
                    <code>{(value as string) || '(empty)'}</code>
                  </div>
                  <button
                    className="copy-btn"
                    onClick={() => {
                      copyToClipboard(value as string)
                      setCopiedKey(key)
                      setTimeout(() => setCopiedKey(null), 3000)
                    }}
                    disabled={!(value as string)}
                  >
                    {copiedKey === key ? 'Copied!' : 'Copy'}
                  </button>
                </div>
              ))}
          </div>
        )}
      </div>

      <AboutToolAccordion
        toolId="case-converter"
        content={toolDescriptions['case-converter']}
      />
    </div>
  )
}
