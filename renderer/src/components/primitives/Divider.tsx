import { type HTMLAttributes } from 'react'

interface DividerProps extends HTMLAttributes<HTMLHRElement> {
  orientation?: 'horizontal' | 'vertical'
}

/** Divider · 极简分割线（1px，alpha 化） */
export function Divider({ orientation = 'horizontal', className = '', ...rest }: DividerProps) {
  return <hr className={`p-divider-${orientation === 'vertical' ? 'v' : 'h'} ${className}`.trim()} {...rest} />
}
