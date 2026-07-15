import { ChevronDown, Eye } from 'lucide-react'

import type { PublicSample } from '../domain/catalog'

export function FreeSampleCard({
  sample,
  number,
}: {
  sample: PublicSample
  number: number
}) {
  return (
    <article className="sample-card">
      <div className="sample-card__label">
        <span>Free sample {number}</span>
        <span>Public · never scored</span>
      </div>
      <p className="sample-card__prompt">{sample.input}</p>
      <details>
        <summary>
          <span>
            <Eye aria-hidden="true" size={17} /> Reveal expected answer
          </span>
          <ChevronDown aria-hidden="true" size={17} />
        </summary>
        <div className="sample-card__answer">
          <strong>{sample.expectedAnswer}</strong>
          <p>{sample.explanation}</p>
        </div>
      </details>
    </article>
  )
}
