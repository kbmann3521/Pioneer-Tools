'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/app/context/AuthContext'
import { useClipboard } from '@/app/hooks/useClipboard'
import CopyFeedback from '@/app/components/CopyFeedback'
import SaveFeedback from '@/app/components/SaveFeedback'
import Header from '@/app/components/Header'
import { supabase } from '@/lib/supabaseClient'
import { formatBalance, PRICING, formatCost } from '@/config/pricing.config'

interface ApiKey {
  id: string
  label: string
  key: string
  created_at: string
  last_used: string | null
}

interface UserProfile {
  id: string
  email: string
  balance: number
  auto_recharge_enabled: boolean
  auto_recharge_threshold: number | null
  auto_recharge_amount: number | null
  monthly_spending_limit: number | null
  usage_this_month: number
}

interface BillingTransaction {
  id: string
  type: 'charge' | 'deposit' | 'auto_recharge' | 'refund'
  amount: number
  tool_name: string | null
  description: string | null
  created_at: string
}

export default function DashboardPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, session, loading: authLoading, signOut } = useAuth()
  const [theme, setTheme] = useState<string>('dark')
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([])
  const [transactions, setTransactions] = useState<BillingTransaction[]>([])
  const [loading, setLoading] = useState(true)
  const [showNewKeyForm, setShowNewKeyForm] = useState(false)
  const [newKeyLabel, setNewKeyLabel] = useState('')
  const [createdKey, setCreatedKey] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Save feedback messages for each section
  const [budgetSaveMessage, setBudgetSaveMessage] = useState<string | null>(null)
  const [autoRechargeSaveMessage, setAutoRechargeSaveMessage] = useState<string | null>(null)
  const [copiedKeyId, setCopiedKeyId] = useState<string | null>(null)

  // Auto-recharge form state
  const [showAutoRechargeForm, setShowAutoRechargeForm] = useState(false)
  const [autoRechargeEnabled, setAutoRechargeEnabled] = useState(false)
  const [threshold, setThreshold] = useState<string>('')
  const [rechargeAmount, setRechargeAmount] = useState<string>('')

  // Monthly budget form state
  const [showBudgetForm, setShowBudgetForm] = useState(false)
  const [monthlyBudget, setMonthlyBudget] = useState<string>('')

  // Activity tabs
  const [activeActivityTab, setActiveActivityTab] = useState<'payments' | 'calls' | 'errors'>('payments')
  const [expandedCallGroup, setExpandedCallGroup] = useState<string | null>(null)
  const [paymentsPage, setPaymentsPage] = useState(0)
  const [errorsPage, setErrorsPage] = useState(0)
  const ITEMS_PER_PAGE = 5

  // Add funds form state
  const [showAddFundsForm, setShowAddFundsForm] = useState(false)
  const [addFundsAmount, setAddFundsAmount] = useState<string>('')

  // Delete account form state
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [deletingAccount, setDeletingAccount] = useState(false)

  // Auto-recharge status
  const [autoRechargeStatus, setAutoRechargeStatus] = useState<{
    hasPaymentMethod: boolean
    successfulAttempts: number
    failedAttempts: number
    lastAttempt: string | null
  } | null>(null)
  const [recharging, setRecharging] = useState(false)

  // Load theme from localStorage on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') || 'dark'
    setTheme(savedTheme)
    document.documentElement.setAttribute('data-theme', savedTheme)
  }, [])

  // Update theme in localStorage and document when changed
  useEffect(() => {
    localStorage.setItem('theme', theme)
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth')
    }
  }, [user, authLoading, router])

  useEffect(() => {
    if (user) {
      loadData()
    }
  }, [user])

  // Refetch data when returning from Stripe payment
  useEffect(() => {
    const paymentStatus = searchParams?.get('payment')
    if (paymentStatus === 'success' && user) {
      // Delay slightly to allow webhook to process
      const timeout = setTimeout(() => {
        loadData()
      }, 1500)
      return () => clearTimeout(timeout)
    }
  }, [searchParams, user])

  const loadData = async () => {
    setLoading(true)
    try {
      // Load user profile
      let { data: profileData, error: profileError } = await supabase
        .from('users_profile')
        .select('*')
        .eq('id', user?.id)
        .single()

      // If profile doesn't exist, try to recreate it
      if (profileError || !profileData) {
        console.warn('Profile not found, attempting to recreate...')
        if (session?.access_token) {
          try {
            const ensureResponse = await fetch('/api/account/ensure-profile', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${session.access_token}`,
              },
            })
            if (ensureResponse.ok) {
              // Retry loading the profile
              const { data: newProfileData } = await supabase
                .from('users_profile')
                .select('*')
                .eq('id', user?.id)
                .single()
              profileData = newProfileData
              console.log('Profile successfully recreated')
            }
          } catch (err) {
            console.error('Failed to recreate profile:', err)
          }
        }
      }

      if (profileData) {
        setProfile({
          ...profileData,
          email: user?.email || '',
        })
        setAutoRechargeEnabled(profileData.auto_recharge_enabled || false)
        setThreshold((profileData.auto_recharge_threshold ? profileData.auto_recharge_threshold / 100 : 5).toFixed(2))
        setRechargeAmount((profileData.auto_recharge_amount ? profileData.auto_recharge_amount / 100 : 15).toFixed(2))
        setMonthlyBudget((profileData.monthly_spending_limit ? profileData.monthly_spending_limit / 100 : 100).toFixed(2))
      } else {
        setError('Failed to load user profile')
      }

      // Load API keys
      const { data: keysData } = await supabase
        .from('api_keys')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false })

      setApiKeys(keysData || [])

      // Load recent transactions (increased limit for better aggregation)
      const { data: txData } = await supabase
        .from('billing_transactions')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false })
        .limit(100)

      setTransactions(txData || [])

      // Load auto-recharge status
      if (session?.access_token) {
        loadAutoRechargeStatus(session.access_token)
      }
    } catch (err) {
      console.error('Error loading data:', err)
    } finally {
      setLoading(false)
    }
  }

  const generateApiKey = async () => {
    if (!newKeyLabel.trim()) {
      setError('Please enter a label')
      return
    }

    try {
      setError(null)

      // Get auth token from context
      if (!session?.access_token) {
        setError('Please log in')
        return
      }

      const response = await fetch('/api/account/api-keys', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ label: newKeyLabel }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to create key')
      }

      const data = await response.json()
      setCreatedKey(data.key)
      setNewKeyLabel('')
      setSuccess('API key created successfully!')

      // Refresh keys
      loadData()
    } catch (err: any) {
      setError(err.message)
    }
  }

  const deleteKey = async (keyId: string) => {
    if (!confirm('Are you sure? This cannot be undone.')) return

    try {
      // Get auth token from context
      if (!session?.access_token) {
        setError('Please log in')
        return
      }

      const response = await fetch(`/api/account/api-keys/${keyId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      })

      if (!response.ok) throw new Error('Failed to delete key')
      setSuccess('API key deleted')
      loadData()
    } catch (err) {
      setError('Failed to delete key')
    }
  }

  const deleteAccount = async () => {
    if (!profile?.email) {
      setError('Unable to verify email')
      return
    }

    if (deleteConfirmText !== profile.email) {
      setError('Email does not match. Please try again.')
      return
    }

    setDeletingAccount(true)
    try {
      setError(null)
      if (!session?.access_token) {
        setError('Please log in')
        return
      }

      const response = await fetch('/api/account/delete-account', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to delete account')
      }

      // Sign out and redirect to home
      await signOut()
      router.push('/')
    } catch (err: any) {
      setError(err.message || 'Failed to delete account')
      setDeletingAccount(false)
    }
  }

  const toggleAutoRecharge = async (enabled: boolean) => {
    try {
      setError(null)
      setAutoRechargeEnabled(enabled)

      if (!enabled) {
        // When unchecking, immediately save the disabled state
        const { error: updateError } = await supabase
          .from('users_profile')
          .update({
            auto_recharge_enabled: false,
            auto_recharge_threshold: null,
            auto_recharge_amount: null,
          })
          .eq('id', user?.id)

        if (updateError) throw updateError

        // Update local state instead of reloading
        if (profile) {
          setProfile({
            ...profile,
            auto_recharge_enabled: false,
            auto_recharge_threshold: null,
            auto_recharge_amount: null,
          })
        }

        setAutoRechargeSaveMessage('Auto-recharge disabled')
        setShowAutoRechargeForm(false)

        // Auto-clear message after 3 seconds
        setTimeout(() => setAutoRechargeSaveMessage(null), 3000)
      } else {
        // When checking, just show the form to configure
        setShowAutoRechargeForm(true)
      }
    } catch (err: any) {
      setError(err.message)
      setAutoRechargeEnabled(!enabled) // Revert on error
    }
  }

  const updateAutoRecharge = async () => {
    try {
      setError(null)
      const thresholdCents = Math.floor(parseFloat(threshold) * 100)
      const rechargeAmountCents = Math.floor(parseFloat(rechargeAmount) * 100)

      if (thresholdCents <= 0 || rechargeAmountCents <= 0) {
        setError('Please enter valid amounts')
        return
      }

      const { error: updateError } = await supabase
        .from('users_profile')
        .update({
          auto_recharge_enabled: autoRechargeEnabled,
          auto_recharge_threshold: autoRechargeEnabled ? thresholdCents : null,
          auto_recharge_amount: autoRechargeEnabled ? rechargeAmountCents : null,
        })
        .eq('id', user?.id)

      if (updateError) throw updateError

      // Update local state instead of reloading
      if (profile) {
        setProfile({
          ...profile,
          auto_recharge_enabled: autoRechargeEnabled,
          auto_recharge_threshold: autoRechargeEnabled ? thresholdCents : null,
          auto_recharge_amount: autoRechargeEnabled ? rechargeAmountCents : null,
        })
      }

      setAutoRechargeSaveMessage('Auto-recharge settings updated!')
      setShowAutoRechargeForm(false)

      // Auto-clear message after 3 seconds
      setTimeout(() => setAutoRechargeSaveMessage(null), 3000)
    } catch (err: any) {
      setError(err.message)
    }
  }

  const updateMonthlyBudget = async () => {
    try {
      setError(null)
      const budgetCents = Math.floor(parseFloat(monthlyBudget) * 100)

      if (budgetCents < 0) {
        setError('Please enter a valid amount')
        return
      }

      const { error: updateError } = await supabase
        .from('users_profile')
        .update({
          monthly_spending_limit: budgetCents || null,
        })
        .eq('id', user?.id)

      if (updateError) throw updateError

      // Update local state instead of reloading
      if (profile) {
        setProfile({
          ...profile,
          monthly_spending_limit: budgetCents || null,
        })
      }

      setBudgetSaveMessage('Monthly budget updated!')
      setShowBudgetForm(false)

      // Auto-clear message after 3 seconds
      setTimeout(() => setBudgetSaveMessage(null), 3000)
    } catch (err: any) {
      setError(err.message)
    }
  }

  const loadAutoRechargeStatus = async (accessToken?: string) => {
    const token = accessToken || session?.access_token
    if (!token) return

    try {
      const response = await fetch('/api/account/auto-recharge', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setAutoRechargeStatus({
          hasPaymentMethod: data.hasPaymentMethod,
          successfulAttempts: data.successfulAttempts,
          failedAttempts: data.failedAttempts,
          lastAttempt: data.lastAttempt,
        })
      }
    } catch (err) {
      console.error('Error loading auto-recharge status:', err)
    }
  }

  const triggerManualRecharge = async () => {
    if (!session?.access_token) {
      setError('Please log in')
      return
    }

    setRecharging(true)
    setError(null)
    setSuccess(null)

    try {
      const response = await fetch('/api/account/auto-recharge', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      })

      const data = await response.json()

      if (response.ok) {
        setSuccess(data.message || 'Auto-recharge successful!')
        loadData()
        loadAutoRechargeStatus()
        // Auto-clear success message after 5 seconds
        setTimeout(() => setSuccess(null), 5000)
      } else {
        setError(
          data.error ||
          (data.needsCheckout
            ? 'No payment method on file. Add funds via checkout first.'
            : 'Auto-recharge failed')
        )
        // Auto-clear error message after 5 seconds
        setTimeout(() => setError(null), 5000)
      }
    } catch (err: any) {
      setError(err.message || 'Failed to process auto-recharge')
      setTimeout(() => setError(null), 5000)
    } finally {
      setRecharging(false)
    }
  }

  const addFunds = async () => {
    try {
      setError(null)
      const amountCents = Math.floor(parseFloat(addFundsAmount) * 100)

      if (amountCents < PRICING.MINIMUM_DEPOSIT) {
        setError(`Minimum deposit is ${formatBalance(PRICING.MINIMUM_DEPOSIT)}`)
        return
      }

      // Get access token from auth context
      const accessToken = session?.access_token

      if (!accessToken) {
        setError('Please log in to add funds')
        return
      }

      const response = await fetch('/api/stripe/add-funds', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ amount: amountCents }),
      })

      let data
      try {
        data = await response.json()
      } catch (parseError) {
        // If response body is empty or invalid JSON
        if (!response.ok) {
          throw new Error(`API error: ${response.status} ${response.statusText}`)
        }
        throw new Error('Invalid response from server')
      }

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create checkout session')
      }

      const { url } = data
      if (!url) {
        throw new Error('No checkout URL provided')
      }

      window.location.href = url
    } catch (err: any) {
      setError(err.message || 'An error occurred')
    }
  }

  const { copyMessage, copyPosition, copyToClipboard } = useClipboard()

  const copyKeyToClipboard = (key: string, event: React.MouseEvent) => {
    copyToClipboard(key, event)
  }

  const handleSignOut = async () => {
    await signOut()
    router.push('/')
  }

  // Helper functions for activity tabs - memoized for performance
  const getPaymentTransactions = useMemo(() => {
    return transactions
      .filter(tx => tx.type === 'deposit' || tx.type === 'auto_recharge')
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  }, [transactions])

  const getApiCallTransactions = useMemo(() => {
    return transactions
      .filter(tx => tx.type === 'charge')
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  }, [transactions])

  const getErrorTransactions = useMemo(() => {
    return transactions
      .filter(tx =>
        tx.description && (
          tx.description.includes('failed') ||
          tx.description.includes('No payment method') ||
          tx.description.includes('limit reached') ||
          tx.description.includes('insufficient') ||
          tx.description.includes('Insufficient')
        )
      )
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  }, [transactions])

  // Aggregate API calls by tool and date - memoized and optimized
  const getAggregatedApiCalls = useMemo(() => {
    const grouped = new Map<string, { tool: string; date: string; count: number; total: number; calls: BillingTransaction[] }>()

    getApiCallTransactions.forEach(call => {
      const date = new Date(call.created_at).toLocaleDateString()
      const key = `${call.tool_name || 'unknown'}-${date}`

      if (!grouped.has(key)) {
        grouped.set(key, {
          tool: call.tool_name || 'Unknown Tool',
          date,
          count: 0,
          total: 0,
          calls: []
        })
      }

      const group = grouped.get(key)!
      group.count += 1
      group.total += Math.abs(call.amount)
      group.calls.push(call)
    })

    return Array.from(grouped.values()).sort((a, b) =>
      new Date(b.date).getTime() - new Date(a.date).getTime()
    )
  }, [getApiCallTransactions])

  if (authLoading || loading) {
    return <div className="dashboard-loading">Loading...</div>
  }

  return (
    <div className="dashboard-wrapper" data-theme={theme}>
      <Header theme={theme} setTheme={setTheme} onSignOut={handleSignOut} developerMode={false} />
      <div className="dashboard-container">
        <header className="dashboard-header">
        </header>

      {profile && (
        <div className="dashboard-content">
          {/* Alerts */}
          {error && <div className="alert alert-error">{error}</div>}
          {success && <div className="alert alert-success">{success}</div>}

          {/* Balance Card */}
          <section className="dashboard-section balance-section">
            <div className="balance-card">
              <div className="balance-info">
                <label>Current Balance</label>
                <p className="balance-amount">{formatBalance(profile.balance)}</p>
              </div>
              <button className="btn-primary" onClick={() => setShowAddFundsForm(true)}>
                + Add Funds
              </button>
            </div>

            {showAddFundsForm && (
              <div className="form-card">
                <h4>Add Funds to Your Account</h4>
                <div className="form-group">
                  <label>Amount (USD)</label>
                  <input
                    type="number"
                    min={PRICING.MINIMUM_DEPOSIT / 100}
                    step="0.01"
                    value={addFundsAmount}
                    onChange={(e) => setAddFundsAmount(e.target.value)}
                    placeholder="10.00"
                  />
                  <small>
                    Minimum: {formatBalance(PRICING.MINIMUM_DEPOSIT)}
                  </small>
                </div>
                <div className="form-actions">
                  <button className="btn-primary" onClick={addFunds}>
                    Proceed to Checkout
                  </button>
                  <button className="btn-secondary" onClick={() => setShowAddFundsForm(false)}>
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </section>

          {/* Usage & Budget */}
          <section className="dashboard-section">
            <h2>Usage & Budget</h2>
            <div className="info-grid">
              <div className="info-item">
                <label>Used This Month</label>
                <p>{formatBalance(profile.usage_this_month || 0)}</p>
              </div>
              <div className="info-item">
                <label>Monthly Budget</label>
                <p>
                  {profile.monthly_spending_limit
                    ? formatBalance(profile.monthly_spending_limit)
                    : 'No limit'}
                </p>
                <button
                  className="btn-secondary"
                  onClick={() => setShowBudgetForm(true)}
                >
                  Configure
                </button>
              </div>
            </div>

            <SaveFeedback message={budgetSaveMessage} />

            {showBudgetForm && (
              <div className="form-card">
                <h4>Set Monthly Spending Limit</h4>
                <div className="form-group">
                  <label>Monthly Limit (USD)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={monthlyBudget}
                    onChange={(e) => setMonthlyBudget(e.target.value)}
                    placeholder="No limit"
                  />
                  <small>Leave blank or 0 for no limit</small>
                </div>
                <div className="form-actions">
                  <button className="btn-primary" onClick={updateMonthlyBudget}>
                    Save
                  </button>
                  <button className="btn-secondary" onClick={() => setShowBudgetForm(false)}>
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </section>

          {/* Auto-Recharge Settings */}
          <section className="dashboard-section">
            <h2>Auto-Recharge Settings</h2>
            <div className="checkbox-group">
              <input
                type="checkbox"
                id="enable-recharge"
                checked={autoRechargeEnabled}
                onChange={(e) => toggleAutoRecharge(e.target.checked)}
              />
              <label htmlFor="enable-recharge">Enable auto-recharge when balance drops below threshold</label>
            </div>

            {autoRechargeEnabled && (
              <div className="info-grid">
                <div className="info-item">
                  <label>Recharge Threshold</label>
                  <p>{formatBalance(Math.floor(parseFloat(threshold) * 100))}</p>
                </div>
                <div className="info-item">
                  <label>Recharge Amount</label>
                  <p>{formatBalance(Math.floor(parseFloat(rechargeAmount) * 100))}</p>
                </div>
              </div>
            )}

            <SaveFeedback message={autoRechargeSaveMessage} />

            {showAutoRechargeForm && (
              <div className="form-card">
                <h4>Configure Auto-Recharge</h4>
                <div className="form-group">
                  <label>Recharge when balance drops below (USD)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={threshold}
                    onChange={(e) => setThreshold(e.target.value)}
                    placeholder="5.00"
                  />
                </div>
                <div className="form-group">
                  <label>Recharge amount (USD)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={rechargeAmount}
                    onChange={(e) => setRechargeAmount(e.target.value)}
                    placeholder="20.00"
                  />
                </div>
                <div className="form-actions">
                  <button className="btn-primary" onClick={updateAutoRecharge}>
                    Save
                  </button>
                  <button className="btn-secondary" onClick={() => setShowAutoRechargeForm(false)}>
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {!showAutoRechargeForm && (
              <button className="btn-secondary" onClick={() => setShowAutoRechargeForm(true)}>
                Configure
              </button>
            )}

            {autoRechargeEnabled && autoRechargeStatus && (
              <div className="auto-recharge-status">
                <h3>Auto-Recharge Status</h3>
                <div className="status-items">
                  <div className="status-item">
                    <label>Payment Method:</label>
                    <p>
                      {autoRechargeStatus.hasPaymentMethod ? (
                        <span className="status-ok">✓ On File</span>
                      ) : (
                        <span className="status-warning">
                          ⚠ None
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="status-item">
                    <label>Successful Recharges:</label>
                    <p>
                      <span className="status-ok">{autoRechargeStatus.successfulAttempts}</span>
                    </p>
                  </div>
                  <div className="status-item">
                    <label>Failed Attempts:</label>
                    <p>
                      {autoRechargeStatus.failedAttempts > 0 ? (
                        <span className="status-error">{autoRechargeStatus.failedAttempts}</span>
                      ) : (
                        <span className="status-ok">{autoRechargeStatus.failedAttempts}</span>
                      )}
                    </p>
                  </div>
                  <div className="status-item">
                    <label>Last Attempt:</label>
                    <p>
                      {autoRechargeStatus.lastAttempt
                        ? new Date(autoRechargeStatus.lastAttempt).toLocaleString()
                        : 'Never'}
                    </p>
                  </div>
                </div>

                {!autoRechargeStatus.hasPaymentMethod && (
                  <div className="alert alert-error" style={{ marginTop: '1rem' }}>
                    <p>
                      <strong>No payment method on file.</strong> To enable auto-recharge, add funds via checkout first. This will save your payment card for automatic future charges.
                    </p>
                    <button className="btn-primary" onClick={() => setShowAddFundsForm(true)} style={{ marginTop: '0.5rem' }}>
                      + Add Funds Now
                    </button>
                  </div>
                )}

                {autoRechargeStatus.hasPaymentMethod && autoRechargeStatus.successfulAttempts === 0 && autoRechargeStatus.failedAttempts === 0 && (
                  <div className="alert" style={{ marginTop: '1rem', backgroundColor: 'rgba(59, 130, 246, 0.1)', border: '1px solid #3b82f6', color: '#3b82f6' }}>
                    <p>
                      <strong>Ready to go!</strong> Auto-recharge is configured and will trigger automatically when your balance drops below the threshold.
                    </p>
                  </div>
                )}

                {autoRechargeStatus.hasPaymentMethod && autoRechargeStatus.failedAttempts > 0 && (
                  <div className="alert alert-error" style={{ marginTop: '1rem' }}>
                    <p>
                      <strong>Auto-recharge has failed {autoRechargeStatus.failedAttempts} time(s).</strong> This usually means your payment method is declined. Try adding a different payment method or manually recharging.
                    </p>
                  </div>
                )}

                {autoRechargeStatus.hasPaymentMethod && (
                  <button
                    className="btn-primary"
                    onClick={triggerManualRecharge}
                    disabled={recharging}
                    style={{ marginTop: '1rem', width: '100%' }}
                  >
                    {recharging ? 'Processing...' : 'Recharge Now'}
                  </button>
                )}
              </div>
            )}
          </section>

          {/* API Keys Section */}
          <section className="dashboard-section">
            <div className="section-header">
              <h2>API Keys</h2>
              {!showNewKeyForm && (
                <button onClick={() => setShowNewKeyForm(true)} className="btn-primary">
                  + Create New Key
                </button>
              )}
            </div>

            {createdKey && (
              <div className="alert alert-success">
                <p>
                  <strong>Your new API key:</strong>
                </p>
                <div className="key-display">
                  <code>{createdKey}</code>
                  <button
                    className="btn-secondary"
                    onClick={() => copyKeyToClipboard(createdKey, 'created')}
                  >
                    {copiedKeyId === 'created' ? 'Copied!' : 'Copy'}
                  </button>
                </div>
                <p className="key-warning">⚠️ Save this key somewhere safe. You won't see it again!</p>
              </div>
            )}

            {showNewKeyForm && (
              <div className="form-card">
                <input
                  type="text"
                  placeholder="e.g., Production API Key"
                  value={newKeyLabel}
                  onChange={(e) => setNewKeyLabel(e.target.value)}
                  className="key-label-input"
                />
                <div className="form-actions">
                  <button onClick={generateApiKey} className="btn-primary">
                    Create Key
                  </button>
                  <button
                    onClick={() => {
                      setShowNewKeyForm(false)
                      setNewKeyLabel('')
                    }}
                    className="btn-secondary"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {apiKeys.length === 0 ? (
              <p className="empty-state">No API keys yet. Create one to get started.</p>
            ) : (
              <div className="keys-table">
                <div className="table-header">
                  <div>Label</div>
                  <div>Key</div>
                  <div>Created</div>
                  <div>Last Used</div>
                  <div>Actions</div>
                </div>
                {apiKeys.map((key) => (
                  <div key={key.id} className="table-row">
                    <div className="label-cell">{key.label}</div>
                    <div className="key-cell">
                      <code>{key.key.substring(0, 20)}...</code>
                    </div>
                    <div className="date-cell">
                      {new Date(key.created_at).toLocaleDateString()}
                    </div>
                    <div className="date-cell">
                      {key.last_used ? new Date(key.last_used).toLocaleDateString() : 'Never'}
                    </div>
                    <div className="actions-cell">
                      <button
                        className="btn-secondary"
                        onClick={(e) => copyKeyToClipboard(key.key, e)}
                      >
                        Copy
                      </button>
                      <button className="btn-delete" onClick={() => deleteKey(key.id)}>
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Recent Activity with Tabs */}
          {transactions.length > 0 && (
            <section className="dashboard-section">
              <h2>Recent Activity</h2>

              <div className="activity-tabs">
                <button
                  className={`tab-btn ${activeActivityTab === 'payments' ? 'active' : ''}`}
                  onClick={() => setActiveActivityTab('payments')}
                >
                  Payments & Recharges
                </button>
                <button
                  className={`tab-btn ${activeActivityTab === 'calls' ? 'active' : ''}`}
                  onClick={() => setActiveActivityTab('calls')}
                >
                  API Calls
                </button>
                <button
                  className={`tab-btn ${activeActivityTab === 'errors' ? 'active' : ''}`}
                  onClick={() => setActiveActivityTab('errors')}
                >
                  Errors
                </button>
              </div>

              {/* Payments Tab */}
              {activeActivityTab === 'payments' && (
                <div className="transactions-list">
                  {getPaymentTransactions.length > 0 ? (
                    <>
                      {getPaymentTransactions
                        .slice(paymentsPage * ITEMS_PER_PAGE, (paymentsPage + 1) * ITEMS_PER_PAGE)
                        .map((tx) => (
                          <div key={tx.id} className="transaction-item">
                            <div className="tx-info">
                              <p className="tx-type">
                                {tx.type === 'deposit' && 'Deposit'}
                                {tx.type === 'auto_recharge' && 'Auto-Recharge'}
                              </p>
                              {tx.description && <p className="tx-desc">{tx.description}</p>}
                            </div>
                            <div className="tx-amount">
                              <span className="positive">+{formatBalance(Math.abs(tx.amount))}</span>
                              <p className="tx-date">{new Date(tx.created_at).toLocaleDateString()}</p>
                            </div>
                          </div>
                        ))}
                      {getPaymentTransactions.length > ITEMS_PER_PAGE && (
                        <div className="pagination-controls">
                          <button
                            className="btn-pagination"
                            onClick={() => setPaymentsPage(Math.max(0, paymentsPage - 1))}
                            disabled={paymentsPage === 0}
                          >
                            Previous
                          </button>
                          <span className="pagination-info">
                            Page {paymentsPage + 1} of {Math.ceil(getPaymentTransactions.length / ITEMS_PER_PAGE)}
                          </span>
                          <button
                            className="btn-pagination"
                            onClick={() => setPaymentsPage(paymentsPage + 1)}
                            disabled={(paymentsPage + 1) * ITEMS_PER_PAGE >= getPaymentTransactions.length}
                          >
                            Next
                          </button>
                        </div>
                      )}
                    </>
                  ) : (
                    <p className="empty-state">No payments or recharges yet</p>
                  )}
                </div>
              )}

              {/* API Calls Tab */}
              {activeActivityTab === 'calls' && (
                <div className="transactions-list">
                  {getAggregatedApiCalls.length > 0 ? (
                    getAggregatedApiCalls.slice(0, 10).map((group) => (
                      <div key={`${group.tool}-${group.date}`}>
                        <div
                          className="call-group-header"
                          onClick={() => setExpandedCallGroup(
                            expandedCallGroup === `${group.tool}-${group.date}`
                              ? null
                              : `${group.tool}-${group.date}`
                          )}
                        >
                          <div className="call-group-info">
                            <span className="group-toggle">
                              {expandedCallGroup === `${group.tool}-${group.date}` ? '▼' : '▶'}
                            </span>
                            <div>
                              <p className="group-title">{group.tool}</p>
                              <p className="group-date">{group.date}</p>
                            </div>
                          </div>
                          <div className="group-stats">
                            <span className="call-count">{group.count} calls</span>
                            <span className="call-total">-{formatBalance(group.total)}</span>
                          </div>
                        </div>

                        {expandedCallGroup === `${group.tool}-${group.date}` && (
                          <div className="call-group-details">
                            {group.calls.slice(0, 10).map((call) => (
                              <div key={call.id} className="call-detail-item">
                                <p className="call-time">
                                  {new Date(call.created_at).toLocaleTimeString()}
                                </p>
                                <span className="negative">-{formatBalance(Math.abs(call.amount))}</span>
                              </div>
                            ))}
                            {group.calls.length > 10 && (
                              <p className="call-more">+{group.calls.length - 10} more calls</p>
                            )}
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <p className="empty-state">No API calls yet</p>
                  )}
                  {getAggregatedApiCalls.length > 10 && (
                    <p className="more-items-info">Showing 10 most recent groups. {getAggregatedApiCalls.length - 10} more available.</p>
                  )}
                </div>
              )}

              {/* Errors Tab */}
              {activeActivityTab === 'errors' && (
                <div className="transactions-list">
                  {getErrorTransactions.length > 0 ? (
                    <>
                      {getErrorTransactions
                        .slice(errorsPage * ITEMS_PER_PAGE, (errorsPage + 1) * ITEMS_PER_PAGE)
                        .map((tx) => (
                          <div key={tx.id} className="transaction-item error-item">
                            <div className="tx-info">
                              <p className="tx-type tx-error">Error</p>
                              {tx.description && <p className="tx-desc">{tx.description}</p>}
                            </div>
                            <p className="tx-date">{new Date(tx.created_at).toLocaleDateString()}</p>
                          </div>
                        ))}
                      {getErrorTransactions.length > ITEMS_PER_PAGE && (
                        <div className="pagination-controls">
                          <button
                            className="btn-pagination"
                            onClick={() => setErrorsPage(Math.max(0, errorsPage - 1))}
                            disabled={errorsPage === 0}
                          >
                            Previous
                          </button>
                          <span className="pagination-info">
                            Page {errorsPage + 1} of {Math.ceil(getErrorTransactions.length / ITEMS_PER_PAGE)}
                          </span>
                          <button
                            className="btn-pagination"
                            onClick={() => setErrorsPage(errorsPage + 1)}
                            disabled={(errorsPage + 1) * ITEMS_PER_PAGE >= getErrorTransactions.length}
                          >
                            Next
                          </button>
                        </div>
                      )}
                    </>
                  ) : (
                    <p className="empty-state">No errors</p>
                  )}
                </div>
              )}
            </section>
          )}

          {/* Delete Account Section */}
          <section className="dashboard-section danger-section">
            <h2>Delete Account</h2>
            <p className="danger-description">Permanently delete your account and all associated data. This action cannot be undone.</p>
            <button
              onClick={() => setShowDeleteModal(true)}
              className="btn-delete-account"
            >
              Delete Account
            </button>

            {showDeleteModal && (
              <div className="modal-overlay" onClick={() => !deletingAccount && setShowDeleteModal(false)}>
                <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                  <h3>Delete Account</h3>
                  <p className="warning-text">⚠️ This action is permanent and cannot be undone. All your data, API keys, and billing history will be deleted.</p>
                  <p>To confirm, please enter your email address:</p>
                  <input
                    type="email"
                    placeholder={profile?.email || 'your@email.com'}
                    value={deleteConfirmText}
                    onChange={(e) => setDeleteConfirmText(e.target.value)}
                    disabled={deletingAccount}
                    className="delete-confirm-input"
                  />
                  <div className="modal-actions">
                    <button
                      onClick={() => {
                        setShowDeleteModal(false)
                        setDeleteConfirmText('')
                        setError(null)
                      }}
                      className="btn-secondary"
                      disabled={deletingAccount}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={deleteAccount}
                      className="btn-delete-confirm"
                      disabled={deletingAccount || deleteConfirmText !== profile?.email}
                    >
                      {deletingAccount ? 'Deleting...' : 'Delete Permanently'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </section>
        </div>
      )}

      <CopyFeedback message={copyMessage} position={copyPosition} />

      <style jsx>{`
        .dashboard-wrapper {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          background: var(--bg-primary);
          color: var(--text-primary);
        }

        .dashboard-container {
          flex: 1;
          background: var(--bg-primary);
          color: var(--text-primary);
        }

        .dashboard-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 2rem;
          background: transparent;
        }

        .dashboard-header h1 {
          margin: 0;
          font-size: 2rem;
        }

        .dashboard-subtitle {
          margin: 0.5rem 0 0 0;
          color: var(--text-tertiary);
        }

        .logout-btn {
          padding: 0.75rem 1.5rem;
          background: rgba(255, 59, 48, 0.1);
          color: #ff3b30;
          border: 1px solid rgba(255, 59, 48, 0.3);
          border-radius: 6px;
          cursor: pointer;
          font-weight: 600;
          transition: all 0.2s;
        }

        .logout-btn:hover {
          background: rgba(255, 59, 48, 0.2);
        }

        .dashboard-content {
          max-width: 1200px;
          margin: 0 auto;
          padding: 2rem;
        }

        .alert {
          padding: 1rem;
          border-radius: 6px;
          margin-bottom: 1.5rem;
          border: 1px solid;
        }

        .alert-error {
          background: rgba(255, 59, 48, 0.1);
          border-color: rgba(255, 59, 48, 0.3);
          color: #ff3b30;
        }

        .alert-success {
          background: rgba(52, 211, 153, 0.1);
          border-color: rgba(52, 211, 153, 0.3);
          color: #10b981;
        }

        .dashboard-section {
          background: var(--bg-secondary);
          border: 1px solid var(--border-color);
          border-radius: 12px;
          padding: 1.5rem;
          margin-bottom: 2rem;
        }

        .dashboard-section h2 {
          margin: 0 0 1.5rem 0;
          font-size: 1.25rem;
        }

        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.5rem;
        }

        .section-header h2 {
          margin: 0;
        }

        .balance-section {
          background: var(--bg-secondary);
          border: 1px solid var(--border-color);
          border-radius: 12px;
          padding: 1.5rem;
          margin-bottom: 2rem;
          color: var(--text-primary);
        }

        .balance-card {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .balance-info label {
          display: block;
          font-size: 0.9rem;
          opacity: 0.85;
          margin-bottom: 0.5rem;
          color: var(--text-secondary);
        }

        .balance-amount {
          margin: 0;
          font-size: 2.5rem;
          font-weight: 700;
          color: var(--color-primary);
        }

        .info-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1.5rem;
          margin-bottom: 1.5rem;
        }

        .info-item {
          background: var(--bg-primary);
          padding: 1rem;
          border-radius: 6px;
        }

        .info-item label {
          display: block;
          font-size: 0.85rem;
          color: var(--text-tertiary);
          margin-bottom: 0.5rem;
          font-weight: 600;
          text-transform: uppercase;
        }

        .info-item p {
          margin: 0;
          font-size: 1.25rem;
          color: var(--text-primary);
        }

        .form-card {
          background: var(--bg-primary);
          padding: 1rem;
          border-radius: 6px;
          margin-bottom: 1rem;
        }

        .form-card h4 {
          margin: 0 0 1rem 0;
        }

        .form-group {
          margin-bottom: 1rem;
        }

        .form-group label {
          display: block;
          margin-bottom: 0.5rem;
          font-weight: 500;
          font-size: 0.9rem;
        }

        .form-group input {
          width: 100%;
          padding: 0.75rem;
          border: 1px solid var(--border-color);
          border-radius: 6px;
          background: var(--bg-secondary);
          color: var(--text-primary);
          font-size: 1rem;
        }

        .form-group input:focus {
          outline: none;
          border-color: var(--color-primary);
        }

        .form-group small {
          display: block;
          margin-top: 0.25rem;
          font-size: 0.8rem;
          color: var(--text-tertiary);
        }

        .form-actions {
          display: flex;
          gap: 0.75rem;
        }

        .checkbox-group {
          display: flex;
          gap: 0.75rem;
          margin-bottom: 1rem;
          align-items: center;
          justify-content: flex-start;
        }

        .checkbox-group input[type="checkbox"] {
          width: 18px;
          height: 18px;
          cursor: pointer;
          flex-shrink: 0;
        }

        .checkbox-group label {
          margin: 0;
          cursor: pointer;
          white-space: normal;
          display: inline;
          flex: 1;
        }

        .btn-primary,
        .btn-secondary,
        .btn-small {
          padding: 0.75rem 1.5rem;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 600;
          transition: all 0.2s;
          font-size: 0.95rem;
        }

        .btn-primary {
          background: var(--color-primary);
          color: white;
        }

        .btn-primary:hover {
          background: var(--color-primary-dark);
        }

        .btn-secondary {
          background: var(--border-color);
          color: var(--text-primary);
        }

        .btn-secondary:hover {
          background: var(--bg-tertiary);
        }

        .btn-small {
          padding: 0.5rem 1rem;
          font-size: 0.85rem;
          background: var(--color-primary);
          color: white;
        }

        .btn-small:hover {
          background: var(--color-primary-dark);
          transform: translateY(-1px);
        }

        .key-display {
          display: flex;
          gap: 0.75rem;
          margin-bottom: 0.75rem;
        }

        .key-display code {
          flex: 1;
          background: var(--bg-primary);
          padding: 0.75rem;
          border-radius: 6px;
          font-family: monospace;
          word-break: break-all;
          color: var(--text-primary);
          font-size: 0.9rem;
        }

        .btn-copy {
          padding: 0.75rem 1rem;
          background: var(--color-primary);
          color: white;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 600;
          white-space: nowrap;
        }

        .btn-copy:hover {
          background: var(--color-primary-dark);
        }

        .key-warning {
          margin: 0;
          font-size: 0.85rem;
          color: var(--text-tertiary);
        }

        .key-label-input {
          width: 100%;
          padding: 0.75rem;
          border: 1px solid var(--border-color);
          border-radius: 6px;
          background: var(--bg-secondary);
          color: var(--text-primary);
          margin-bottom: 1rem;
          font-size: 1rem;
        }

        .empty-state {
          text-align: center;
          padding: 2rem;
          color: var(--text-tertiary);
        }

        .keys-table {
          border: 1px solid var(--border-color);
          border-radius: 6px;
          overflow: hidden;
        }

        .table-header {
          display: grid;
          grid-template-columns: 150px 1fr 120px 120px 200px;
          gap: 1rem;
          background: var(--bg-primary);
          padding: 1rem;
          font-weight: 600;
          border-bottom: 1px solid var(--border-color);
          font-size: 0.9rem;
          color: var(--text-tertiary);
        }

        .table-row {
          display: grid;
          grid-template-columns: 150px 1fr 120px 120px 200px;
          gap: 1rem;
          padding: 1rem;
          border-bottom: 1px solid var(--border-color);
          align-items: center;
        }

        .table-row:last-child {
          border-bottom: none;
        }

        .label-cell {
          font-weight: 600;
        }

        .key-cell code {
          background: var(--bg-primary);
          padding: 0.5rem;
          border-radius: 4px;
          font-family: monospace;
          font-size: 0.85rem;
          color: var(--text-secondary);
        }

        .date-cell {
          font-size: 0.9rem;
          color: var(--text-secondary);
        }

        .actions-cell {
          display: flex;
          gap: 0.5rem;
        }

        .btn-delete {
          padding: 0.5rem 1rem;
          background: rgba(255, 59, 48, 0.1);
          color: #ff3b30;
          border: 1px solid rgba(255, 59, 48, 0.3);
          border-radius: 4px;
          cursor: pointer;
          font-size: 0.85rem;
          font-weight: 600;
          transition: all 0.2s;
        }

        .btn-delete:hover {
          background: rgba(255, 59, 48, 0.2);
        }

        .transactions-list {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .transaction-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem;
          background: var(--bg-primary);
          border-radius: 6px;
          border-left: 4px solid var(--color-primary);
        }

        .tx-info p {
          margin: 0;
          font-size: 0.9rem;
        }

        .tx-type {
          font-weight: 600;
          color: var(--text-primary);
        }

        .tx-tool {
          font-size: 0.85rem;
          color: var(--text-secondary);
        }

        .tx-desc {
          font-size: 0.8rem;
          color: var(--text-tertiary);
        }

        .tx-amount {
          text-align: right;
        }

        .tx-amount span {
          display: block;
          font-weight: 600;
          font-size: 1.1rem;
        }

        .tx-amount .negative {
          color: #ff3b30;
        }

        .tx-amount .positive {
          color: #10b981;
        }

        .tx-date {
          margin: 0.25rem 0 0 0;
          font-size: 0.8rem;
          color: var(--text-tertiary);
        }

        .activity-tabs {
          display: flex;
          gap: 0.5rem;
          margin-bottom: 1.5rem;
          border-bottom: 1px solid var(--border-color);
        }

        .tab-btn {
          padding: 0.75rem 1.5rem;
          background: none;
          border: none;
          color: var(--text-tertiary);
          font-weight: 600;
          cursor: pointer;
          border-bottom: 3px solid transparent;
          transition: all 0.2s;
          font-size: 0.95rem;
        }

        .tab-btn:hover {
          color: var(--text-secondary);
        }

        .tab-btn.active {
          color: var(--color-primary);
          border-bottom-color: var(--color-primary);
        }

        .call-group-header {
          padding: 1rem;
          background: var(--bg-primary);
          border-radius: 6px;
          border-left: 4px solid var(--color-primary);
          cursor: pointer;
          display: flex;
          justify-content: space-between;
          align-items: center;
          transition: all 0.2s;
        }

        .call-group-header:hover {
          background: var(--bg-secondary);
        }

        .call-group-info {
          display: flex;
          align-items: center;
          gap: 1rem;
          flex: 1;
        }

        .group-toggle {
          font-size: 0.8rem;
          color: var(--text-tertiary);
          display: inline-block;
          width: 1rem;
        }

        .group-title {
          font-weight: 600;
          color: var(--text-primary);
          margin: 0;
          font-size: 0.95rem;
        }

        .group-date {
          font-size: 0.8rem;
          color: var(--text-tertiary);
          margin: 0.25rem 0 0 0;
        }

        .group-stats {
          display: flex;
          gap: 1rem;
          align-items: center;
        }

        .call-count {
          font-size: 0.85rem;
          color: var(--text-secondary);
          background: var(--bg-secondary);
          padding: 0.25rem 0.75rem;
          border-radius: 4px;
        }

        .call-total {
          font-weight: 600;
          color: #ff3b30;
          font-size: 0.95rem;
        }

        .call-group-details {
          background: var(--bg-secondary);
          border-radius: 0 0 6px 6px;
          padding: 1rem;
          margin-top: -0.5rem;
        }

        .call-detail-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.5rem 0;
          border-bottom: 1px solid var(--border-color);
          font-size: 0.9rem;
        }

        .call-detail-item:last-child {
          border-bottom: none;
        }

        .call-time {
          color: var(--text-tertiary);
          margin: 0;
          font-size: 0.85rem;
        }

        .call-more {
          font-size: 0.85rem;
          color: var(--text-tertiary);
          padding-top: 0.5rem;
          margin: 0;
          text-align: center;
          font-style: italic;
        }

        .more-items-info {
          font-size: 0.85rem;
          color: var(--text-tertiary);
          padding: 1rem;
          margin: 0;
          text-align: center;
          font-style: italic;
          background: var(--bg-primary);
          border-radius: 6px;
        }

        .pagination-controls {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 1rem;
          padding: 1rem;
          margin-top: 1rem;
          background: var(--bg-primary);
          border-radius: 6px;
        }

        .pagination-info {
          font-size: 0.85rem;
          color: var(--text-tertiary);
          white-space: nowrap;
        }

        .btn-pagination {
          padding: 0.5rem 1rem;
          background: var(--color-primary);
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 0.85rem;
          font-weight: 600;
          transition: all 0.2s;
        }

        .btn-pagination:hover:not(:disabled) {
          background: var(--color-primary-dark);
        }

        .btn-pagination:disabled {
          background: var(--border-color);
          color: var(--text-tertiary);
          cursor: not-allowed;
          opacity: 0.5;
        }

        .error-item {
          border-left-color: #ff3b30;
        }

        .tx-error {
          color: #ff3b30;
        }

        .dashboard-loading {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          font-size: 1.1rem;
          color: var(--text-secondary);
        }

        .danger-section {
          border-color: rgba(255, 59, 48, 0.3);
          background: rgba(255, 59, 48, 0.05);
        }

        .danger-description {
          margin: 0 0 1rem 0;
          color: var(--text-secondary);
          font-size: 0.95rem;
        }

        .btn-delete-account {
          padding: 0.75rem 1.5rem;
          background: rgba(255, 59, 48, 0.1);
          color: #ff3b30;
          border: 1px solid rgba(255, 59, 48, 0.3);
          border-radius: 6px;
          cursor: pointer;
          font-weight: 600;
          transition: all 0.2s;
        }

        .btn-delete-account:hover {
          background: rgba(255, 59, 48, 0.2);
          border-color: rgba(255, 59, 48, 0.5);
        }

        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.7);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }

        .modal-content {
          background: var(--bg-secondary);
          border: 1px solid var(--border-color);
          border-radius: 12px;
          padding: 2rem;
          max-width: 500px;
          width: 90%;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.3);
        }

        .modal-content h3 {
          margin: 0 0 1rem 0;
          font-size: 1.25rem;
          color: var(--text-primary);
        }

        .warning-text {
          color: #ff3b30;
          font-weight: 500;
          margin: 0 0 1rem 0;
        }

        .modal-content p {
          margin: 0 0 1rem 0;
          color: var(--text-secondary);
        }

        .delete-confirm-input {
          width: 100%;
          padding: 0.75rem;
          border: 1px solid var(--border-color);
          border-radius: 6px;
          background: var(--bg-primary);
          color: var(--text-primary);
          font-size: 1rem;
          margin-bottom: 1.5rem;
        }

        .delete-confirm-input:focus {
          outline: none;
          border-color: #ff3b30;
          box-shadow: 0 0 0 3px rgba(255, 59, 48, 0.1);
        }

        .delete-confirm-input:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .modal-actions {
          display: flex;
          gap: 0.75rem;
          justify-content: flex-end;
        }

        .btn-delete-confirm {
          padding: 0.75rem 1.5rem;
          background: #ff3b30;
          color: white;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 600;
          transition: all 0.2s;
        }

        .btn-delete-confirm:hover:not(:disabled) {
          background: #d32f2f;
        }

        .btn-delete-confirm:disabled {
          background: var(--border-color);
          color: var(--text-tertiary);
          cursor: not-allowed;
          opacity: 0.5;
        }

        @media (max-width: 768px) {
          .dashboard-header {
            flex-direction: column;
            gap: 1rem;
            align-items: flex-start;
          }

          .balance-card {
            flex-direction: column;
            gap: 1rem;
          }

          .table-header,
          .table-row {
            grid-template-columns: 1fr;
            gap: 0.5rem;
          }

          .transaction-item {
            flex-direction: column;
            align-items: flex-start;
            gap: 0.75rem;
          }

          .tx-amount {
            align-self: flex-end;
          }
        }
      `}</style>
      </div>
    </div>
  )
}
