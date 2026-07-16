import { useState } from 'react'
import { Check, Copy } from 'lucide-react'

export function CopyButton({
  value,
  children,
}: {
  value: string
  children: React.ReactNode
}) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    await navigator.clipboard.writeText(
      value.replaceAll('{{origin}}', window.location.origin),
    )
    setCopied(true)
    window.setTimeout(() => setCopied(false), 2_000)
  }

  return (
    <button
      className="button button--paper"
      onClick={() => void copy()}
      type="button"
    >
      {copied ? (
        <Check aria-hidden="true" size={16} />
      ) : (
        <Copy aria-hidden="true" size={16} />
      )}
      {copied ? 'Copied' : children}
    </button>
  )
}
