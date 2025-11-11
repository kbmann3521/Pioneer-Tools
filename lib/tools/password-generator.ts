interface PasswordOptions {
  length: number
  useUppercase: boolean
  useLowercase: boolean
  useNumbers: boolean
  useSpecialChars: boolean
}

const UPPERCASE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
const LOWERCASE = 'abcdefghijklmnopqrstuvwxyz'
const NUMBERS = '0123456789'
const SPECIAL_CHARS = '!@#$%^&*()_+-=[]{}|;:,.<>?'

export function generatePassword(options: PasswordOptions): string {
  let chars = ''

  if (options.useUppercase) chars += UPPERCASE
  if (options.useLowercase) chars += LOWERCASE
  if (options.useNumbers) chars += NUMBERS
  if (options.useSpecialChars) chars += SPECIAL_CHARS

  if (chars.length === 0) {
    throw new Error('At least one character type must be selected')
  }

  let password = ''
  for (let i = 0; i < options.length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length))
  }

  return password
}

export function calculatePasswordStrength(password: string): {
  strength: 'weak' | 'fair' | 'good' | 'strong'
  score: number
} {
  let score = 0

  if (password.length >= 8) score++
  if (password.length >= 12) score++
  if (password.length >= 16) score++
  if (/[a-z]/.test(password)) score++
  if (/[A-Z]/.test(password)) score++
  if (/[0-9]/.test(password)) score++
  if (/[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(password)) score++

  let strength: 'weak' | 'fair' | 'good' | 'strong' = 'weak'
  if (score >= 5) strength = 'good'
  if (score >= 6) strength = 'strong'
  if (score === 2) strength = 'fair'

  return { strength, score: Math.min(score, 7) }
}

export function createPassword(options: PasswordOptions) {
  const password = generatePassword(options)
  const strength = calculatePasswordStrength(password)

  return {
    password,
    strength: strength.strength,
    metrics: {
      length: password.length,
      hasUppercase: /[A-Z]/.test(password),
      hasLowercase: /[a-z]/.test(password),
      hasNumbers: /[0-9]/.test(password),
      hasSpecialChars: /[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(password),
    },
  }
}
