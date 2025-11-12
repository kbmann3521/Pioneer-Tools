'use client'

import { useState, useRef, useEffect } from 'react'
import ToolHeader from '@/app/components/ToolHeader'
import AboutToolAccordion from '@/app/components/AboutToolAccordion'
import { extractColorFromImage, type ExtractedColor } from '@/lib/tools/image-color-extractor'
import { useFavorites } from '@/app/hooks/useFavorites'
import { useClipboard } from '@/app/hooks/useClipboard'
import { useApiParams } from '@/app/context/ApiParamsContext'
import { toolDescriptions } from '@/config/tool-descriptions'

export default function ImageColorExtractorPage(): JSX.Element {
  const { updateParams } = useApiParams()
  const { isSaved, toggleSave } = useFavorites('image-color-extractor')
  const [image, setImage] = useState<string | null>(null)
  const [colorCount, setColorCount] = useState<number>(5)
  const [colors, setColors] = useState<ExtractedColor[] | null>(null)
  const [selectedColorIndex, setSelectedColorIndex] = useState<number>(0)
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const [dragActive, setDragActive] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { copyToClipboard } = useClipboard()

  // Update colors when image or colorCount changes
  useEffect(() => {
    if (image) {
      const result = extractColorFromImage({ imageData: image, colorCount })
      setColors(result.colors)
      setSelectedColorIndex(0)
      updateParams({ imageData: image.substring(0, 100) + '...', colorCount })
    }
  }, [image, colorCount, updateParams])

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
    setSelectedColorIndex(0)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleColorCountChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setColorCount(Number(e.target.value))
  }

  const copyColor = (value: string, index: number, format: string) => {
    copyToClipboard(value)
    setCopiedKey(`color-${index}-${format}`)
    setTimeout(() => setCopiedKey(null), 2000)
  }

  const selectedColor = colors?.[selectedColorIndex]

  return (
    <div className="tool-container">
      <ToolHeader
        title="Image Color Extractor"
        description="Extract dominant colors from any image"
        isSaved={isSaved}
        onToggleSave={toggleSave}
        toolId="image-color-extractor"
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
              <div className="color-count-selector">
                <label htmlFor="color-count">Number of colors:</label>
                <select
                  id="color-count"
                  value={colorCount}
                  onChange={handleColorCountChange}
                  className="color-count-dropdown"
                >
                  {Array.from({ length: 10 }, (_, i) => i + 1).map(num => (
                    <option key={num} value={num}>
                      {num} color{num !== 1 ? 's' : ''}
                    </option>
                  ))}
                </select>
              </div>

              {colors && colors.length > 0 ? (
                <div className="colors-display-section">
                  <div className="colors-grid">
                    {colors.map((color, index) => (
                      <button
                        key={index}
                        className={`color-swatch-button ${selectedColorIndex === index ? 'selected' : ''}`}
                        onClick={() => setSelectedColorIndex(index)}
                        title={`${color.hex} (${color.percentage}%)`}
                      >
                        <div
                          className="color-swatch-display"
                          style={{ backgroundColor: color.hex }}
                        />
                        <div className="color-percentage">{color.percentage}%</div>
                      </button>
                    ))}
                  </div>

                  {selectedColor && (
                    <div className="selected-color-details">
                      <div className="selected-color-preview">
                        <div
                          className="selected-swatch"
                          style={{ backgroundColor: selectedColor.hex }}
                        />
                      </div>

                      <div className="color-values-display">
                        <div className="color-value-item">
                          <div className="value-label">HEX</div>
                          <div className="value-content">
                            <code>{selectedColor.hex}</code>
                            <button
                              className="mini-copy-btn"
                              onClick={() => copyColor(selectedColor.hex, selectedColorIndex, 'hex')}
                              title="Copy HEX"
                            >
                              {copiedKey === `color-${selectedColorIndex}-hex` ? '✓' : '📋'}
                            </button>
                          </div>
                        </div>

                        <div className="color-value-item">
                          <div className="value-label">RGB</div>
                          <div className="value-content">
                            <code>{selectedColor.rgb}</code>
                            <button
                              className="mini-copy-btn"
                              onClick={() => copyColor(selectedColor.rgb, selectedColorIndex, 'rgb')}
                              title="Copy RGB"
                            >
                              {copiedKey === `color-${selectedColorIndex}-rgb` ? '✓' : '📋'}
                            </button>
                          </div>
                        </div>

                        <div className="color-value-item">
                          <div className="value-label">Components</div>
                          <div className="rgb-components">
                            <div className="component">
                              <span className="comp-label">R:</span>
                              <span className="comp-value">{selectedColor.r}</span>
                            </div>
                            <div className="component">
                              <span className="comp-label">G:</span>
                              <span className="comp-value">{selectedColor.g}</span>
                            </div>
                            <div className="component">
                              <span className="comp-label">B:</span>
                              <span className="comp-value">{selectedColor.b}</span>
                            </div>
                          </div>
                        </div>

                        <div className="color-value-item">
                          <div className="value-label">Prominence</div>
                          <div className="value-content">
                            <code>{selectedColor.percentage}%</code>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="error-message">No colors could be extracted from the image</div>
              )}
            </div>
          </div>
        )}
      </div>

      <AboutToolAccordion
        toolId="image-color-extractor"
        content={toolDescriptions['image-color-extractor']}
      />
    </div>
  )
}
