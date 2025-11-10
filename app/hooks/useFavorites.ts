'use client'

import { useFavoritesContext } from '@/app/context/FavoritesContext'

export function useFavorites(toolId: string) {
  const { favorites, toggleFavorite } = useFavoritesContext()
  const isSaved = favorites.includes(toolId)

  const toggleSave = () => {
    toggleFavorite(toolId)
  }

  return { isSaved, toggleSave, mounted: true }
}
