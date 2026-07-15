import type { ReactNode } from 'react'
import { CircleAlert, FlaskConical, ShieldCheck } from 'lucide-react'

type StatusBannerProps = {
  variant?: 'info' | 'warning' | 'success'
  title: string
  children: ReactNode
}

const icons = {
  info: FlaskConical,
  warning: CircleAlert,
  success: ShieldCheck,
}

export function StatusBanner({
  variant = 'info',
  title,
  children,
}: StatusBannerProps) {
  const Icon = icons[variant]

  return (
    <aside className={`status-banner status-banner--${variant}`}>
      <Icon aria-hidden="true" size={21} />
      <div>
        <strong>{title}</strong>
        <div>{children}</div>
      </div>
    </aside>
  )
}
