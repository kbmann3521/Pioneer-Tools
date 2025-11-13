'use client'

import { useState, useRef, useEffect } from 'react'
import ToolHeader from '@/app/components/ToolHeader'
import AboutToolAccordion from '@/app/components/AboutToolAccordion'
import { type ColorAlgorithm } from '@/lib/tools/image-average-color'
import { useFavorites } from '@/app/hooks/useFavorites'
import { useClipboard } from '@/app/hooks/useClipboard'
import { useApiParams } from '@/app/context/ApiParamsContext'
import { toolDescriptions } from '@/config/tool-descriptions'
import styles from './image-average-color.module.css'

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

  // Helper function: Calculate color average/dominant using specified algorithm
  const calculateColorFromPixels = (pixels: { r: number; g: number; b: number }[], algo: ColorAlgorithm) => {
    if (pixels.length === 0) {
      return { r: 127, g: 127, b: 127 }
    }

    let r = 0, g = 0, b = 0

    if (algo === 'simple') {
      // Simple: true average
      let sumR = 0, sumG = 0, sumB = 0
      for (const pixel of pixels) {
        sumR += pixel.r
        sumG += pixel.g
        sumB += pixel.b
      }
      r = Math.round(sumR / pixels.length)
      g = Math.round(sumG / pixels.length)
      b = Math.round(sumB / pixels.length)
    } else if (algo === 'square-root') {
      // Square Root: weighted with square root normalization
      let sumR = 0, sumG = 0, sumB = 0
      for (const pixel of pixels) {
        sumR += Math.sqrt(pixel.r)
        sumG += Math.sqrt(pixel.g)
        sumB += Math.sqrt(pixel.b)
      }
      r = Math.round(Math.pow(sumR / pixels.length, 2))
      g = Math.round(Math.pow(sumG / pixels.length, 2))
      b = Math.round(Math.pow(sumB / pixels.length, 2))
    } else if (algo === 'dominant') {
      // Dominant: find most frequent quantized color
      const colorMap: Record<string, number> = {}
      for (const pixel of pixels) {
        const qr = Math.round(pixel.r / 32) * 32
        const qg = Math.round(pixel.g / 32) * 32
        const qb = Math.round(pixel.b / 32) * 32
        const key = `${qr},${qg},${qb}`
        colorMap[key] = (colorMap[key] || 0) + 1
      }

      let maxCount = 0
      let dominantKey = '127,127,127'
      for (const key in colorMap) {
        if (colorMap[key] > maxCount) {
          maxCount = colorMap[key]
          dominantKey = key
        }
      }

      const parts = dominantKey.split(',')
      r = Math.round(parseInt(parts[0], 10))
      g = Math.round(parseInt(parts[1], 10))
      b = Math.round(parseInt(parts[2], 10))
    }

    return {
      r: Math.max(0, Math.min(255, r)),
      g: Math.max(0, Math.min(255, g)),
      b: Math.max(0, Math.min(255, b)),
    }
  }

  // Helper function: Convert RGB to hex
  const rgbToHex = (r: number, g: number, b: number): string => {
    const toHex = (n: number) => {
      const hex = n.toString(16)
      return hex.length === 1 ? '0' + hex : hex
    }
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase()
  }

  // Helper function: Convert RGB to HSL
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

  // Update colors when image or algorithm changes
  useEffect(() => {
    if (!image) return

    const extractColorFromCanvas = async () => {
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

          // Calculate color using selected algorithm
          const color = calculateColorFromPixels(pixels, algorithm)

          // Format output
          const hex = rgbToHex(color.r, color.g, color.b)
          const rgb = `rgb(${color.r}, ${color.g}, ${color.b})`
          const rgba = `rgba(${color.r}, ${color.g}, ${color.b}, 1)`
          const hsl = rgbToHsl(color.r, color.g, color.b)
          const hsla = hsl.replace(')', ', 1)')

          setColors({
            hex,
            rgb,
            rgba,
            hsl,
            hsla,
            r: color.r,
            g: color.g,
            b: color.b,
            algorithm,
          })

          updateParams({ imageData: image.substring(0, 100) + '...', algorithm })
        }

        imgElement.src = image
      } catch (error) {
        console.error('Color extraction error:', error)
      }
    }

    extractColorFromCanvas()
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
    e.stopPropagation()
    handleImageUpload(e.target.files?.[0] || null)
  }

  const handleFileInputClick = (e: React.MouseEvent<HTMLInputElement>) => {
    e.stopPropagation()
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
              onClick={handleFileInputClick}
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
              <img src={image} alt="Uploaded preview" className={styles.imagePreviewThumbnail} />
              <button className={styles.clearImageBtn} onClick={handleClearImage}>
                ✕ Change Image
              </button>
            </div>

            <div className={styles.colorBlockContainer}>
              <div className={styles.algorithmSelector}>
                <div
                  className={styles.colorSwatch}
                  style={{ backgroundColor: colors?.hex || '#000000' }}
                  title={colors?.rgb}
                />
                <label className={styles.algoLabel}>Algorithm:</label>
                <div className={styles.algoButtons}>
                  {(['simple', 'square-root', 'dominant'] as ColorAlgorithm[]).map(algo => (
                    <button
                      key={algo}
                      className={`${styles.algoBtn} ${algorithm === algo ? styles.active : ''}`}
                      onClick={() => setAlgorithm(algo)}
                    >
                      {algo === 'simple' ? 'Simple' : algo === 'square-root' ? 'Square Root' : 'Dominant'}
                    </button>
                  ))}
                </div>
              </div>

              {colors && !colors.error && (
                <div className={styles.colorValuesDisplay}>
                  <div className={styles.colorValueItem}>
                    <div className={styles.valueLabel}>HEX</div>
                    <div className={styles.valueContent}>
                      <code>{colors.hex}</code>
                      <button
                        className={styles.miniCopyBtn}
                        onClick={() => copyColor(colors.hex, 'hex')}
                        title="Copy HEX"
                      >
                        {copiedKey === 'hex' ? 'Copied!' : 'Copy'}
                      </button>
                    </div>
                  </div>

                  <div className={styles.colorValueItem}>
                    <div className={styles.valueLabel}>RGB</div>
                    <div className={styles.valueContent}>
                      <code>{colors.rgb}</code>
                      <button
                        className={styles.miniCopyBtn}
                        onClick={() => copyColor(colors.rgb, 'rgb')}
                        title="Copy RGB"
                      >
                        {copiedKey === 'rgb' ? 'Copied!' : 'Copy'}
                      </button>
                    </div>
                  </div>

                  <div className={styles.colorValueItem}>
                    <div className={styles.valueLabel}>HSL</div>
                    <div className={styles.valueContent}>
                      <code>{colors.hsl}</code>
                      <button
                        className={styles.miniCopyBtn}
                        onClick={() => copyColor(colors.hsl, 'hsl')}
                        title="Copy HSL"
                      >
                        {copiedKey === 'hsl' ? 'Copied!' : 'Copy'}
                      </button>
                    </div>
                  </div>

                  <div className={styles.colorValueItem}>
                    <div className={styles.valueLabel}>HSLA</div>
                    <div className={styles.valueContent}>
                      <code>{colors.hsla}</code>
                      <button
                        className={styles.miniCopyBtn}
                        onClick={() => copyColor(colors.hsla, 'hsla')}
                        title="Copy HSLA"
                      >
                        {copiedKey === 'hsla' ? 'Copied!' : 'Copy'}
                      </button>
                    </div>
                  </div>

                  <div className={styles.colorValueItem}>
                    <div className={styles.valueLabel}>Components</div>
                    <div className={styles.rgbComponents}>
                      <div className={styles.component}>
                        <span className={styles.compLabel}>R:</span>
                        <span className={styles.compValue}>{colors.r}</span>
                      </div>
                      <div className={styles.component}>
                        <span className={styles.compLabel}>G:</span>
                        <span className={styles.compValue}>{colors.g}</span>
                      </div>
                      <div className={styles.component}>
                        <span className={styles.compLabel}>B:</span>
                        <span className={styles.compValue}>{colors.b}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {colors?.error && <div className={styles.errorMessage}>{colors.error}</div>}
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
