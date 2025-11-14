'use client'

import { useState, useEffect } from 'react'
import ToolHeader from '@/app/components/ToolHeader'
import AboutToolAccordion from '@/app/components/AboutToolAccordion'
import { countWords } from '@/lib/tools/word-counter'
import { useFavorites } from '@/app/hooks/useFavorites'
import { useApiParams } from '@/app/context/ApiParamsContext'
import { useApiPanel } from '@/app/context/ApiPanelContext'
import { toolDescriptions } from '@/config/tool-descriptions'
import type { ToolPageProps, WordCounterResult } from '@/lib/types/tools'

export default function WordCounterPage(): JSX.Element {
  const { updateParams } = useApiParams()
  const { isSaved, toggleSave } = useFavorites('word-counter')
  const { setOpen: setApiPanelOpen } = useApiPanel()
  const [text, setText] = useState<string>('')
  const [stats, setStats] = useState<WordCounterResult | null>(null)

  useEffect(() => {
    if (text) {
      const result = countWords({ text })
      setStats(result)
    } else {
      setStats(null)
    }
    // Update API params
    updateParams({ text: text || 'Sample text' })
  }, [text, updateParams])

  const labels = {
    characters: 'Characters (with spaces)',
    charactersNoSpaces: 'Characters (no spaces)',
    words: 'Words',
    sentences: 'Sentences',
    paragraphs: 'Paragraphs',
    lines: 'Lines',
  }

  return (
    <div className="tool-container">
      <ToolHeader
        title="Letter & Word Counter"
        description="Count characters, words, sentences and more"
        isSaved={isSaved}
        onToggleSave={toggleSave}
        toolId="word-counter"
        showViewApiLink={true}
        onViewApi={() => setApiPanelOpen(true)}
      />

      <div className="tool-content">
        <div className="input-section">
          <label htmlFor="text-input">Enter your text:</label>
          <textarea
            id="text-input"
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="Paste or type your text here..."
            className="text-input"
            rows={8}
          />
        </div>

        {stats && (
          <>
            <div className="stats-grid">
              {Object.entries(stats)
                .filter(([key]) => key !== 'input')
                .map(([key, value]) => (
                  <div key={key} className="stat-card">
                    <div className="stat-value">{(value as number).toLocaleString()}</div>
                    <div className="stat-label">{labels[key as keyof typeof labels]}</div>
                  </div>
                ))}
            </div>

            {text && (
              <div className="text-preview">
                <h3>Preview</h3>
                <p>{text.substring(0, 200)}{text.length > 200 ? '...' : ''}</p>
              </div>
            )}
          </>
        )}
      </div>

      <AboutToolAccordion
        toolId="word-counter"
        content={toolDescriptions['word-counter']}
      />
    </div>
  )
}
