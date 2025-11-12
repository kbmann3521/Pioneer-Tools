'use client'

import { useState, useRef, useEffect } from 'react'
import ToolHeader from '@/app/components/ToolHeader'
import AboutToolAccordion from '@/app/components/AboutToolAccordion'
import { type ExtractedColor } from '@/lib/tools/image-color-extractor'
import { useFavorites } from '@/app/hooks/useFavorites'
import { useClipboard } from '@/app/hooks/useClipboard'
import { useApiParams } from '@/app/context/ApiParamsContext'
import { toolDescriptions } from '@/config/tool-descriptions'
import styles from './image-color-extractor.module.css'

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

  // Extract colors from canvas when image or colorCount changes
  useEffect(() => {
    if (!image) return

    const extractColorsFromCanvas = async () => {
      try {
        const imgElement = new Image()
        imgElement.crossOrigin = 'anonymous'

        imgElement.onload = () => {
          const canvas = document.createElement('canvas')
          canvas.width = imgElement.width
          canvas.height = imgElement.height

          const ctx = canvas.getContext('2d')
          if (!ctx) return

          ctx.drawImage(imgElement, 0, 0)

          // Get image data
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
          const data = imageData.data

          // Extract pixel data with sampling
          const pixels: { r: number; g: number; b: number }[] = []
          const sampleRate = Math.max(1, Math.floor(Math.sqrt((data.length / 4) / 500)))

          for (let i = 0; i < data.length; i += sampleRate * 4) {
            const r = data[i]
            const g = data[i + 1]
            const b = data[i + 2]

            // Filter: avoid pure white, pure black, and low contrast
            const brightness = (r + g + b) / 3
            const contrast = Math.max(r, g, b) - Math.min(r, g, b)

            if (brightness > 20 && brightness < 235 && contrast > 10) {
              pixels.push({ r, g, b })
            }
          }

          // Perform k-means clustering
          const extractedColors = performKMeans(pixels, colorCount)
          extractedColors.sort((a, b) => b.frequency - a.frequency)

          const totalFreq = extractedColors.reduce((sum, c) => sum + c.frequency, 0)
          const formattedColors: ExtractedColor[] = extractedColors.map(c => ({
            hex: rgbToHex(c.r, c.g, c.b),
            rgb: `rgb(${c.r}, ${c.g}, ${c.b})`,
            r: c.r,
            g: c.g,
            b: c.b,
            percentage: Math.round((c.frequency / totalFreq) * 100),
          }))

          setColors(formattedColors)
          setSelectedColorIndex(0)
          updateParams({ imageData: image.substring(0, 100) + '...', colorCount })
        }

        imgElement.src = image
      } catch (error) {
        console.error('Color extraction error:', error)
      }
    }

    extractColorsFromCanvas()
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

  // Helper function: Convert RGB to HEX
  const rgbToHex = (r: number, g: number, b: number): string => {
    const toHex = (n: number) => {
      const hex = n.toString(16)
      return hex.length === 1 ? '0' + hex : hex
    }
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase()
  }

  // Helper function: Perform k-means clustering to find dominant colors
  const performKMeans = (
    pixels: { r: number; g: number; b: number }[],
    k: number,
  ): Array<{ r: number; g: number; b: number; frequency: number }> => {
    if (pixels.length === 0) return []

    const targetK = Math.min(k, Math.min(pixels.length, 256))
    const clusters: Array<{
      r: number
      g: number
      b: number
      pixels: { r: number; g: number; b: number }[]
    }> = []

    // Initialize with random pixels
    const firstIdx = Math.floor(Math.random() * pixels.length)
    clusters.push({
      r: pixels[firstIdx].r,
      g: pixels[firstIdx].g,
      b: pixels[firstIdx].b,
      pixels: [],
    })

    // k-means++ initialization
    for (let i = 1; i < targetK; i++) {
      let maxDist = 0
      let farthestIdx = 0

      for (let p = 0; p < pixels.length; p++) {
        let minDistToCluster = Infinity
        for (const cluster of clusters) {
          const dist = Math.sqrt(
            Math.pow(pixels[p].r - cluster.r, 2) +
            Math.pow(pixels[p].g - cluster.g, 2) +
            Math.pow(pixels[p].b - cluster.b, 2),
          )
          minDistToCluster = Math.min(minDistToCluster, dist)
        }
        if (minDistToCluster > maxDist) {
          maxDist = minDistToCluster
          farthestIdx = p
        }
      }

      clusters.push({
        r: pixels[farthestIdx].r,
        g: pixels[farthestIdx].g,
        b: pixels[farthestIdx].b,
        pixels: [],
      })
    }

    // K-means iterations
    for (let iter = 0; iter < 10; iter++) {
      for (const cluster of clusters) {
        cluster.pixels = []
      }

      for (const pixel of pixels) {
        let nearest = 0
        let minDist = Infinity
        for (let i = 0; i < clusters.length; i++) {
          const dist = Math.sqrt(
            Math.pow(pixel.r - clusters[i].r, 2) +
            Math.pow(pixel.g - clusters[i].g, 2) +
            Math.pow(pixel.b - clusters[i].b, 2),
          )
          if (dist < minDist) {
            minDist = dist
            nearest = i
          }
        }
        clusters[nearest].pixels.push(pixel)
      }

      let changed = false
      for (const cluster of clusters) {
        if (cluster.pixels.length > 0) {
          const newR = Math.round(cluster.pixels.reduce((sum, p) => sum + p.r, 0) / cluster.pixels.length)
          const newG = Math.round(cluster.pixels.reduce((sum, p) => sum + p.g, 0) / cluster.pixels.length)
          const newB = Math.round(cluster.pixels.reduce((sum, p) => sum + p.b, 0) / cluster.pixels.length)

          if (newR !== cluster.r || newG !== cluster.g || newB !== cluster.b) {
            changed = true
          }
          cluster.r = newR
          cluster.g = newG
          cluster.b = newB
        }
      }

      if (!changed) break
    }

    return clusters
      .filter(c => c.pixels.length > 0)
      .map(c => ({
        r: Math.max(0, Math.min(255, c.r)),
        g: Math.max(0, Math.min(255, c.g)),
        b: Math.max(0, Math.min(255, c.b)),
        frequency: c.pixels.length,
      }))
  }

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
