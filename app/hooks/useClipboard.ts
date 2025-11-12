'use client'

import { useState } from 'react'

interface UseClipboardReturn {
  isCopied: boolean
  copyToClipboard: (text: string) => Promise<void>
}

export function useClipboard(duration: number = 3000): UseClipboardReturn {
  const [isCopied, setIsCopied] = useState(false)

  const copyToClipboard = async (text: string) => {
    // Try modern Clipboard API first
    if (navigator.clipboard && navigator.clipboard.writeText) {
      try {
        await navigator.clipboard.writeText(text)
        setIsCopied(true)
        setTimeout(() => setIsCopied(false), duration)
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
        setIsCopied(true)
        setTimeout(() => setIsCopied(false), duration)
      }
    } catch (err) {
      // Silent failure
    } finally {
      document.body.removeChild(textArea)
    }
  }

  return {
    isCopied,
    copyToClipboard,
  }
}
