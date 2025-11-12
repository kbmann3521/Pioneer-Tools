'use client'

import { useState, useRef, useEffect } from 'react'
import ToolHeader from '@/app/components/ToolHeader'
import AboutToolAccordion from '@/app/components/AboutToolAccordion'
import { useFavorites } from '@/app/hooks/useFavorites'
import { useApiParams } from '@/app/context/ApiParamsContext'
import { toolDescriptions } from '@/config/tool-descriptions'
import type { CensorRegion } from '@/lib/tools/photo-censor'
import styles from './photo-censor.module.css'

interface CanvasRegion extends CensorRegion {
  id: string
}

export default function PhotoCensorPage(): JSX.Element {
  const { updateParams } = useApiParams()
  const { isSaved, toggleSave } = useFavorites('photo-censor')
  
  const [image, setImage] = useState<string | null>(null)
  const [imageWidth, setImageWidth] = useState(0)
  const [imageHeight, setImageHeight] = useState(0)
  const [censorType, setCensorType] = useState<'pixelate' | 'blur' | 'blackbar'>('pixelate')
  const [intensity, setIntensity] = useState(5)
  const [regions, setRegions] = useState<CanvasRegion[]>([])
  const [dragActive, setDragActive] = useState(false)
  const [isDrawing, setIsDrawing] = useState(false)
  const [startX, setStartX] = useState(0)
  const [startY, setStartY] = useState(0)
  const [mouseX, setMouseX] = useState(0)
  const [mouseY, setMouseY] = useState(0)
  const [previewCanvas, setPreviewCanvas] = useState<HTMLCanvasElement | null>(null)
  
  const fileInputRef = useRef<HTMLInputElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Update API params whenever settings change
  useEffect(() => {
    updateParams({
      censorType,
      intensity,
      regionsCount: regions.length,
      imageWidth,
      imageHeight,
    })
  }, [censorType, intensity, regions.length, imageWidth, imageHeight, updateParams])

  // Redraw canvas when regions change
  useEffect(() => {
    if (!canvasRef.current || !image) return
    redrawCanvas()
  }, [regions, image])

  const handleImageUpload = (file: File | null) => {
    if (!file) return

    if (file.size > 5000000) {
      alert('Image size exceeds 5MB limit')
      return
    }

    const reader = new FileReader()
    reader.onload = event => {
      const dataUrl = event.target?.result as string
      const img = new Image()
      img.onload = () => {
        setImage(dataUrl)
        setImageWidth(img.width)
        setImageHeight(img.height)
        setRegions([])

        // Set canvas size
        if (canvasRef.current) {
          canvasRef.current.width = img.width
          canvasRef.current.height = img.height
          const ctx = canvasRef.current.getContext('2d')
          if (ctx) {
            ctx.drawImage(img, 0, 0)
            setPreviewCanvas(canvasRef.current.cloneNode(true) as HTMLCanvasElement)
          }
        }
      }
      img.src = dataUrl
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
    setImageWidth(0)
    setImageHeight(0)
    setRegions([])
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const getCanvasCoordinates = (clientX: number, clientY: number) => {
    if (!canvasRef.current) return { x: 0, y: 0 }
    const rect = canvasRef.current.getBoundingClientRect()
    const scaleX = canvasRef.current.width / rect.width
    const scaleY = canvasRef.current.height / rect.height
    return {
      x: Math.round((clientX - rect.left) * scaleX),
      y: Math.round((clientY - rect.top) * scaleY),
    }
  }

  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const coords = getCanvasCoordinates(e.clientX, e.clientY)
    setStartX(coords.x)
    setStartY(coords.y)
    setMouseX(coords.x)
    setMouseY(coords.y)
    setIsDrawing(true)
  }

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const coords = getCanvasCoordinates(e.clientX, e.clientY)
    setMouseX(coords.x)
    setMouseY(coords.y)

    if (!isDrawing || !canvasRef.current || !image) return

    // Draw preview
    const ctx = canvasRef.current.getContext('2d')
    if (!ctx) return

    // Redraw original image
    const img = new Image()
    img.onload = () => {
      ctx.drawImage(img, 0, 0)

      // Draw existing regions
      drawRegions(ctx, regions)

      // Draw preview rectangle
      const width = coords.x - startX
      const height = coords.y - startY
      ctx.strokeStyle = 'rgba(74, 158, 255, 0.8)'
      ctx.lineWidth = 2
      ctx.strokeRect(startX, startY, width, height)
      ctx.fillStyle = 'rgba(74, 158, 255, 0.1)'
      ctx.fillRect(startX, startY, width, height)
    }
    img.src = image
  }

  const handleCanvasMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) {
      setIsDrawing(false)
      return
    }

    setIsDrawing(false)

    const width = mouseX - startX
    const height = mouseY - startY

    if (Math.abs(width) < 5 || Math.abs(height) < 5) {
      redrawCanvas()
      return
    }

    const newRegion: CanvasRegion = {
      id: `region-${Date.now()}`,
      x: Math.min(startX, mouseX),
      y: Math.min(startY, mouseY),
      width: Math.abs(width),
      height: Math.abs(height),
      type: censorType,
      intensity,
    }

    setRegions([...regions, newRegion])
  }

  const drawRegions = (ctx: CanvasRenderingContext2D, regionsToDrawFeedback: CanvasRegion[]) => {
    regionsToDrawFeedback.forEach(region => {
      ctx.strokeStyle = 'rgba(74, 158, 255, 0.6)'
      ctx.lineWidth = 2
      ctx.strokeRect(region.x, region.y, region.width, region.height)

      if (region.type === 'pixelate') {
        ctx.fillStyle = 'rgba(74, 158, 255, 0.15)'
        ctx.fillRect(region.x, region.y, region.width, region.height)
        ctx.fillStyle = 'rgba(74, 158, 255, 0.3)'
        const pixelSize = Math.max(2, Math.ceil(region.width / 15))
        for (let i = 0; i < 5; i++) {
          const y = region.y + (i * region.height) / 5
          ctx.fillRect(region.x, y, pixelSize * 2, pixelSize)
        }
      } else if (region.type === 'blur') {
        ctx.fillStyle = 'rgba(100, 150, 255, 0.1)'
        ctx.fillRect(region.x, region.y, region.width, region.height)
      } else if (region.type === 'blackbar') {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)'
        ctx.fillRect(region.x, region.y, region.width, region.height)
      }
    })
  }

  const redrawCanvas = () => {
    if (!canvasRef.current || !image) return

    const img = new Image()
    img.onload = () => {
      const ctx = canvasRef.current?.getContext('2d')
      if (!ctx) return

      ctx.drawImage(img, 0, 0)
      drawRegions(ctx, regions)
    }
    img.src = image
  }

  const downloadCensoredImage = async () => {
    if (!canvasRef.current || regions.length === 0) {
      alert('Please add at least one censor region')
      return
    }

    const canvas = document.createElement('canvas')
    canvas.width = imageWidth
    canvas.height = imageHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const img = new Image()
    img.onload = () => {
      ctx.drawImage(img, 0, 0)

      // Apply censoring effects
      regions.forEach(region => {
        const imageData = ctx.getImageData(region.x, region.y, region.width, region.height)
        const data = imageData.data

        if (region.type === 'pixelate') {
          const pixelSize = Math.ceil(region.intensity || 5)
          for (let i = 0; i < region.height; i += pixelSize) {
            for (let j = 0; j < region.width; j += pixelSize) {
              const pixelImageData = ctx.getImageData(
                region.x + j,
                region.y + i,
                Math.min(pixelSize, region.width - j),
                Math.min(pixelSize, region.height - i),
              )

              let r = 0, g = 0, b = 0, count = 0
              for (let k = 0; k < pixelImageData.data.length; k += 4) {
                r += pixelImageData.data[k]
                g += pixelImageData.data[k + 1]
                b += pixelImageData.data[k + 2]
                count++
              }

              r = Math.round(r / count)
              g = Math.round(g / count)
              b = Math.round(b / count)

              for (let k = 0; k < pixelImageData.data.length; k += 4) {
                pixelImageData.data[k] = r
                pixelImageData.data[k + 1] = g
                pixelImageData.data[k + 2] = b
              }

              ctx.putImageData(pixelImageData, region.x + j, region.y + i)
            }
          }
        } else if (region.type === 'blur') {
          const blurRadius = Math.ceil((region.intensity || 5) * 0.8)
          for (let i = 0; i < data.length; i += 4) {
            const avgOffset = Math.floor(Math.random() * blurRadius)
            const offset = i + avgOffset * 4
            if (offset < data.length) {
              data[i] = (data[i] + data[offset]) / 2
              data[i + 1] = (data[i + 1] + data[offset + 1]) / 2
              data[i + 2] = (data[i + 2] + data[offset + 2]) / 2
            }
          }
          ctx.putImageData(imageData, region.x, region.y)
        } else if (region.type === 'blackbar') {
          ctx.fillStyle = 'rgba(0, 0, 0, 0.95)'
          ctx.fillRect(region.x, region.y, region.width, region.height)
        }
      })

      // Download
      canvas.toBlob(blob => {
        if (!blob) return
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `censored-image-${Date.now()}.png`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
      }, 'image/png')
    }
    img.src = image
  }

  const removeRegion = (id: string) => {
    setRegions(regions.filter(r => r.id !== id))
  }

  return (
    <div className="tool-container">
      <ToolHeader
        title="Photo Censor"
        description="Hide sensitive information in images with pixelation, blur, or black bars"
        isSaved={isSaved}
        onToggleSave={toggleSave}
        toolId="photo-censor"
      />

      <div className="tool-content">
        {!image ? (
          <div className={styles.uploadSection}>
            <label htmlFor="image-upload" className={styles.uploadLabel}>
              Upload an image:
            </label>
            <div
              className={`${styles.fileInputWrapper} ${dragActive ? styles.dragActive : ''}`}
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
                className={styles.fileInput}
              />
              <label htmlFor="image-upload" className={styles.fileInputLabel}>
                Choose Image or Drag & Drop
              </label>
            </div>
          </div>
        ) : (
          <div className={styles.container}>
            <div className={styles.imageEditorSection}>
              <div className={styles.canvasContainer}>
                <div className={styles.canvasWrapper}>
                  <canvas
                    ref={canvasRef}
                    className={styles.canvas}
                    onMouseDown={handleCanvasMouseDown}
                    onMouseMove={handleCanvasMouseMove}
                    onMouseUp={handleCanvasMouseUp}
                    onMouseLeave={handleCanvasMouseUp}
                  />
                </div>
                <div className={styles.coordinatesInfo}>
                  <div className={styles.coordinateItem}>
                    <strong>Start:</strong> ({startX}, {startY})
                  </div>
                  <div className={styles.coordinateItem}>
                    <strong>Current:</strong> ({mouseX}, {mouseY})
                  </div>
                  <div className={styles.coordinateItem}>
                    <strong>Size:</strong> {Math.abs(mouseX - startX)} × {Math.abs(mouseY - startY)}
                  </div>
                </div>
              </div>

              <div className={styles.controlsSection}>
                <div className={styles.censorTypeSection}>
                  <label className={styles.sectionLabel}>Censor Type:</label>
                  <div className={styles.typeButtonGroup}>
                    {(['pixelate', 'blur', 'blackbar'] as const).map(type => (
                      <button
                        key={type}
                        className={`${styles.typeButton} ${censorType === type ? styles.active : ''}`}
                        onClick={() => setCensorType(type)}
                        title={`Apply ${type} effect`}
                      >
                        {type.charAt(0).toUpperCase() + type.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>

                <div className={styles.intensitySection}>
                  <div className={styles.intensityLabel}>
                    <span>Intensity:</span>
                    <span>{intensity}</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={intensity}
                    onChange={e => setIntensity(Number(e.target.value))}
                    className={styles.intensitySlider}
                    title="Adjust intensity of the effect"
                  />
                </div>

                <div className={styles.regionsSection}>
                  <label className={styles.sectionLabel}>
                    Regions ({regions.length})
                  </label>
                  {regions.length > 0 ? (
                    <div className={styles.regionsList}>
                      {regions.map((region, index) => (
                        <div key={region.id} className={styles.regionItem}>
                          <div className={styles.regionInfo}>
                            <div className={styles.regionType}>{region.type}</div>
                            <div>
                              Position: ({region.x}, {region.y})
                              <br />
                              Size: {region.width} × {region.height}
                            </div>
                          </div>
                          <button
                            className={styles.regionRemoveBtn}
                            onClick={() => removeRegion(region.id)}
                            title={`Remove region ${index + 1}`}
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className={styles.noRegions}>
                      No regions yet. Click and drag on the image to add one.
                    </div>
                  )}
                </div>

                <div className={styles.buttonsGroup}>
                  <button
                    className={styles.buttonPrimary}
                    onClick={downloadCensoredImage}
                    disabled={regions.length === 0}
                    title={regions.length === 0 ? 'Add a region first' : 'Download censored image'}
                  >
                    Download Censored Image
                  </button>
                  <button
                    className={styles.buttonSecondary}
                    onClick={() => setRegions([])}
                    disabled={regions.length === 0}
                    title="Clear all regions"
                  >
                    Clear All Regions
                  </button>
                  <button
                    className={styles.buttonSecondary}
                    onClick={handleClearImage}
                    title="Upload a different image"
                  >
                    Change Image
                  </button>
                </div>
              </div>
            </div>

            <div className={styles.instructionsSection}>
              <div className={styles.instructionsTitle}>How to use:</div>
              <ul className={styles.instructionsList}>
                <li>
                  <strong>1. Choose Censor Type:</strong> Select between Pixelate, Blur, or Black Bar effect
                </li>
                <li>
                  <strong>2. Adjust Intensity:</strong> Use the slider to control the intensity of the effect (1-10)
                </li>
                <li>
                  <strong>3. Select Area:</strong> Click and drag on the image to select regions to censor
                </li>
                <li>
                  <strong>4. Multiple Regions:</strong> Add as many regions as needed - use different types for each
                </li>
                <li>
                  <strong>5. Download:</strong> Click Download to get your censored image
                </li>
              </ul>
            </div>
          </div>
        )}
      </div>

      <AboutToolAccordion
        toolId="photo-censor"
        content={toolDescriptions['photo-censor']}
      />
    </div>
  )
}
