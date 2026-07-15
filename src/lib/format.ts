export function formatCompactNumber(value: number): string {
  return new Intl.NumberFormat('en', { notation: 'compact' }).format(value)
}

export function formatDate(value: string): string {
  return new Intl.DateTimeFormat('en', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(value))
}

export function formatScore(value: number, unit: '%' | 'score'): string {
  return unit === '%' ? `${value.toFixed(1)}%` : value.toFixed(2)
}
