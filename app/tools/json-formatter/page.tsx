'use client'

import { useState, useEffect } from 'react'
import ToolHeader from '@/app/components/ToolHeader'
import AboutToolAccordion from '@/app/components/AboutToolAccordion'
import CopyFeedback from '@/app/components/CopyFeedback'
import { formatJson } from '@/lib/tools/json-formatter'
import { useFavorites } from '@/app/hooks/useFavorites'
import { useClipboard } from '@/app/hooks/useClipboard'
import { useApiParams } from '@/app/context/ApiParamsContext'
import { toolDescriptions } from '@/config/tool-descriptions'
import type { ToolPageProps, JsonFormatterResult } from '@/lib/types/tools'

export default function JsonFormatterPage({}: ToolPageProps): JSX.Element {
  const { updateParams } = useApiParams()
  const { isSaved, toggleSave } = useFavorites('json-formatter')
  const { copyMessage, copyPosition, copyToClipboard } = useClipboard()
  const [input, setInput] = useState<string>('')
  const [result, setResult] = useState<JsonFormatterResult | null>(null)

  // Update API params whenever input changes
  useEffect(() => {
    updateParams({ json: input || '{}' })

    if (input.trim()) {
      const formatted = formatJson(input)
      setResult(formatted)
    } else {
      setResult(null)
    }
  }, [input, updateParams])

  return (
    <div className="tool-container">
      <ToolHeader
        title="JSON Formatter"
        description="Format, minify, and validate JSON with real-time error detection"
        isSaved={isSaved}
        onToggleSave={toggleSave}
        toolId="json-formatter"
      />

      <div className="tool-content">
        <div className="input-section">
          <label htmlFor="json-input">Paste your JSON:</label>
          <textarea
            id="json-input"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder='{"key": "value"}'
            className="text-input"
            rows={8}
          />
        </div>

        {result && (
          <div className="results-container">
            {result.isValid ? (
              <>
                <div className="result-section">
                  <div className="section-header">
                    <h3>Formatted JSON</h3>
                    <button
                      className="copy-btn"
                      onClick={(e) => copyToClipboard(result.formatted, e)}
                      title="Copy formatted JSON"
                      type="button"
                    >
                      Copy
                    </button>
                  </div>
                  <pre className="code-output">{result.formatted}</pre>
                </div>

                <div className="result-section">
                  <div className="section-header">
                    <h3>Minified JSON</h3>
                    <button
                      className="copy-btn"
                      onClick={(e) => copyToClipboard(result.minified, e)}
                      title="Copy minified JSON"
                      type="button"
                    >
                      Copy
                    </button>
                  </div>
                  <pre className="code-output">{result.minified}</pre>
                </div>

                {result.stats && (
                  <div className="stats-grid">
                    <div className="stat-item">
                      <span className="stat-label">Original Size</span>
                      <span className="stat-value">{result.stats.size} bytes</span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-label">Minified Size</span>
                      <span className="stat-value">{result.stats.minifiedSize} bytes</span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-label">Reduction</span>
                      <span className="stat-value">
                        {Math.round(((result.stats.size - result.stats.minifiedSize) / result.stats.size) * 100)}%
                      </span>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="error-section">
                <h3 className="error-title">Invalid JSON</h3>
                <p className="error-message">{result.error}</p>
              </div>
            )}
          </div>
        )}

        <CopyFeedback message={copyMessage} position={copyPosition} />
      </div>

      <AboutToolAccordion
        toolId="json-formatter"
        content={toolDescriptions['json-formatter']}
      />
    </div>
  )
}
