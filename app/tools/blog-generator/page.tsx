'use client'

import { useState, useEffect } from 'react'
import ToolHeader from '@/app/components/ToolHeader'
import AboutToolAccordion from '@/app/components/AboutToolAccordion'
import { useFavorites } from '@/app/hooks/useFavorites'
import { useClipboard } from '@/app/hooks/useClipboard'
import { useAuth } from '@/app/context/AuthContext'
import { useApiParams } from '@/app/context/ApiParamsContext'
import { toolDescriptions } from '@/config/tool-descriptions'
import type { ToolPageProps, BlogGeneratorResult } from '@/lib/types/tools'

type BlogTitle = BlogGeneratorResult['titles'][number]

export default function BlogGeneratorPage(): JSX.Element {
  const { updateParams } = useApiParams()
  const { isSaved, toggleSave } = useFavorites('blog-generator')
  const { session } = useAuth()
  const [topic, setTopic] = useState<string>('')
  const [titles, setTitles] = useState<BlogTitle[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [apiKey, setApiKey] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const { isCopied, copyToClipboard } = useClipboard()

  // Get or create API key when session changes
  useEffect(() => {
    if (!session?.access_token) {
      setApiKey(null)
      return
    }

    const fetchOrCreateApiKey = async () => {
      try {
        // Try to get existing API keys
        const response = await fetch('/api/account/api-keys', {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        })

        if (response.ok) {
          const keys = await response.json()
          if (keys.length > 0) {
            // Use first existing key
            setApiKey(keys[0].key)
            return
          }
        }

        // Create new API key if none exists
        const createResponse = await fetch('/api/account/api-keys', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ label: 'Default API Key' }),
        })

        if (createResponse.ok) {
          const newKey = await createResponse.json()
          setApiKey(newKey.key)
        }
      } catch (err) {
        console.error('Failed to get/create API key:', err)
      }
    }

    fetchOrCreateApiKey()
  }, [session?.access_token])

  // Update API params whenever topic changes
  useEffect(() => {
    updateParams({ topic: topic || 'sample blog topic' })
  }, [topic, updateParams])

  const generateTitles = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!topic.trim()) {
      setError('Please enter a blog topic')
      return
    }

    if (!apiKey) {
      setError('API key not initialized. Please try again.')
      return
    }

    setLoading(true)
    setError(null)
    setTitles([])

    try {
      const response = await fetch('/api/tools/blog-generator', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({ topic }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to generate titles')
      }

      const data = await response.json()
      setTitles(data.data.titles)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate titles. Please try again.')
      console.error('Generation error:', err)
    } finally {
      setLoading(false)
    }
  }


  return (
    <div className="tool-container">
      <ToolHeader
        title="Blog Title Generator"
        description="Generate 5 catchy blog titles in different styles using AI"
        isSaved={isSaved}
        onToggleSave={toggleSave}
        toolId="blog-generator"
      />

      <div className="tool-content blog-content">
        <form onSubmit={generateTitles} className="blog-form">
          <div className="form-group">
            <label htmlFor="blog-topic">Blog Topic</label>
            <input
              id="blog-topic"
              type="text"
              value={topic}
              onChange={e => setTopic(e.target.value)}
              placeholder="e.g., Remote Work, Productivity Tips, AI Tools"
              className="text-input"
            />
            <small className="form-hint">Enter a topic to generate 5 unique blog titles</small>
          </div>

          <button type="submit" className="generate-btn" disabled={loading}>
            {loading ? (
              <>
                <span className="spinner"></span>
                Generating Titles...
              </>
            ) : (
              <>
                <span></span> Generate 5 Titles
              </>
            )}
          </button>

          {error && <div className="error-message">{error}</div>}
        </form>

        {titles.length > 0 && (
          <div className="posts-container">
            <div className="posts-header">
              <h3>Your Generated Titles</h3>
              <p className="posts-subtitle">Click copy to save your favorite</p>
            </div>

            <div className="titles-grid">
              {titles.map(item => (
                <div key={item.id} className="title-card">
                  <div className="title-header" style={{ background: item.color }}>
                    <span className="title-icon">{item.icon}</span>
                    <h4>{item.style}</h4>
                  </div>

                  <div className="title-content">
                    <p className="title-text">{item.title}</p>
                  </div>

                  <div className="title-actions">
                    <button
                      className="copy-btn"
                      onClick={async () => {
                        await copyToClipboard(item.title)
                        setCopiedId(item.id)
                        setTimeout(() => setCopiedId(null), 3000)
                      }}
                      title="Copy to clipboard"
                    >
                      {copiedId === item.id ? 'Copied!' : 'Copy Title'}
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="posts-tips">
              <h4>Pro Tips</h4>
              <ul>
                <li>Mix and match words from different titles to create a hybrid</li>
                <li>
                  Use <strong>SEO Optimized</strong> titles for search engine visibility
                </li>
                <li>
                  Use <strong>Trendy & Viral</strong> titles for social media engagement
                </li>
                <li>Test multiple titles A/B style to see which performs best</li>
              </ul>
            </div>
          </div>
        )}
      </div>

      <AboutToolAccordion
        toolId="blog-generator"
        content={toolDescriptions['blog-generator']}
      />
    </div>
  )
}
