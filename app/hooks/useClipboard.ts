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
    try {
      await navigator.clipboard.writeText(text)
      setCopyPosition({ x: event.clientX, y: event.clientY })
      setCopyMessage('Copied!')
      setTimeout(() => setCopyMessage(null), duration)
    } catch (err) {
      setCopyPosition({ x: event.clientX, y: event.clientY })
      setCopyMessage('Failed to copy')
      setTimeout(() => setCopyMessage(null), duration)
    }
  }

  return {
    copyMessage,
    copyPosition,
    copyToClipboard,
  }
}
