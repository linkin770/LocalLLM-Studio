import { type ReactNode } from 'react'

interface KbdProps {
  children: ReactNode
  className?: string
  title?: string
}

/** Kbd · 单个键盘按键（带下边框的微立体感） */
export function Kbd({ children, className = '', title }: KbdProps) {
  return (
    <kbd className={`p-kbd ${className}`.trim()} title={title}>
      {children}
    </kbd>
  )
}

interface KbdGroupProps {
  children: ReactNode
  className?: string
}

/** KbdGroup · 一组快捷键（如 ⌘K 自动按 + 分隔） */
export function KbdGroup({ children, className = '' }: KbdGroupProps) {
  const items = Array.isArray(children) ? children : [children]
  return (
    <span className={`p-kbd-group ${className}`.trim()}>
      {items.map((child, i) => (
        <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
          {i > 0 ? <span className="p-kbd-sep">+</span> : null}
          {child}
        </span>
      ))}
    </span>
  )
}
