'use client'

interface HeaderApiToggleProps {
  developerMode: boolean
  setDeveloperMode: (mode: boolean) => void
  isVisible: boolean
}

export default function HeaderApiToggle({ developerMode, setDeveloperMode, isVisible }: HeaderApiToggleProps) {
  if (!isVisible) return null

  const toggleDeveloperMode = () => {
    setDeveloperMode(!developerMode)
  }

  return (
    <>
      <button
        className={`api-view-toggle ${developerMode ? 'active' : ''}`}
        onClick={(e) => {
          e.preventDefault()
          toggleDeveloperMode()
        }}
        type="button"
        aria-label={`API View: ${developerMode ? 'on' : 'off'}`}
        title={`Toggle API View panel`}
      >
        <span className="toggle-label">API View</span>
        <span className="toggle-switch">
          <span className="toggle-circle"></span>
        </span>
      </button>

      <style jsx>{`
        .api-view-toggle {
          padding: 0.5rem 1rem;
          border-radius: 8px;
          border: 2px solid var(--border-color);
          background: var(--bg-secondary);
          color: var(--text-primary);
          font-size: 0.95rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
          font-family: inherit;
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .api-view-toggle:hover {
          border-color: var(--color-primary);
        }

        .toggle-label {
          display: inline-block;
          white-space: nowrap;
        }

        .toggle-switch {
          display: inline-flex;
          align-items: center;
          justify-content: flex-start;
          width: 44px;
          height: 24px;
          background-color: var(--bg-tertiary);
          border-radius: 12px;
          padding: 2px;
          transition: background-color 0.3s ease;
          position: relative;
        }

        .api-view-toggle.active .toggle-switch {
          background-color: var(--color-primary);
          justify-content: flex-end;
        }

        .toggle-circle {
          display: inline-block;
          width: 20px;
          height: 20px;
          background-color: white;
          border-radius: 50%;
          transition: all 0.3s ease;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }

        .api-view-toggle.active .toggle-circle {
          background-color: white;
        }

        @media (max-width: 768px) {
          .api-view-toggle {
            padding: 0.6rem 1rem;
            font-size: 0.85rem;
          }
        }
      `}</style>
    </>
  )
}
