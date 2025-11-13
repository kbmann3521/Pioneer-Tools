'use client'

import { useApiPanel } from '@/app/context/ApiPanelContext'

export default function FloatingApiButton() {
  const { toggleOpen } = useApiPanel()

  return (
    <button
      onClick={toggleOpen}
      className="floating-api-btn"
      aria-label="Toggle API view"
    >
      🔌 API View
    </button>
  )
}
