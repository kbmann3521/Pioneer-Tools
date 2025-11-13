'use client'

import { useState, useEffect } from 'react'
import { useApiPanel } from '@/app/context/ApiPanelContext'
import CodeLanguageSelector, { type CodeLanguage } from '@/app/components/CodeLanguageSelector'
import CodePreview from '@/app/components/CodePreview'
import PricingCard from '@/app/components/PricingCard'
import type { ToolParams } from '@/lib/types/tools'

interface ApiPreviewProps {
  endpoint: string
  method?: string
  params?: Partial<ToolParams>
  toolName: string
  enableCodeExecution?: boolean
}

export default function ApiPreview({ endpoint, method = 'POST', params = {}, toolName, enableCodeExecution = false }: ApiPreviewProps) {
  const [language, setLanguage] = useState<CodeLanguage>('fetch')
  const [activeTab, setActiveTab] = useState<'request' | 'response' | 'run-code'>('request')
  const [isRunning, setIsRunning] = useState(false)
  const [isFetchingResponse, setIsFetchingResponse] = useState(false)
  const [executionResult, setExecutionResult] = useState<{ success: boolean; output?: string; error?: string; executionTime?: number } | null>(null)
  const [liveResponse, setLiveResponse] = useState<{ success: boolean; result?: any; error?: any; meta?: any } | null>(null)
  const [validationStatus, setValidationStatus] = useState<{ status: 'success' | 'failure' | 'pending'; errorMessage?: string; lastValidatedAt?: string } | null>(null)

  // Always use the public demo API key for display
  const publicDemoKey = 'pk_demo_sandbox_ea3f199fe'

  // Convert relative URLs to absolute URLs for code snippets
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

  // Convert toolName to toolId format (e.g., "Case Converter" -> "case-converter")
  const toolId = toolName
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')

  // Clear execution result and fetch validation status when language changes
  useEffect(() => {
    setExecutionResult(null)

    // Fetch validation status for the selected language
    const fetchValidationStatus = async () => {
      try {
        const response = await fetch(
          `/api/dev/validate-snippets?toolId=${toolId}&language=${language}`
        )
        const result = await response.json()
        if (result.success && result.data) {
          setValidationStatus({
            status: result.data.status,
            errorMessage: result.data.error_message,
            lastValidatedAt: result.data.last_validated_at,
          })
        } else {
          setValidationStatus(null)
        }
      } catch (err) {
        console.debug('Failed to fetch validation status:', err)
        setValidationStatus(null)
      }
    }

    fetchValidationStatus()
  }, [language, toolId])

  // Fetch live response whenever params change
  useEffect(() => {
    // Don't fetch if no params are provided
    const hasParams = Object.keys(params).length > 0 && Object.values(params).some(v => v !== '' && v !== null && v !== undefined)
    if (!hasParams) {
      setLiveResponse(null)
      return
    }

    const fetchLiveResponse = async () => {
      setIsFetchingResponse(true)
      try {
        // Call the proxy route which uses the demo API key
        const response = await fetch('/api/dev/run-code-proxy', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            endpoint: fullUrl,
            method,
            params,
          }),
        })

        if (!response.ok) {
          setLiveResponse(null)
          return
        }

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
  }, [params, fullUrl, method])

  const generateCode = (lang: CodeLanguage, apiKey: string = publicDemoKey): string => {
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
        return `import requests
import json

headers = {
    'Authorization': 'Bearer ${apiKey}'
}

data = ${paramStringCompact}

response = requests.${method.toLowerCase()}('${absoluteUrl}', json=data, headers=headers, timeout=5)
response.raise_for_status()

result = response.json()
print(json.dumps(result, indent=2))`

      case 'java':
        return `import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.net.URI;

try {
    HttpClient client = HttpClient.newHttpClient();

    String body = ${paramStringCompact.replace(/"/g, '\\"')};

    HttpRequest request = HttpRequest.newBuilder()
        .uri(URI.create("${absoluteUrl}"))
        .header("Content-Type", "application/json")
        .header("Authorization", "Bearer ${apiKey}")
        .method("${method}", HttpRequest.BodyPublishers.ofString(body))
        .timeout(java.time.Duration.ofSeconds(10))
        .build();

    HttpResponse<String> response = client.send(request,
        HttpResponse.BodyHandlers.ofString());

    System.out.println(response.body());
} catch (Exception e) {
    System.err.println("Error: " + e.getMessage());
}`

      case 'go':
        return `package main

import (
    "bytes"
    "encoding/json"
    "fmt"
    "io"
    "log"
    "net/http"
)

func main() {
    data := map[string]interface{}{
${Object.entries(params).map(([k, v]) => `        "${k}": ${typeof v === 'string' ? `"${v}"` : v},`).join('\n')}
    }

    jsonData, err := json.Marshal(data)
    if err != nil {
        log.Fatal("Marshal error:", err)
    }

    req, err := http.NewRequest("${method}", "${absoluteUrl}", bytes.NewBuffer(jsonData))
    if err != nil {
        log.Fatal("Request error:", err)
    }
    req.Header.Set("Content-Type", "application/json")
    req.Header.Set("Authorization", "Bearer ${apiKey}")

    client := &http.Client{}
    resp, err := client.Do(req)
    if err != nil {
        log.Fatal("Do error:", err)
    }
    defer resp.Body.Close()

    body, err := io.ReadAll(resp.Body)
    if err != nil {
        log.Fatal("ReadAll error:", err)
    }
    fmt.Println(string(body))
}`

      case 'csharp': {
        const methodName = method === 'POST' ? 'PostAsync' : method === 'GET' ? 'GetAsync' : method === 'PUT' ? 'PutAsync' : 'PostAsync'
        return `using System;
using System.Net.Http;
using System.Text;
using System.Threading.Tasks;

class Program {
    static async Task Main() {
        using var client = new HttpClient();
        client.DefaultRequestHeaders.Add("Authorization", "Bearer ${apiKey}");

        var json = @"${paramStringCompact.replace(/"/g, '""')}";
        var content = new StringContent(json, Encoding.UTF8, "application/json");

        var response = await client.${methodName}("${absoluteUrl}", content);
        response.EnsureSuccessStatusCode();

        var result = await response.Content.ReadAsStringAsync();
        Console.WriteLine(result);
    }
}`
      }

      case 'ruby': {
        const methodClass = method === 'POST' ? 'Post' : method === 'GET' ? 'Get' : method === 'PUT' ? 'Put' : 'Post'
        // Convert JSON to Ruby hash syntax with hash rockets (=>)
        const jsonToRubyHash = (json: string) => {
          return json.replace(/"/g, "'").replace(/:/g, ' =>')
        }
        const rubyHashSyntax = jsonToRubyHash(paramStringCompact)
        return `require 'net/http'
require 'json'
require 'uri'

uri = URI("${absoluteUrl}")
data = ${rubyHashSyntax}

http = Net::HTTP.new(uri.host, uri.port)
http.use_ssl = (uri.scheme == 'https')

request = Net::HTTP::${methodClass}.new(uri.path)
request['Content-Type'] = 'application/json'
request['Authorization'] = 'Bearer ${apiKey}'
request.body = JSON.generate(data)

response = http.request(request)
puts JSON.pretty_generate(JSON.parse(response.body))`
      }

      case 'php': {
        const escapedJson = paramStringCompact.replace(/\\/g, '\\\\').replace(/'/g, "\\'")
        return `<?php

$url = "${absoluteUrl}";
$data = json_decode('${escapedJson}', true);

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $url);
curl_setopt($ch, CURLOPT_CUSTOMREQUEST, '${method}');
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, array(
    'Content-Type: application/json',
    'Authorization: Bearer ${apiKey}'
));

$response = curl_exec($ch);
curl_close($ch);

$result = json_decode($response, true);
echo json_encode($result, JSON_PRETTY_PRINT);
?>`
      }

      default:
        return ''
    }
  }

  const code = generateCode(language, publicDemoKey)

  const runCode = async () => {
    setIsRunning(true)
    setExecutionResult(null)

    try {
      // Call the proxy route which uses the demo API key to call the tool API
      const response = await fetch('/api/dev/run-code-proxy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          endpoint: fullUrl,
          method,
          params,
        }),
      })

      let result: any
      try {
        result = await response.json()
      } catch (parseErr) {
        setExecutionResult({
          success: false,
          error: `Failed to parse response: ${parseErr instanceof Error ? parseErr.message : 'Invalid JSON'}`,
          executionTime: 0,
        })
        setIsRunning(false)
        return
      }

      if (response.ok && result.success) {
        setExecutionResult({
          success: true,
          output: JSON.stringify(result.result || result, null, 2),
          executionTime: 0,
        })
      } else {
        let errorMessage = `Server error (${response.status}): ${response.statusText}`
        if (result.error) {
          if (typeof result.error === 'object' && result.error.message) {
            errorMessage = result.error.message
          } else if (typeof result.error === 'string') {
            errorMessage = result.error
          }
        }
        setExecutionResult({
          success: false,
          error: errorMessage,
          executionTime: 0,
        })
      }
    } catch (err) {
      setExecutionResult({
        success: false,
        error: err instanceof Error ? err.message : 'Failed to execute code',
        executionTime: 0,
      })
    } finally {
      setIsRunning(false)
    }
  }

  const { setOpen } = useApiPanel()

  return (
    <div className="api-preview">
      <div
        className="api-preview-back-btn"
        onClick={() => setOpen(false)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            setOpen(false)
          }
        }}
        aria-label="Close API view"
      >
        ← Back to tool
      </div>
      <div className="api-preview-header">
        <p className="api-endpoint">{method} {endpoint}</p>
      </div>

      <div className="language-selector-wrapper">
        <label htmlFor="language-select" className="language-select-label">
          <p>Language:</p>
        </label>
        <CodeLanguageSelector language={language} onLanguageChange={setLanguage} />

        {validationStatus && (
          <div className={`validation-status validation-${validationStatus.status}`}>
            <span className="validation-icon">
              {validationStatus.status === 'success' ? '✅' : '❌'}
            </span>
            <span className="validation-text">
              {validationStatus.status === 'success' ? 'Validated' : 'Failed'}
            </span>
            {validationStatus.lastValidatedAt && (
              <span className="validation-time">
                {new Date(validationStatus.lastValidatedAt).toLocaleDateString()} {new Date(validationStatus.lastValidatedAt).toLocaleTimeString()}
              </span>
            )}
          </div>
        )}
      </div>

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
            disabled={isRunning}
            className="run-code-btn"
            title="Test the API endpoint"
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

        .api-preview-back-btn {
          display: block;
          color: var(--color-primary);
          font-weight: 600;
          margin-bottom: 1rem;
          padding: 0.5rem 0;
          background: none;
          border: none;
          cursor: pointer;
          transition: opacity 0.2s ease;
        }

        .api-preview-back-btn:hover {
          opacity: 0.8;
        }

        .api-preview-header {
          display: flex;
          flex-direction: column;
          gap: 0.1rem;
          margin-bottom: 1rem;
        }

        .api-endpoint {
          margin: 0;
          font-size: 0.95rem;
          color: var(--text-secondary);
          font-family: 'Monaco', 'Courier New', monospace;
          font-weight: 600;
          background-color: var(--bg-primary);
          border-radius: 4px;
          padding: 0.5rem 0.75rem;
          word-break: break-all;
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

        .language-selector-wrapper {
          display: flex;
          align-items: center;
          gap: 1rem;
          flex-wrap: wrap;
        }

        .validation-status {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 0.75rem;
          border-radius: 4px;
          font-size: 0.85rem;
          white-space: nowrap;
        }

        .validation-status.validation-success {
          background: rgba(34, 170, 34, 0.1);
          color: #22aa22;
          border: 1px solid rgba(34, 170, 34, 0.3);
        }

        .validation-status.validation-failure {
          background: rgba(255, 68, 68, 0.1);
          color: #ff4444;
          border: 1px solid rgba(255, 68, 68, 0.3);
        }

        .validation-status.validation-pending {
          background: rgba(170, 170, 34, 0.1);
          color: #aaaa22;
          border: 1px solid rgba(170, 170, 34, 0.3);
        }

        .validation-icon {
          font-size: 1rem;
        }

        .validation-text {
          font-weight: 600;
        }

        .validation-time {
          font-size: 0.75rem;
          opacity: 0.8;
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
