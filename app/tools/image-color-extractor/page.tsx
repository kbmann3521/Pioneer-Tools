'use client'

import { useState, useRef, useEffect } from 'react'
import ToolHeader from '@/app/components/ToolHeader'
import AboutToolAccordion from '@/app/components/AboutToolAccordion'
import { extractImageColors, type ColorAlgorithm, type ColorInfo } from '@/lib/tools/image-color-extractor'
import { useFavorites } from '@/app/hooks/useFavorites'
import { useClipboard } from '@/app/hooks/useClipboard'
import { useApiParams } from '@/app/context/ApiParamsContext'
import { toolDescriptions } from '@/config/tool-descriptions'

export default function ImageColorExtractorPage(): JSX.Element {
  const { updateParams } = useApiParams()
  const { isSaved, toggleSave } = useFavorites('image-color-extractor')
  const [image, setImage] = useState<string | null>(null)
  const [colorCount, setColorCount] = useState(5)
  const [algorithm, setAlgorithm] = useState<ColorAlgorithm>('simple')
  const [colors, setColors] = useState<ColorInfo[]>([])
  const [selectedColorIndex, setSelectedColorIndex] = useState(0)
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const [dragActive, setDragActive] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { copyToClipboard } = useClipboard()

  // Update colors when image, count, or algorithm changes
  useEffect(() => {
    if (image) {
      const result = extractImageColors({ imageData: image, colorCount, algorithm })
      setColors(result.colors)
      setSelectedColorIndex(0)
      updateParams({ imageData: image.substring(0, 100) + '...', colorCount, algorithm })
    }
  }, [image, colorCount, algorithm, updateParams])

  const selectedColor = colors[selectedColorIndex] || null

  const handleImageUpload = (file: File | null) => {
    if (!file) return

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
    setColors([])
    setSelectedColorIndex(0)
    setColorCount(5)
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
        title="Image Color Extractor"
        description="Extract a palette of dominant colors from any image"
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
          <div className="color-extractor-container">
            <div className="image-preview-wrapper">
              <img src={image} alt="Uploaded preview" className="image-preview-thumbnail" />
              <button className="clear-image-btn" onClick={handleClearImage}>
                ✕ Change Image
              </button>
            </div>

            <div className="color-extractor-panel">
              <div className="extractor-controls">
                <div className="control-group">
                  <label className="control-label">Colors to Extract:</label>
                  <select
                    value={colorCount}
                    onChange={e => setColorCount(Number(e.target.value))}
                    className="color-count-select"
                  >
                    {Array.from({ length: 10 }, (_, i) => i + 1).map(num => (
                      <option key={num} value={num}>
                        {num} Color{num !== 1 ? 's' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="control-group">
                  <label className="control-label">Algorithm:</label>
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
              </div>

              <div className="color-palette">
                <div className="palette-label">Color Palette</div>
                <div className="swatches-grid">
                  {colors.map(color => (
                    <button
                      key={color.index}
                      className={`color-swatch-btn ${selectedColorIndex === color.index ? 'selected' : ''}`}
                      onClick={() => setSelectedColorIndex(color.index)}
                      title={color.rgb}
                      style={{ backgroundColor: color.hex }}
                    >
                      {selectedColorIndex === color.index && <span className="swatch-checkmark">✓</span>}
                    </button>
                  ))}
                </div>
              </div>

              {selectedColor && (
                <div className="color-values">
                  <div className="color-value-item">
                    <div className="value-label">HEX</div>
                    <div className="value-content">
                      <code>{selectedColor.hex}</code>
                      <button
                        className="mini-copy-btn"
                        onClick={() => copyColor(selectedColor.hex, 'hex')}
                        title="Copy HEX"
                      >
                        {copiedKey === 'hex' ? '✓' : '📋'}
                      </button>
                    </div>
                  </div>

                  <div className="color-value-item">
                    <div className="value-label">RGB</div>
                    <div className="value-content">
                      <code>{selectedColor.rgb}</code>
                      <button
                        className="mini-copy-btn"
                        onClick={() => copyColor(selectedColor.rgb, 'rgb')}
                        title="Copy RGB"
                      >
                        {copiedKey === 'rgb' ? '✓' : '📋'}
                      </button>
                    </div>
                  </div>

                  <div className="color-value-item">
                    <div className="value-label">HSL</div>
                    <div className="value-content">
                      <code>{selectedColor.hsl}</code>
                      <button
                        className="mini-copy-btn"
                        onClick={() => copyColor(selectedColor.hsl, 'hsl')}
                        title="Copy HSL"
                      >
                        {copiedKey === 'hsl' ? '✓' : '📋'}
                      </button>
                    </div>
                  </div>

                  <div className="color-value-item">
                    <div className="value-label">HSLA</div>
                    <div className="value-content">
                      <code>{selectedColor.hsla}</code>
                      <button
                        className="mini-copy-btn"
                        onClick={() => copyColor(selectedColor.hsla, 'hsla')}
                        title="Copy HSLA"
                      >
                        {copiedKey === 'hsla' ? '✓' : '📋'}
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
                </div>
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
