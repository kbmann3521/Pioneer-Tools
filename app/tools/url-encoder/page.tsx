'use client'

import { useState, useEffect } from 'react'
import ToolHeader from '@/app/components/ToolHeader'
import AboutToolAccordion from '@/app/components/AboutToolAccordion'
import { convertUrl } from '@/lib/tools/url-encoder'
import { useFavorites } from '@/app/hooks/useFavorites'
import { useApiParams } from '@/app/context/ApiParamsContext'
import { toolDescriptions } from '@/config/tool-descriptions'
import type { ToolPageProps, UrlEncoderResult } from '@/lib/types/tools'

export default function UrlEncoderPage({}: ToolPageProps) {
  const { updateParams } = useApiParams()
  const { isSaved, toggleSave } = useFavorites('url-encoder')
  const [text, setText] = useState<string>('')
  const [mode, setMode] = useState<'encode' | 'decode'>('encode')
  const [result, setResult] = useState<UrlEncoderResult | null>(null)
  const [copyMessage, setCopyMessage] = useState<string | null>(null)
  const [copyPosition, setCopyPosition] = useState<{ x: number; y: number } | null>(null)

  // Update API params and convert
  useEffect(() => {
    updateParams({ url: text || 'hello world', mode })

    if (text.trim()) {
      const converted = convertUrl(text, mode)
      setResult(converted)
    } else {
      setResult(null)
    }
  }, [text, mode, updateParams])

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
        title="URL Encoder/Decoder"
        description="Encode and decode URLs for use in links and query strings"
        isSaved={isSaved}
        onToggleSave={toggleSave}
        toolId="url-encoder"
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
              <option value="encode">Encode URL</option>
              <option value="decode">Decode URL</option>
            </select>
          </div>
        </div>

        <div className="input-section">
          <label htmlFor="text-input">
            {mode === 'encode' ? 'Enter text to encode:' : 'Enter encoded URL to decode:'}
          </label>
          <textarea
            id="text-input"
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder={mode === 'encode' ? 'hello world?foo=bar' : 'hello%20world%3Ffoo%3Dbar'}
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
                    <h3>{mode === 'encode' ? 'Encoded URL' : 'Decoded URL'}</h3>
                    <button
                      className="copy-btn"
                      onClick={(e) => copyToClipboard(result.result, e)}
                      title="Copy result"
                      type="button"
                    >
                      Copy
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

        {copyMessage && (
          <div
            className="copy-notification"
            style={{
              position: 'fixed',
              left: `${copyPosition?.x}px`,
              top: `${copyPosition?.y}px`,
              pointerEvents: 'none',
            }}
          >
            {copyMessage}
          </div>
        )}
      </div>

      <AboutToolAccordion
        toolId="url-encoder"
        content={toolDescriptions['url-encoder']}
      />
    </div>
  )
}
