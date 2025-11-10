'use client'

import { useState, useRef, useEffect } from 'react'
import { formatBalance, formatCost, getToolCost } from '@/config/pricing.config'
import { useAuth } from '@/app/context/AuthContext'

// Use actual pricing from config instead of hard-coded value
const CASE_CONVERTER_COST = getToolCost('case-converter')

interface RateLimitTestLog {
  timestamp: number
  callNumber: number
  success: boolean
  statusCode: number
  message: string
  responseTime: number
}

interface RateLimitTestStats {
  total: number
  successful: number
  failed: number
  rateLimitHits: number
  startTime: number
  endTime: number
  actualRps: number
}

export default function TestPage() {
  const { user, session, loading: authLoading } = useAuth()
  const [text, setText] = useState('hello world')
  const [result, setResult] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [totalCharged, setTotalCharged] = useState(0)
  const [callCount, setCallCount] = useState(0)
  const [userApiKey, setUserApiKey] = useState<string | null>(null)
  const [fetchingApiKey, setFetchingApiKey] = useState(false)

  // Rate limit test state
  const [callsPerSecond, setCallsPerSecond] = useState(2)
  const [totalTestCalls, setTotalTestCalls] = useState(10)
  const [isRunningTest, setIsRunningTest] = useState(false)
  const [testLogs, setTestLogs] = useState<RateLimitTestLog[]>([])
  const [testStats, setTestStats] = useState({
    total: 0,
    successful: 0,
    failed: 0,
    rateLimitHits: 0,
    startTime: 0,
    endTime: 0,
  })
  const testAbortRef = useRef(false)
  const testAbortControllerRef = useRef<AbortController | null>(null)
  const testPendingCallsRef = useRef<Promise<void>[]>([])

  // Fetch user's API key on component mount or when user changes
  useEffect(() => {
    if (user && session?.access_token && !userApiKey) {
      fetchUserApiKey()
    }
  }, [user, session, userApiKey])

  const fetchUserApiKey = async () => {
    if (!session?.access_token) return

    setFetchingApiKey(true)
    try {
      const response = await fetch('/api/account/api-keys', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch API keys: ${response.status}`)
      }

      const keys = await response.json()

      // Handle error response
      if (keys?.error) {
        throw new Error(keys.error)
      }

      // Check if we got an array of keys
      if (!Array.isArray(keys)) {
        throw new Error('Invalid response format from API')
      }

      if (keys.length > 0) {
        // Use the first key (usually the default one)
        setUserApiKey(keys[0].key)
      } else {
        // No API keys found - try to create one
        console.warn('No API keys found, attempting to create one...')
        await createDefaultApiKey()
      }
    } catch (err) {
      console.error('Error fetching API keys:', err)
      setError(`Failed to load your API key: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setFetchingApiKey(false)
    }
  }

  const createDefaultApiKey = async () => {
    if (!session?.access_token) return

    try {
      const response = await fetch('/api/account/api-keys', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          label: 'Default Key',
        }),
      })

      if (!response.ok) {
        throw new Error(`Failed to create API key: ${response.status}`)
      }

      const data = await response.json()

      if (data?.error) {
        throw new Error(data.error)
      }

      if (data?.key) {
        setUserApiKey(data.key)
        setError(null)
      } else {
        throw new Error('No key returned from API')
      }
    } catch (err) {
      console.error('Error creating API key:', err)
      setError(`Failed to create API key: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  const handleConvert = async () => {
    if (!user) {
      setError('Please sign up to test the API')
      return
    }

    if (fetchingApiKey) {
      setError('Still loading your API key... please wait')
      return
    }

    if (!userApiKey) {
      setError('No API key found. Please refresh the page or sign up again.')
      return
    }

    if (!text.trim()) {
      setError('Please enter text to convert')
      return
    }

    setLoading(true)
    setError(null)
    setResult(null)

    try {
      // Call the case-converter API with the user's API key
      const response = await fetch('/api/tools/case-converter', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userApiKey}`,
        },
        body: JSON.stringify({
          text: text,
          format: 'uppercase', // uppercase the text
        }),
      })

      let errorMessage = ''
      let data: any = null

      try {
        data = await response.json()
      } catch (parseError) {
        // Response body couldn't be parsed
        errorMessage = response.statusText || 'Unable to parse response'
      }

      if (!response.ok) {
        // Extract error message from new unified response format
        const errorMessage = typeof data?.error === 'object'
          ? data.error.message
          : data?.error || errorMessage || `API error: ${response.status}`

        let finalError = errorMessage
        if (response.status === 401) {
          finalError = `🔐 Unauthorized: ${errorMessage}`
        } else if (response.status === 429) {
          finalError = `⚡ Rate limited: ${errorMessage}`
        } else if (response.status === 402) {
          finalError = `💰 Insufficient balance: ${errorMessage}`
        }

        throw new Error(finalError)
      }

      // Update stats
      setResult(data?.data?.uppercase || '')
      setCallCount(c => c + 1)
      setTotalCharged(prev => prev + CASE_CONVERTER_COST)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  const runRateLimitTest = async () => {
    if (!user) {
      setError('Please sign up to run tests')
      return
    }

    if (fetchingApiKey) {
      setError('Still loading your API key... please wait')
      return
    }

    if (!userApiKey) {
      setError('No API key found. Please refresh the page or sign up again.')
      return
    }

    testAbortRef.current = false
    testAbortControllerRef.current = new AbortController()
    testPendingCallsRef.current = []
    setIsRunningTest(true)
    setTestLogs([])

    const startTime = Date.now()
    setTestStats({
      total: 0,
      successful: 0,
      failed: 0,
      rateLimitHits: 0,
      startTime,
      endTime: 0,
      actualRps: 0,
    })

    const logs: RateLimitTestLog[] = []
    let successCount = 0
    let failCount = 0
    let rateLimitHits = 0
    const completedTimestamps: number[] = [] // Track when each call completes for RPS calculation

    // Helper function to make a single API call
    const makeCall = async (callNumber: number): Promise<void> => {
      if (testAbortRef.current) return

      const callStartTime = performance.now()

      try {
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userApiKey}`,
        }

        const response = await fetch('/api/tools/case-converter', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            text: `test call ${callNumber}`,
            format: 'uppercase',
          }),
          signal: testAbortControllerRef.current?.signal,
        })

        const responseTime = performance.now() - callStartTime
        const isSuccess = response.ok
        const isRateLimitError = response.status === 429

        let errorMessage = ''
        try {
          const data = await response.json()
          // Extract error message from new unified response format
          errorMessage = typeof data?.error === 'object'
            ? data.error.message
            : data?.error || response.statusText
        } catch (parseError) {
          errorMessage = response.statusText || 'Unknown error'
        }

        if (isSuccess) {
          successCount++
        } else {
          failCount++
          if (isRateLimitError) {
            rateLimitHits++
          }
        }

        // Track completion time for RPS calculation
        completedTimestamps.push(Date.now())

        // Format message based on status code
        let displayMessage = errorMessage
        if (response.status === 401) {
          displayMessage = `🔐 Unauthorized - ${errorMessage}`
        } else if (response.status === 429) {
          displayMessage = `⚡ Rate limited - ${errorMessage}`
        } else if (response.status === 402) {
          displayMessage = `💰 Insufficient balance - ${errorMessage}`
        }

        logs.push({
          timestamp: Date.now(),
          callNumber,
          success: isSuccess,
          statusCode: response.status,
          message: isSuccess ? 'Success' : displayMessage,
          responseTime: Math.round(responseTime),
        })

        // Calculate actual RPS over last second
        const now = Date.now()
        const lastSecond = completedTimestamps.filter(t => now - t < 1000).length
        const elapsedSeconds = Math.max(1, (now - startTime) / 1000)
        const actualRps = completedTimestamps.length / elapsedSeconds

        setTestLogs([...logs])
        setTestStats(prev => ({
          ...prev,
          total: logs.length,
          successful: successCount,
          failed: failCount,
          rateLimitHits: rateLimitHits,
          actualRps: Math.round(actualRps * 100) / 100, // Round to 2 decimals
        }))

        // Stop if we hit a rate limit
        if (isRateLimitError) {
          console.log(`✋ Rate limit hit on call ${callNumber}`)
          testAbortRef.current = true
        }
      } catch (err) {
        // Skip logging abort errors (test was stopped)
        if (err instanceof Error && err.name === 'AbortError') {
          return
        }

        failCount++
        const errorMsg = err instanceof Error ? err.message : 'Unknown error'

        logs.push({
          timestamp: Date.now(),
          callNumber,
          success: false,
          statusCode: 0,
          message: errorMsg,
          responseTime: Math.round(performance.now() - callStartTime),
        })

        const now = Date.now()
        const elapsedSeconds = Math.max(1, (now - startTime) / 1000)
        const actualRps = completedTimestamps.length / elapsedSeconds

        setTestLogs([...logs])
        setTestStats(prev => ({
          ...prev,
          total: logs.length,
          successful: successCount,
          failed: failCount,
          actualRps: Math.round(actualRps * 100) / 100,
        }))
      }
    }

    // Fire calls with aggressive concurrency to match target RPS
    // Estimate how many concurrent calls we need in flight based on average response time
    // For now, use a reasonable default concurrency (callsPerSecond * 0.5 to keep ~0.5s of requests pending)
    const targetConcurrency = Math.max(2, Math.ceil(callsPerSecond * 0.3))
    const timeBetweenLaunches = 1000 / Math.max(callsPerSecond, 1) // ms between launching each call

    let callCount = 0
    let nextLaunchTime = Date.now()

    // Launch calls to maintain target concurrency and RPS
    while (callCount < totalTestCalls && !testAbortRef.current) {
      const now = Date.now()

      // Launch multiple calls if we're behind on concurrency
      const callsInFlight = testPendingCallsRef.current.length
      const callsToLaunch = Math.min(
        Math.max(1, targetConcurrency - callsInFlight),
        totalTestCalls - callCount
      )

      for (let j = 0; j < callsToLaunch && callCount < totalTestCalls; j++) {
        callCount++

        // Create and track the call promise
        const callPromise = makeCall(callCount).catch(err => {
          if (err?.name !== 'AbortError') {
            console.error('Call error:', err)
          }
        })

        // Add to pending calls and remove when done
        testPendingCallsRef.current.push(callPromise)
        callPromise.finally(() => {
          testPendingCallsRef.current = testPendingCallsRef.current.filter(p => p !== callPromise)
        })
      }

      // Wait until it's time to launch the next batch
      nextLaunchTime = Math.max(nextLaunchTime + timeBetweenLaunches, now)
      const delay = Math.min(nextLaunchTime - now, 100) // Cap delay at 100ms to stay responsive

      if (delay > 0 && callCount < totalTestCalls) {
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }

    // Wait for all pending calls to complete
    if (testPendingCallsRef.current.length > 0) {
      await Promise.allSettled(testPendingCallsRef.current)
    }

    setTestStats(prev => ({
      ...prev,
      endTime: Date.now(),
    }))
    setIsRunningTest(false)
  }

  const stopTest = () => {
    testAbortRef.current = true
    // Abort all in-flight requests
    if (testAbortControllerRef.current) {
      testAbortControllerRef.current.abort()
    }
    setIsRunningTest(false)
    setTestStats(prev => ({
      ...prev,
      endTime: Date.now(),
    }))
  }

  if (authLoading) {
    return (
      <div style={styles.container}>
        <div style={{ textAlign: 'center', marginTop: '100px' }}>
          <p>Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <h1>🧪 API Endpoint Test Page</h1>
          <p style={styles.subtitle}>Testing case-converter with billing & rate limits</p>
        </div>
        <div style={styles.card}>
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <p style={{ fontSize: '18px', marginBottom: '20px' }}>
              You need to sign up to use the test page
            </p>
            <a href="/auth" style={{
              ...styles.button,
              display: 'inline-block',
              textDecoration: 'none',
              textAlign: 'center' as const,
            }}>
              📝 Sign Up / Login
            </a>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1>🧪 API Endpoint Test Page</h1>
        <p style={styles.subtitle}>Testing case-converter with billing & rate limits</p>
        <p style={styles.warning}>⚠️ Delete this page when done testing</p>
        {fetchingApiKey && (
          <p style={{ fontSize: '12px', opacity: 0.6, marginTop: '12px', color: '#ffaa00' }}>
            🔄 Loading API key...
          </p>
        )}
        {userApiKey && !fetchingApiKey && (
          <p style={{ fontSize: '12px', opacity: 0.6, marginTop: '12px', color: '#22aa22' }}>
            ✅ Using API Key: <code>{userApiKey.substring(0, 10)}...{userApiKey.substring(userApiKey.length - 6)}</code>
          </p>
        )}
        {!userApiKey && !fetchingApiKey && error && (
          <p style={{ fontSize: '12px', opacity: 0.6, marginTop: '12px', color: '#ff6666' }}>
            ❌ {error}
          </p>
        )}
      </div>

      <div style={styles.card}>
        <h2>Test Case Converter Endpoint</h2>

        <div style={styles.section}>
          <label style={styles.label}>Text to Convert:</label>
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            style={styles.textarea}
            placeholder="Enter text here..."
            disabled={loading}
          />
        </div>

        <button
          onClick={handleConvert}
          disabled={loading}
          style={{
            ...styles.button,
            opacity: loading ? 0.6 : 1,
            cursor: loading ? 'not-allowed' : 'pointer',
          }}
        >
          {loading ? 'Converting...' : '⚡ Convert (Triggers Charge)'}
        </button>

        {error && (
          <div style={styles.error}>
            <strong>❌ Error:</strong> {error}
          </div>
        )}

        {result && (
          <div style={styles.success}>
            <strong>✅ Result:</strong>
            <p style={styles.resultText}>{result}</p>
            <p style={styles.costNote}>
              💰 Charged: {formatCost(CASE_CONVERTER_COST)} per call
            </p>
          </div>
        )}
      </div>

      <div style={styles.stats}>
        <div style={styles.statCard}>
          <div style={styles.statLabel}>Total Calls</div>
          <div style={styles.statValue}>{callCount}</div>
        </div>

        <div style={styles.statCard}>
          <div style={styles.statLabel}>Total Charged</div>
          <div style={styles.statValue}>{formatBalance(totalCharged)}</div>
        </div>

        <div style={styles.statCard}>
          <div style={styles.statLabel}>Cost Per Call</div>
          <div style={styles.statValue}>{formatCost(CASE_CONVERTER_COST)}</div>
        </div>
      </div>

      <div style={styles.infoBox}>
        <h3>📋 How This Works</h3>
        <ul style={styles.list}>
          <li>Each click sends a request to <code>/api/tools/case-converter</code></li>
          <li>Authorization header includes your API key: <code>{userApiKey ? `${userApiKey.substring(0, 10)}...${userApiKey.substring(userApiKey.length - 6)}` : 'Loading...'}</code></li>
          <li>The API rate limiter validates the key and checks your balance</li>
          <li>Each call costs {formatCost(CASE_CONVERTER_COST)} (deducted from your account if you add funds)</li>
          <li>If balance drops below auto-recharge threshold, a charge is triggered</li>
        </ul>
      </div>

      <div style={styles.infoBox}>
        <h3>🔍 What To Watch For</h3>
        <ul style={styles.list}>
          <li>Check dashboard balance after each call - it should decrease by {formatCost(CASE_CONVERTER_COST)}</li>
          <li>Check Recent Activity for the charge transactions</li>
          <li>When balance drops below $5.00 (your threshold), auto-recharge should trigger</li>
          <li>Look for an "auto_recharge" transaction in Recent Activity</li>
          <li>Balance should jump back up by $15.00 (your recharge amount) after auto-recharge</li>
        </ul>
      </div>

      <div style={styles.card}>
        <h2>⚡ Rate Limit Testing</h2>
        <p style={{ opacity: 0.7, marginBottom: '20px' }}>
          Test your account rate limits: Unfunded accounts (100 calls/day, 1 req/sec), Funded accounts (unlimited, 10 req/sec). Your current balance: <strong>${(0).toFixed(2)}</strong>
        </p>

        <div style={styles.configGrid}>
          <div style={styles.configSection}>
            <label style={styles.label}>Note:</label>
            <p style={{ fontSize: '13px', opacity: 0.7, marginBottom: 0 }}>
              All users now have API keys. Rate limits depend on your account balance:
            </p>
            <ul style={{ fontSize: '12px', opacity: 0.6, marginTop: '8px', marginBottom: 0 }}>
              <li><strong>$0.00 balance:</strong> 100 calls/day, 1 req/sec (free tier)</li>
              <li><strong>&gt;$0.00 balance:</strong> Unlimited calls, 10 req/sec (paid tier)</li>
            </ul>
          </div>

          <div style={styles.configSection}>
            <label style={styles.label}>
              Calls Per Second: <strong>{callsPerSecond}</strong>
            </label>
            <input
              type="range"
              min="1"
              max="50"
              value={callsPerSecond}
              onChange={e => setCallsPerSecond(parseInt(e.target.value))}
              style={styles.slider}
              disabled={isRunningTest}
            />
            <small style={{ opacity: 0.6 }}>Min: 1, Max: 50 (free tier limit: 1 req/sec, paid: 10 req/sec)</small>
          </div>

          <div style={styles.configSection}>
            <label style={styles.label}>
              Total Calls to Attempt: <strong>{totalTestCalls}</strong>
            </label>
            <input
              type="range"
              min="5"
              max="200"
              value={totalTestCalls}
              onChange={e => setTotalTestCalls(parseInt(e.target.value))}
              style={styles.slider}
              disabled={isRunningTest}
            />
            <small style={{ opacity: 0.6 }}>Test will stop early if rate limit is hit</small>
          </div>
        </div>

        <div style={styles.buttonContainer}>
          <button
            onClick={runRateLimitTest}
            disabled={isRunningTest}
            style={{
              ...styles.button,
              backgroundColor: isRunningTest ? '#666' : '#22aa22',
              opacity: isRunningTest ? 0.6 : 1,
            }}
          >
            {isRunningTest ? '🔄 Running Test...' : '▶️ Start Rate Limit Test'}
          </button>
          {isRunningTest && (
            <button
              onClick={stopTest}
              style={{
                ...styles.button,
                backgroundColor: '#ff4444',
              }}
            >
              ⏹️ Stop Test
            </button>
          )}
        </div>

        {testStats.total > 0 && (
          <>
            <div style={styles.testStatsGrid}>
              <div style={styles.testStatCard}>
                <div style={styles.testStatLabel}>Total Calls</div>
                <div style={styles.testStatValue}>{testStats.total}</div>
              </div>
              <div style={styles.testStatCard}>
                <div style={styles.testStatLabel}>Successful</div>
                <div style={{ ...styles.testStatValue, color: '#22ff22' }}>
                  {testStats.successful}
                </div>
              </div>
              <div style={styles.testStatCard}>
                <div style={styles.testStatLabel}>Failed</div>
                <div style={{ ...styles.testStatValue, color: '#ff6666' }}>
                  {testStats.failed}
                </div>
              </div>
              <div style={styles.testStatCard}>
                <div style={styles.testStatLabel}>Rate Limit Hits</div>
                <div style={{ ...styles.testStatValue, color: '#ffaa00' }}>
                  {testStats.rateLimitHits}
                </div>
              </div>
              <div style={styles.testStatCard}>
                <div style={styles.testStatLabel}>Actual RPS</div>
                <div style={{ ...styles.testStatValue, color: '#00d4ff' }}>
                  {testStats.actualRps.toFixed(2)}
                </div>
              </div>
              {testStats.endTime > 0 && (
                <div style={styles.testStatCard}>
                  <div style={styles.testStatLabel}>Duration</div>
                  <div style={styles.testStatValue}>
                    {((testStats.endTime - testStats.startTime) / 1000).toFixed(1)}s
                  </div>
                </div>
              )}
            </div>

            {/* Real-time RPS Meter */}
            <div style={styles.rpsMeterContainer}>
              <div style={styles.rpsLabel}>
                Real-time Requests/Second: <strong>{testStats.actualRps.toFixed(2)}</strong> / Target: <strong>{callsPerSecond}</strong>
              </div>
              <div style={styles.rpsBarBackground}>
                <div
                  style={{
                    ...styles.rpsBarFill,
                    width: `${Math.min(100, (testStats.actualRps / Math.max(callsPerSecond, 1)) * 100)}%`,
                  }}
                />
              </div>
              <div style={styles.rpsBarLabels}>
                <span>0</span>
                <span>{callsPerSecond} req/s</span>
              </div>
            </div>

            <div style={styles.logsContainer}>
              <h3 style={{ marginTop: 0 }}>📊 Test Logs (Latest First)</h3>
              <div style={styles.logsList}>
                {[...testLogs].reverse().slice(0, 20).map((log, idx) => (
                  <div
                    key={idx}
                    style={{
                      ...styles.logEntry,
                      borderLeftColor: log.success ? '#22aa22' : '#ff4444',
                    }}
                  >
                    <div style={styles.logHeader}>
                      <span>
                        Call #{log.callNumber} - {log.success ? '✅' : '❌'} {log.statusCode}
                      </span>
                      <span style={{ opacity: 0.6 }}>{log.responseTime}ms</span>
                    </div>
                    <div style={styles.logMessage}>{log.message}</div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

const styles = {
  container: {
    maxWidth: '900px',
    margin: '0 auto',
    padding: '40px 20px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    backgroundColor: '#0f0f0f',
    color: '#ffffff',
    minHeight: '100vh',
  } as React.CSSProperties,

  header: {
    marginBottom: '40px',
    textAlign: 'center' as const,
  } as React.CSSProperties,

  subtitle: {
    fontSize: '16px',
    opacity: 0.7,
    marginTop: '8px',
  } as React.CSSProperties,

  warning: {
    fontSize: '14px',
    color: '#ffa500',
    marginTop: '12px',
    fontWeight: 'bold',
  } as React.CSSProperties,

  card: {
    backgroundColor: '#1a1a1a',
    border: '1px solid #333',
    borderRadius: '12px',
    padding: '30px',
    marginBottom: '30px',
  } as React.CSSProperties,

  section: {
    marginBottom: '20px',
  } as React.CSSProperties,

  label: {
    display: 'block',
    marginBottom: '8px',
    fontSize: '14px',
    fontWeight: '500',
    textTransform: 'uppercase' as const,
    opacity: 0.7,
  } as React.CSSProperties,

  textarea: {
    width: '100%',
    minHeight: '100px',
    padding: '12px',
    backgroundColor: '#0f0f0f',
    border: '1px solid #333',
    borderRadius: '8px',
    color: '#ffffff',
    fontSize: '14px',
    fontFamily: 'monospace',
    resize: 'vertical' as const,
  } as React.CSSProperties,

  button: {
    width: '100%',
    padding: '12px 24px',
    backgroundColor: '#7c3aed',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
    marginBottom: '20px',
  } as React.CSSProperties,

  error: {
    padding: '12px 16px',
    backgroundColor: '#ff4444',
    border: '1px solid #cc0000',
    borderRadius: '8px',
    color: 'white',
    marginBottom: '20px',
    fontSize: '14px',
  } as React.CSSProperties,

  success: {
    padding: '16px',
    backgroundColor: '#0a3d0a',
    border: '1px solid #22aa22',
    borderRadius: '8px',
    color: '#22ff22',
  } as React.CSSProperties,

  resultText: {
    fontFamily: 'monospace',
    backgroundColor: '#000000',
    padding: '12px',
    borderRadius: '6px',
    marginTop: '8px',
    wordBreak: 'break-word' as const,
  } as React.CSSProperties,

  costNote: {
    marginTop: '12px',
    fontSize: '13px',
    opacity: 0.8,
  } as React.CSSProperties,

  stats: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '16px',
    marginBottom: '30px',
  } as React.CSSProperties,

  statCard: {
    backgroundColor: '#1a1a1a',
    border: '1px solid #333',
    borderRadius: '8px',
    padding: '20px',
    textAlign: 'center' as const,
  } as React.CSSProperties,

  statLabel: {
    fontSize: '12px',
    opacity: 0.6,
    textTransform: 'uppercase' as const,
    marginBottom: '8px',
  } as React.CSSProperties,

  statValue: {
    fontSize: '28px',
    fontWeight: 'bold',
    color: '#7c3aed',
  } as React.CSSProperties,

  infoBox: {
    backgroundColor: '#1a1a1a',
    border: '1px solid #333',
    borderRadius: '8px',
    padding: '20px',
    marginBottom: '20px',
  } as React.CSSProperties,

  list: {
    marginLeft: '20px',
    opacity: 0.8,
    lineHeight: '1.8',
  } as React.CSSProperties,

  configGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '20px',
    marginBottom: '20px',
  } as React.CSSProperties,

  configSection: {
    backgroundColor: '#0f0f0f',
    padding: '16px',
    borderRadius: '8px',
    border: '1px solid #333',
  } as React.CSSProperties,

  buttonGroup: {
    display: 'flex',
    gap: '8px',
    marginTop: '8px',
  } as React.CSSProperties,

  modeButton: {
    flex: 1,
    padding: '8px 12px',
    backgroundColor: '#333',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  } as React.CSSProperties,

  slider: {
    width: '100%',
    marginTop: '8px',
    marginBottom: '8px',
    cursor: 'pointer',
  } as React.CSSProperties,

  buttonContainer: {
    display: 'flex',
    gap: '10px',
    marginBottom: '20px',
  } as React.CSSProperties,

  testStatsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: '12px',
    marginBottom: '20px',
  } as React.CSSProperties,

  testStatCard: {
    backgroundColor: '#0f0f0f',
    border: '1px solid #333',
    borderRadius: '8px',
    padding: '12px',
    textAlign: 'center' as const,
  } as React.CSSProperties,

  testStatLabel: {
    fontSize: '11px',
    opacity: 0.6,
    textTransform: 'uppercase' as const,
    marginBottom: '6px',
  } as React.CSSProperties,

  testStatValue: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#7c3aed',
  } as React.CSSProperties,

  logsContainer: {
    backgroundColor: '#0f0f0f',
    border: '1px solid #333',
    borderRadius: '8px',
    padding: '16px',
    marginTop: '20px',
  } as React.CSSProperties,

  logsList: {
    maxHeight: '400px',
    overflowY: 'auto' as const,
  } as React.CSSProperties,

  logEntry: {
    borderLeft: '4px solid #22aa22',
    paddingLeft: '12px',
    paddingTop: '8px',
    paddingBottom: '8px',
    marginBottom: '8px',
    fontSize: '13px',
    fontFamily: 'monospace',
    borderRadius: '4px',
    backgroundColor: '#1a1a1a',
  } as React.CSSProperties,

  logHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '4px',
    fontWeight: 'bold',
  } as React.CSSProperties,

  logMessage: {
    opacity: 0.8,
    fontSize: '12px',
    wordBreak: 'break-word' as const,
  } as React.CSSProperties,

  rpsMeterContainer: {
    backgroundColor: '#0f0f0f',
    border: '1px solid #333',
    borderRadius: '8px',
    padding: '20px',
    marginBottom: '20px',
  } as React.CSSProperties,

  rpsLabel: {
    fontSize: '14px',
    marginBottom: '12px',
    opacity: 0.9,
  } as React.CSSProperties,

  rpsBarBackground: {
    width: '100%',
    height: '30px',
    backgroundColor: '#1a1a1a',
    border: '1px solid #333',
    borderRadius: '4px',
    overflow: 'hidden',
    marginBottom: '8px',
  } as React.CSSProperties,

  rpsBarFill: {
    height: '100%',
    backgroundColor: '#00d4ff',
    transition: 'width 0.2s ease-out',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  } as React.CSSProperties,

  rpsBarLabels: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '12px',
    opacity: 0.6,
  } as React.CSSProperties,
}
