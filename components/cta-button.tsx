import { cn } from '@/lib/utils'

type CtaButtonProps = {
  href?: string
  children: React.ReactNode
  variant?: 'primary' | 'ghost'
  className?: string
}

export function CtaButton({
  href = '#pricing',
  children,
  variant = 'primary',
  className,
}: CtaButtonProps) {
  return (
    <a
      href={href}
      className={cn(
        'inline-flex min-h-11 items-center justify-center rounded-xl px-6 py-3 text-sm font-semibold tracking-wide transition-all',
        variant === 'primary' &&
          'bg-gradient-to-r from-primary to-accent text-primary-foreground shadow-lg shadow-primary/25 hover:brightness-110',
        variant === 'ghost' &&
          'border border-border/70 bg-card/60 text-foreground hover:border-primary/60',
        className,
      )}
    >
      {children}
    </a>
  )
}
