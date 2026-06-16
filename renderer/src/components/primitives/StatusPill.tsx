import { type ReactNode, type ButtonHTMLAttributes } from 'react'
import { StatusDot, type StatusKind } from './StatusDot'

interface StatusPillProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  status: StatusKind
  name: ReactNode
  meta?: ReactNode
  bare?: boolean
}

/** StatusPill · 服务的"心跳"，活体状态指示 */
export function StatusPill({
  status,
  name,
  meta,
  bare = false,
  className = '',
  type = 'button',
  ...rest
}: StatusPillProps) {
  return (
    <button
      type={type}
      className={`p-status-pill ${bare ? 'bare' : ''} ${className}`.trim()}
      {...rest}
    >
      <StatusDot kind={status} />
      <span className="name">{name}</span>
      {meta ? (
        <>
          <span className="sep">·</span>
          <span className="meta">{meta}</span>
        </>
      ) : null}
    </button>
  )
}
