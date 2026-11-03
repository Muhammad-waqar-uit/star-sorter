import { describe, expect, it } from "vitest"

import { buildUndoLog, undoEntries } from "./history"
import {
  applyOverrides,
  buildPlan,
  desiredListIds,
  groupPlan,
  isRepoInList,
  planToApplyItems,
  summarizePlan
} from "./plan"
import type { GitHubList, RuleSet, StarredRepo } from "./types"

const repo = (id: string, overrides: Partial<StarredRepo> = {}): StarredRepo => ({
  id,
  nameWithOwner: `acme/${id}`,
  owner: "acme",
  description: "",
  language: "TypeScript",
  topics: [],
  stargazerCount: 1,
  isArchived: false,
  updatedAt: "2026-01-01T00:00:00Z",
  ...overrides
})

const rules: RuleSet = {
  private: false,
  maxListsPerRepo: 1,
  lists: [
    { name: "CLI", match: { topics: ["cli"] } },
    { name: "Rust", match: { languages: ["Rust"] } }
  ]
}

const list = (id: string, name: string, repoIds: string[] = []): GitHubList => ({
  id,
  name,
  description: "",
  isPrivate: false,
  repoIds
})

describe("buildPlan", () => {
  const repos = [
    repo("a", { topics: ["cli"] }),
    repo("b", { language: "Rust" }),
    repo("c", { description: "Misc" })
  ]
  const lists = [list("L1", "CLI"), list("L2", "Rust", ["b"])]

  it("suggests a list per repo and marks unsorted repos", () => {
    const plan = buildPlan(repos, rules, lists)
    expect(plan.map((item) => item.suggested)).toEqual(["CLI", "Rust", null])
    expect(plan[0]?.alreadyInSuggested).toBe(false)
    expect(plan[1]?.alreadyInSuggested).toBe(true)
    expect(plan[0]?.inAnyList).toBe(false)
    expect(plan[1]?.inAnyList).toBe(true)
  })

  it("does not mutate suggestions when overrides are applied", () => {
    const plan = buildPlan(repos, rules, lists)
    const overridden = applyOverrides(plan, { a: null, b: "CLI" })
    expect(overridden[0]?.target).toBeNull()
    expect(overridden[1]?.target).toBe("CLI")
    expect(plan[1]?.target).toBe("Rust")
  })

  it("summarizes moves, skips and unchanged rows", () => {
    const plan = applyOverrides(buildPlan(repos, rules, lists), {
      a: "Rust",
      c: null
    })
    const summary = summarizePlan(plan, lists)
    expect(summary.moves).toBe(1)
    expect(summary.skips).toBe(1)
    expect(summary.unchanged).toBe(1)
    expect(summary.listsTouched).toBe(1)
  })

  it("only sends repos that are not already in their target list", () => {
    const plan = applyOverrides(buildPlan(repos, rules, lists), {
      a: "CLI",
      b: "Rust",
      c: "New List"
    })
    const items = planToApplyItems(plan, lists)
    expect(items.map((item) => item.repoId).sort()).toEqual(["a", "c"])
  })

  it("groups unsorted repos first", () => {
    const plan = buildPlan(repos, rules, lists)
    expect(groupPlan(plan).map((group) => group.name)).toEqual(["Unsorted", "CLI", "Rust"])
  })
})

describe("membership merge", () => {
  it("keeps existing lists and appends the target", () => {
    expect(desiredListIds(["L1"], "L9")).toEqual(["L1", "L9"])
    expect(desiredListIds(["L1", "L9"], "L9")).toEqual(["L1", "L9"])
    expect(desiredListIds([], "L9")).toEqual(["L9"])
  })

  it("matches list names case insensitively", () => {
    expect(isRepoInList("r1", "cli", [list("L1", "CLI", ["r1"])])).toBe(true)
  })
})

describe("undo log", () => {
  it("copies the previous memberships and names", () => {
    const previous = { r1: ["L1"], r2: [] }
    const log = buildUndoLog({
      previous,
      createdListIds: ["L9"],
      names: { r1: "acme/one", r2: "acme/two" },
      at: 42
    })

    previous.r1.push("mutated")
    expect(log.previous.r1).toEqual(["L1"])
    expect(log.at).toBe(42)
    expect(undoEntries(log).map((entry) => entry.nameWithOwner)).toEqual([
      "acme/one",
      "acme/two"
    ])
  })
})
