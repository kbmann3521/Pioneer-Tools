'use client'

interface HeaderThemeToggleProps {
  theme: string
  setTheme: (theme: string) => void
}

export default function HeaderThemeToggle({ theme, setTheme }: HeaderThemeToggleProps) {
  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark')
  }

  return (
    <>
      <button
        className={`theme-toggle ${theme === 'dark' ? 'active' : ''}`}
        onClick={(e) => {
          e.preventDefault()
          toggleTheme()
        }}
        type="button"
        aria-label={`Dark mode: ${theme === 'dark' ? 'on' : 'off'}`}
        title={`Toggle dark mode`}
      >
        <span className="toggle-label">Dark Mode</span>
        <span className="toggle-switch">
          <span className="toggle-circle"></span>
        </span>
      </button>

      <style jsx>{`
        .theme-toggle {
          padding: 0.5rem 0.75rem;
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
          gap: 0.5rem;
          margin-left: 0.5rem;
        }

        .theme-toggle:hover {
          border-color: var(--color-primary);
          background: var(--bg-primary);
        }

        .theme-toggle.active .toggle-switch {
          background-color: var(--color-primary);
          justify-content: flex-end;
        }

        .toggle-label {
          display: inline-block;
          white-space: nowrap;
        }

        .toggle-switch {
          display: inline-flex;
          align-items: center;
          justify-content: flex-start;
          width: 40px;
          height: 22px;
          background-color: var(--bg-tertiary);
          border-radius: 11px;
          padding: 2px;
          transition: background-color 0.3s ease;
          position: relative;
        }

        .toggle-circle {
          display: inline-block;
          width: 18px;
          height: 18px;
          background-color: white;
          border-radius: 50%;
          transition: all 0.3s ease;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }

        @media (max-width: 768px) {
          .theme-toggle {
            padding: 0.4rem 0.5rem;
            gap: 0.4rem;
          }

          .toggle-label {
            display: none;
          }

          .toggle-switch {
            width: 38px;
            height: 20px;
            border-radius: 10px;
          }

          .toggle-circle {
            width: 16px;
            height: 16px;
          }
        }

        @media (max-width: 480px) {
          .theme-toggle {
            padding: 0.35rem 0.4rem;
          }

          .toggle-switch {
            width: 36px;
            height: 18px;
            border-radius: 9px;
            padding: 1.5px;
          }

          .toggle-circle {
            width: 15px;
            height: 15px;
          }
        }
      `}</style>
    </>
  )
}
