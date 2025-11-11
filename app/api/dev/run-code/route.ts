import { NextRequest, NextResponse } from 'next/server'
import { execSync, spawn } from 'child_process'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

type Language = 'fetch' | 'python' | 'nodejs' | 'java' | 'go' | 'csharp' | 'ruby' | 'php' | 'typescript'

interface RunCodeRequest {
  code: string
  language: Language
  apiKey: string
}

interface RunCodeResponse {
  success: boolean
  output?: string
  error?: string
  executionTime: number
}

// Sandbox restrictions: max execution time, disable dangerous operations
const EXECUTION_TIMEOUT = 10000 // 10 seconds
const MAX_OUTPUT_SIZE = 50000 // 50KB

function sanitizeCode(code: string, language: Language): string {
  // Remove shebang lines
  code = code.replace(/^#!.*\n/, '')

  // Language-specific sanitization
  switch (language) {
    case 'python':
      // Block file operations and system calls
      const pythonBlocks = [
        '\\bopen\\(',  // Match open( as a word boundary (not urlopen)
        '__import__',
        'exec\\(',
        'eval\\(',
        'compile\\(',
        'os\\.system',
        'subprocess',
        'importlib',
      ]
      for (const block of pythonBlocks) {
        if (new RegExp(block).test(code)) {
          throw new Error(`Blocked operation in Python: ${block}`)
        }
      }
      break

    case 'php':
      const phpBlocks = ['fopen', 'fwrite', 'unlink', 'system', 'exec', 'shell_exec', 'file_']
      for (const block of phpBlocks) {
        if (code.includes(block)) {
          throw new Error(`Blocked operation in PHP: ${block}`)
        }
      }
      break

    case 'nodejs':
    case 'typescript':
      const jsBlocks = ["require('fs')", "require('child_process')", 'fs\\.', 'child_process\\.']
      for (const block of jsBlocks) {
        if (new RegExp(block).test(code)) {
          throw new Error(`Blocked operation in Node.js: ${block}`)
        }
      }
      break

    case 'ruby':
      const rubyBlocks = ['File\\.', 'Dir\\.', 'system\\(', 'exec\\(', 'backtick']
      for (const block of rubyBlocks) {
        if (new RegExp(block).test(code)) {
          throw new Error(`Blocked operation in Ruby: ${block}`)
        }
      }
      break

    case 'go':
      if (code.includes('ioutil') || code.includes('os.')) {
        throw new Error('File operations not allowed in Go')
      }
      break

    case 'java':
      const javaBlocks = ['java\\.nio\\.file', 'java\\.io\\.File', 'Runtime\\.getRuntime']
      for (const block of javaBlocks) {
        if (code.includes(block)) {
          throw new Error(`Blocked operation in Java: ${block}`)
        }
      }
      break

    case 'csharp':
      const csharpBlocks = ['File\\.', 'Directory\\.', 'Process\\.', 'System\\.IO']
      for (const block of csharpBlocks) {
        if (code.includes(block)) {
          throw new Error(`Blocked operation in C#: ${block}`)
        }
      }
      break
  }

  return code
}

async function executeCode(code: string, language: Language): Promise<{ output: string; error: string }> {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'code-executor-'))

  const cleanup = () => {
    try {
      fs.rmSync(tempDir, { recursive: true })
    } catch (err) {
      console.error('Failed to cleanup temp directory:', err)
    }
  }

  try {
    switch (language) {
      case 'nodejs':
      case 'typescript':
      case 'fetch': {
        const jsCode = `(async () => {
  try {
    ${code}
  } catch (err) {
    console.error(err.message);
  }
})();`
        const tempFile = path.join(tempDir, 'script.js')
        fs.writeFileSync(tempFile, jsCode)

        return new Promise((resolve) => {
          const child = spawn('node', [tempFile], {
            timeout: EXECUTION_TIMEOUT,
            stdio: ['pipe', 'pipe', 'pipe'],
          })

          let output = ''
          let error = ''

          child.stdout?.on('data', (data) => {
            output += data.toString()
          })

          child.stderr?.on('data', (data) => {
            error += data.toString()
          })

          child.on('close', (code) => {
            cleanup()
            resolve({ output: output.substring(0, MAX_OUTPUT_SIZE), error: error.substring(0, MAX_OUTPUT_SIZE) })
          })

          setTimeout(() => {
            child.kill()
            cleanup()
            resolve({ output: '', error: 'Execution timeout (10s exceeded)' })
          }, EXECUTION_TIMEOUT)
        })
      }

      case 'python': {
        const tempFile = path.join(tempDir, 'script.py')
        fs.writeFileSync(tempFile, code)

        return new Promise((resolve) => {
          // Try 'python' first (Windows), then 'python3' (Linux/Mac)
          const pythonCmd = process.platform === 'win32' ? 'python' : 'python3'
          const child = spawn(pythonCmd, [tempFile], {
            timeout: EXECUTION_TIMEOUT,
            stdio: ['pipe', 'pipe', 'pipe'],
          })

          let output = ''
          let error = ''

          child.stdout?.on('data', (data) => {
            output += data.toString()
          })

          child.stderr?.on('data', (data) => {
            error += data.toString()
          })

          child.on('close', (code) => {
            cleanup()
            resolve({ output: output.substring(0, MAX_OUTPUT_SIZE), error: error.substring(0, MAX_OUTPUT_SIZE) })
          })

          setTimeout(() => {
            child.kill()
            cleanup()
            resolve({ output: '', error: 'Execution timeout (10s exceeded)' })
          }, EXECUTION_TIMEOUT)
        })
      }

      case 'ruby': {
        const tempFile = path.join(tempDir, 'script.rb')
        fs.writeFileSync(tempFile, code)

        return new Promise((resolve) => {
          const child = spawn('ruby', [tempFile], {
            timeout: EXECUTION_TIMEOUT,
            stdio: ['pipe', 'pipe', 'pipe'],
          })

          let output = ''
          let error = ''

          child.stdout?.on('data', (data) => {
            output += data.toString()
          })

          child.stderr?.on('data', (data) => {
            error += data.toString()
          })

          child.on('close', (code) => {
            cleanup()
            resolve({ output: output.substring(0, MAX_OUTPUT_SIZE), error: error.substring(0, MAX_OUTPUT_SIZE) })
          })

          setTimeout(() => {
            child.kill()
            cleanup()
            resolve({ output: '', error: 'Execution timeout (10s exceeded)' })
          }, EXECUTION_TIMEOUT)
        })
      }

      case 'php': {
        const tempFile = path.join(tempDir, 'script.php')
        fs.writeFileSync(tempFile, code)

        return new Promise((resolve) => {
          const child = spawn('php', [tempFile], {
            timeout: EXECUTION_TIMEOUT,
            stdio: ['pipe', 'pipe', 'pipe'],
          })

          let output = ''
          let error = ''

          child.stdout?.on('data', (data) => {
            output += data.toString()
          })

          child.stderr?.on('data', (data) => {
            error += data.toString()
          })

          child.on('close', (code) => {
            cleanup()
            resolve({ output: output.substring(0, MAX_OUTPUT_SIZE), error: error.substring(0, MAX_OUTPUT_SIZE) })
          })

          setTimeout(() => {
            child.kill()
            cleanup()
            resolve({ output: '', error: 'Execution timeout (10s exceeded)' })
          }, EXECUTION_TIMEOUT)
        })
      }

      default:
        cleanup()
        return { output: '', error: `Language ${language} not yet supported for execution` }
    }
  } catch (err) {
    cleanup()
    throw err
  }
}

