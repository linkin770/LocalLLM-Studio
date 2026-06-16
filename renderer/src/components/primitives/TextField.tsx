import { type ReactNode, type InputHTMLAttributes, forwardRef } from 'react'

interface TextFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  size?: 'sm' | 'md' | 'lg'
  invalid?: boolean
  iconLeft?: ReactNode
  iconRight?: ReactNode
  prefix?: ReactNode
  suffix?: ReactNode
}

/** TextField · 带前缀/后缀/图标/焦点环的输入框 */
export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(function TextField(
  { size = 'md', invalid = false, iconLeft, iconRight, prefix, suffix, className = '', ...rest },
  ref,
) {
  const cls = [
    'p-field',
    size === 'sm' ? 'size-sm' : '',
    size === 'lg' ? 'size-lg' : '',
    invalid ? 'invalid' : '',
    className,
  ].filter(Boolean).join(' ')
  return (
    <span className={cls}>
      {iconLeft ? <span className="icon-left">{iconLeft}</span> : null}
      {prefix ? <span className="prefix">{prefix}</span> : null}
      <input ref={ref} {...rest} />
      {suffix ? <span className="suffix">{suffix}</span> : null}
      {iconRight ? <span className="icon-right">{iconRight}</span> : null}
    </span>
  )
})
