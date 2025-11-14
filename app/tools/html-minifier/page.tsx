'use client'

import { useState, useEffect } from 'react'
import ToolHeader from '@/app/components/ToolHeader'
import AboutToolAccordion from '@/app/components/AboutToolAccordion'
import { minifyHtml } from '@/lib/tools/html-minifier'
import { useFavorites } from '@/app/hooks/useFavorites'
import { useClipboard } from '@/app/hooks/useClipboard'
import { useApiParams } from '@/app/context/ApiParamsContext'
import { useApiPanel } from '@/app/context/ApiPanelContext'
import { toolDescriptions } from '@/config/tool-descriptions'
import type { HtmlMinifierResult } from '@/lib/types/tools'

export default function HtmlMinifierPage(): JSX.Element {
  const { updateParams } = useApiParams()
  const { isSaved, toggleSave } = useFavorites('html-minifier')
  const { setOpen: setApiPanelOpen } = useApiPanel()
  const { isCopied, copyToClipboard } = useClipboard()
  const [input, setInput] = useState<string>('')
  const [result, setResult] = useState<HtmlMinifierResult | null>(null)

  // Update API params whenever input changes
  useEffect(() => {
    updateParams({ html: input || '' })

    if (input.trim()) {
      const minified = minifyHtml(input)
      setResult(minified)
    } else {
      setResult(null)
    }
  }, [input, updateParams])

  return (
    <div className="tool-container">
      <ToolHeader
        title="HTML Minifier"
        description="Minify and optimize HTML code to reduce file size"
        isSaved={isSaved}
        onToggleSave={toggleSave}
        toolId="html-minifier"
        showViewApiLink={true}
        onViewApi={() => setApiPanelOpen(true)}
      />

      <div className="tool-content">
        <div className="input-section">
          <label htmlFor="html-input" style={{ display: 'block', fontWeight: '600' }}>Paste your HTML:</label>
          <textarea
            id="html-input"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder={`<!DOCTYPE html>
<html>
  <head>
    <title>Example</title>
  </head>
  <body>
    <h1>Hello World</h1>
  </body>
</html>`}
            className="text-input"
            rows={12}
            style={{ marginBottom: '38px' }}
          />
        </div>

        {result && (
          <div className="results-container">
            {result.isValid ? (
              <>
                {result.minified && (
                  <div className="result-section">
                    <div className="section-header">
                      <h3>Minified HTML</h3>
                      <button
                        className="copy-btn"
                        onClick={() => copyToClipboard(result.minified!)}
                        title="Copy minified HTML"
                        type="button"
                      >
                        {isCopied ? 'Copied!' : 'Copy'}
                      </button>
                    </div>
                    <pre className="code-output">{result.minified}</pre>
                  </div>
                )}

                {result.stats && (
                  <div className="stats-grid">
                    <div className="stat-item">
                      <span className="stat-label">Original Size</span>
                      <span className="stat-value">{result.stats.originalSize} bytes</span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-label">Minified Size</span>
                      <span className="stat-value">{result.stats.minifiedSize} bytes</span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-label">Reduction</span>
                      <span className="stat-value">{result.stats.reductionPercent}%</span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-label">Bytes Saved</span>
                      <span className="stat-value">{result.stats.reduction} bytes</span>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="error-section">
                <h3 className="error-title">Processing Error</h3>
                <p className="error-message">{result.error}</p>
              </div>
            )}
          </div>
        )}
      </div>

      <AboutToolAccordion
        toolId="html-minifier"
        content={toolDescriptions['html-minifier']}
      />
    </div>
  )
}
