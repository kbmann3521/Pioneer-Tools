'use client'

import { useState } from 'react'

interface CopyPosition {
  x: number
  y: number
}

interface UseClipboardReturn {
  copyMessage: string | null
  copyPosition: CopyPosition | null
  copyToClipboard: (text: string, event: React.MouseEvent) => Promise<void>
}

export function useClipboard(duration: number = 1200): UseClipboardReturn {
  const [copyMessage, setCopyMessage] = useState<string | null>(null)
  const [copyPosition, setCopyPosition] = useState<CopyPosition | null>(null)

  const copyToClipboard = async (text: string, event: React.MouseEvent) => {
    setCopyPosition({ x: event.clientX, y: event.clientY })

    // Try modern Clipboard API first
    if (navigator.clipboard && navigator.clipboard.writeText) {
      try {
        await navigator.clipboard.writeText(text)
        setCopyMessage('Copied!')
        setTimeout(() => setCopyMessage(null), duration)
        return
      } catch (err) {
        // Clipboard API failed, try fallback
      }
    }

    // Fallback: use deprecated execCommand method
    const textArea = document.createElement('textarea')
    textArea.value = text
    textArea.style.position = 'fixed'
    textArea.style.left = '-999999px'
    textArea.style.top = '-999999px'
    document.body.appendChild(textArea)

    try {
      textArea.focus()
      textArea.select()
      const successful = document.execCommand('copy')

      if (successful) {
        setCopyMessage('Copied!')
        setTimeout(() => setCopyMessage(null), duration)
      } else {
        setCopyMessage('Failed to copy')
        setTimeout(() => setCopyMessage(null), duration)
      }
    } catch (err) {
      setCopyMessage('Failed to copy')
      setTimeout(() => setCopyMessage(null), duration)
    } finally {
      document.body.removeChild(textArea)
    }
  }

  return {
    copyMessage,
    copyPosition,
    copyToClipboard,
  }
}
