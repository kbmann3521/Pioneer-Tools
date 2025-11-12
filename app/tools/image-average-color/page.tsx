'use client'

import { useState, useRef, useEffect } from 'react'
import ToolHeader from '@/app/components/ToolHeader'
import AboutToolAccordion from '@/app/components/AboutToolAccordion'
import { getImageAverageColor, type ColorAlgorithm } from '@/lib/tools/image-average-color'
import { useFavorites } from '@/app/hooks/useFavorites'
import { useClipboard } from '@/app/hooks/useClipboard'
import { useApiParams } from '@/app/context/ApiParamsContext'
import { toolDescriptions } from '@/config/tool-descriptions'

export default function ImageAverageColorPage(): JSX.Element {
  const { updateParams } = useApiParams()
  const { isSaved, toggleSave } = useFavorites('image-average-color')
  const [image, setImage] = useState<string | null>(null)
  const [algorithm, setAlgorithm] = useState<ColorAlgorithm>('simple')
  const [colors, setColors] = useState<any | null>(null)
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const [dragActive, setDragActive] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { copyToClipboard } = useClipboard()

  // Update colors when image or algorithm changes
  useEffect(() => {
    if (image) {
      const result = getImageAverageColor({ imageData: image, algorithm })
      setColors(result)
      updateParams({ imageData: image.substring(0, 100) + '...', algorithm })
    }
  }, [image, algorithm, updateParams])

  const handleImageUpload = (file: File | null) => {
    if (!file) return

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

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleImageUpload(e.target.files?.[0] || null)
  }

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    const files = e.dataTransfer.files
    if (files && files.length > 0) {
      handleImageUpload(files[0])
    }
  }

  const handleClearImage = () => {
    setImage(null)
    setColors(null)
    setAlgorithm('simple')
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
          <div
            className={`file-input-wrapper ${dragActive ? 'drag-active' : ''}`}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          >
            <input
              ref={fileInputRef}
              type="file"
              id="image-upload"
              accept="image/*"
              onChange={handleFileInputChange}
              className="file-input"
            />
            <label htmlFor="image-upload" className="file-input-label">
              Choose Image or Drag & Drop
            </label>
          </div>
        </div>

        {image && (
          <div className="color-analyzer-container">
            <div className="image-preview-wrapper">
              <img src={image} alt="Uploaded preview" className="image-preview-thumbnail" />
              <button className="clear-image-btn" onClick={handleClearImage}>
                ✕ Change Image
              </button>
            </div>

            <div className="color-result-box">
              <div className="color-swatch-display">
                <div
                  className="color-swatch"
                  style={{ backgroundColor: colors?.hex || '#000000' }}
                  title={colors?.rgb}
                />
              </div>

              <div className="algorithm-selector">
                <label className="algo-label">Algorithm:</label>
                <div className="algo-buttons">
                  {(['simple', 'square-root', 'dominant'] as ColorAlgorithm[]).map(algo => (
                    <button
                      key={algo}
                      className={`algo-btn ${algorithm === algo ? 'active' : ''}`}
                      onClick={() => setAlgorithm(algo)}
                    >
                      {algo === 'simple' ? 'Simple' : algo === 'square-root' ? 'Square Root' : 'Dominant'}
                    </button>
                  ))}
                </div>
              </div>

              {colors && !colors.error && (
                <div className="color-values-display">
                  <div className="color-value-item">
                    <div className="value-label">HEX</div>
                    <div className="value-content">
                      <code>{colors.hex}</code>
                      <button
                        className="mini-copy-btn"
                        onClick={() => copyColor(colors.hex, 'hex')}
                        title="Copy HEX"
                      >
                        {copiedKey === 'hex' ? '✓' : '📋'}
                      </button>
                    </div>
                  </div>

                  <div className="color-value-item">
                    <div className="value-label">RGB</div>
                    <div className="value-content">
                      <code>{colors.rgb}</code>
                      <button
                        className="mini-copy-btn"
                        onClick={() => copyColor(colors.rgb, 'rgb')}
                        title="Copy RGB"
                      >
                        {copiedKey === 'rgb' ? '✓' : '📋'}
                      </button>
                    </div>
                  </div>

                  <div className="color-value-item">
                    <div className="value-label">Components</div>
                    <div className="rgb-components">
                      <div className="component">
                        <span className="comp-label">R:</span>
                        <span className="comp-value">{colors.r}</span>
                      </div>
                      <div className="component">
                        <span className="comp-label">G:</span>
                        <span className="comp-value">{colors.g}</span>
                      </div>
                      <div className="component">
                        <span className="comp-label">B:</span>
                        <span className="comp-value">{colors.b}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {colors?.error && <div className="error-message">{colors.error}</div>}
            </div>
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
