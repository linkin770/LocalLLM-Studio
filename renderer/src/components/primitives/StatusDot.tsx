import { type ReactNode, type HTMLAttributes } from 'react'

export type StatusKind = 'running' | 'stopped' | 'starting' | 'warning' | 'danger' | 'idle'

interface StatusDotProps extends HTMLAttributes<HTMLSpanElement> {
  kind?: StatusKind
  size?: number
}

/** 状态点 · 6 种状态：running（脉冲）/ starting（旋转）/ stopped / warning / danger / idle */
export function StatusDot({ kind = 'idle', size, style, className = '', ...rest }: StatusDotProps) {
  return (
    <span
      className={`p-dot ${kind} ${className}`.trim()}
      style={size ? { width: size, height: size, ...style } : style}
      {...rest}
    />
  )
}
