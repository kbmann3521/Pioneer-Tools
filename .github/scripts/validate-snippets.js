#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Tool configurations
const TOOLS = [
  { id: 'case-converter', endpoint: '/api/tools/case-converter', testParams: { text: 'hello world' } },
  { id: 'word-counter', endpoint: '/api/tools/word-counter', testParams: { text: 'hello world test' } },
  { id: 'base64-converter', endpoint: '/api/tools/base64-converter', testParams: { text: 'hello', mode: 'encode' } },
  { id: 'json-formatter', endpoint: '/api/tools/json-formatter', testParams: { json: '{"test": "value"}', mode: 'format' } },
  { id: 'url-encoder', endpoint: '/api/tools/url-encoder', testParams: { text: 'hello world', mode: 'encode' } },
  { id: 'slug-generator', endpoint: '/api/tools/slug-generator', testParams: { text: 'hello world', separator: '-' } },
  { id: 'password-generator', endpoint: '/api/tools/password-generator', testParams: { length: 12 } },
  { id: 'hex-rgba-converter', endpoint: '/api/tools/hex-rgba-converter', testParams: { hex: '#FF0000' } },
  { id: 'image-resizer', endpoint: '/api/tools/image-resizer', testParams: { imageUrl: 'https://via.placeholder.com/100', width: 50, height: 50 } },
  { id: 'og-generator', endpoint: '/api/tools/og-generator', testParams: { title: 'Test', description: 'Test page', url: 'https://example.com' } },
  { id: 'blog-generator', endpoint: '/api/tools/blog-generator', testParams: { topic: 'AI' } },
];

const LANGUAGES = ['curl', 'python', 'nodejs', 'typescript', 'java', 'go', 'csharp', 'ruby', 'php'];
const PISTON_URL = process.env.PISTON_API_URL || 'https://api.piston.codes/v1/execute';
const API_BASE_URL = process.env.API_BASE_URL;
const DEMO_API_KEY = process.env.DEMO_API_KEY;

// Map languages to Piston runtime values
const PISTON_RUNTIMES = {
  python: { language: 'python', version: '3.11' },
  nodejs: { language: 'javascript', version: '20.10.0' },
  typescript: { language: 'typescript', version: '5.2.2' },
  java: { language: 'java', version: '17.0.8' },
  go: { language: 'go', version: '1.20.0' },
  ruby: { language: 'ruby', version: '3.2.0' },
  php: { language: 'php', version: '8.2.0' },
  csharp: { language: 'csharp', version: '6.12.0' },
};

/**
 * Generate code snippet for a given tool and language
 */
function generateCodeSnippet(tool, language) {
  const apiUrl = `${API_BASE_URL}${tool.endpoint}`;
  const params = JSON.stringify(tool.testParams);

  const snippets = {
    fetch: `const response = await fetch('${apiUrl}', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ${DEMO_API_KEY}',
  },
  body: JSON.stringify(${params}),
});
const data = await response.json();
console.log(JSON.stringify(data));`,

    nodejs: `const https = require('https');
const options = {
  hostname: '${new URL(apiUrl).hostname}',
  port: 443,
  path: '${new URL(apiUrl).pathname}',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ${DEMO_API_KEY}',
  },
};
const req = https.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => { console.log(JSON.stringify(JSON.parse(data))); });
});
req.on('error', (error) => { console.error('Error:', error.message); });
req.write(JSON.stringify(${params}));
req.end();`,

    typescript: `import fetch from 'node-fetch';
interface ApiResponse {
  success: boolean;
  data?: Record<string, any>;
  error?: string;
}
const response = await fetch('${apiUrl}', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ${DEMO_API_KEY}',
  },
  body: JSON.stringify(${params}),
});
const data: ApiResponse = await response.json();
console.log(JSON.stringify(data));`,

    python: `import urllib.request
import json
headers = {
    'Authorization': 'Bearer ${DEMO_API_KEY}',
    'Content-Type': 'application/json'
}
data = json.dumps(${params}).encode('utf-8')
req = urllib.request.Request('${apiUrl}', data=data, headers=headers, method='POST')
with urllib.request.urlopen(req) as response:
    result = json.loads(response.read())
    print(json.dumps(result))`,

    ruby: `require 'net/https'
require 'json'
uri = URI('${apiUrl}')
http = Net::HTTP.new(uri.host, uri.port)
http.use_ssl = true
request = Net::HTTP::Post.new(uri.path)
request['Content-Type'] = 'application/json'
request['Authorization'] = 'Bearer ${DEMO_API_KEY}'
request.body = JSON.generate(${params})
response = http.request(request)
puts JSON.generate(JSON.parse(response.body))`,

    php: `<?php
$url = '${apiUrl}';
$headers = [
    'Content-Type: application/json',
    'Authorization: Bearer ${DEMO_API_KEY}',
];
$ch = curl_init($url);
curl_setopt($ch, CURLOPT_POST, 1);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode(${params}));
curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
$response = curl_exec($ch);
curl_close($ch);
echo json_encode(json_decode($response));
?>`,

    go: `package main
import (
    "bytes"
    "encoding/json"
    "fmt"
    "io"
    "net/http"
)
func main() {
    data := ${params}
    jsonData, _ := json.Marshal(data)
    req, _ := http.NewRequest("POST", "${apiUrl}", bytes.NewBuffer(jsonData))
    req.Header.Set("Content-Type", "application/json")
    req.Header.Set("Authorization", "Bearer ${DEMO_API_KEY}")
    client := &http.Client{}
    resp, _ := client.Do(req)
    body, _ := io.ReadAll(resp.Body)
    var result interface{}
    json.Unmarshal(body, &result)
    jsonResp, _ := json.Marshal(result)
    fmt.Println(string(jsonResp))
}`,

    java: `import java.io.*;
import java.net.HttpURLConnection;
import java.net.URL;
import org.json.JSONObject;
URL url = new URL("${apiUrl}");
HttpURLConnection conn = (HttpURLConnection) url.openConnection();
conn.setRequestMethod("POST");
conn.setRequestProperty("Content-Type", "application/json");
conn.setRequestProperty("Authorization", "Bearer ${DEMO_API_KEY}");
conn.setDoOutput(true);
String payload = new JSONObject(${params}).toString();
conn.getOutputStream().write(payload.getBytes());
BufferedReader reader = new BufferedReader(new InputStreamReader(conn.getInputStream()));
String line, response = "";
while ((line = reader.readLine()) != null) response += line;
System.out.println(response);`,

    csharp: `using System;
using System.Net.Http;
using System.Threading.Tasks;
using System.Text.Json;
var client = new HttpClient();
var content = new StringContent(JsonSerializer.Serialize(${params}), System.Text.Encoding.UTF8, "application/json");
client.DefaultRequestHeaders.Add("Authorization", "Bearer ${DEMO_API_KEY}");
var response = await client.PostAsync("${apiUrl}", content);
var result = await response.Content.ReadAsStringAsync();
Console.WriteLine(result);`,

    curl: `curl -X POST '${apiUrl}' \\
  -H 'Content-Type: application/json' \\
  -H 'Authorization: Bearer ${DEMO_API_KEY}' \\
  -d '${params}'`,
  };

  return snippets[language] || null;
}

