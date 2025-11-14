'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/app/context/AuthContext'

interface SidebarProps {
  favorites: string[]
  onToggleFavorite: (toolId: string) => void
  onCloseApiPanel?: () => void
}

interface Tool {
  id: string
  name: string
  icon: string
  category: string
}

const toolsByCategory = {
  'Text Tools': [
    { id: 'case-converter', name: 'Case Converter', icon: '🔤', category: 'Text Tools' },
    { id: 'word-counter', name: 'Letter/Word Counter', icon: '📊', category: 'Text Tools' },
    { id: 'json-formatter', name: 'JSON Formatter', icon: '{}', category: 'Text Tools' },
    { id: 'base64-converter', name: 'Base64 Encoder/Decoder', icon: '🔐', category: 'Text Tools' },
    { id: 'url-encoder', name: 'URL Encoder/Decoder', icon: '🔗', category: 'Text Tools' },
    { id: 'slug-generator', name: 'Slug Generator', icon: '📝', category: 'Text Tools' },
    { id: 'password-generator', name: 'Password Generator', icon: '🔑', category: 'Text Tools' },
  ],
  'Code Tools': [
    { id: 'html-minifier', name: 'HTML Minifier', icon: '⚡', category: 'Code Tools' },
  ],
  'Image Tools': [
    { id: 'image-resizer', name: 'Image Resizer', icon: '🖼️', category: 'Image Tools' },
    { id: 'image-average-color', name: 'Average Color Finder', icon: '🎨', category: 'Image Tools' },
    { id: 'image-color-extractor', name: 'Color Extractor', icon: '🌈', category: 'Image Tools' },
    { id: 'photo-censor', name: 'Photo Censor', icon: '🔒', category: 'Image Tools' },
  ],
  'Color Tools': [
    { id: 'hex-rgba-converter', name: 'HEX ↔ RGBA', icon: '🎨', category: 'Color Tools' },
  ],
  'Social Media Tools': [
    { id: 'og-generator', name: 'OG Meta Tag Gen', icon: '🏷️', category: 'Social Media Tools' },
  ],
  'Blog Tools': [
    { id: 'blog-generator', name: 'Blog Title Gen', icon: '✨', category: 'Blog Tools' },
  ],
}

type CategoryKey = keyof typeof toolsByCategory

export default function Sidebar({ favorites, onToggleFavorite, onCloseApiPanel }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { user } = useAuth()
  const isDashboard = pathname?.startsWith('/dashboard')
  const [lastTool, setLastTool] = useState<string | null>(null)
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({
    'Favorite Tools': false,
    'Text Tools': false,
    'Code Tools': false,
    'Image Tools': false,
    'Color Tools': false,
    'Social Media Tools': false,
    'Blog Tools': false,
  })

  useEffect(() => {
    const saved = localStorage.getItem('lastTool')
    setLastTool(saved)
  }, [])

  const currentTool = pathname?.startsWith('/tools/') ? pathname.replace('/tools/', '') : null

  const favoriteTools = Object.values(toolsByCategory)
    .flat()
    .filter(t => favorites.includes(t.id))

  const toggleCategory = (category: CategoryKey | 'Favorite Tools') => {
    setExpandedCategories(prev => ({
      ...prev,
      [category]: !prev[category],
    }))
  }

  const renderToolItem = (tool: Tool) => (
    <Link
      key={tool.id}
      href={`/tools/${tool.id}`}
      className={`tool-item ${currentTool === tool.id ? 'active' : ''}`}
      onClick={() => onCloseApiPanel?.()}
    >
      <span className="tool-icon">{tool.icon}</span>
      <span className="tool-name">{tool.name}</span>
    </Link>
  )

  const { signOut } = useAuth()

  const handleAuthClick = (mode: 'login' | 'signup') => {
    router.push(`/auth?mode=${mode}`)
  }

  const handleNavigate = (path: string) => {
    router.push(path)
  }

  const handleSignOut = async () => {
    try {
      await signOut()
      router.push('/')
    } catch (error) {
      console.error('Sign out error:', error)
    }
  }

  return (
    <aside className="sidebar">
      <div className="sidebar-content">
        <div className="sidebar-auth">
          {user ? (
            <>
              {isDashboard ? (
                <button
                  type="button"
                  className="sidebar-auth-btn tools-btn"
                  onClick={() => {
                    if (lastTool) {
                      handleNavigate(`/tools/${lastTool}`)
                    } else {
                      handleNavigate('/')
                    }
                  }}
                  title="Back to tools"
                >
                  Tools
                </button>
              ) : (
                <button
                  type="button"
                  className="sidebar-auth-btn dashboard-btn"
                  onClick={() => handleNavigate('/dashboard')}
                  title="View your dashboard"
                >
                  Dashboard
                </button>
              )}
              <button
                type="button"
                className="sidebar-auth-btn signout-btn"
                onClick={handleSignOut}
                title="Sign out"
              >
                Sign Out
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                className="sidebar-auth-btn login-btn"
                onClick={() => handleAuthClick('login')}
                title="Log in to your account"
              >
                Login
              </button>
              <button
                type="button"
                className="sidebar-auth-btn signup-btn"
                onClick={() => handleAuthClick('signup')}
                title="Create a new account"
              >
                Sign Up
              </button>
            </>
          )}
        </div>

        <h2 className="sidebar-title">Tools</h2>

        <div className="category-accordion">
          <button
            type="button"
            className={`category-header ${expandedCategories['Favorite Tools'] ? 'expanded' : ''}`}
            onClick={() => toggleCategory('Favorite Tools' as CategoryKey)}
            title={expandedCategories['Favorite Tools'] ? 'Collapse Favorite Tools' : 'Expand Favorite Tools'}
          >
            <span className="category-name">Favorite Tools</span>
            <span className="category-icon">
              {expandedCategories['Favorite Tools'] ? '▼' : '▶'}
            </span>
          </button>
          {expandedCategories['Favorite Tools'] && (
            <div className="category-tools">
              {user ? (
                favoriteTools.length > 0 ? (
                  favoriteTools.map(tool => renderToolItem(tool))
                ) : (
                  <p className="favorites-empty">No favorites yet. Click the Save button on any tool to add it here!</p>
                )
              ) : (
                <button
                  type="button"
                  className="sign-in-to-view-btn"
                  onClick={() => router.push('/auth?mode=login')}
                  title="Sign in to view favorites"
                >
                  Sign in to view favorites
                </button>
              )}
            </div>
          )}
        </div>

        {(Object.entries(toolsByCategory) as [CategoryKey, typeof toolsByCategory[CategoryKey]][]).map(([category, categoryTools]) => (
            <div key={category} className="category-accordion">
              <button
                type="button"
                className={`category-header ${expandedCategories[category] ? 'expanded' : ''}`}
                onClick={() => toggleCategory(category)}
                title={expandedCategories[category] ? `Collapse ${category}` : `Expand ${category}`}
              >
                <span className="category-name">{category}</span>
                <span className="category-icon">
                  {expandedCategories[category] ? '▼' : '▶'}
                </span>
              </button>
              {expandedCategories[category] && (
                <div className="category-tools">
                  {categoryTools.map(tool => renderToolItem(tool))}
                </div>
              )}
            </div>
          ))}
      </div>
    </aside>
  )
}
