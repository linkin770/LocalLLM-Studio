import { type ReactNode } from 'react'

export type PillTone = 'neutral' | 'success' | 'warning' | 'danger'

interface PillProps {
  tone?: PillTone
  children: ReactNode
  className?: string
}

/** Pill · 圆角胶囊状态指示器 */
export function Pill({ tone = 'neutral', children, className = '' }: PillProps) {
  return <span className={`p-pill ${tone} ${className}`.trim()}>{children}</span>
}
