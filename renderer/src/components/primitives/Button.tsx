import { type ButtonHTMLAttributes, type ReactNode } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'link'
  size?: 'sm' | 'md' | 'lg' | 'icon'
  children: ReactNode
}

/** Button · 5 种 variant × 4 种 size 的统一按钮 */
export function Button({
  variant = 'secondary',
  size = 'md',
  className = '',
  type = 'button',
  children,
  ...rest
}: ButtonProps) {
  const cls = [
    'p-btn',
    `p-btn-${variant}`,
    size === 'sm' ? 'size-sm' : '',
    size === 'lg' ? 'size-lg' : '',
    size === 'icon' ? 'size-icon' : '',
    className,
  ].filter(Boolean).join(' ')
  return (
    <button type={type} className={cls} {...rest}>
      {children}
    </button>
  )
}
