'use client'

import { getToolCost, formatCost, RATE_LIMITS } from '@/config/pricing.config'

interface PricingCardProps {
  toolName: string
}

export default function PricingCard({ toolName }: PricingCardProps) {
  const toolCost = getToolCost(toolName)
  const toolCostFormatted = formatCost(toolCost)

  return (
    <div className="api-preview-pricing">
      <div className="pricing-card">
        <div className="pricing-item">
          <label>Cost Per Call</label>
          <p className="pricing-value">{toolCostFormatted}</p>
        </div>
        <div className="pricing-divider"></div>
        <div className="pricing-item rate-limits-container">
          <div className="rate-limits">
            <div className="rate-tier">
              <p><strong>Free Tier:</strong></p>
              <small>{RATE_LIMITS.FREE.dailyCallLimit} calls/day, {RATE_LIMITS.FREE.requestsPerSecond} req/sec</small>
            </div>
            <div className="rate-tier">
              <p><strong>Paid Tier:</strong></p>
              <small>Unlimited calls, {RATE_LIMITS.PAID.requestsPerSecond} req/sec</small>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .api-preview-pricing {
          margin-top: 0.4rem;
          padding-top: 0.4rem;
          border-top: 1px solid var(--border-color);
          flex-shrink: 0;
        }

        .pricing-card {
          display: grid;
          grid-template-columns: 1fr 1px 1fr;
          gap: 0.5rem;
          align-items: center;
          background: var(--bg-primary);
          padding: 0.5rem;
          border-radius: 6px;
        }

        .pricing-item {
          text-align: center;
        }

        .pricing-item label {
          display: block;
          font-size: 0.65rem;
          color: var(--text-tertiary);
          font-weight: 600;
          text-transform: uppercase;
          margin-bottom: 0.2rem;
          letter-spacing: 0.5px;
        }

        .pricing-value {
          margin: 0;
          font-size: 1.25rem;
          font-weight: 700;
          color: var(--color-primary);
        }

        .pricing-divider {
          background: var(--border-color);
          height: 14px;
        }

        .rate-limits-container {
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .rate-limits {
          display: flex;
          flex-direction: column;
          gap: 0.15rem;
          text-align: left;
        }

        .rate-tier {
          font-size: 0.8rem;
          line-height: 1.2;
        }

        .rate-tier p {
          margin: 0 0 0.05rem 0;
          font-weight: 600;
        }

        .rate-tier small {
          color: var(--text-secondary);
          display: block;
        }

        @media (max-width: 768px) {
          .pricing-card {
            grid-template-columns: auto 1px auto;
            gap: 0.3rem;
            padding: 0.4rem;
          }

          .pricing-divider {
            height: 20px;
            width: 1px;
          }

          .pricing-item {
            text-align: center;
          }

          .pricing-item label {
            font-size: 0.6rem;
            margin-bottom: 0.1rem;
          }

          .pricing-value {
            font-size: 1.1rem;
          }

          .rate-limits {
            gap: 0.1rem;
          }

          .rate-tier {
            font-size: 0.7rem;
          }

          .rate-tier p {
            margin: 0;
            font-size: 0.7rem;
          }

          .rate-tier small {
            font-size: 0.65rem;
          }
        }
      `}</style>
    </div>
  )
}
