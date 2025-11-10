'use client'

import { useState, useEffect } from 'react'
import ToolHeader from '@/app/components/ToolHeader'
import AboutToolAccordion from '@/app/components/AboutToolAccordion'
import CopyFeedback from '@/app/components/CopyFeedback'
import { convertCase } from '@/lib/tools/case-converter'
import { useFavorites } from '@/app/hooks/useFavorites'
import { useApiParams } from '@/app/context/ApiParamsContext'
import { toolDescriptions } from '@/config/tool-descriptions'
import type { ToolPageProps, CaseConverterResult } from '@/lib/types/tools'

export default function CaseConverterPage({}: ToolPageProps) {
  const { updateParams } = useApiParams()
  const { isSaved, toggleSave } = useFavorites('case-converter')
  const [text, setText] = useState<string>('')
  const [results, setResults] = useState<CaseConverterResult | null>(null)
  const [copyMessage, setCopyMessage] = useState<string | null>(null)
  const [copyPosition, setCopyPosition] = useState<{ x: number; y: number } | null>(null)

  // Update API params whenever text changes
  useEffect(() => {
    updateParams({ text: text || 'hello world' })
  }, [text, updateParams])

  const handleConvert = () => {
    if (text.trim()) {
      const result = convertCase({ text })
      setResults(result)
    }
  }

  const copyToClipboard = (value: string, event: React.MouseEvent) => {
    navigator.clipboard.writeText(value).then(() => {
      setCopyPosition({ x: event.clientX, y: event.clientY })
      setCopyMessage('Copied!')
      setTimeout(() => setCopyMessage(null), 1200)
    })
  }

  return (
    <div className="tool-container">
      <ToolHeader
        title="Case Converter"
        description="Transform text between different case formats instantly"
        isSaved={isSaved}
        onToggleSave={toggleSave}
        toolId="case-converter"
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
          <button className="convert-btn" onClick={handleConvert}>
            Convert
          </button>
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
                    onClick={(e) => copyToClipboard(value as string, e)}
                    disabled={!(value as string)}
                  >
                    Copy
                  </button>
                </div>
              ))}
          </div>
        )}
      </div>
      <CopyFeedback message={copyMessage} position={copyPosition} />

      <AboutToolAccordion
        toolId="case-converter"
        content={toolDescriptions['case-converter']}
      />
    </div>
  )
}
