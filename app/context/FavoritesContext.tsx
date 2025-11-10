'use client'

import { createContext, useContext, ReactNode } from 'react'

interface FavoritesContextType {
  favorites: string[]
  toggleFavorite: (toolId: string) => Promise<void>
}

const FavoritesContext = createContext<FavoritesContextType | undefined>(undefined)

export function FavoritesProvider({ children, favorites, toggleFavorite }: { children: ReactNode; favorites: string[]; toggleFavorite: (toolId: string) => Promise<void> }) {
  return (
    <FavoritesContext.Provider value={{ favorites, toggleFavorite }}>
      {children}
    </FavoritesContext.Provider>
  )
}

export function useFavoritesContext() {
  const context = useContext(FavoritesContext)
  if (undefined === context) {
    throw new Error('useFavoritesContext must be used within FavoritesProvider')
  }
  return context
}
