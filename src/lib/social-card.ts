function escapeXml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;')
}

function truncate(value: string, length: number) {
  return value.length <= length ? value : `${value.slice(0, length - 1)}…`
}

export function socialCardSvg(input: {
  eyebrow: string
  title: string
  summary: string
  facts: Array<string>
}) {
  const facts = input.facts
    .slice(0, 4)
    .map(
      (fact, index) =>
        `<text x="${72 + index * 270}" y="540" class="fact">${escapeXml(truncate(fact, 32))}</text>`,
    )
    .join('')

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630" role="img" aria-label="${escapeXml(input.title)}">
  <rect width="1200" height="630" fill="#fff8e7"/>
  <path d="M0 0h1200v76H0z" fill="#1c2520"/>
  <path d="M0 76h1200v22H0z" fill="#d54b3d"/>
  <g fill="#f4bd3f">${Array.from({ length: 15 }, (_, index) => `<path d="M${index * 80} 76h40v22h-40z"/>`).join('')}</g>
  <text x="72" y="52" fill="#fff8e7" font-family="ui-monospace, monospace" font-size="25" font-weight="700">BENCHBAZAAR · ODD TESTS. USEFUL SIGNALS.</text>
  <text x="72" y="165" class="eyebrow">${escapeXml(truncate(input.eyebrow.toUpperCase(), 72))}</text>
  <text x="72" y="252" class="title">${escapeXml(truncate(input.title, 42))}</text>
  <text x="72" y="328" class="summary">${escapeXml(truncate(input.summary, 95))}</text>
  <rect x="64" y="472" width="1072" height="104" rx="8" fill="#ffffff" stroke="#1c2520" stroke-width="3"/>
  ${facts}
  <style>
    .eyebrow,.fact{font-family:ui-monospace,monospace;fill:#5a625d;font-size:22px;font-weight:700}
    .title{font-family:Georgia,serif;fill:#1c2520;font-size:68px;font-weight:700}
    .summary{font-family:Arial,sans-serif;fill:#38413c;font-size:30px}
    .fact{fill:#1c2520;font-size:19px}
  </style>
</svg>`
}

export function svgResponse(svg: string, status = 200) {
  return new Response(svg, {
    status,
    headers: {
      'Content-Type': 'image/svg+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=300, stale-while-revalidate=3600',
      'X-Content-Type-Options': 'nosniff',
    },
  })
}
