'use client'

import { useState, useEffect } from 'react'
import ToolHeader from '@/app/components/ToolHeader'
import AboutToolAccordion from '@/app/components/AboutToolAccordion'
import { convertColor } from '@/lib/tools/hex-rgba-converter'
import { useFavorites } from '@/app/hooks/useFavorites'
import { useApiParams } from '@/app/context/ApiParamsContext'
import { toolDescriptions } from '@/config/tool-descriptions'
import type { ToolPageProps, HexRgbaConverterResult } from '@/lib/types/tools'

export default function HexRgbaConverterPage({}: ToolPageProps) {
  const { updateParams } = useApiParams()
  const { isSaved, toggleSave } = useFavorites('hex-rgba-converter')
  const [hex, setHex] = useState<string>('#FF6B6B')
  const [rgb, setRgb] = useState<{ r: number; g: number; b: number }>({ r: 255, g: 107, b: 107 })
  const [alpha, setAlpha] = useState<number>(1)
  const [result, setResult] = useState<HexRgbaConverterResult | null>(null)
  const [copyMessage, setCopyMessage] = useState<string | null>(null)
  const [copyPosition, setCopyPosition] = useState<{ x: number; y: number } | null>(null)

  // Update API params whenever color changes
  useEffect(() => {
    updateParams({ hex, r: rgb.r, g: rgb.g, b: rgb.b, alpha })
  }, [hex, rgb.r, rgb.g, rgb.b, alpha, updateParams])

  const handleHexChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setHex(value)
    const converted = convertColor({ hex: value, alpha })
    setRgb(converted.colors)
    setResult(converted)
  }

  const handleRgbChange = (component: 'r' | 'g' | 'b', value: string) => {
    const numValue = Math.min(255, Math.max(0, Number(value)))
    const newRgb = { ...rgb, [component]: numValue }
    setRgb(newRgb)
    const converted = convertColor({ ...newRgb, alpha })
    setHex(converted.hex)
    setResult(converted)
  }

  const handleAlphaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Number(e.target.value)
    setAlpha(value)
    const converted = convertColor({ hex, alpha: value })
    setResult(converted)
  }

  const rgbaString = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`

  const copyToClipboard = (value: string, event: React.MouseEvent) => {
    navigator.clipboard.writeText(value).then(() => {
      setCopyPosition({ x: event.clientX, y: event.clientY })
      setCopyMessage('Copied!')
      setTimeout(() => setCopyMessage(null), 1200)
    })
  }

  return (
    <div className="tool-container">
      <ToolHeader
        title="HEX ↔ RGBA Converter"
        description="Convert between HEX, RGB, and RGBA color formats"
        isSaved={isSaved}
        onToggleSave={toggleSave}
        toolId="hex-rgba-converter"
      />

      <div className="tool-content">
        <div className="color-preview-box" style={{ backgroundColor: rgbaString }}>
          <div className="preview-label">Preview</div>
        </div>

        <div className="converter-section">
          <div className="input-group">
            <label htmlFor="hex">HEX:</label>
            <input
              id="hex"
              type="text"
              value={hex}
              onChange={handleHexChange}
              placeholder="#000000"
              className="color-input"
            />
          </div>

          <div className="rgb-inputs">
            <div className="input-group">
              <label htmlFor="red">Red:</label>
              <input
                id="red"
                type="number"
                min="0"
                max="255"
                value={rgb.r}
                onChange={e => handleRgbChange('r', e.target.value)}
                className="number-input"
              />
            </div>
            <div className="input-group">
              <label htmlFor="green">Green:</label>
              <input
                id="green"
                type="number"
                min="0"
                max="255"
                value={rgb.g}
                onChange={e => handleRgbChange('g', e.target.value)}
                className="number-input"
              />
            </div>
            <div className="input-group">
              <label htmlFor="blue">Blue:</label>
              <input
                id="blue"
                type="number"
                min="0"
                max="255"
                value={rgb.b}
                onChange={e => handleRgbChange('b', e.target.value)}
                className="number-input"
              />
            </div>
          </div>

          <div className="input-group">
            <label htmlFor="alpha">Alpha (Opacity):</label>
            <input
              id="alpha"
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={alpha}
              onChange={handleAlphaChange}
              className="range-input"
            />
            <span className="alpha-value">{alpha.toFixed(1)}</span>
          </div>
        </div>

        {result && (
          <div className="output-section">
            <div className="output-item">
              <div className="output-label">HEX</div>
              <code>{result.hex}</code>
              <button className="copy-btn" onClick={(e) => copyToClipboard(result.hex, e)}>
                Copy
              </button>
            </div>
            <div className="output-item">
              <div className="output-label">RGB</div>
              <code>{result.rgb}</code>
              <button className="copy-btn" onClick={(e) => copyToClipboard(result.rgb, e)}>
                Copy
              </button>
            </div>
            <div className="output-item">
              <div className="output-label">RGBA</div>
              <code>{result.rgba}</code>
              <button className="copy-btn" onClick={(e) => copyToClipboard(result.rgba, e)}>
                Copy
              </button>
            </div>
          </div>
        )}
      </div>
      {copyMessage && copyPosition && (
        <div
          className="copy-feedback-toast"
          style={{ left: `${copyPosition.x}px`, top: `${copyPosition.y}px` }}
        >
          {copyMessage}
        </div>
      )}

      <AboutToolAccordion
        toolId="hex-rgba-converter"
        content={toolDescriptions['hex-rgba-converter']}
      />
    </div>
  )
}
