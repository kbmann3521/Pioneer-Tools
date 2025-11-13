'use client'

import { useState, useEffect } from 'react'
import ToolHeader from '@/app/components/ToolHeader'
import AboutToolAccordion from '@/app/components/AboutToolAccordion'
import MobileApiToggle from '@/app/components/MobileApiToggle'
import { createPassword } from '@/lib/tools/password-generator'
import { useFavorites } from '@/app/hooks/useFavorites'
import { useClipboard } from '@/app/hooks/useClipboard'
import { useApiParams } from '@/app/context/ApiParamsContext'
import { toolDescriptions } from '@/config/tool-descriptions'
import type { ToolPageProps, PasswordGeneratorResult } from '@/lib/types/tools'

export default function PasswordGeneratorPage(): JSX.Element {
  const { updateParams } = useApiParams()
  const { isSaved, toggleSave } = useFavorites('password-generator')
  const [length, setLength] = useState<number>(16)
  const [useUppercase, setUseUppercase] = useState<boolean>(true)
  const [useLowercase, setUseLowercase] = useState<boolean>(true)
  const [useNumbers, setUseNumbers] = useState<boolean>(true)
  const [useSpecialChars, setUseSpecialChars] = useState<boolean>(true)
  const [password, setPassword] = useState<string>('')
  const [strength, setStrength] = useState<PasswordGeneratorResult | null>(null)
  const { isCopied, copyToClipboard } = useClipboard()

  // Generate initial password
  useEffect(() => {
    generatePassword()
  }, [])

  const generatePassword = () => {
    try {
      const result = createPassword({
        length,
        useUppercase,
        useLowercase,
        useNumbers,
        useSpecialChars,
      })
      setPassword(result.password)
      setStrength(result)

      updateParams({
        length,
        useUppercase,
        useLowercase,
        useNumbers,
        useSpecialChars,
      })
    } catch (error) {
      alert('Please select at least one character type')
    }
  }

  const handleCopyPassword = async () => {
    await copyToClipboard(password)
  }

  const getStrengthColor = (strengthLevel: string) => {
    switch (strengthLevel) {
      case 'weak':
        return '#ff4444'
      case 'fair':
        return '#ffaa44'
      case 'good':
        return '#44aa44'
      case 'strong':
        return '#00aa00'
      default:
        return '#999'
    }
  }

  return (
    <div className="tool-container">
      <ToolHeader
        title="Password Generator"
        description="Create strong, random passwords with customizable character types"
        isSaved={isSaved}
        onToggleSave={toggleSave}
        toolId="password-generator"
      />

      <div className="tool-content">
        <div className="password-controls">
          <div className="control-group">
            <label htmlFor="length-input">Password Length:</label>
            <div className="length-input-group">
              <input
                id="length-input"
                type="range"
                min="4"
                max="128"
                value={length}
                onChange={e => setLength(Number(e.target.value))}
                className="length-slider"
              />
              <input
                type="number"
                min="4"
                max="128"
                value={length}
                onChange={e => setLength(Math.max(4, Math.min(128, Number(e.target.value))))}
                className="length-number"
              />
            </div>
          </div>

          <div className="checkbox-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={useUppercase}
                onChange={e => setUseUppercase(e.target.checked)}
              />
              <span>Uppercase (A-Z)</span>
            </label>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={useLowercase}
                onChange={e => setUseLowercase(e.target.checked)}
              />
              <span>Lowercase (a-z)</span>
            </label>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={useNumbers}
                onChange={e => setUseNumbers(e.target.checked)}
              />
              <span>Numbers (0-9)</span>
            </label>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={useSpecialChars}
                onChange={e => setUseSpecialChars(e.target.checked)}
              />
              <span>Special Characters (!@#$...)</span>
            </label>
          </div>

          <button className="generate-btn" onClick={generatePassword} type="button">
            Generate Password
          </button>
        </div>

        {password && (
          <div className="results-container">
            <div className="result-section">
              <div className="section-header">
                <h3>Generated Password</h3>
                <button
                  className="copy-btn"
                  onClick={handleCopyPassword}
                  title="Copy password"
                  type="button"
                >
                  {isCopied ? 'Copied!' : 'Copy'}
                </button>
              </div>
              <div className="password-output">
                <code>{password}</code>
              </div>
            </div>

            {strength && (
              <div className="strength-section">
                <h3>Password Strength</h3>
                <div className="strength-bar">
                  <div
                    className="strength-fill"
                    style={{
                      width: `${(strength.score / 7) * 100}%`,
                      backgroundColor: getStrengthColor(strength.strength),
                    }}
                  />
                </div>
                <p className="strength-label" style={{ color: getStrengthColor(strength.strength) }}>
                  {strength.strength.charAt(0).toUpperCase() + strength.strength.slice(1)}
                </p>
              </div>
            )}
          </div>
        )}

      </div>

      <MobileApiToggle />

      <AboutToolAccordion
        toolId="password-generator"
        content={toolDescriptions['password-generator']}
      />
    </div>
  )
}
