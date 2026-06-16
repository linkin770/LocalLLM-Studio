import { type ButtonHTMLAttributes, type ReactNode } from 'react'

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode
  size?: 'sm' | 'md' | 'lg'
  bordered?: boolean
  active?: boolean
  danger?: boolean
}

/** IconButton · 纯图标方形按钮 */
export function IconButton({
  children,
  size = 'md',
  bordered = false,
  active = false,
  danger = false,
  className = '',
  type = 'button',
  ...rest
}: IconButtonProps) {
  const cls = [
    'p-icon-btn',
    size === 'sm' ? 'size-sm' : '',
    size === 'lg' ? 'size-lg' : '',
    bordered ? 'bordered' : '',
    active ? 'active' : '',
    danger ? 'danger' : '',
    className,
  ].filter(Boolean).join(' ')
  return (
    <button type={type} className={cls} {...rest}>
      {children}
    </button>
  )
}
