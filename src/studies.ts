import type { CSSProperties } from 'react'
import type { Study } from '../shared/types'

export interface Swatch {
  tint: string
  solid: string
  ink: string
}

export interface StudyView extends Study {
  /** '162' for 'Study 162 – Dermatology', else initials. */
  code: string
  /** 'Study 162' */
  label: string
  /** 'Dermatology' */
  name: string
  swatch: Swatch
}

const SWATCHES: Swatch[] = [
  { solid: '#2F8A63', tint: '#E6F2EC', ink: '#1D5C41' },
  { solid: '#D97A2B', tint: '#FBEEE2', ink: '#8A4612' },
  { solid: '#7B61C9', tint: '#EFEBFA', ink: '#4B3590' },
  { solid: '#C49A1C', tint: '#F8F1DB', ink: '#6E5610' },
  { solid: '#3A7FB8', tint: '#E5EFF8', ink: '#1F4D73' },
  { solid: '#C4566C', tint: '#F8E7EA', ink: '#7D2C3C' },
]

export function initials(text: string) {
  return text
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0].toUpperCase())
    .join('')
}

export function toStudyViews(studies: Study[]): StudyView[] {
  return studies.map((study, i) => {
    const number = study.title.match(/\d{2,}/)?.[0]
    return {
      ...study,
      code: number ?? initials(study.title),
      label: number ? `Study ${number}` : study.title,
      name: study.title.replace(/^study\s+\d+\s*[·:\-–]\s*/i, ''),
      swatch: SWATCHES[i % SWATCHES.length],
    }
  })
}

type CSSVars = CSSProperties & Record<`--${string}`, string>

export function swatchVars({ tint, solid, ink }: Swatch, extra?: CSSProperties): CSSVars {
  return { '--tint': tint, '--solid': solid, '--ink': ink, ...extra }
}
