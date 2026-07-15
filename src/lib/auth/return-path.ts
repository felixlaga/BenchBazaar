export function getSafeReturnPath(value: string | null): string | undefined {
  if (!value) return undefined
  if (!value.startsWith('/') || value.startsWith('//')) return undefined
  if (value.includes('\\') || value.includes('\0')) return undefined

  return value
}
