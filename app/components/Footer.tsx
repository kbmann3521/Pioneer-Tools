'use client'

export default function Footer() {
  return (
    <footer className="footer">
      <p>Passion Project by Kyle Mann • © {new Date().getFullYear()} Pioneer Web Tools. All rights reserved.</p>
      <style jsx>{`
        .footer {
          background: var(--bg-secondary);
          border-top: 1px solid var(--border-color);
          padding: 0.75rem 2rem;
          text-align: center;
          margin-top: auto;
        }

        .footer p {
          margin: 0;
          font-size: 0.85rem;
          color: var(--text-tertiary);
          line-height: 1.4;
        }
      `}</style>
    </footer>
  )
}
