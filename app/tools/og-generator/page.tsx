'use client'

import { useState, useEffect } from 'react'
import ToolHeader from '@/app/components/ToolHeader'
import AboutToolAccordion from '@/app/components/AboutToolAccordion'
import { generateOGTags, type OGGeneratorOutput } from '@/lib/tools/og-generator'
import { useFavorites } from '@/app/hooks/useFavorites'
import { useApiParams } from '@/app/context/ApiParamsContext'
import { toolDescriptions } from '@/config/tool-descriptions'

interface OGGeneratorProps {
  isSaved?: boolean
  toggleSave?: () => void
}

export default function OGGeneratorPage({}: OGGeneratorProps) {
  const { updateParams } = useApiParams()
  const { isSaved, toggleSave } = useFavorites('og-generator')
  const [formData, setFormData] = useState({
    title: 'My Awesome Website',
    description: 'A description of my website',
    url: 'https://example.com',
    image: 'https://example.com/image.jpg',
    type: 'website',
    siteName: 'My Site',
  })

  const [result, setResult] = useState<OGGeneratorOutput | null>(null)
  const [copyMessage, setCopyMessage] = useState<string | null>(null)
  const [copyPosition, setCopyPosition] = useState<{ x: number; y: number } | null>(null)

  // Update API params whenever form data changes
  useEffect(() => {
    updateParams(formData)
    if (formData.title && formData.description && formData.url && formData.image) {
      const generated = generateOGTags(formData)
      setResult(generated)
    }
  }, [formData, updateParams])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const copyToClipboard = (text: string, event: React.MouseEvent) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopyPosition({ x: event.clientX, y: event.clientY })
      setCopyMessage('Copied!')
      setTimeout(() => setCopyMessage(null), 1200)
    })
  }

  const metaTags = result?.metaTags || ''

  return (
    <div className="tool-container">
      <ToolHeader
        title="Open Graph Meta Tag Generator"
        description="Generate meta tags for social media sharing"
        isSaved={isSaved}
        onToggleSave={toggleSave}
        toolId="og-generator"
      />

      <div className="tool-content og-content">
        <div className="og-form">
          <div className="form-group">
            <label htmlFor="title">Title:</label>
            <input
              id="title"
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              className="text-input"
            />
          </div>

          <div className="form-group">
            <label htmlFor="description">Description:</label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              className="text-input"
              rows={3}
            />
          </div>

          <div className="form-group">
            <label htmlFor="url">URL:</label>
            <input
              id="url"
              type="url"
              name="url"
              value={formData.url}
              onChange={handleChange}
              className="text-input"
            />
          </div>

          <div className="form-group">
            <label htmlFor="image">Image URL:</label>
            <input
              id="image"
              type="url"
              name="image"
              value={formData.image}
              onChange={handleChange}
              className="text-input"
            />
          </div>

          <div className="form-group">
            <label htmlFor="type">Type:</label>
            <select
              id="type"
              name="type"
              value={formData.type}
              onChange={handleChange}
              className="text-input"
            >
              <option value="website">Website</option>
              <option value="article">Article</option>
              <option value="book">Book</option>
              <option value="profile">Profile</option>
              <option value="video.movie">Video Movie</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="siteName">Site Name:</label>
            <input
              id="siteName"
              type="text"
              name="siteName"
              value={formData.siteName}
              onChange={handleChange}
              className="text-input"
            />
          </div>
        </div>

        {result && (
          <>
            <div className="og-preview">
              <h3>Preview</h3>
              <div className="preview-card">
                <div className="preview-image">
                  <img
                    src={formData.image}
                    alt="Preview"
                    onError={e => {
                      ;(e.target as HTMLImageElement).src =
                        'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22400%22 height=%22200%22%3E%3Crect fill=%22%23e0e0e0%22 width=%22400%22 height=%22200%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 text-anchor=%22middle%22 dy=%22.3em%22 font-family=%22Arial%22%3EImage%3C/text%3E%3C/svg%3E'
                    }}
                  />
                </div>
                <div className="preview-text">
                  <h4>{formData.title}</h4>
                  <p>{formData.description}</p>
                  <small>{formData.url}</small>
                </div>
              </div>
            </div>

            <div className="meta-tags-output">
              <h3>Generated Meta Tags</h3>
              <pre className="code-block">
                <code>{metaTags}</code>
              </pre>
              <button className="copy-btn" onClick={(e) => copyToClipboard(metaTags, e)}>
                Copy All Tags
              </button>
            </div>
          </>
        )}
      </div>
      {copyMessage && copyPosition && (
        <div
          className="copy-feedback-toast"
          style={{ left: `${copyPosition.x}px`, top: `${copyPosition.y}px` }}
        >
          {copyMessage}
        </div>
      )}

      <AboutToolAccordion
        toolId="og-generator"
        content={toolDescriptions['og-generator']}
      />
    </div>
  )
}
