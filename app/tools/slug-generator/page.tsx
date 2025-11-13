'use client'

import { useState, useEffect } from 'react'
import ToolHeader from '@/app/components/ToolHeader'
import AboutToolAccordion from '@/app/components/AboutToolAccordion'
import MobileApiToggle from '@/app/components/MobileApiToggle'
import { createSlug, generateSlug } from '@/lib/tools/slug-generator'
import { useFavorites } from '@/app/hooks/useFavorites'
import { useClipboard } from '@/app/hooks/useClipboard'
import { useApiParams } from '@/app/context/ApiParamsContext'
import { toolDescriptions } from '@/config/tool-descriptions'
import type { ToolPageProps, SlugGeneratorResult } from '@/lib/types/tools'

export default function SlugGeneratorPage(): JSX.Element {
  const { updateParams } = useApiParams()
  const { isSaved, toggleSave } = useFavorites('slug-generator')
  const [text, setText] = useState<string>('')
  const [separator, setSeparator] = useState<string>('-')
  const [result, setResult] = useState<SlugGeneratorResult | null>(null)
  const { isCopied, copyToClipboard } = useClipboard()

  // Update API params and generate slug
  useEffect(() => {
    updateParams({ text: text || 'My Blog Post Title', separator })

    if (text.trim()) {
      const generated = createSlug(text, separator)
      setResult(generated)
    } else {
      setResult(null)
    }
  }, [text, separator, updateParams])


  return (
    <div className="tool-container">
      <ToolHeader
        title="Slug Generator"
        description="Convert text to URL-friendly slugs with custom separators"
        isSaved={isSaved}
        onToggleSave={toggleSave}
        toolId="slug-generator"
      />

      <div className="tool-content">
        <div className="converter-controls">
          <div className="separator-selector">
            <label htmlFor="separator-select">Separator:</label>
            <select
              id="separator-select"
              value={separator}
              onChange={e => setSeparator(e.target.value)}
              className="mode-select"
            >
              <option value="-">Hyphen (-)</option>
              <option value="_">Underscore (_)</option>
              <option value="">No separator</option>
            </select>
          </div>
        </div>

        <div className="input-section">
          <label htmlFor="text-input">Enter text to convert to slug:</label>
          <input
            id="text-input"
            type="text"
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="My Blog Post Title"
            className="text-input"
          />
        </div>

        {result && (
          <div className="results-container">
            <div className="result-section">
              <div className="section-header">
                <h3>Generated Slug</h3>
                <button
                  className="copy-btn"
                  onClick={() => copyToClipboard(result.slug)}
                  title="Copy slug"
                  type="button"
                >
                  {isCopied ? 'Copied!' : 'Copy'}
                </button>
              </div>
              <div className="slug-output">
                <code>{result.slug}</code>
              </div>
            </div>

            <div className="stats-grid">
              <div className="stat-item">
                <span className="stat-label">Original Length</span>
                <span className="stat-value">{result.original.length} chars</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Slug Length</span>
                <span className="stat-value">{result.length} chars</span>
              </div>
            </div>
          </div>
        )}
      </div>

      <MobileApiToggle />

      <AboutToolAccordion
        toolId="slug-generator"
        content={toolDescriptions['slug-generator']}
      />
    </div>
  )
}
