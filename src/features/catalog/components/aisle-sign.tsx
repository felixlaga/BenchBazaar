import { Link } from '@tanstack/react-router'
import { ArrowRight } from 'lucide-react'

import type { Aisle } from '../domain/catalog'

export function AisleSign({ aisle }: { aisle: Aisle }) {
  return (
    <Link
      className={`aisle-sign aisle-sign--${aisle.id}`}
      params={{ aisle: aisle.id }}
      to="/aisles/$aisle"
    >
      <span className="aisle-sign__number">{aisle.motif.split(' / ')[0]}</span>
      <span>
        <strong>{aisle.label}</strong>
        <small>{aisle.description}</small>
      </span>
      <ArrowRight aria-hidden="true" size={19} />
    </Link>
  )
}
