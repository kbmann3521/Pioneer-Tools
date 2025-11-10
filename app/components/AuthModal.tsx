'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface AuthModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  message?: string
}

export default function AuthModal({ isOpen, onClose, title = 'Sign in to save favorites', message = 'Create an account or sign in to save your favorite tools.' }: AuthModalProps) {
  const router = useRouter()

  if (!isOpen) return null

  const handleSignUp = () => {
    router.push('/auth?mode=signup')
    onClose()
  }

  const handleLogIn = () => {
    router.push('/auth?mode=login')
    onClose()
  }

  return (
    <>
      <div className="modal-overlay" onClick={onClose} aria-modal="true" role="dialog" />
      <div className="modal-content">
        <button
          className="modal-close"
          onClick={onClose}
          aria-label="Close modal"
          type="button"
        >
          ✕
        </button>
        <h2 className="modal-title">{title}</h2>
        <p className="modal-message">{message}</p>
        <div className="modal-actions">
          <button
            className="modal-btn modal-btn-primary"
            onClick={handleSignUp}
            type="button"
          >
            Create Account
          </button>
          <button
            className="modal-btn modal-btn-secondary"
            onClick={handleLogIn}
            type="button"
          >
            Sign In
          </button>
        </div>
      </div>
    </>
  )
}
