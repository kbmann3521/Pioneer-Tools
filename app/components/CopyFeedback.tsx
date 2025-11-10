'use client'

interface CopyFeedbackProps {
  message: string | null
  position?: { x: number; y: number } | null
}

export default function CopyFeedback({ message, position }: CopyFeedbackProps) {
  if (!message) return null

  const positionStyle = position
    ? {
        left: `${position.x}px`,
        top: `${position.y}px`,
        transform: 'translate(-50%, -50%)',
      }
    : {
        top: '20px',
        right: '20px',
        transform: 'none',
      }

  return (
    <div className="copy-feedback-wrapper" style={positionStyle}>
      <div className="toast-notification success">
        <svg width="16" height="16" viewBox="0 0 20 20" fill="none" className="toast-icon">
          <path d="M7 10L9 12L13 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <circle cx="10" cy="10" r="9" stroke="currentColor" strokeWidth="1.5"/>
        </svg>
        <span className="toast-message">{message}</span>
      </div>
      <style jsx>{`
        .copy-feedback-wrapper {
          position: fixed;
          z-index: 10000;
          pointer-events: none;
        }

        .toast-notification {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 14px;
          background: rgba(34, 170, 34, 0.95);
          color: white;
          border-radius: 6px;
          font-size: 13px;
          font-weight: 500;
          backdrop-filter: blur(10px);
          border: 1px solid rgba(34, 170, 34, 0.5);
          box-shadow: 0 8px 24px rgba(34, 170, 34, 0.25);
          animation: popIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
          pointer-events: auto;
          white-space: nowrap;
        }

        .toast-icon {
          flex-shrink: 0;
          color: inherit;
          width: 16px;
          height: 16px;
        }

        .toast-message {
          flex: 1;
        }

        @keyframes popIn {
          0% {
            opacity: 0;
            transform: scale(0.5) translateY(10px);
          }
          65% {
            opacity: 1;
            transform: scale(1.05);
          }
          100% {
            opacity: 0;
            transform: scale(0.95) translateY(-20px);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .toast-notification {
            animation: none;
            opacity: 1;
          }
        }
      `}</style>
    </div>
  )
}
