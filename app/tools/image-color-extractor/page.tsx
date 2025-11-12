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
          const formattedColors: ExtractedColor[] = extractedColors.map(c => {
            const hsl = rgbToHsl(c.r, c.g, c.b)
            return {
              hex: rgbToHex(c.r, c.g, c.b),
              rgb: `rgb(${c.r}, ${c.g}, ${c.b})`,
              hsl: hsl,
              hsla: hsl.replace(')', ', 1)'),
              r: c.r,
              g: c.g,
              b: c.b,
              percentage: Math.round((c.frequency / totalFreq) * 100),
            }
          })

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

  const rgbToHsl = (r: number, g: number, b: number): string => {
    r /= 255
    g /= 255
    b /= 255

    const max = Math.max(r, g, b)
    const min = Math.min(r, g, b)
    let h = 0
    let s = 0
    const l = (max + min) / 2

    if (max !== min) {
      const d = max - min
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min)

      switch (max) {
        case r:
          h = ((g - b) / d + (g < b ? 6 : 0)) / 6
          break
        case g:
          h = ((b - r) / d + 2) / 6
          break
        case b:
          h = ((r - g) / d + 4) / 6
          break
      }
    }

    return `hsl(${Math.round(h * 360)}, ${Math.round(s * 100)}%, ${Math.round(l * 100)}%)`
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
          <div className={styles.container}>
            <div className={styles.photoContainer}>
              <div className={styles.imagePreviewWrapper}>
                <img src={image} alt="Uploaded preview" className={styles.imagePreviewThumbnail} />
                <button className={styles.clearImageBtn} onClick={handleClearImage}>
                  ✕ Change Image
                </button>
              </div>
            </div>

            <div className={styles.colorsContainer}>
              <div className={styles.colorCountSelector}>
                <label htmlFor="color-count" className={styles.colorCountSelectorLabel}>Number of colors:</label>
                <select
                  id="color-count"
                  value={colorCount}
                  onChange={handleColorCountChange}
                  className={styles.colorCountDropdown}
                >
                  {Array.from({ length: 10 }, (_, i) => i + 1).map(num => (
                    <option key={num} value={num}>
                      {num} color{num !== 1 ? 's' : ''}
                    </option>
                  ))}
                </select>
              </div>

              {colors && colors.length > 0 && (
                <div className={styles.colorsGrid}>
                  {colors.map((color, index) => (
                    <button
                      key={index}
                      className={`${styles.colorSwatchButton} ${selectedColorIndex === index ? styles.selected : ''}`}
                      onClick={() => setSelectedColorIndex(index)}
                      title={`${color.hex} (${color.percentage}%)`}
                    >
                      <div
                        className={styles.colorSwatchDisplay}
                        style={{ backgroundColor: color.hex }}
                      />
                      <div className={styles.colorPercentage}>{color.percentage}%</div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className={styles.everythingElseContainer}>
              {colors && colors.length > 0 ? (
                <>
                  {selectedColor && (
                    <div className={styles.selectedColorDetails}>
                      <div className={styles.selectedColorPreview}>
                        <div
                          className={styles.selectedSwatch}
                          style={{ backgroundColor: selectedColor.hex }}
                        />
                      </div>

                      <div className={styles.colorValuesDisplay}>
                        <div className={styles.colorValueItem}>
                          <div className={styles.valueLabel}>HEX</div>
                          <div className={styles.valueContent}>
                            <code>{selectedColor.hex}</code>
                            <button
                              className={styles.miniCopyBtn}
                              onClick={() => copyColor(selectedColor.hex, selectedColorIndex, 'hex')}
                              title="Copy HEX"
                            >
                              {copiedKey === `color-${selectedColorIndex}-hex` ? 'Copied!' : 'Copy'}
                            </button>
                          </div>
                        </div>

                        <div className={styles.colorValueItem}>
                          <div className={styles.valueLabel}>RGB</div>
                          <div className={styles.valueContent}>
                            <code>{selectedColor.rgb}</code>
                            <button
                              className={styles.miniCopyBtn}
                              onClick={() => copyColor(selectedColor.rgb, selectedColorIndex, 'rgb')}
                              title="Copy RGB"
                            >
                              {copiedKey === `color-${selectedColorIndex}-rgb` ? '✓' : '📋'}
                            </button>
                          </div>
                        </div>

                        <div className={styles.colorValueItem}>
                          <div className={styles.valueLabel}>HSL</div>
                          <div className={styles.valueContent}>
                            <code>{selectedColor.hsl}</code>
                            <button
                              className={styles.miniCopyBtn}
                              onClick={() => copyColor(selectedColor.hsl, selectedColorIndex, 'hsl')}
                              title="Copy HSL"
                            >
                              {copiedKey === `color-${selectedColorIndex}-hsl` ? '✓' : '📋'}
                            </button>
                          </div>
                        </div>

                        <div className={styles.colorValueItem}>
                          <div className={styles.valueLabel}>HSLA</div>
                          <div className={styles.valueContent}>
                            <code>{selectedColor.hsla}</code>
                            <button
                              className={styles.miniCopyBtn}
                              onClick={() => copyColor(selectedColor.hsla, selectedColorIndex, 'hsla')}
                              title="Copy HSLA"
                            >
                              {copiedKey === `color-${selectedColorIndex}-hsla` ? '✓' : '📋'}
                            </button>
                          </div>
                        </div>

                        <div className={styles.colorValueItem}>
                          <div className={styles.valueLabel}>Components</div>
                          <div className={styles.rgbComponents}>
                            <div className={styles.component}>
                              <span className={styles.compLabel}>R:</span>
                              <span className={styles.compValue}>{selectedColor.r}</span>
                            </div>
                            <div className={styles.component}>
                              <span className={styles.compLabel}>G:</span>
                              <span className={styles.compValue}>{selectedColor.g}</span>
                            </div>
                            <div className={styles.component}>
                              <span className={styles.compLabel}>B:</span>
                              <span className={styles.compValue}>{selectedColor.b}</span>
                            </div>
                          </div>
                        </div>

                        <div className={styles.colorValueItem}>
                          <div className={styles.valueLabel}>Prominence</div>
                          <div className={styles.valueContent}>
                            <code>{selectedColor.percentage}%</code>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className={styles.errorMessage}>No colors could be extracted from the image</div>
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
