'use client'

export type CodeLanguage = 'fetch' | 'curl' | 'python' | 'nodejs' | 'java' | 'go' | 'csharp' | 'ruby' | 'php' | 'typescript'

interface CodeLanguageSelectorProps {
  language: CodeLanguage
  onLanguageChange: (lang: CodeLanguage) => void
}

const LANGUAGES: { value: CodeLanguage; label: string }[] = [
  { value: 'fetch', label: 'Fetch (JavaScript)' },
  { value: 'typescript', label: 'TypeScript' },
  { value: 'nodejs', label: 'Node.js' },
  { value: 'curl', label: 'cURL' },
  { value: 'python', label: 'Python' },
  { value: 'java', label: 'Java' },
  { value: 'go', label: 'Go' },
  { value: 'csharp', label: 'C#' },
  { value: 'ruby', label: 'Ruby' },
  { value: 'php', label: 'PHP' },
]

export default function CodeLanguageSelector({ language, onLanguageChange }: CodeLanguageSelectorProps) {
  return (
    <div className="language-selector-wrapper">
      <label htmlFor="language-select" className="language-label">
        Select Language:
      </label>
      <select
        id="language-select"
        value={language}
        onChange={e => onLanguageChange(e.target.value as CodeLanguage)}
        className="language-dropdown"
      >
        {LANGUAGES.map(lang => (
          <option key={lang.value} value={lang.value}>
            {lang.label}
          </option>
        ))}
      </select>

      <style jsx>{`
        .language-selector-wrapper {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin-bottom: 1rem;
        }

        .language-label {
          font-size: 0.9rem;
          font-weight: 500;
          color: var(--text-primary);
          white-space: nowrap;
        }

        .language-dropdown {
          padding: 0.5rem 0.75rem;
          border-radius: 4px;
          border: 1px solid var(--border-color);
          background: var(--bg-primary);
          color: var(--text-primary);
          font-size: 0.9rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
          font-family: inherit;
          min-width: 200px;
        }

        .language-dropdown:hover {
          border-color: var(--color-primary);
        }

        .language-dropdown:focus {
          outline: none;
          border-color: var(--color-primary);
          box-shadow: 0 0 0 2px rgba(var(--color-primary-rgb), 0.1);
        }

        @media (max-width: 640px) {
          .language-selector-wrapper {
            flex-direction: column;
            align-items: flex-start;
          }

          .language-dropdown {
            width: 100%;
            min-width: unset;
          }
        }
      `}</style>
    </div>
  )
}
