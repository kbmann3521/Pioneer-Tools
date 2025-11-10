'use client'

import { createContext, useContext, ReactNode } from 'react'
import type { ToolParams, ApiParamsContextValue } from '@/lib/types/tools'

const ApiParamsContext = createContext<ApiParamsContextValue | undefined>(undefined)

interface ApiParamsProviderProps {
  children: ReactNode
  updateParams: (params: Partial<ToolParams>) => void
  currentParams?: Partial<ToolParams>
}

export function ApiParamsProvider({
  children,
  updateParams,
  currentParams = {}
}: ApiParamsProviderProps) {
  return (
    <ApiParamsContext.Provider value={{ updateParams, currentParams }}>
      {children}
    </ApiParamsContext.Provider>
  )
}

export function useApiParams() {
  const context = useContext(ApiParamsContext)
  if (undefined === context) {
    throw new Error('useApiParams must be used within ApiParamsProvider')
  }
  return context
}
