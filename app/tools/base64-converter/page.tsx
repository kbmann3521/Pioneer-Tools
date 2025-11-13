'use client'

import { useState, useEffect } from 'react'
import ToolHeader from '@/app/components/ToolHeader'
import AboutToolAccordion from '@/app/components/AboutToolAccordion'
import { convertBase64 } from '@/lib/tools/base64-converter'
import { useFavorites } from '@/app/hooks/useFavorites'
import { useClipboard } from '@/app/hooks/useClipboard'
import { useApiParams } from '@/app/context/ApiParamsContext'
import { toolDescriptions } from '@/config/tool-descriptions'
import type { ToolPageProps, Base64ConverterResult } from '@/lib/types/tools'

export default function Base64ConverterPage(): JSX.Element {
  const { updateParams } = useApiParams()
  const { isSaved, toggleSave } = useFavorites('base64-converter')
  const { isCopied, copyToClipboard } = useClipboard()
  const [text, setText] = useState<string>('')
  const [mode, setMode] = useState<'encode' | 'decode'>('encode')
  const [result, setResult] = useState<Base64ConverterResult | null>(null)

  // Update API params and convert
  useEffect(() => {
    updateParams({ text: text || 'Hello World', mode })

    if (text.trim()) {
      const converted = convertBase64(text, mode)
      setResult(converted)
    } else {
      setResult(null)
    }
  }, [text, mode, updateParams])

  return (
    <div className="tool-container">
      <ToolHeader
        title="Base64 Encoder/Decoder"
        description="Convert text to and from Base64 encoding"
        isSaved={isSaved}
        onToggleSave={toggleSave}
        toolId="base64-converter"
        showApiToggle={true}
      />

      <div className="tool-content">
        <div className="converter-controls">
          <div className="mode-selector">
            <label htmlFor="mode-select">Mode:</label>
            <select
              id="mode-select"
              value={mode}
              onChange={e => setMode(e.target.value as 'encode' | 'decode')}
              className="mode-select"
            >
              <option value="encode">Encode to Base64</option>
              <option value="decode">Decode from Base64</option>
            </select>
          </div>
        </div>

        <div className="input-section">
          <label htmlFor="text-input">
            {mode === 'encode' ? 'Enter text to encode:' : 'Enter Base64 to decode:'}
          </label>
          <textarea
            id="text-input"
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder={mode === 'encode' ? 'Hello, World!' : 'SGVsbG8sIFdvcmxkIQ=='}
            className="text-input"
            rows={6}
          />
        </div>

        {result && (
          <div className="results-container">
            {result.success ? (
              <>
                <div className="result-section">
                  <div className="section-header">
                    <h3>{mode === 'encode' ? 'Base64 Encoded' : 'Decoded Text'}</h3>
                    <button
                      className="copy-btn"
                      onClick={() => copyToClipboard(result.result)}
                      title="Copy result"
                      type="button"
                    >
                      {isCopied ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                  <pre className="code-output">{result.result}</pre>
                </div>

                <div className="stats-grid">
                  <div className="stat-item">
                    <span className="stat-label">Original Size</span>
                    <span className="stat-value">{result.size.original} bytes</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">Converted Size</span>
                    <span className="stat-value">{result.size.converted} bytes</span>
                  </div>
                </div>
              </>
            ) : (
              <div className="error-section">
                <h3 className="error-title">Error</h3>
                <p className="error-message">{result.error}</p>
              </div>
            )}
          </div>
        )}
      </div>

      <AboutToolAccordion
        toolId="base64-converter"
        content={toolDescriptions['base64-converter']}
      />
    </div>
  )
}