export async function POST(request: NextRequest): Promise<NextResponse<RunCodeResponse>> {
  try {
    // Check if this is a development environment
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json(
        {
          success: false,
          error: 'Code execution is disabled in production',
          executionTime: 0,
        },
        { status: 403 }
      )
    }

    const body: RunCodeRequest = await request.json()
    const { code, language, apiKey } = body

    if (!code || !language) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: code, language',
          executionTime: 0,
        },
        { status: 400 }
      )
    }

    // Validate language
    const validLanguages: Language[] = ['fetch', 'python', 'nodejs', 'java', 'go', 'csharp', 'ruby', 'php', 'typescript']
    if (!validLanguages.includes(language)) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid language: ${language}`,
          executionTime: 0,
        },
        { status: 400 }
      )
    }

    // Sanitize code
    const sanitized = sanitizeCode(code, language)

    // Execute code
    const startTime = Date.now()
    const { output, error } = await executeCode(sanitized, language)
    const executionTime = Date.now() - startTime

    if (error) {
      return NextResponse.json(
        {
          success: false,
          output: output || undefined,
          error,
          executionTime,
        },
        { status: 200 } // Return 200 even for execution errors (they're not server errors)
      )
    }

    return NextResponse.json(
      {
        success: true,
        output,
        executionTime,
      },
      { status: 200 }
    )
  } catch (err) {
    console.error('Error in /api/dev/run-code:', err)
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : 'Internal server error',
        executionTime: 0,
      },
      { status: 500 }
    )
  }
}
