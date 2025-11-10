'use client'

import { useState } from 'react'

interface AboutToolAccordionProps {
  toolId: string
  content: string
}

export default function AboutToolAccordion({ toolId, content }: AboutToolAccordionProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="about-tool-accordion">
      <button
        className="accordion-toggle"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
      >
        <span className="accordion-title">About Tool</span>
        <span className={`accordion-icon ${isOpen ? 'open' : ''}`}>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M5 7.5L10 12.5L15 7.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </button>
      {isOpen && (
        <div className="accordion-content">
          <div
            className="accordion-text"
            dangerouslySetInnerHTML={{ __html: content }}
          />
        </div>
      )}
    </div>
  )
}
