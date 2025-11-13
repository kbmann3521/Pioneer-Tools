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
    <div className="language-selector-container">
      <label htmlFor="language-select" className="language-label">
        <p>Language:</p>
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
        .language-selector-container {
          display: flex;
          align-items: center;
          flex-direction: row;
          gap: 0.75rem;
          margin-bottom: 0;
        }

        .language-label {
          display: block;
          font-size: 0.9rem;
          font-weight: 500;
          color: var(--text-primary);
          white-space: nowrap;
          text-wrap: nowrap;
        }

        .language-label p {
          margin: 0;
          font-size: 0.9rem;
          font-weight: 500;
          color: var(--text-primary);
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
          display: block;
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
          .language-selector-container {
            display: flex;
            flex-direction: row;
            align-items: center;
            gap: 0.75rem;
          }

          .language-label {
            margin: auto auto auto 0;
          }

          .language-dropdown {
            margin-left: auto;
          }
        }
      `}</style>
    </div>
  )
}
