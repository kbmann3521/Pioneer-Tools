'use client'

import { useState, useRef, useEffect } from 'react'
import ToolHeader from '@/app/components/ToolHeader'
import AboutToolAccordion from '@/app/components/AboutToolAccordion'
import { useFavorites } from '@/app/hooks/useFavorites'
import { useApiParams } from '@/app/context/ApiParamsContext'
import { useAuth } from '@/app/context/AuthContext'
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
  const { session } = useAuth()

  const [image, setImage] = useState<string | null>(null)
  const [originalImageData, setOriginalImageData] = useState<string | null>(null)
  const [originalImage, setOriginalImage] = useState<HTMLImageElement | null>(null)
  const [censorType, setCensorType] = useState<'pixelate' | 'blur' | 'blackbar'>('pixelate')
  const [intensity, setIntensity] = useState(5)
  const [dragActive, setDragActive] = useState(false)
  const [censorBox, setCensorBox] = useState<CensorBox>({ x: 50, y: 50, width: 100, height: 100 })
  const [isDragging, setIsDragging] = useState<string | null>(null)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [isCensored, setIsCensored] = useState(false)
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 })

  const fileInputRef = useRef<HTMLInputElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const imgRef = useRef<HTMLImageElement>(null)
  const dragUpdateRef = useRef<number | null>(null)
  const pendingCoordRef = useRef<{ clientX: number; clientY: number } | null>(null)

  // Update API params - only when image is loaded
  useEffect(() => {
    // Only update params if an image is loaded
    if (!image) {
      updateParams({})
      return
    }

    const params = {
      imageData: image,
      censorType,
      intensity,
      regions: [
        {
          x: censorBox.x,
          y: censorBox.y,
          width: censorBox.width,
          height: censorBox.height,
          type: censorType,
          intensity,
        },
      ],
    }
    updateParams(params)
  }, [censorType, intensity, censorBox, image, updateParams])

  // Redraw overlay canvas when censor box changes
  useEffect(() => {
    redrawOverlay()
  }, [censorBox, isCensored, imageDimensions])

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
        setOriginalImageData(dataUrl)
        setImage(dataUrl)
        setIsCensored(false)
        setImageDimensions({ width: img.width, height: img.height })

        setCensorBox({
          x: Math.floor(img.width * 0.2),
          y: Math.floor(img.height * 0.2),
          width: Math.floor(img.width * 0.4),
          height: Math.floor(img.height * 0.4),
        })
      }
      img.src = dataUrl
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
    setOriginalImage(null)
    setIsCensored(false)
    setCensorBox({ x: 50, y: 50, width: 100, height: 100 })
    setImageDimensions({ width: 0, height: 0 })
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const redrawOverlay = () => {
    if (!canvasRef.current || !imgRef.current || imageDimensions.width === 0) return

    const canvas = canvasRef.current
    const img = imgRef.current

    // Set canvas pixel dimensions to actual image dimensions
    canvas.width = imageDimensions.width
    canvas.height = imageDimensions.height

    // Set canvas display size to match the img element's displayed size
    const imgRect = img.getBoundingClientRect()
    const parentRect = canvas.parentElement?.getBoundingClientRect()
    if (!parentRect) return

    const displayWidth = img.offsetWidth || imgRect.width
    const displayHeight = img.offsetHeight || imgRect.height

    canvas.style.width = displayWidth + 'px'
    canvas.style.height = displayHeight + 'px'

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Detect if mobile device for responsive handle sizing
    const isMobile = window.innerWidth < 768
    const handleSize = isMobile ? 20 : 12

    if (isCensored) {
      // Draw semi-transparent overlay showing what was censored
      ctx.fillStyle = 'rgba(0, 0, 0, 0.3)'
      ctx.fillRect(censorBox.x, censorBox.y, censorBox.width, censorBox.height)
      ctx.strokeStyle = 'rgba(74, 158, 255, 0.8)'
      ctx.lineWidth = 2
      ctx.strokeRect(censorBox.x, censorBox.y, censorBox.width, censorBox.height)
    } else {
      // Draw selection box preview with increased opacity for better visibility
      ctx.strokeStyle = 'rgba(74, 158, 255, 0.9)'
      ctx.lineWidth = 2
      ctx.strokeRect(censorBox.x, censorBox.y, censorBox.width, censorBox.height)
      ctx.fillStyle = 'rgba(74, 158, 255, 0.25)'
      ctx.fillRect(censorBox.x, censorBox.y, censorBox.width, censorBox.height)

      // Draw corner handles
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
  }

  const getCanvasCoordinates = (clientX: number, clientY: number) => {
    if (!imgRef.current || !canvasRef.current) return { x: 0, y: 0 }

    const rect = imgRef.current.getBoundingClientRect()
    const imgWidth = rect.width
    const imgHeight = rect.height

    // Calculate scale factors from displayed size to actual image dimensions
    const scaleX = imageDimensions.width / imgWidth
    const scaleY = imageDimensions.height / imgHeight

    return {
      x: Math.round((clientX - rect.left) * scaleX),
      y: Math.round((clientY - rect.top) * scaleY),
    }
  }

  const getHandleAtPoint = (x: number, y: number): string | null => {
    if (isCensored) return null

    const isMobile = window.innerWidth < 768
    const handleThreshold = isMobile ? 15 : 12
    const { x: cx, y: cy, width: w, height: h } = censorBox

    if (Math.abs(x - cx) < handleThreshold && Math.abs(y - cy) < handleThreshold) return 'tl'
    if (Math.abs(x - (cx + w)) < handleThreshold && Math.abs(y - cy) < handleThreshold) return 'tr'
    if (Math.abs(x - cx) < handleThreshold && Math.abs(y - (cy + h)) < handleThreshold) return 'bl'
    if (Math.abs(x - (cx + w)) < handleThreshold && Math.abs(y - (cy + h)) < handleThreshold) return 'br'

    if (x > cx && x < cx + w && y > cy && y < cy + h) return 'move'
    return null
  }

  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isCensored) return

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

  const handleCanvasTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (isCensored || !e.touches[0]) return

    const touch = e.touches[0]
    const coords = getCanvasCoordinates(touch.clientX, touch.clientY)
    const handle = getHandleAtPoint(coords.x, coords.y)

    if (handle) {
      setIsDragging(handle)
      setDragOffset({
        x: coords.x - censorBox.x,
        y: coords.y - censorBox.y,
      })
      e.preventDefault()
    }
  }

  const performDragUpdate = (clientX: number, clientY: number) => {
    if (!isDragging) return

    // Store the latest coordinates
    pendingCoordRef.current = { clientX, clientY }

    // Schedule an update on the next animation frame if not already scheduled
    if (!dragUpdateRef.current) {
      dragUpdateRef.current = requestAnimationFrame(() => {
        if (!pendingCoordRef.current || !isDragging) {
          dragUpdateRef.current = null
          return
        }

        const { clientX: x, clientY: y } = pendingCoordRef.current
        const coords = getCanvasCoordinates(x, y)
        const minSize = 20

        if (isDragging === 'move') {
          setCensorBox(prev => ({
            ...prev,
            x: Math.max(0, Math.min(coords.x - dragOffset.x, imageDimensions.width - prev.width)),
            y: Math.max(0, Math.min(coords.y - dragOffset.y, imageDimensions.height - prev.height)),
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
        dragUpdateRef.current = null
      })
    }
  }

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    performDragUpdate(e.clientX, e.clientY)
  }

  const handleCanvasTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDragging || !e.touches[0]) return
    const touch = e.touches[0]
    performDragUpdate(touch.clientX, touch.clientY)
    e.preventDefault()
  }

  const handleCanvasMouseUp = () => {
    if (dragUpdateRef.current) {
      clearTimeout(dragUpdateRef.current)
      dragUpdateRef.current = null
    }
    setIsDragging(null)
  }

  const handleCanvasTouchEnd = () => {
    if (dragUpdateRef.current) {
      clearTimeout(dragUpdateRef.current)
      dragUpdateRef.current = null
    }
    setIsDragging(null)
  }

  const updateCursor = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isCensored || !canvasRef.current) {
      canvasRef.current!.style.cursor = 'default'
      return
    }

    const coords = getCanvasCoordinates(e.clientX, e.clientY)
    const handle = getHandleAtPoint(coords.x, coords.y)

    const cursorMap: Record<string, string> = {
      tl: 'nwse-resize',
      tr: 'nesw-resize',
      bl: 'nesw-resize',
      br: 'nwse-resize',
      move: 'grab',
    }

    canvasRef.current.style.cursor = handle ? cursorMap[handle] : 'crosshair'
  }

  const handleCensorClick = async () => {
    if (!originalImage || !image) return

    // Create a temporary canvas for processing
    const tempCanvas = document.createElement('canvas')
    tempCanvas.width = originalImage.width
    tempCanvas.height = originalImage.height
    const ctx = tempCanvas.getContext('2d')
    if (!ctx) return

    ctx.drawImage(originalImage, 0, 0)

    // Apply censoring effect
    if (censorType === 'pixelate') {
      const pixelSize = Math.max(2, Math.ceil(intensity * 1.5))
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
      const blurAmount = Math.max(3, Math.ceil(intensity * 2))
      // Create a separate canvas for the censored region
      const regionCanvas = document.createElement('canvas')
      regionCanvas.width = censorBox.width
      regionCanvas.height = censorBox.height
      const regionCtx = regionCanvas.getContext('2d')
      if (regionCtx) {
        // Copy the region to blur
        regionCtx.drawImage(
          tempCanvas,
          censorBox.x, censorBox.y, censorBox.width, censorBox.height,
          0, 0, censorBox.width, censorBox.height
        )
        // Apply filter - test if supported
        try {
          regionCtx.filter = `blur(${blurAmount}px)`
          regionCtx.drawImage(regionCanvas, 0, 0)
          regionCtx.filter = 'none'
        } catch (e) {
          // Fallback: use pixelate if blur filter not supported (some mobile browsers)
          const pixelSize = Math.max(2, Math.ceil(intensity * 1.5))
          for (let i = 0; i < censorBox.height; i += pixelSize) {
            for (let j = 0; j < censorBox.width; j += pixelSize) {
              const pixelData = regionCtx.getImageData(
                j, i,
                Math.min(pixelSize, censorBox.width - j),
                Math.min(pixelSize, censorBox.height - i),
              )
              let r = 0, g = 0, b = 0, count = 0
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
              regionCtx.putImageData(pixelData, j, i)
            }
          }
        }
        // Draw the processed region back
        ctx.drawImage(regionCanvas, censorBox.x, censorBox.y)
      }
    } else if (censorType === 'blackbar') {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.95)'
      ctx.fillRect(censorBox.x, censorBox.y, censorBox.width, censorBox.height)
    }

    // Convert to data URL and update image
    const censoredDataUrl = tempCanvas.toDataURL('image/png')
    setImage(censoredDataUrl)
    setIsCensored(true)
  }

  const downloadCensoredImage = async () => {
    if (!image || !isCensored) return

    if (!session?.access_token) {
      alert('Please log in to download censored images')
      return
    }

    try {
      // Get the censored image canvas and convert to base64
      const canvas = document.createElement('canvas')
      const img = new Image()

      img.onload = async () => {
        canvas.width = img.width
        canvas.height = img.height
        const ctx = canvas.getContext('2d')
        if (!ctx) return

        ctx.drawImage(img, 0, 0)
        const base64 = canvas.toDataURL('image/png')

        // Send to API to process and get signed URL
        const response = await fetch('/api/tools/photo-censor', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            imageData: base64,
            regions: [censorBox],
          }),
        })

        const data = await response.json()

        if (response.ok && data.data?.censoredImageUrl) {
          // Download from signed URL
          const a = document.createElement('a')
          a.href = data.data.censoredImageUrl
          a.download = `censored-image-${Date.now()}.png`
          document.body.appendChild(a)
          a.click()
          document.body.removeChild(a)
        } else {
          alert('Failed to download censored image: ' + (data.error?.message || 'Unknown error'))
        }
      }

      img.src = image
    } catch (error) {
      console.error('Download error:', error)
      alert('Error downloading image')
    }
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
                onClick={handleFileInputClick}
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
              <div className={styles.canvasContainer}>
                <div className={styles.imageWrapper}>
                  <img
                    ref={imgRef}
                    src={image}
                    alt="Image to censor"
                    className={styles.image}
                  />
                  {!isCensored && (
                    <canvas
                      ref={canvasRef}
                      className={styles.overlay}
                      onMouseDown={handleCanvasMouseDown}
                      onMouseMove={(e) => {
                        handleCanvasMouseMove(e)
                        updateCursor(e)
                      }}
                      onMouseUp={handleCanvasMouseUp}
                      onMouseLeave={handleCanvasMouseUp}
                      onTouchStart={handleCanvasTouchStart}
                      onTouchMove={handleCanvasTouchMove}
                      onTouchEnd={handleCanvasTouchEnd}
                      style={{ touchAction: 'none' }}
                    />
                  )}
                </div>
                <div className={styles.boxInfo}>
                  {isCensored ? (
                    <span>��� Image censored</span>
                  ) : (
                    <span>Position: ({censorBox.x}, {censorBox.y}) | Size: {censorBox.width} × {censorBox.height}</span>
                  )}
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
                        disabled={isCensored}
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
                    disabled={isCensored}
                  />
                </div>

                <div className={styles.section}>
                  {!isCensored ? (
                    <button
                      className={styles.censorButton}
                      onClick={handleCensorClick}
                    >
                      Apply Censor
                    </button>
                  ) : (
                    <button
                      className={styles.uncensorButton}
                      onClick={() => {
                        setIsCensored(false)
                        if (originalImageData) {
                          setImage(originalImageData)
                        }
                      }}
                    >
                      Start Over
                    </button>
                  )}
                  {isCensored && (
                    <>
                      <button
                        className={styles.downloadButton}
                        onClick={downloadCensoredImage}
                      >
                        Download Image
                      </button>
                      <button
                        className={styles.changeButton}
                        onClick={handleClearImage}
                      >
                        Change Image
                      </button>
                    </>
                  )}
                  {!isCensored && (
                    <button
                      className={styles.changeButton}
                      onClick={handleClearImage}
                    >
                      Change Image
                    </button>
                  )}
                </div>

                <div className={styles.instructionsBox}>
                  <strong>How to use:</strong>
                  <ul>
                    <li>Select censor type</li>
                    <li>Drag box to move</li>
                    <li>Drag corners to resize</li>
                    <li>Adjust intensity</li>
                    <li>Click "Apply Censor"</li>
                    <li>Download image</li>
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
