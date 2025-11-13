'use client'

import { useState, useRef, useEffect } from 'react'
import ToolHeader from '@/app/components/ToolHeader'
import AboutToolAccordion from '@/app/components/AboutToolAccordion'
import { resizeImage, calculateHeightFromWidth } from '@/lib/tools/image-resizer'
import { useFavorites } from '@/app/hooks/useFavorites'
import { useApiParams } from '@/app/context/ApiParamsContext'
import { toolDescriptions } from '@/config/tool-descriptions'
import type { ToolPageProps } from '@/lib/types/tools'

export default function ImageResizerPage(): JSX.Element {
  const { updateParams } = useApiParams()
  const { isSaved, toggleSave } = useFavorites('image-resizer')
  const [image, setImage] = useState<string | null>(null)
  const [width, setWidth] = useState(800)
  const [height, setHeight] = useState(600)
  const [keepAspect, setKeepAspect] = useState(true)
  const [originalDimensions, setOriginalDimensions] = useState<{ width: number; height: number } | null>(null)
  const [dragActive, setDragActive] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // Update API params whenever dimensions change
  useEffect(() => {
    updateParams({
      width,
      height,
      keepAspectRatio: keepAspect,
      originalWidth: originalDimensions?.width,
      originalHeight: originalDimensions?.height,
    })
  }, [width, height, keepAspect, originalDimensions, updateParams])

  const processImageFile = (file: File) => {
    const reader = new FileReader()
    reader.onload = event => {
      const img = new Image()
      img.onload = () => {
        setImage(event.target?.result as string)
        setOriginalDimensions({ width: img.width, height: img.height })
        setWidth(img.width)
        setHeight(img.height)
      }
      img.src = event.target?.result as string
    }
    reader.readAsDataURL(file)
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      processImageFile(file)
    }
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
      processImageFile(files[0])
    }
  }

  const handleClearImage = () => {
    setImage(null)
    setOriginalDimensions(null)
    setWidth(800)
    setHeight(600)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleWidthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newWidth = Number(e.target.value)
    setWidth(newWidth)
    if (keepAspect && originalDimensions) {
      const newHeight = calculateHeightFromWidth(newWidth, originalDimensions.width, originalDimensions.height)
      setHeight(newHeight)
    }
  }

  const handleHeightChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newHeight = Number(e.target.value)
    setHeight(newHeight)
    if (keepAspect && originalDimensions) {
      const newWidth = Math.round((newHeight * originalDimensions.width) / originalDimensions.height)
      setWidth(newWidth)
    }
  }

  const downloadResized = () => {
    if (!image || !canvasRef.current) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const img = new Image()

    img.onload = () => {
      if (ctx) {
        canvas.width = width
        canvas.height = height
        ctx.drawImage(img, 0, 0, width, height)
        const link = document.createElement('a')
        link.href = canvas.toDataURL('image/png')
        link.download = 'resized-image.png'
        link.click()
      }
    }

    img.src = image
  }

  const result = resizeImage({
    width,
    height,
    keepAspectRatio: keepAspect,
    originalWidth: originalDimensions?.width,
    originalHeight: originalDimensions?.height,
  })

  return (
    <div className="tool-container">
      <ToolHeader
        title="Image Resizer"
        description="Resize images to any dimensions"
        isSaved={isSaved}
        onToggleSave={toggleSave}
        toolId="image-resizer"
        showApiToggle={true}
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
              id="image-upload"
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="file-input"
            />
            <label htmlFor="image-upload" className="file-input-label">
              Choose Image or Drag & Drop
            </label>
          </div>
        </div>

        {image && (
          <>
            <div className="resize-controls">
              <div className="control-group">
                <label htmlFor="width">Width (px):</label>
                <input
                  id="width"
                  type="number"
                  value={width}
                  onChange={handleWidthChange}
                  className="number-input"
                />
              </div>

              <div className="control-group">
                <label htmlFor="height">Height (px):</label>
                <input
                  id="height"
                  type="number"
                  value={height}
                  onChange={handleHeightChange}
                  className="number-input"
                />
              </div>

              <div className="control-group checkbox">
                <input
                  id="aspect-ratio"
                  type="checkbox"
                  checked={keepAspect}
                  onChange={e => setKeepAspect(e.target.checked)}
                />
                <label htmlFor="aspect-ratio">Keep Aspect Ratio</label>
              </div>

              <div className="preview-section">
                <div className="preview-box">
                  <img
                    src={image}
                    alt="Preview"
                    style={{ maxWidth: '100%', maxHeight: '300px', objectFit: 'contain' }}
                  />
                  <button className="clear-image-btn" onClick={handleClearImage}>
                    ✕ Change Image
                  </button>
                </div>
                <div className="dimensions">
                  {width}px × {height}px
                </div>
              </div>

              <button className="download-btn" onClick={downloadResized}>
                Download Resized Image
              </button>
            </div>

            <div className="resize-info">
              <p>
                <strong>Original:</strong> {originalDimensions?.width}px × {originalDimensions?.height}px
              </p>
              <p>
                <strong>New:</strong> {result.dimensions}
              </p>
              <p>
                <strong>Scale Factor:</strong> {result.scaleFactor}x
              </p>
            </div>
          </>
        )}

        <canvas ref={canvasRef} style={{ display: 'none' }} />
      </div>

      <AboutToolAccordion
        toolId="image-resizer"
        content={toolDescriptions['image-resizer']}
      />
    </div>
  )
}
