'use client'

import { useState, useRef, useEffect } from 'react'
import ToolHeader from '@/app/components/ToolHeader'
import AboutToolAccordion from '@/app/components/AboutToolAccordion'
import { getImageAverageColor } from '@/lib/tools/image-average-color'
import { useFavorites } from '@/app/hooks/useFavorites'
import { useClipboard } from '@/app/hooks/useClipboard'
import { useApiParams } from '@/app/context/ApiParamsContext'
import { toolDescriptions } from '@/config/tool-descriptions'
import type { ToolPageProps } from '@/lib/types/tools'

export default function ImageAverageColorPage(): JSX.Element {
  const { updateParams } = useApiParams()
  const { isSaved, toggleSave } = useFavorites('image-average-color')
  const [image, setImage] = useState<string | null>(null)
  const [colors, setColors] = useState<any | null>(null)
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { copyToClipboard } = useClipboard()

  // Update API params when image changes
  useEffect(() => {
    if (image) {
      const result = getImageAverageColor({ imageData: image })
      setColors(result)
      updateParams({ imageData: image.substring(0, 100) + '...' })
    } else {
      setColors(null)
      updateParams({ imageData: '' })
    }
  }, [image, updateParams])

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Validate file size (5MB max)
      if (file.size > 5000000) {
        alert('Image size exceeds 5MB limit')
        return
      }

      const reader = new FileReader()
      reader.onload = event => {
        const result = event.target?.result as string
        setImage(result)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleClearImage = () => {
    setImage(null)
    setColors(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const copyColor = (value: string, key: string) => {
    copyToClipboard(value)
    setCopiedKey(key)
    setTimeout(() => setCopiedKey(null), 3000)
  }

  return (
    <div className="tool-container">
      <ToolHeader
        title="Image Average Color"
        description="Extract the average color from any image"
        isSaved={isSaved}
        onToggleSave={toggleSave}
        toolId="image-average-color"
      />

      <div className="tool-content">
        <div className="upload-section">
          <label htmlFor="image-upload">Upload an image:</label>
          <div className="file-input-wrapper">
            <input
              ref={fileInputRef}
              type="file"
              id="image-upload"
              accept="image/*"
              onChange={handleImageUpload}
              className="file-input"
            />
            <label htmlFor="image-upload" className="file-input-label">
              Choose Image or Drag & Drop
            </label>
          </div>
          {image && (
            <button className="clear-btn" onClick={handleClearImage}>
              Clear Image
            </button>
          )}
        </div>

        {image && (
          <div className="image-preview-section">
            <div className="preview-container">
              <img src={image} alt="Uploaded preview" className="image-preview" />
            </div>
          </div>
        )}

        {colors && !colors.error && (
          <div className="colors-display">
            <div className="color-visual">
              <div
                className="color-swatch"
                style={{ backgroundColor: colors.hex }}
              />
            </div>

            <div className="colors-grid">
              <div className="color-item">
                <div className="color-label">HEX</div>
                <div className="color-output">
                  <code>{colors.hex}</code>
                </div>
                <button
                  className="copy-btn"
                  onClick={() => copyColor(colors.hex, 'hex')}
                >
                  {copiedKey === 'hex' ? 'Copied!' : 'Copy'}
                </button>
              </div>

              <div className="color-item">
                <div className="color-label">RGB</div>
                <div className="color-output">
                  <code>{colors.rgb}</code>
                </div>
                <button
                  className="copy-btn"
                  onClick={() => copyColor(colors.rgb, 'rgb')}
                >
                  {copiedKey === 'rgb' ? 'Copied!' : 'Copy'}
                </button>
              </div>

              <div className="color-item">
                <div className="color-label">RGBA</div>
                <div className="color-output">
                  <code>{colors.rgba}</code>
                </div>
                <button
                  className="copy-btn"
                  onClick={() => copyColor(colors.rgba, 'rgba')}
                >
                  {copiedKey === 'rgba' ? 'Copied!' : 'Copy'}
                </button>
              </div>

              <div className="color-item">
                <div className="color-label">HSL</div>
                <div className="color-output">
                  <code>{colors.hsl}</code>
                </div>
                <button
                  className="copy-btn"
                  onClick={() => copyColor(colors.hsl, 'hsl')}
                >
                  {copiedKey === 'hsl' ? 'Copied!' : 'Copy'}
                </button>
              </div>

              <div className="color-item">
                <div className="color-label">Red Value</div>
                <div className="color-output">
                  <code>{colors.r}</code>
                </div>
                <button
                  className="copy-btn"
                  onClick={() => copyColor(colors.r.toString(), 'r')}
                >
                  {copiedKey === 'r' ? 'Copied!' : 'Copy'}
                </button>
              </div>

              <div className="color-item">
                <div className="color-label">Green Value</div>
                <div className="color-output">
                  <code>{colors.g}</code>
                </div>
                <button
                  className="copy-btn"
                  onClick={() => copyColor(colors.g.toString(), 'g')}
                >
                  {copiedKey === 'g' ? 'Copied!' : 'Copy'}
                </button>
              </div>

              <div className="color-item">
                <div className="color-label">Blue Value</div>
                <div className="color-output">
                  <code>{colors.b}</code>
                </div>
                <button
                  className="copy-btn"
                  onClick={() => copyColor(colors.b.toString(), 'b')}
                >
                  {copiedKey === 'b' ? 'Copied!' : 'Copy'}
                </button>
              </div>
            </div>
          </div>
        )}

        {colors?.error && (
          <div className="error-message">
            {colors.error}
          </div>
        )}
      </div>

      <AboutToolAccordion
        toolId="image-average-color"
        content={toolDescriptions['image-average-color']}
      />
    </div>
  )
}