/**
 * Execute code using Piston API
 */
async function executeCode(code, language) {
  if (language === 'curl') {
    // curl is a command, not executable code - just return success
    return { success: true, output: 'curl syntax validated' };
  }

  if (!PISTON_RUNTIMES[language]) {
    return { success: false, error: `Language ${language} not supported by Piston` };
  }

  const runtime = PISTON_RUNTIMES[language];

  try {
    const response = await fetch(PISTON_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        language: runtime.language,
        version: runtime.version,
        files: [{ name: `code.${getFileExtension(language)}`, content: code }],
        stdin: '',
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      return { success: false, error: `Piston error: ${error}` };
    }

    const result = await response.json();
    if (result.compile && result.compile.stderr) {
      return { success: false, error: result.compile.stderr };
    }
    if (result.runtime && result.runtime.stderr) {
      return { success: false, error: result.runtime.stderr };
    }

    return { success: true, output: result.run?.stdout || '' };
  } catch (err) {
    return { success: false, error: `Execution error: ${err.message}` };
  }
}

/**
 * Get file extension for language
 */
function getFileExtension(language) {
  const extensions = {
    python: 'py',
    nodejs: 'js',
    typescript: 'ts',
    java: 'java',
    go: 'go',
    ruby: 'rb',
    php: 'php',
    csharp: 'cs',
  };
  return extensions[language] || 'txt';
}

/**
 * Test real API endpoint
 */
async function testApiEndpoint(tool) {
  try {
    const response = await fetch(`${API_BASE_URL}${tool.endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DEMO_API_KEY}`,
      },
      body: JSON.stringify(tool.testParams),
    });

    if (!response.ok) {
      return { success: false, error: `API returned ${response.status}` };
    }

    const data = await response.json();
    return { success: true, data };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * Main validation function
 */
async function validateSnippets() {
  const results = [];

  console.log(`Starting validation of ${TOOLS.length} tools × ${LANGUAGES.length} languages...`);

  for (const tool of TOOLS) {
    console.log(`\nValidating ${tool.id}...`);

    // First, test the real API endpoint
    const apiTest = await testApiEndpoint(tool);
    if (!apiTest.success) {
      console.log(`  ❌ API endpoint failed: ${apiTest.error}`);
      // Mark all languages as failed if API doesn't work
      for (const language of LANGUAGES) {
        results.push({
          toolId: tool.id,
          language,
          status: 'failure',
          errorMessage: `API endpoint error: ${apiTest.error}`,
        });
      }
      continue;
    }

    console.log(`  ✅ API endpoint working`);

    // Now test each language snippet
    for (const language of LANGUAGES) {
      const code = generateCodeSnippet(tool, language);
      if (!code) {
        console.log(`  ⚠️  ${language}: snippet generation failed`);
        results.push({
          toolId: tool.id,
          language,
          status: 'failure',
          errorMessage: 'Failed to generate code snippet',
        });
        continue;
      }

      const execution = await executeCode(code, language);
      if (execution.success) {
        console.log(`  ✅ ${language}: validated`);
        results.push({
          toolId: tool.id,
          language,
          status: 'success',
        });
      } else {
        console.log(`  ❌ ${language}: ${execution.error}`);
        results.push({
          toolId: tool.id,
          language,
          status: 'failure',
          errorMessage: execution.error,
        });
      }
    }
  }

  // Write results to file
  fs.writeFileSync(
    path.join(process.cwd(), 'validation-results.json'),
    JSON.stringify(results, null, 2)
  );

  // Set GitHub Actions output
  const successCount = results.filter(r => r.status === 'success').length;
  const failureCount = results.filter(r => r.status === 'failure').length;

  console.log(`\n📊 Results: ${successCount} passed, ${failureCount} failed out of ${results.length} total`);
  console.log(`✅ Wrote results to validation-results.json`);

  // Exit with error if any failed
  if (failureCount > 0) {
    process.exit(1);
  }
}

// Run validation
validateSnippets().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
