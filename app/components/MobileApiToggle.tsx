'use client'

import { useApiPanel } from '@/app/context/ApiPanelContext'

export default function MobileApiToggle() {
  const { toggleOpen } = useApiPanel()

  return (
    <button
      onClick={toggleOpen}
      className="mobile-api-toggle"
      aria-label="Toggle API view"
    >
      🔌 API View
    </button>
  )
}
