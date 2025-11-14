'use client'

import { useState } from 'react'

const tools = [
  { id: 'case-converter', name: 'Case Converter', icon: '🔤' },
  { id: 'word-counter', name: 'Letter/Word Counter', icon: '📊' },
  { id: 'html-minifier', name: 'HTML Minifier', icon: '⚡' },
  { id: 'image-resizer', name: 'Image Resizer', icon: '🖼️' },
  { id: 'hex-rgba-converter', name: 'HEX ↔ RGBA', icon: '🎨' },
  { id: 'og-generator', name: 'OG Meta Tag Gen', icon: '📊' },
  { id: 'blog-generator', name: 'Blog Title Gen', icon: '✨' },
]

interface HeaderSearchProps {
  onSelectTool: (toolId: string) => void
}

export default function HeaderSearch({ onSelectTool }: HeaderSearchProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [showSearchResults, setShowSearchResults] = useState(false)

  const filteredTools = tools.filter(tool =>
    tool.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleSelectTool = (toolId: string) => {
    onSelectTool(toolId)
    setSearchQuery('')
    setShowSearchResults(false)
  }

  return (
    <div className="header-search-container">
      <input
        type="text"
        placeholder="Search tools..."
        value={searchQuery}
        onChange={(e) => {
          setSearchQuery(e.target.value)
          setShowSearchResults(e.target.value.length > 0)
        }}
        onFocus={() => searchQuery.length > 0 && setShowSearchResults(true)}
        onBlur={() => setTimeout(() => setShowSearchResults(false), 200)}
        className="header-search-input"
        aria-label="Search tools"
      />
      {showSearchResults && (
        <div className="search-dropdown">
          {filteredTools.length > 0 ? (
            <ul className="search-results">
              {filteredTools.map(tool => (
                <li key={tool.id}>
                  <button
                    type="button"
                    className="search-result-item"
                    onClick={() => handleSelectTool(tool.id)}
                  >
                    <span className="search-result-icon">{tool.icon}</span>
                    <span className="search-result-name">{tool.name}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="search-no-results">
              No tools found for "{searchQuery}"
            </div>
          )}
        </div>
      )}
    </div>
  )
}
