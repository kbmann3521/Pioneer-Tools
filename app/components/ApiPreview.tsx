'use client'

import { useState, useEffect } from 'react'
import CodeLanguageSelector, { type CodeLanguage } from '@/app/components/CodeLanguageSelector'
import CodePreview from '@/app/components/CodePreview'
import PricingCard from '@/app/components/PricingCard'
import { useAuth } from '@/app/context/AuthContext'
import type { ToolParams } from '@/lib/types/tools'

interface ApiPreviewProps {
  endpoint: string
  method?: string
  params?: Partial<ToolParams>
  toolName: string
  enableCodeExecution?: boolean
}

export default function ApiPreview({ endpoint, method = 'POST', params = {}, toolName, enableCodeExecution = false }: ApiPreviewProps) {
  const { session } = useAuth()
  const [language, setLanguage] = useState<CodeLanguage>('fetch')
  const [activeTab, setActiveTab] = useState<'request' | 'response' | 'run-code'>('request')
  const [isRunning, setIsRunning] = useState(false)
  const [isFetchingResponse, setIsFetchingResponse] = useState(false)
  const [executionResult, setExecutionResult] = useState<{ success: boolean; output?: string; error?: string; executionTime?: number } | null>(null)
  const [liveResponse, setLiveResponse] = useState<{ success: boolean; result?: any; error?: any; meta?: any } | null>(null)
  const [userApiKey, setUserApiKey] = useState<string | null>(null)

  // Convert relative URLs to absolute URLs for code execution
  const getAbsoluteUrl = (url: string): string => {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url
    }
    const baseUrl = typeof window !== 'undefined'
      ? window.location.origin
      : (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000')
    return `${baseUrl}${url}`
  }

  const fullUrl = endpoint
  const absoluteUrl = getAbsoluteUrl(endpoint)

  // Fetch user's API key for displaying in code snippets
  // If not logged in, use the public test key
  useEffect(() => {
    // If we already have a key, don't fetch again
    if (userApiKey) return

    // Use public test key if user is not logged in
    if (!session?.access_token) {
      setUserApiKey('pk_test_public_demo')
      return
    }

    // For logged-in users, fetch their actual API keys
    const fetchApiKey = async () => {
      try {
        const response = await fetch('/api/account/api-keys', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        })

        if (response.ok) {
          const keys = await response.json()
          if (Array.isArray(keys) && keys.length > 0) {
            // Use the first key (most recent)
            setUserApiKey(keys[0].key)
          } else {
            // User is logged in but has no API keys yet - fall back to test key
            setUserApiKey('pk_test_public_demo')
          }
        } else {
          // Fetch failed - fall back to test key
          console.error('Failed to fetch API keys:', response.statusText)
          setUserApiKey('pk_test_public_demo')
        }
      } catch (err) {
        console.error('Failed to fetch API key:', err)
        // Fall back to test key on error
        setUserApiKey('pk_test_public_demo')
      }
    }

    fetchApiKey()
  }, [session?.access_token])

  // Clear execution result when language changes
  useEffect(() => {
    setExecutionResult(null)
  }, [language])

  // Fetch live response whenever params change
  useEffect(() => {
    // Only fetch if we have an API key and non-empty params
    if (!userApiKey) {
      setLiveResponse(null)
      return
    }

    // Don't fetch if no params are provided
    const hasParams = Object.keys(params).length > 0 && Object.values(params).some(v => v !== '' && v !== null && v !== undefined)
    if (!hasParams) {
      setLiveResponse(null)
      return
    }

    const fetchLiveResponse = async () => {
      setIsFetchingResponse(true)
      try {
        // Call the actual API endpoint with the user's API key
        const response = await fetch(fullUrl, {
          method,
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${userApiKey}`,
          },
          body: JSON.stringify(params),
        })

        const data = await response.json()
        setLiveResponse(data)
      } catch (error) {
        // If fetch fails (CORS, network, etc), silently fail
        console.debug('Live response fetch failed (expected in some environments)', error)
        setLiveResponse(null)
      } finally {
        setIsFetchingResponse(false)
      }
    }

    // Debounce the fetch to avoid too many requests
    const timer = setTimeout(fetchLiveResponse, 800)
    return () => clearTimeout(timer)
  }, [params, userApiKey, fullUrl, method])

  const generateCode = (lang: CodeLanguage, apiKey: string = userApiKey || 'pk_test_public_demo'): string => {
    const paramString = JSON.stringify(params, null, 2)
    const paramStringCompact = JSON.stringify(params)

    switch (lang) {
      case 'fetch':
        return `const response = await fetch('${absoluteUrl}', {
  method: '${method}',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ${apiKey}'
  },
  body: JSON.stringify(${paramString}),
})

const data = await response.json()
console.log(data)`

      case 'typescript':
        return `const response = await fetch('${absoluteUrl}', {
  method: '${method}',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ${apiKey}'
  },
  body: JSON.stringify(${paramString}),
})

const data = await response.json()
console.log(data)`

      case 'nodejs':
        return `const data = ${paramStringCompact}

const response = await fetch('${absoluteUrl}', {
  method: '${method}',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ${apiKey}'
  },
  body: JSON.stringify(data)
})

const result = await response.json()
console.log(result)`

      case 'curl':
        return `curl -X ${method} ${absoluteUrl} \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer ${apiKey}" \\
  -d '${paramString.replace(/'/g, "'\\''")}'`

      case 'python':
        return `import urllib.request
import json

headers = {
    'Authorization': 'Bearer ${apiKey}',
    'Content-Type': 'application/json'
}

data = ${paramStringCompact}
json_data = json.dumps(data).encode('utf-8')

request = urllib.request.Request(
    '${absoluteUrl}',
    data=json_data,
    headers=headers,
    method='${method}'
)

try:
    with urllib.request.urlopen(request) as response:
        result = json.loads(response.read().decode('utf-8'))
        print(json.dumps(result, indent=2))
except urllib.error.HTTPError as e:
    print(f"Error: {e.code} {e.reason}")`

      case 'java':
        return `import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.net.URI;

HttpClient client = HttpClient.newHttpClient();

String body = ${paramStringCompact.replace(/"/g, '\\"')};

HttpRequest request = HttpRequest.newBuilder()
    .uri(URI.create("${absoluteUrl}"))
    .header("Content-Type", "application/json")
    .header("Authorization", "Bearer ${apiKey}")
    .method("${method}", HttpRequest.BodyPublishers.ofString(body))
    .build();

HttpResponse<String> response = client.send(request,
    HttpResponse.BodyHandlers.ofString());

System.out.println(response.body());`

      case 'go':
        return `package main

import (
    "bytes"
    "encoding/json"
    "fmt"
    "io"
    "net/http"
)

func main() {
    data := map[string]interface{}{
${Object.entries(params).map(([k, v]) => `        "${k}": ${typeof v === 'string' ? `"${v}"` : v},`).join('\n')}
    }

    jsonData, _ := json.Marshal(data)

    req, _ := http.NewRequest("${method}", "${absoluteUrl}", bytes.NewBuffer(jsonData))
    req.Header.Set("Content-Type", "application/json")
    req.Header.Set("Authorization", "Bearer ${apiKey}")

    client := &http.Client{}
    resp, _ := client.Do(req)
    defer resp.Body.Close()

    body, _ := io.ReadAll(resp.Body)
    fmt.Println(string(body))
}`

      case 'csharp':
        return `using System;
using System.Net.Http;
using System.Text;
using System.Threading.Tasks;

class Program {
    static async Task Main() {
        var client = new HttpClient();

        var json = @"${paramStringCompact.replace(/"/g, '""')}";
        var content = new StringContent(json, Encoding.UTF8, "application/json");

        client.DefaultRequestHeaders.Add("Authorization", "Bearer ${apiKey}");

        var response = await client.${method.charAt(0) + method.slice(1).toLowerCase()}Async(
            "${absoluteUrl}",
            content
        );

        var result = await response.Content.ReadAsStringAsync();
        Console.WriteLine(result);
    }
}`

      case 'ruby':
        return `require 'net/http'
require 'json'
require 'uri'

uri = URI("${absoluteUrl}")

data = ${paramStringCompact}

http = Net::HTTP.new(uri.host, uri.port)
http.use_ssl = (uri.scheme == 'https')

request = Net::HTTP::${method.charAt(0) + method.slice(1).toLowerCase()}(uri.path)
request["Content-Type"] = "application/json"
request["Authorization"] = "Bearer ${apiKey}"
request.body = JSON.generate(data)

response = http.request(request)
puts JSON.parse(response.body)`

      case 'php': {
        const escapedJson = paramStringCompact.replace(/\\/g, '\\\\').replace(/'/g, "\\'")
        return `<?php

$url = "${absoluteUrl}";
$data = ${paramStringCompact};

$ch = curl_init();

curl_setopt($ch, CURLOPT_URL, $url);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, array(
    'Content-Type: application/json',
    'Authorization: Bearer ${apiKey}'
));

$response = curl_exec($ch);
$http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

$result = json_decode($response, true);
var_dump($result);
?>`
      }

      default:
        return ''
    }
  }

  const apiKey = userApiKey || 'pk_test_public_demo'
  const code = generateCode(language, apiKey)

  const runCode = async () => {
    // Wait a moment for API key to load if component just mounted
    if (!userApiKey && enableCodeExecution) {
      // Give it a moment to fetch the key
      await new Promise(resolve => setTimeout(resolve, 100))
      if (!userApiKey) {
        setExecutionResult({
          success: false,
          error: 'Unable to load API key. Please refresh the page.',
        })
        return
      }
    }

    setIsRunning(true)
    setExecutionResult(null)

    try {
      const actualApiKey = userApiKey || 'YOUR_API_KEY'
      const codeWithRealKey = code.replace(/YOUR_API_KEY/g, actualApiKey)

      const response = await fetch('/api/dev/run-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code: codeWithRealKey,
          language,
          apiKey: actualApiKey,
        }),
      })

      const result = await response.json()
      setExecutionResult(result)
    } catch (err) {
      setExecutionResult({
        success: false,
        error: err instanceof Error ? err.message : 'Failed to execute code',
      })
    } finally {
      setIsRunning(false)
    }
  }

  return (
    <div className="api-preview">
      <div className="api-preview-header">
        <h3>API Call</h3>
        <p className="api-endpoint">{method} {endpoint}</p>
      </div>

      <CodeLanguageSelector language={language} onLanguageChange={setLanguage} />

      <div className="api-preview-tabs">
        <button
          className={`api-tab ${activeTab === 'request' ? 'active' : ''}`}
          onClick={() => setActiveTab('request')}
        >
          Request
        </button>
        <button
          className={`api-tab ${activeTab === 'response' ? 'active' : ''}`}
          onClick={() => setActiveTab('response')}
        >
          Response
        </button>
        <button
          className={`api-tab ${activeTab === 'run-code' ? 'active' : ''}`}
          onClick={() => setActiveTab('run-code')}
        >
          Test
        </button>
      </div>

      {activeTab === 'request' ? (
        <CodePreview code={code} endpoint={endpoint} method={method} params={params} />
      ) : activeTab === 'response' ? (
        <div className="api-response-preview">
          {isFetchingResponse && <div className="response-loading">Loading response...</div>}
          {liveResponse && (
            <pre className="response-json">{JSON.stringify(liveResponse, null, 2)}</pre>
          )}
          {!liveResponse && !isFetchingResponse && (
            <div className="response-placeholder">Configure tool parameters to see response</div>
          )}
        </div>
      ) : (
        <div className="api-test-section">
          <button
            onClick={runCode}
            disabled={isRunning || ['curl', 'java', 'go', 'csharp', 'ruby', 'php'].includes(language)}
            className="run-code-btn"
            title={
              language === 'curl' ? 'cURL examples must be run manually in your terminal' :
              ['java', 'go', 'csharp'].includes(language) ? 'Compiled languages must be run locally with their compiler' :
              ['ruby', 'php'].includes(language) ? 'Network-based languages must be run locally with their runtime' :
              'Execute this code in a sandboxed environment'
            }
          >
            {isRunning ? 'Running...' : 'Run Test'}
          </button>

          {executionResult && (
            <div className={`execution-result ${executionResult.success ? 'success' : 'error'}`}>
              {executionResult.success ? (
                <>
                  <div className="result-header">✅ Success</div>
                  {executionResult.output && (
                    <pre className="result-output">{executionResult.output}</pre>
                  )}
                  {executionResult.executionTime !== undefined && (
                    <div className="result-meta">⏱️ {executionResult.executionTime}ms</div>
                  )}
                </>
              ) : (
                <>
                  <div className="result-header">❌ Error</div>
                  <pre className="result-error">{executionResult.error}</pre>
                  {executionResult.output && (
                    <>
                      <div className="result-label">Output:</div>
                      <pre className="result-output">{executionResult.output}</pre>
                    </>
                  )}
                </>
              )}
            </div>
          )}

          {!executionResult && !isRunning && (
            <div className="test-placeholder">Click "Run Test" to execute this code example</div>
          )}
        </div>
      )}


      <PricingCard toolName={toolName} />

      <style jsx>{`
        .api-preview {
          display: flex;
          flex-direction: column;
          gap: 0.4rem;
          padding: 1.5rem;
          background: var(--bg-secondary);
          border-radius: 8px;
          border: 1px solid var(--border-color);
          max-height: 100vh;
          overflow-y: auto;
        }

        .api-preview-header {
          display: flex;
          flex-direction: column;
          gap: 0.1rem;
        }

        .api-preview-header h3 {
          margin: 0;
          font-size: 1.25rem;
          font-weight: 700;
          color: var(--text-primary);
        }

        .api-endpoint {
          margin: 0;
          font-size: 0.95rem;
          color: var(--text-secondary);
          font-family: 'Monaco', 'Courier New', monospace;
          font-weight: 600;
        }

        .api-preview-language-selector {
          display: flex;
          gap: 0.5rem;
        }

        .lang-btn {
          padding: 0.5rem 1rem;
          border-radius: 4px;
          border: 1px solid var(--border-color);
          background: var(--bg-primary);
          color: var(--text-secondary);
          cursor: pointer;
          font-size: 0.9rem;
          font-weight: 500;
          transition: all 0.2s ease;
        }

        .lang-btn:hover {
          border-color: var(--color-primary);
          color: var(--color-primary);
        }

        .lang-btn.active {
          background: var(--color-primary);
          color: white;
          border-color: var(--color-primary);
        }

        .api-preview-code {
          position: relative;
          background: var(--bg-primary);
          border: 1px solid var(--border-color);
          border-radius: 6px;
          overflow: hidden;
          flex: 1;
          min-height: 400px;
          display: flex;
          flex-direction: column;
        }

        .api-preview-code pre {
          margin: 0;
          padding: 1rem;
          overflow-x: auto;
          overflow-y: auto;
          font-size: 0.9rem;
          line-height: 1.6;
          flex: 1;
        }

        .api-preview-code code {
          color: var(--text-secondary);
          font-family: 'Monaco', 'Courier New', monospace;
        }

        .copy-code-btn {
          position: absolute;
          top: 1rem;
          right: 1rem;
          padding: 0.5rem 1rem;
          border-radius: 4px;
          border: 1px solid var(--border-color);
          background: var(--bg-secondary);
          color: var(--text-primary);
          cursor: pointer;
          font-size: 0.9rem;
          font-weight: 500;
          transition: all 0.2s ease;
          z-index: 10;
        }

        .copy-code-btn:hover {
          border-color: var(--color-primary);
          color: var(--color-primary);
          background: var(--bg-primary);
        }

        .api-test-section {
          display: flex;
          flex-direction: column;
          gap: 1rem;
          height: 100%;
          overflow: auto;
        }

        .test-placeholder {
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100%;
          color: var(--text-secondary);
          font-style: italic;
          padding: 2rem;
          text-align: center;
        }

        .run-code-btn {
          padding: 0.75rem 1rem;
          background: linear-gradient(135deg, var(--color-primary), #6d28d9);
          color: white;
          border: none;
          border-radius: 6px;
          font-size: 0.95rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          width: 100%;
        }

        .run-code-btn:hover:not(:disabled) {
          opacity: 0.9;
        }

        .run-code-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .execution-result {
          background: var(--bg-primary);
          border: 1px solid var(--border-color);
          border-radius: 6px;
          overflow: hidden;
          font-family: 'Monaco', 'Courier New', monospace;
          font-size: 0.85rem;
          display: flex;
          flex-direction: column;
          flex: 1;
          min-height: 0;
        }

        .execution-result.success {
          border-color: #22aa22;
          background: rgba(34, 170, 34, 0.05);
        }

        .execution-result.error {
          border-color: #ff4444;
          background: rgba(255, 68, 68, 0.05);
        }

        .result-header {
          padding: 0.75rem 1rem;
          font-weight: 600;
          border-bottom: 1px solid var(--border-color);
          color: var(--text-primary);
        }

        .execution-result.success .result-header {
          color: #22aa22;
          background: rgba(34, 170, 34, 0.1);
        }

        .execution-result.error .result-header {
          color: #ff4444;
          background: rgba(255, 68, 68, 0.1);
        }

        .result-output,
        .result-error {
          margin: 0;
          padding: 1rem;
          overflow: auto;
          white-space: pre-wrap;
          word-break: break-word;
          color: var(--text-secondary);
          flex: 1;
          min-height: 0;
        }

        .result-error {
          color: #ff4444;
        }

        .result-label {
          padding: 0.5rem 1rem 0 1rem;
          font-weight: 600;
          color: var(--text-secondary);
          font-size: 0.8rem;
          text-transform: uppercase;
        }

        .result-meta {
          padding: 0.5rem 1rem;
          font-size: 0.8rem;
          color: var(--text-secondary);
          opacity: 0.7;
          border-top: 1px solid var(--border-color);
        }

        @media (max-width: 768px) {
          .api-preview {
            max-height: auto;
          }

          .copy-code-btn {
            top: 0.5rem;
            right: 0.5rem;
            padding: 0.4rem 0.8rem;
            font-size: 0.8rem;
          }

          .run-code-btn {
            font-size: 0.9rem;
          }

          .result-output,
          .result-error {
            max-height: 150px;
          }
        }
      `}</style>
    </div>
  )
}
