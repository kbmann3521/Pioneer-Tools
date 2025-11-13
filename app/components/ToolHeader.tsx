'use client'

import { useState } from 'react'
import { useAuth } from '@/app/context/AuthContext'
import SuggestionButton from './SuggestionButton'
import AuthModal from './AuthModal'
import MobileApiToggle from './MobileApiToggle'

interface ToolHeaderProps {
  title: string
  description: string
  isSaved: boolean
  onToggleSave: () => void
  toolId: string
  showApiToggle?: boolean
  showViewApiLink?: boolean
  onViewApi?: () => void
}

export default function ToolHeader({ title, description, isSaved, onToggleSave, toolId, showApiToggle = false, showViewApiLink = false, onViewApi }: ToolHeaderProps) {
  const { user } = useAuth()
  const [showAuthModal, setShowAuthModal] = useState(false)

  const handleSaveClick = () => {
    if (!user) {
      setShowAuthModal(true)
    } else {
      onToggleSave()
    }
  }

  return (
    <>
      <div className="tool-header-wrapper">
        {showApiToggle && <MobileApiToggle />}
        <div className="tool-header">
          <div className="tool-header-text">
            <h2>{title}</h2>
            <p>
              {description}
              {showViewApiLink && (
                <>
                  {' → '}
                  <button
                    onClick={onViewApi}
                    className="view-api-link"
                  >
                    View API
                  </button>
                </>
              )}
            </p>
          </div>
          <div className="tool-header-actions">
            <SuggestionButton toolName={title} toolId={toolId} />
            <button
              className={`save-tool-btn ${isSaved ? 'saved' : ''}`}
              onClick={handleSaveClick}
              title={isSaved ? 'Unsave this tool' : 'Save this tool'}
            >
              {isSaved ? 'Unsave' : 'Save'}
            </button>
          </div>
        </div>
      </div>
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        title="Save your favorite tools"
        message="Sign in or create an account to save your favorite tools and access them from any device."
      />
    </>
  )
}
