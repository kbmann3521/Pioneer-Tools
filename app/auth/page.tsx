'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/app/context/AuthContext'
import Link from 'next/link'

export default function AuthPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const mode = searchParams.get('mode')
  const [isSignUp, setIsSignUp] = useState(mode === 'signup')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const { signUp, signIn } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      if (isSignUp) {
        await signUp(email, password)
        // Only redirect after successful signup
        await new Promise(resolve => setTimeout(resolve, 500))
        router.push('/dashboard')
      } else {
        await signIn(email, password)
        // Only redirect after successful signin
        await new Promise(resolve => setTimeout(resolve, 500))
        router.push('/dashboard')
      }
    } catch (err: any) {
      // Parse Supabase error messages
      let errorMessage = err.message || 'An error occurred'

      console.error('Auth error:', err)

      if (err.message?.includes('User already registered')) {
        errorMessage = 'An account with this email already exists'
      } else if (err.message?.includes('Email not confirmed')) {
        errorMessage = 'Please confirm your email address'
      } else if (err.message?.includes('Invalid login credentials')) {
        errorMessage = 'Incorrect email or password'
      } else if (err.message?.includes('already exists')) {
        errorMessage = 'An account with this email already exists'
      }

      setError(errorMessage)
      setLoading(false)
    }
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1 className="auth-title">Tools Hub</h1>
        <p className="auth-subtitle">{isSignUp ? 'Create Account' : 'Sign In'}</p>

        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="auth-form-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              disabled={loading}
            />
          </div>

          <div className="auth-form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              disabled={loading}
            />
          </div>

          <button type="submit" disabled={loading} className="auth-button">
            {loading ? 'Loading...' : isSignUp ? 'Create Account' : 'Sign In'}
          </button>
        </form>

        <div className="auth-toggle">
          <span>{isSignUp ? 'Already have an account?' : "Don't have an account?"}</span>
          <button
            type="button"
            onClick={() => setIsSignUp(!isSignUp)}
            disabled={loading}
            className="auth-toggle-btn"
          >
            {isSignUp ? 'Sign In' : 'Sign Up'}
          </button>
        </div>

        <Link href="/" className="auth-back-link">
          ← Back to Tools Hub
        </Link>
      </div>

      <style jsx>{`
        .auth-container {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, var(--bg-primary) 0%, var(--bg-secondary) 100%);
          padding: 1rem;
          position: relative;
          overflow: hidden;
        }

        .auth-container::before {
          content: '';
          position: absolute;
          top: -50%;
          right: -50%;
          width: 100%;
          height: 100%;
          background: radial-gradient(circle, rgba(99, 102, 241, 0.1) 0%, transparent 70%);
          pointer-events: none;
        }

        .auth-card {
          background: var(--bg-secondary);
          border-radius: 16px;
          padding: 2.5rem;
          width: 100%;
          max-width: 420px;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
          border: 1px solid var(--border-color);
          position: relative;
          z-index: 1;
        }

        .auth-title {
          font-size: 2rem;
          font-weight: 700;
          margin-bottom: 0.5rem;
          background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-dark) 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          text-align: center;
        }

        .auth-subtitle {
          text-align: center;
          color: var(--text-tertiary);
          margin-bottom: 2rem;
          font-size: 0.95rem;
        }

        .auth-error {
          background-color: rgba(255, 59, 48, 0.1);
          border: 1px solid rgba(255, 59, 48, 0.3);
          color: #ff3b30;
          padding: 1rem;
          border-radius: 8px;
          margin-bottom: 1.5rem;
          font-size: 0.9rem;
        }

        .auth-form {
          margin-bottom: 1.5rem;
        }

        .auth-form-group {
          margin-bottom: 1.3rem;
        }

        .auth-form-group label {
          display: block;
          margin-bottom: 0.6rem;
          color: var(--text-primary);
          font-weight: 600;
          font-size: 0.9rem;
        }

        .auth-form-group input {
          width: 100%;
          padding: 0.85rem 1rem;
          border: 2px solid var(--border-color);
          border-radius: 8px;
          background: var(--bg-primary);
          color: var(--text-primary);
          font-size: 1rem;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .auth-form-group input:focus {
          outline: none;
          border-color: var(--color-primary);
          box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
        }

        .auth-form-group input:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .auth-button {
          width: 100%;
          padding: 0.9rem;
          background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-dark) 100%);
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
        }

        .auth-button:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(99, 102, 241, 0.4);
        }

        .auth-button:active:not(:disabled) {
          transform: translateY(0);
        }

        .auth-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .auth-toggle {
          text-align: center;
          margin-bottom: 1.5rem;
          font-size: 0.95rem;
          color: var(--text-tertiary);
        }

        .auth-toggle-btn {
          background: none;
          border: none;
          color: var(--color-primary);
          cursor: pointer;
          font-weight: 600;
          padding: 0;
          margin-left: 0.25rem;
          text-decoration: underline;
          font-size: 0.95rem;
          transition: color 0.2s;
        }

        .auth-toggle-btn:hover:not(:disabled) {
          color: var(--color-primary-dark);
        }

        .auth-toggle-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .auth-back-link {
          display: block;
          text-align: center;
          color: var(--color-primary);
          text-decoration: none;
          font-size: 0.9rem;
          margin-top: 1.5rem;
          transition: all 0.2s;
        }

        .auth-back-link:hover {
          text-decoration: underline;
          color: var(--color-primary-dark);
        }
      `}</style>
    </div>
  )
}
