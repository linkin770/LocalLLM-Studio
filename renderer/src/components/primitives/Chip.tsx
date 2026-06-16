import { type ReactNode } from 'react'

export type ChipTone = 'neutral' | 'accent' | 'success' | 'warning' | 'danger'
export type ChipDotKind = 'neutral' | 'accent' | 'success' | 'warning' | 'danger'

interface ChipProps {
  tone?: ChipTone
  dot?: ChipDotKind
  icon?: ReactNode
  onRemove?: () => void
  children: ReactNode
  className?: string
  title?: string
}

/** Chip · 带可选圆点/图标/移除按钮的附着项 */
export function Chip({
  tone = 'neutral',
  dot,
  icon,
  onRemove,
  children,
  className = '',
  title,
}: ChipProps) {
  return (
    <span className={`p-chip ${tone} ${className}`.trim()} title={title}>
      {icon ? <span className="p-chip-icon" style={{ display: 'inline-flex' }}>{icon}</span> : null}
      {dot ? <span className={`p-chip-dot ${dot}`} /> : null}
      <span className="p-chip-label">{children}</span>
      {onRemove ? (
        <button
          type="button"
          className="p-chip-remove"
          onClick={onRemove}
          aria-label="移除"
        >
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>
      ) : null}
    </span>
  )
}
