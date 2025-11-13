'use client'

import { createContext, useContext, useState, ReactNode } from 'react'

interface ApiPanelContextType {
  isOpen: boolean
  toggleOpen: () => void
  setOpen: (open: boolean) => void
}

const ApiPanelContext = createContext<ApiPanelContextType | undefined>(undefined)

export function ApiPanelProvider({ children }: { children: ReactNode }) {
  const [isOpen, setOpen] = useState(false)

  const toggleOpen = () => setOpen(prev => !prev)

  return (
    <ApiPanelContext.Provider value={{ isOpen, toggleOpen, setOpen }}>
      {children}
    </ApiPanelContext.Provider>
  )
}

export function useApiPanel() {
  const context = useContext(ApiPanelContext)
  if (!context) {
    throw new Error('useApiPanel must be used within ApiPanelProvider')
  }
  return context
}
