'use client'

import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from '@/app/context/AuthContext'
import { useEffect, useState } from 'react'

interface HeaderAuthProps {
  onSignOut?: () => Promise<void>
}

export default function HeaderAuth({ onSignOut }: HeaderAuthProps) {
  const { user, signOut } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const isDashboard = pathname?.startsWith('/dashboard')
  const [lastTool, setLastTool] = useState<string | null>(null)

  useEffect(() => {
    const saved = localStorage.getItem('lastTool')
    setLastTool(saved)
  }, [])

  const handleSignOut = async () => {
    try {
      await (onSignOut ? onSignOut() : signOut())
      router.push('/')
    } catch (error) {
      console.error('Sign out error:', error)
    }
  }

  const handleAuthClick = (page: 'login' | 'signup') => {
    router.push(`/auth?mode=${page}`)
  }

  return (
    <>
      <div className="auth-buttons">
        {user ? (
          <>
            {isDashboard ? (
              <button
                className="header-btn btn-tools"
                onClick={(e) => {
                  e.preventDefault()
                  if (lastTool) {
                    router.push(`/tools/${lastTool}`)
                  } else {
                    router.push('/')
                  }
                }}
                type="button"
                title="Back to tools"
              >
                Tools
              </button>
            ) : (
              <button
                className="header-btn btn-dashboard"
                onClick={(e) => {
                  e.preventDefault()
                  router.push('/dashboard')
                }}
                type="button"
                title="View your dashboard"
              >
                Dashboard
              </button>
            )}
            <button
              className="header-btn btn-signout"
              onClick={(e) => {
                e.preventDefault()
                handleSignOut()
              }}
              type="button"
              title="Sign out"
            >
              Sign Out
            </button>
          </>
        ) : (
          <>
            <button
              className="header-btn btn-login"
              onClick={(e) => {
                e.preventDefault()
                handleAuthClick('login')
              }}
              type="button"
              title="Log in to your account"
            >
              Login
            </button>
            <button
              className="header-btn btn-signup"
              onClick={(e) => {
                e.preventDefault()
                handleAuthClick('signup')
              }}
              type="button"
              title="Create a new account"
            >
              Sign Up
            </button>
          </>
        )}
      </div>

      <style jsx>{`
        .auth-buttons {
          display: flex;
          gap: 0.5rem;
          margin-left: 1rem;
        }

        .header-btn {
          padding: 0.65rem 1.3rem;
          border-radius: 8px;
          font-size: 0.95rem;
          font-weight: 600;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
          cursor: pointer;
          border: none;
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
          white-space: nowrap;
          font-family: inherit;
        }

        .header-btn:active {
          transform: scale(0.98);
        }

        .btn-login {
          color: var(--color-primary);
          border: 2px solid var(--color-primary);
          background: transparent;
        }

        .btn-login:hover {
          background: var(--color-primary);
          color: white;
        }

        .btn-signup {
          background: var(--color-primary);
          color: white;
          border: 2px solid var(--color-primary);
        }

        .btn-signup:hover {
          background: var(--color-primary-dark);
          border-color: var(--color-primary-dark);
        }

        .btn-dashboard {
          background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-dark) 100%);
          color: white;
          border: none;
        }

        .btn-dashboard:hover {
          opacity: 0.85;
        }

        .btn-tools {
          background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-dark) 100%);
          color: white;
          border: none;
        }

        .btn-tools:hover {
          opacity: 0.85;
        }

        .btn-signout {
          color: var(--text-tertiary);
          border: 2px solid var(--border-color);
          background: transparent;
        }

        .btn-signout:hover {
          background: rgba(255, 59, 48, 0.1);
          color: #ff3b30;
          border-color: #ff3b30;
        }

        @media (max-width: 768px) {
          .auth-buttons {
            margin-left: 0.5rem;
            gap: 0.3rem;
          }

          .header-btn {
            padding: 0.6rem 1rem;
            font-size: 0.85rem;
          }

          .header-btn span:nth-child(2) {
            display: none;
          }
        }
      `}</style>
    </>
  )
}
