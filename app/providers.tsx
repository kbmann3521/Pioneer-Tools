'use client'

import { useState, useEffect, ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import { useAuth } from './context/AuthContext'
import { FavoritesProvider } from './context/FavoritesContext'
import { ApiParamsProvider } from './context/ApiParamsContext'
import { ApiPanelProvider, useApiPanel } from './context/ApiPanelContext'
import Header from './components/Header'
import Footer from './components/Footer'
import Sidebar from './components/Sidebar'
import ApiPreview from './components/ApiPreview'
import Dashboard from './components/Dashboard'

interface ProvidersProps {
  children?: ReactNode
}

interface ToolPageContentProps {
  theme: string
  setTheme: (theme: string) => void
  developerMode: boolean
  setDeveloperMode: (mode: boolean) => void
  sidebarOpen: boolean
  setSidebarOpen: (open: boolean) => void
  handleMainContainerClick: (e: React.MouseEvent<HTMLDivElement>) => void
  endpoints: Record<string, string>
  toolId: string
  apiParams: Record<string, any>
  children: ReactNode
  favorites: string[]
  toggleFavorite: (toolId: string) => void
}

function ToolPageContent({
  theme,
  setTheme,
  developerMode,
  setDeveloperMode,
  sidebarOpen,
  setSidebarOpen,
  handleMainContainerClick,
  endpoints,
  toolId,
  apiParams,
  children,
  favorites,
  toggleFavorite
}: ToolPageContentProps) {
  const { isOpen: apiPanelOpen } = useApiPanel()

  return (
    <div className="app" data-theme={theme}>
      <Header theme={theme} setTheme={setTheme} developerMode={developerMode} setDeveloperMode={setDeveloperMode} sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
      <div className="main-container" data-sidebar-open={sidebarOpen} data-api-panel-open={apiPanelOpen} onClick={handleMainContainerClick}>
        <Sidebar
          favorites={favorites}
          onToggleFavorite={toggleFavorite}
        />
        <main className="content">
          {children}
        </main>
        {endpoints[toolId] && (
          <div className={`right-sidebar ${!developerMode ? 'collapsed' : ''}`} data-api-panel-open={apiPanelOpen}>
            <ApiPreview
              endpoint={endpoints[toolId]}
              params={apiParams}
              toolName={toolId}
              enableCodeExecution={true}
            />
          </div>
        )}
      </div>
      <Footer />
    </div>
  )
}

export function RootProvider({ children }: ProvidersProps) {
  const pathname = usePathname()
  const { user, session } = useAuth()
  const [theme, setTheme] = useState<string>('dark')
  const [favorites, setFavorites] = useState<string[]>([])
  const [mounted, setMounted] = useState(false)
  const [apiParams, setApiParams] = useState<Record<string, any>>({})
  const [developerMode, setDeveloperMode] = useState<boolean>(true)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // Skip RootProvider layout for test page
  if (pathname === '/test') {
    return <>{children}</>
  }

  // Load theme and developer mode from localStorage on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') || 'dark'
    const savedDeveloperMode = localStorage.getItem('developerMode') !== 'false'

    setTheme(savedTheme)
    setDeveloperMode(savedDeveloperMode)
    setMounted(true)

    // Apply theme to document
    document.documentElement.setAttribute('data-theme', savedTheme)
  }, [])

  // Load favorites from Supabase for logged-in users
  useEffect(() => {
    const loadFavorites = async () => {
      if (!user || !session) {
        // Clear favorites if user logs out
        console.log('No user or session - clearing favorites')
        setFavorites([])
        return
      }

      console.log('Loading favorites for user:', user.id)

      try {
        // GET favorites from Supabase
        const response = await fetch('/api/favorites', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        })

        if (!response.ok) {
          const errorText = await response.text()
          console.error('Failed to fetch favorites from Supabase:', response.status, errorText)
          return
        }

        const data = await response.json()
        const supabaseFavorites = data.data?.favorites || data.favorites || []
        console.log('Loaded favorites from Supabase:', supabaseFavorites)
        setFavorites(supabaseFavorites)
      } catch (error) {
        console.error('Error loading favorites from Supabase:', error)
      }
    }

    loadFavorites()
  }, [user, session])

  // Save theme to localStorage
  useEffect(() => {
    if (mounted) {
      localStorage.setItem('theme', theme)
      document.documentElement.setAttribute('data-theme', theme)
    }
  }, [theme, mounted])


  // Save developer mode to localStorage
  useEffect(() => {
    if (mounted) {
      localStorage.setItem('developerMode', String(developerMode))
    }
  }, [developerMode, mounted])

  // Save last visited tool to localStorage
  useEffect(() => {
    if (mounted && pathname?.startsWith('/tools/')) {
      const toolId = pathname.replace('/tools/', '')
      localStorage.setItem('lastTool', toolId)
    }
  }, [pathname, mounted])

  // Close sidebar when navigating on mobile
  useEffect(() => {
    setSidebarOpen(false)
  }, [pathname])

  const toggleFavorite = async (toolId: string) => {
    const isFavorited = favorites.includes(toolId)

    // Update local state immediately for UX
    setFavorites(prev =>
      prev.includes(toolId) ? prev.filter(id => id !== toolId) : [...prev, toolId]
    )

    // Sync to Supabase if user is logged in
    if (!user) {
      console.log('Not logged in - favorite will not persist')
      return
    }

    if (!session?.access_token) {
      console.log('No access token available')
      return
    }

    try {
      if (isFavorited) {
        // Remove from favorites
        const response = await fetch(`/api/favorites/${toolId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        })

        if (!response.ok) {
          const errorText = await response.text()
          console.error(`Error removing favorite: ${response.status}`, errorText)
          // Revert local change on error
          setFavorites(prev => [...prev, toolId])
        } else {
          console.log(`Successfully removed ${toolId} from favorites`)
        }
      } else {
        // Add to favorites
        const response = await fetch('/api/favorites', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ toolId }),
        })

        // 409 means already favorited, which is fine - just continue
        if (!response.ok && response.status !== 409) {
          const errorText = await response.text()
          console.error(`Error adding favorite: ${response.status}`, errorText)
          // Revert local change on error
          setFavorites(prev => prev.filter(id => id !== toolId))
        } else {
          console.log(`Successfully added ${toolId} to favorites`)
        }
      }
    } catch (error) {
      console.error('Error syncing favorite to Supabase:', error)
      // Revert local change on error
      setFavorites(prev =>
        prev.includes(toolId) ? prev.filter(id => id !== toolId) : [...prev, toolId]
      )
    }
  }

  const renderTool = () => {
    // Only render Dashboard on home page
    // Tools are now rendered via Next.js routing (/tools/[slug]/page.tsx)
    return <Dashboard theme={theme} setTheme={setTheme} />
  }



  if (!mounted) {
    return (
      <div className="app" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        Loading...
      </div>
    )
  }

  // If on /auth or /dashboard route, render just the children with footer
  if (pathname?.startsWith('/auth') || pathname?.startsWith('/dashboard')) {
    return (
      <div className="app" data-theme={theme}>
        {children}
        <Footer />
      </div>
    )
  }

  // If on /tools/* route, render with sidebar and the tool page content
  if (pathname?.startsWith('/tools/')) {
    // Extract tool slug from pathname (e.g., /tools/case-converter -> case-converter)
    const toolId = pathname.replace('/tools/', '')

    // Map tool IDs to their API endpoints
    const endpoints: Record<string, string> = {
      'case-converter': '/api/tools/case-converter',
      'word-counter': '/api/tools/word-counter',
      'hex-rgba-converter': '/api/tools/hex-rgba-converter',
      'image-resizer': '/api/tools/image-resizer',
      'image-average-color': '/api/tools/image-average-color',
      'image-color-extractor': '/api/tools/image-color-extractor',
      'photo-censor': '/api/tools/photo-censor',
      'og-generator': '/api/tools/og-generator',
      'blog-generator': '/api/tools/blog-generator',
      'json-formatter': '/api/tools/json-formatter',
      'base64-converter': '/api/tools/base64-converter',
      'url-encoder': '/api/tools/url-encoder',
      'slug-generator': '/api/tools/slug-generator',
      'password-generator': '/api/tools/password-generator',
    }

    const handleMainContainerClick = (e: React.MouseEvent<HTMLDivElement>) => {
      // Close sidebar when clicking on the overlay backdrop
      if (sidebarOpen && e.target === e.currentTarget) {
        setSidebarOpen(false)
      }
    }

    return (
      <FavoritesProvider favorites={favorites} toggleFavorite={toggleFavorite}>
        <ApiParamsProvider updateParams={setApiParams}>
          <ApiPanelProvider>
            <ToolPageContent
              theme={theme}
              setTheme={setTheme}
              developerMode={developerMode}
              setDeveloperMode={setDeveloperMode}
              sidebarOpen={sidebarOpen}
              setSidebarOpen={setSidebarOpen}
              handleMainContainerClick={handleMainContainerClick}
              endpoints={endpoints}
              toolId={toolId}
              apiParams={apiParams}
              favorites={favorites}
              toggleFavorite={toggleFavorite}
            >
              {children}
            </ToolPageContent>
          </ApiPanelProvider>
        </ApiParamsProvider>
      </FavoritesProvider>
    )
  }

  // Default: render home page with sidebar and dashboard
  const handleMainContainerClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // Close sidebar when clicking on the overlay backdrop
    if (sidebarOpen && e.target === e.currentTarget) {
      setSidebarOpen(false)
    }
  }

  return (
    <FavoritesProvider favorites={favorites} toggleFavorite={toggleFavorite}>
      <div className="app" data-theme={theme}>
        <Header theme={theme} setTheme={setTheme} developerMode={developerMode} setDeveloperMode={setDeveloperMode} sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
        <div className="main-container" data-sidebar-open={sidebarOpen} onClick={handleMainContainerClick}>
          <Sidebar
            favorites={favorites}
            onToggleFavorite={toggleFavorite}
          />
          <main className="content">{renderTool()}</main>
        </div>
        <Footer />
      </div>
    </FavoritesProvider>
  )
}
