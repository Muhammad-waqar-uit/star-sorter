import { describe, expect, it } from "vitest"

import { measureRows, visibleRange } from "./virtual"

describe("measureRows", () => {
  it("computes offsets and total height", () => {
    expect(measureRows([48, 48, 36])).toEqual({
      offsets: [0, 48, 96],
      totalHeight: 132
    })
  })

  it("handles an empty list", () => {
    expect(measureRows([])).toEqual({ offsets: [], totalHeight: 0 })
  })
})

describe("visibleRange", () => {
  const heights = Array.from({ length: 1000 }, () => 48)
  const { offsets } = measureRows(heights)

  it("renders a bounded window at the top", () => {
    const range = visibleRange(offsets, heights, 0, 480, 3)
    expect(range.start).toBe(0)
    // 10 visible rows plus three rows of overscan.
    expect(range.end).toBe(12)
  })

  it("moves the window while scrolling", () => {
    const range = visibleRange(offsets, heights, 4800, 480, 0)
    expect(range.start).toBe(100)
    expect(range.end).toBe(109)
  })

  it("clamps to the last row at the bottom", () => {
    const range = visibleRange(offsets, heights, 48000, 480, 5)
    expect(range.start).toBe(995)
    expect(range.end).toBe(999)
  })

  it("returns an empty range with no rows", () => {
    expect(visibleRange([], [], 0, 400)).toEqual({ start: 0, end: -1 })
  })

  it("renders only a small fraction of 5,000 rows", () => {
    const bigHeights = Array.from({ length: 5000 }, () => 48)
    const big = measureRows(bigHeights)
    const range = visibleRange(big.offsets, bigHeights, 24000, 600, 3)
    expect(range.end - range.start + 1).toBeLessThan(25)
  })
})
