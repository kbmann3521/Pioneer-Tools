'use client'

import { useState } from 'react'

interface SuggestionButtonProps {
  toolName: string
  toolId: string
}

export default function SuggestionButton({ toolName, toolId }: SuggestionButtonProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [suggestion, setSuggestion] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!suggestion.trim()) return

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('https://formspree.io/f/mwppvvpo', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          suggestion,
          toolName,
          toolId,
          timestamp: new Date().toISOString(),
        }),
      })

      if (response.ok) {
        setSubmitted(true)
        setSuggestion('')
        setTimeout(() => {
          setSubmitted(false)
          setIsOpen(false)
        }, 2000)
      } else {
        setError('Failed to send suggestion. Please try again.')
      }
    } catch (err) {
      setError('Connection error. Please check your internet and try again.')
      console.error('Suggestion submission error:', err)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      <button
        className="suggestion-btn"
        onClick={() => setIsOpen(true)}
        title="Send a suggestion"
      >
        Suggestion?
      </button>

      {isOpen && (
        <div className="suggestion-modal-overlay" onClick={() => setIsOpen(false)}>
          <div className="suggestion-modal" onClick={e => e.stopPropagation()}>
            <div className="suggestion-header">
              <h3>Suggestion for {toolName}</h3>
              <button className="close-btn" onClick={() => setIsOpen(false)}>×</button>
            </div>

            {submitted ? (
              <div className="suggestion-success">
                <div className="success-icon">✓</div>
                <p>Thank you for your suggestion! We'll review it soon.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="suggestion-form">
                <div className="form-group">
                  <label htmlFor="suggestion">Your Suggestion</label>
                  <textarea
                    id="suggestion"
                    value={suggestion}
                    onChange={e => setSuggestion(e.target.value)}
                    placeholder="Tell us what could be better..."
                    required
                    rows={4}
                    className="suggestion-textarea"
                  />
                </div>

                {error && <div className="error-message">{error}</div>}

                <button type="submit" className="submit-btn" disabled={isLoading}>
                  {isLoading ? 'Sending...' : 'Send Suggestion'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  )
}
