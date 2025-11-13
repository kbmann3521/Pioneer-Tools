'use client'

import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import HeaderSearch from '@/app/components/HeaderSearch'
import HeaderThemeToggle from '@/app/components/HeaderThemeToggle'
import HeaderAuth from '@/app/components/HeaderAuth'
import HeaderApiToggle from '@/app/components/HeaderApiToggle'

interface HeaderProps {
  theme: string
  setTheme: (theme: string) => void
  developerMode?: boolean
  setDeveloperMode?: (mode: boolean) => void
  onSignOut?: () => Promise<void>
  sidebarOpen?: boolean
  setSidebarOpen?: (open: boolean) => void
}

export default function Header({ theme, setTheme, developerMode = false, setDeveloperMode, onSignOut, sidebarOpen = false, setSidebarOpen }: HeaderProps) {
  const router = useRouter()
  const pathname = usePathname()
  const isToolPage = pathname?.startsWith('/tools/')

  const handleSearchSelect = (toolId: string) => {
    router.push(`/tools/${toolId}`)
  }

  const toggleSidebar = () => {
    setSidebarOpen?.(!sidebarOpen)
  }

  return (
    <header className="header">
      <button
        className="hamburger-menu"
        onClick={toggleSidebar}
        aria-label="Toggle navigation menu"
        title="Toggle navigation menu"
      >
        <span className="hamburger-line"></span>
        <span className="hamburger-line"></span>
        <span className="hamburger-line"></span>
      </button>
      <div className="header-left">
        <Link href="/" className="home-btn" aria-label="Go to home" title="Go to home">
          <h1 className="header-title">Pioneer Web Tools</h1>
        </Link>
        <HeaderSearch onSelectTool={handleSearchSelect} />
        <div className="theme-toggle-mobile">
          <HeaderThemeToggle theme={theme} setTheme={setTheme} />
        </div>
      </div>
      <div className="header-right">
        <div className="theme-toggle-desktop">
          <HeaderThemeToggle theme={theme} setTheme={setTheme} />
        </div>

        {isToolPage && setDeveloperMode && (
          <HeaderApiToggle
            developerMode={developerMode}
            setDeveloperMode={setDeveloperMode}
            isVisible={true}
          />
        )}

        <HeaderAuth onSignOut={onSignOut} />
      </div>

    </header>
  )
}
