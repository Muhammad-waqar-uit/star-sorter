/**
 * Small, dependency-free row windower used by the plan table. Keeping the math
 * pure makes the 5,000-row behaviour testable without a DOM.
 */

export type RowMetrics = {
  /** Top offset of each row in pixels. */
  offsets: number[]
  totalHeight: number
}

export function measureRows(heights: number[]): RowMetrics {
  const offsets: number[] = new Array(heights.length)
  let totalHeight = 0

  for (let index = 0; index < heights.length; index++) {
    offsets[index] = totalHeight
    totalHeight += Math.max(0, heights[index] ?? 0)
  }

  return { offsets, totalHeight }
}

export type Range = {
  /** Inclusive first rendered row. */
  start: number
  /** Inclusive last rendered row; -1 when there is nothing to render. */
  end: number
}

/**
 * Index range intersecting the viewport, expanded by `overscan` rows on each
 * side to avoid blank space while scrolling.
 */
export function visibleRange(
  offsets: number[],
  heights: number[],
  scrollTop: number,
  viewportHeight: number,
  overscan = 3
): Range {
  if (offsets.length === 0) return { start: 0, end: -1 }

  const top = Math.max(0, scrollTop)
  const bottom = top + Math.max(1, viewportHeight)

  let first = 0
  while (first < offsets.length && (offsets[first] ?? 0) + (heights[first] ?? 0) <= top) {
    first++
  }

  const start = Math.max(0, first - overscan)

  let last = start
  while (last < offsets.length && (offsets[last] ?? 0) < bottom) {
    last++
  }

  const end = Math.min(offsets.length - 1, last - 1 + overscan)
  return { start, end: Math.max(start - 1, end) }
}
