'use client'

import { useRouter } from 'next/navigation'

interface DashboardProps {
  theme: string
  setTheme: (theme: string) => void
}

export default function Dashboard({ theme, setTheme }: DashboardProps) {
  const router = useRouter()

  return (
    <div className="homepage">
      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-content">
          <h1>Your Toolkit for Productivity & Development</h1>
          <p className="hero-subtitle">Free, fast, and powerful online tools for everyone. Perfect for everyday tasks and developer workflows.</p>
          <p className="hero-tagline">No sign-up required. No ads. All tools work in your browser.</p>
        </div>
      </section>

      {/* For Everyone Section */}
      <section className="audience-section">
        <h2>Built for Everyone</h2>
        <div className="audience-grid">
          <div className="audience-card">
            <div className="audience-icon">👥</div>
            <h3>For Everyday Users</h3>
            <p>Quick, intuitive tools to help you with daily tasks. Convert text, resize images, count words, and more—instantly in your browser.</p>
            <ul className="audience-list">
              <li>No installation needed</li>
              <li>Works offline</li>
              <li>Zero data tracking</li>
              <li>Completely free</li>
            </ul>
          </div>

          <div className="audience-card">
            <div className="audience-icon">👨‍💻</div>
            <h3>For Developers</h3>
            <p>Integrate our tools into your applications via REST API. Each tool has a dedicated endpoint with full documentation and examples.</p>
            <ul className="audience-list">
              <li>REST API for all tools</li>
              <li>Easy authentication</li>
              <li>Rate limiting & usage tracking</li>
              <li>Pay only for what you use</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="features-section">
        <h2>Why Choose Us?</h2>
        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon">⚡</div>
            <h3>Instant Results</h3>
            <p>Fast processing with no waiting. See results in real-time as you work.</p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">🔒</div>
            <h3>Privacy First</h3>
            <p>All processing happens in your browser. Your data never leaves your device.</p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">🔌</div>
            <h3>API Ready</h3>
            <p>Developers can access all tools via REST API with flexible authentication and transparent pricing.</p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">📦</div>
            <h3>Always Free</h3>
            <p>Web tools are completely free. API access is affordable with pay-as-you-go pricing.</p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">🎯</div>
            <h3>Reliable</h3>
            <p>Built for performance and stability. No ads, no interruptions, no limitations.</p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">🚀</div>
            <h3>Growing Library</h3>
            <p>New tools added regularly. Request features and vote on what you'd like to see next.</p>
          </div>
        </div>
      </section>

      {/* API Section */}
      <section className="api-section">
        <h2>Integrate with Your Application</h2>
        <div className="api-content">
          <div className="api-description">
            <p>Get programmatic access to all our tools. Perfect for automating workflows, building applications, and saving time.</p>
            <div className="api-features">
              <div className="api-feature">
                <span className="check">✓</span>
                <span>Straightforward REST API</span>
              </div>
              <div className="api-feature">
                <span className="check">✓</span>
                <span>API Key authentication</span>
              </div>
              <div className="api-feature">
                <span className="check">✓</span>
                <span>Usage tracking & analytics</span>
              </div>
              <div className="api-feature">
                <span className="check">✓</span>
                <span>Flexible credit-based pricing</span>
              </div>
            </div>
            <button className="btn-api-primary" onClick={() => router.push('/auth?mode=signup')}>Sign Up for API Access</button>
          </div>
          <div className="api-example">
            <h4>Example API Request</h4>
            <pre className="code-block"><code>{`curl https://tools-hub.com/api/tools/case-converter \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -d '{"text": "hello world", "format": "uppercase"}'

// Response
{
  "success": true,
  "result": "HELLO WORLD"
}`}</code></pre>
          </div>
        </div>
      </section>

      <style jsx>{`
        .homepage {
          width: 100%;
          color: var(--text-primary);
        }

        .hero-section {
          background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-dark) 100%);
          color: white;
          padding: 4rem 2rem;
          text-align: center;
          margin-bottom: 3rem;
        }

        .hero-content h1 {
          font-size: clamp(2rem, 5vw, 3.5rem);
          margin: 0 0 1rem 0;
          line-height: 1.2;
        }

        .hero-subtitle {
          font-size: 1.1rem;
          max-width: 600px;
          margin: 0 auto 2rem;
          opacity: 0.95;
          line-height: 1.6;
        }

        .hero-tagline {
          font-size: 0.95rem;
          opacity: 0.85;
          margin: 0;
        }

        .audience-section {
          max-width: 1200px;
          margin: 0 auto 4rem;
          padding: 0 2rem;
        }

        .audience-section h2,
        .features-section h2,
        .api-section h2 {
          font-size: clamp(1.75rem, 4vw, 2.5rem);
          text-align: center;
          margin: 0 0 2rem 0;
        }

        .audience-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
          gap: 2rem;
        }

        .audience-card {
          background: var(--bg-secondary);
          border: 1px solid var(--border-color);
          border-radius: 12px;
          padding: 2rem;
        }

        .audience-icon {
          font-size: 2.5rem;
          margin-bottom: 1rem;
        }

        .audience-card h3 {
          font-size: 1.4rem;
          margin: 0 0 0.75rem 0;
        }

        .audience-card p {
          color: var(--text-secondary);
          margin: 0 0 1.5rem 0;
          line-height: 1.6;
        }

        .audience-list {
          list-style: none;
          padding: 0;
          margin: 0;
        }

        .audience-list li {
          padding: 0.5rem 0;
          padding-left: 1.5rem;
          position: relative;
          color: var(--text-secondary);
          font-size: 0.95rem;
        }

        .audience-list li:before {
          content: "✓ ";
          position: absolute;
          left: 0;
          color: var(--color-primary);
          font-weight: bold;
        }

        .features-section {
          background: var(--bg-secondary);
          padding: 3rem 2rem;
          margin-bottom: 4rem;
        }

        .features-section h2 {
          color: var(--text-primary);
        }

        .features-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 1.5rem;
          max-width: 1200px;
          margin: 0 auto;
        }

        .feature-card {
          background: var(--bg-primary);
          border: 1px solid var(--border-color);
          border-radius: 12px;
          padding: 1.75rem;
          text-align: center;
        }

        .feature-icon {
          font-size: 2.5rem;
          margin-bottom: 1rem;
          display: block;
        }

        .feature-card h3 {
          font-size: 1.1rem;
          margin: 0 0 0.75rem 0;
        }

        .feature-card p {
          margin: 0;
          font-size: 0.95rem;
          color: var(--text-secondary);
          line-height: 1.6;
        }

        .api-section {
          background: var(--bg-secondary);
          padding: 3rem 2rem;
          margin-bottom: 4rem;
        }

        .api-section h2 {
          max-width: 1200px;
          margin-left: auto;
          margin-right: auto;
        }

        .api-content {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 3rem;
          max-width: 1200px;
          margin: 0 auto;
          align-items: center;
        }

        .api-description p {
          font-size: 1rem;
          color: var(--text-secondary);
          line-height: 1.7;
          margin: 0 0 1.5rem 0;
        }

        .api-features {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          margin-bottom: 1.5rem;
        }

        .api-feature {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          font-size: 0.95rem;
        }

        .check {
          color: var(--color-primary);
          font-weight: bold;
          font-size: 1.25rem;
        }

        .btn-api-primary {
          padding: 0.875rem 2rem;
          background: var(--color-primary);
          color: white;
          border: none;
          border-radius: 6px;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-api-primary:hover {
          background: var(--color-primary-dark);
        }

        .api-example {
          background: var(--bg-primary);
          border: 1px solid var(--border-color);
          border-radius: 12px;
          padding: 1.5rem;
        }

        .api-example h4 {
          margin: 0 0 1rem 0;
          font-size: 0.95rem;
          color: var(--text-secondary);
        }

        .code-block {
          background: rgba(0, 0, 0, 0.3);
          padding: 1rem;
          border-radius: 6px;
          overflow-x: auto;
          margin: 0;
          border: 1px solid rgba(0, 0, 0, 0.1);
        }

        .code-block code {
          font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
          font-size: 0.85rem;
          line-height: 1.5;
          color: var(--text-tertiary);
        }

        @media (max-width: 768px) {
          .hero-section {
            padding: 2.5rem 1.5rem;
          }

          .hero-content h1 {
            font-size: 1.75rem;
          }

          .audience-grid {
            grid-template-columns: 1fr;
          }

          .api-content {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  )
}
