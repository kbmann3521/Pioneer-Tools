'use client'

import { useState, useRef, useEffect } from 'react'
import ToolHeader from '@/app/components/ToolHeader'
import AboutToolAccordion from '@/app/components/AboutToolAccordion'
import { useFavorites } from '@/app/hooks/useFavorites'
import { useApiParams } from '@/app/context/ApiParamsContext'
import { toolDescriptions } from '@/config/tool-descriptions'
import styles from './photo-censor.module.css'

interface CensorBox {
  x: number
  y: number
  width: number
  height: number
}

export default function PhotoCensorPage(): JSX.Element {
  const { updateParams } = useApiParams()
  const { isSaved, toggleSave } = useFavorites('photo-censor')

  const [image, setImage] = useState<string | null>(null)
  const [originalImage, setOriginalImage] = useState<HTMLImageElement | null>(null)
  const [censorType, setCensorType] = useState<'pixelate' | 'blur' | 'blackbar'>('pixelate')
  const [intensity, setIntensity] = useState(5)
  const [dragActive, setDragActive] = useState(false)
  const [censorBox, setCensorBox] = useState<CensorBox>({ x: 50, y: 50, width: 100, height: 100 })
  const [isDragging, setIsDragging] = useState<string | null>(null)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })

  const fileInputRef = useRef<HTMLInputElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Update API params
  useEffect(() => {
    updateParams({
      censorType,
      intensity,
      boxWidth: censorBox.width,
      boxHeight: censorBox.height,
    })
  }, [censorType, intensity, censorBox, updateParams])

  // Redraw canvas when censor box changes
  useEffect(() => {
    if (!canvasRef.current || !originalImage) return
    redrawCanvas()
  }, [censorBox, originalImage])

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
        setOriginalImage(img)
        setImage(dataUrl)
        if (canvasRef.current) {
          canvasRef.current.width = img.width
          canvasRef.current.height = img.height
          redrawCanvas()
        }
        setCensorBox({ x: 50, y: 50, width: 100, height: 100 })
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
    setOriginalImage(null)
    setCensorBox({ x: 50, y: 50, width: 100, height: 100 })
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const redrawCanvas = () => {
    if (!canvasRef.current || !originalImage) return

    const ctx = canvasRef.current.getContext('2d')
    if (!ctx) return

    ctx.drawImage(originalImage, 0, 0)

    // Draw censor box preview
    ctx.strokeStyle = 'rgba(74, 158, 255, 0.8)'
    ctx.lineWidth = 2
    ctx.strokeRect(censorBox.x, censorBox.y, censorBox.width, censorBox.height)
    ctx.fillStyle = 'rgba(74, 158, 255, 0.1)'
    ctx.fillRect(censorBox.x, censorBox.y, censorBox.width, censorBox.height)

    // Draw corner handles
    const handleSize = 8
    const corners = [
      { x: censorBox.x, y: censorBox.y },
      { x: censorBox.x + censorBox.width, y: censorBox.y },
      { x: censorBox.x, y: censorBox.y + censorBox.height },
      { x: censorBox.x + censorBox.width, y: censorBox.y + censorBox.height },
    ]

    corners.forEach(corner => {
      ctx.fillStyle = '#4a9eff'
      ctx.fillRect(corner.x - handleSize / 2, corner.y - handleSize / 2, handleSize, handleSize)
      ctx.strokeStyle = 'white'
      ctx.lineWidth = 1
      ctx.strokeRect(corner.x - handleSize / 2, corner.y - handleSize / 2, handleSize, handleSize)
    })
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

  const getHandleAtPoint = (x: number, y: number): string | null => {
    const handleThreshold = 12
    const { x: cx, y: cy, width: w, height: h } = censorBox

    if (Math.abs(x - cx) < handleThreshold && Math.abs(y - cy) < handleThreshold) return 'tl'
    if (Math.abs(x - (cx + w)) < handleThreshold && Math.abs(y - cy) < handleThreshold) return 'tr'
    if (Math.abs(x - cx) < handleThreshold && Math.abs(y - (cy + h)) < handleThreshold) return 'bl'
    if (Math.abs(x - (cx + w)) < handleThreshold && Math.abs(y - (cy + h)) < handleThreshold) return 'br'

    if (x > cx && x < cx + w && y > cy && y < cy + h) return 'move'
    return null
  }

  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const coords = getCanvasCoordinates(e.clientX, e.clientY)
    const handle = getHandleAtPoint(coords.x, coords.y)

    if (handle) {
      setIsDragging(handle)
      setDragOffset({
        x: coords.x - censorBox.x,
        y: coords.y - censorBox.y,
      })
    }
  }

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging || !originalImage) return

    const coords = getCanvasCoordinates(e.clientX, e.clientY)
    const minSize = 20

    if (isDragging === 'move') {
      setCensorBox(prev => ({
        ...prev,
        x: Math.max(0, Math.min(coords.x - dragOffset.x, originalImage.width - prev.width)),
        y: Math.max(0, Math.min(coords.y - dragOffset.y, originalImage.height - prev.height)),
      }))
    } else if (isDragging === 'tl') {
      const newX = Math.max(0, coords.x)
      const newY = Math.max(0, coords.y)
      setCensorBox(prev => ({
        x: newX,
        y: newY,
        width: Math.max(minSize, prev.x + prev.width - newX),
        height: Math.max(minSize, prev.y + prev.height - newY),
      }))
    } else if (isDragging === 'tr') {
      const newY = Math.max(0, coords.y)
      setCensorBox(prev => ({
        ...prev,
        y: newY,
        width: Math.max(minSize, coords.x - prev.x),
        height: Math.max(minSize, prev.y + prev.height - newY),
      }))
    } else if (isDragging === 'bl') {
      const newX = Math.max(0, coords.x)
      setCensorBox(prev => ({
        x: newX,
        y: prev.y,
        width: Math.max(minSize, prev.x + prev.width - newX),
        height: Math.max(minSize, coords.y - prev.y),
      }))
    } else if (isDragging === 'br') {
      setCensorBox(prev => ({
        ...prev,
        width: Math.max(minSize, coords.x - prev.x),
        height: Math.max(minSize, coords.y - prev.y),
      }))
    }
  }

  const handleCanvasMouseUp = () => {
    setIsDragging(null)
  }

  const updateCursor = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const coords = getCanvasCoordinates(e.clientX, e.clientY)
    const handle = getHandleAtPoint(coords.x, coords.y)

    if (!canvasRef.current) return

    const cursorMap: Record<string, string> = {
      tl: 'nwse-resize',
      tr: 'nesw-resize',
      bl: 'nesw-resize',
      br: 'nwse-resize',
      move: 'grab',
    }

    canvasRef.current.style.cursor = handle ? cursorMap[handle] : 'crosshair'
  }

  const downloadCensoredImage = async () => {
    if (!originalImage) return

    const canvas = document.createElement('canvas')
    canvas.width = originalImage.width
    canvas.height = originalImage.height
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.drawImage(originalImage, 0, 0)

    // Apply censoring effect
    const imageData = ctx.getImageData(censorBox.x, censorBox.y, censorBox.width, censorBox.height)
    const data = imageData.data

    if (censorType === 'pixelate') {
      const pixelSize = Math.ceil(intensity * 1.5)
      for (let i = 0; i < censorBox.height; i += pixelSize) {
        for (let j = 0; j < censorBox.width; j += pixelSize) {
          const pixelData = ctx.getImageData(
            censorBox.x + j,
            censorBox.y + i,
            Math.min(pixelSize, censorBox.width - j),
            Math.min(pixelSize, censorBox.height - i),
          )

          let r = 0,
            g = 0,
            b = 0,
            count = 0
          for (let k = 0; k < pixelData.data.length; k += 4) {
            r += pixelData.data[k]
            g += pixelData.data[k + 1]
            b += pixelData.data[k + 2]
            count++
          }

          r = Math.round(r / count)
          g = Math.round(g / count)
          b = Math.round(b / count)

          for (let k = 0; k < pixelData.data.length; k += 4) {
            pixelData.data[k] = r
            pixelData.data[k + 1] = g
            pixelData.data[k + 2] = b
          }

          ctx.putImageData(pixelData, censorBox.x + j, censorBox.y + i)
        }
      }
    } else if (censorType === 'blur') {
      const blurRadius = intensity
      for (let i = 0; i < blurRadius; i++) {
        const tempCanvas = document.createElement('canvas')
        tempCanvas.width = canvas.width
        tempCanvas.height = canvas.height
        const tempCtx = tempCanvas.getContext('2d')
        if (!tempCtx) return

        tempCtx.drawImage(canvas, 0, 0)
        ctx.filter = `blur(${blurRadius}px)`
        ctx.drawImage(tempCanvas, 0, 0)
      }
      ctx.filter = 'none'
    } else if (censorType === 'blackbar') {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.95)'
      ctx.fillRect(censorBox.x, censorBox.y, censorBox.width, censorBox.height)
    }

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
            <div className={styles.editorWrapper}>
              <div className={styles.canvasContainer} ref={containerRef}>
                <div className={styles.canvasWrapper}>
                  <canvas
                    ref={canvasRef}
                    className={styles.canvas}
                    onMouseDown={handleCanvasMouseDown}
                    onMouseMove={(e) => {
                      handleCanvasMouseMove(e)
                      updateCursor(e)
                    }}
                    onMouseUp={handleCanvasMouseUp}
                    onMouseLeave={handleCanvasMouseUp}
                  />
                </div>
                <div className={styles.boxInfo}>
                  Position: ({censorBox.x}, {censorBox.y}) | Size: {censorBox.width} × {censorBox.height}
                </div>
              </div>

              <div className={styles.controlPanel}>
                <div className={styles.section}>
                  <label className={styles.sectionLabel}>Censor Type:</label>
                  <div className={styles.buttonGroup}>
                    {(['pixelate', 'blur', 'blackbar'] as const).map(type => (
                      <button
                        key={type}
                        className={`${styles.typeButton} ${censorType === type ? styles.active : ''}`}
                        onClick={() => setCensorType(type)}
                      >
                        {type.charAt(0).toUpperCase() + type.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>

                <div className={styles.section}>
                  <div className={styles.intensityLabel}>
                    <span>Intensity: {intensity}</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={intensity}
                    onChange={e => setIntensity(Number(e.target.value))}
                    className={styles.slider}
                  />
                </div>

                <div className={styles.section}>
                  <button
                    className={styles.downloadButton}
                    onClick={downloadCensoredImage}
                  >
                    Download Censored Image
                  </button>
                  <button
                    className={styles.changeButton}
                    onClick={handleClearImage}
                  >
                    Change Image
                  </button>
                </div>

                <div className={styles.instructionsBox}>
                  <strong>How to use:</strong>
                  <ul>
                    <li>Select censor type above</li>
                    <li>Drag the box to move it</li>
                    <li>Drag corners to resize</li>
                    <li>Adjust intensity slider</li>
                    <li>Download to apply effect</li>
                  </ul>
                </div>
              </div>
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
