import { describe, expect, it } from "vitest"

import { DEFAULT_RULES } from "./defaults"
import {
  classifyRepo,
  countAssignments,
  matchesRule,
  parseRuleSet,
  parseRuleSetJson,
  RuleValidationError,
  suggestList,
  validateRuleSet
} from "./rules"
import type { Rule, RuleSet, StarredRepo } from "./types"

const repo = (overrides: Partial<StarredRepo> = {}): StarredRepo => ({
  id: "R1",
  nameWithOwner: "acme/rocket",
  owner: "acme",
  description: "A tiny toolkit",
  language: "TypeScript",
  topics: ["cli"],
  stargazerCount: 10,
  isArchived: false,
  updatedAt: "2026-01-01T00:00:00Z",
  ...overrides
})

const rules = (lists: Rule[], maxListsPerRepo = 1): RuleSet => ({
  private: false,
  maxListsPerRepo,
  lists
})

describe("matchesRule", () => {
  it("matches exact topics case insensitively", () => {
    const rule: Rule = { name: "CLI", match: { topics: ["CLI"] } }
    expect(matchesRule(repo({ topics: ["cli", "rust"] }), rule)).toBe(true)
    expect(matchesRule(repo({ topics: ["web"] }), rule)).toBe(false)
  })

  it("matches the primary language", () => {
    const rule: Rule = { name: "Rust", match: { languages: ["rust"] } }
    expect(matchesRule(repo({ language: "Rust" }), rule)).toBe(true)
    expect(matchesRule(repo({ language: "Go" }), rule)).toBe(false)
  })

  it("matches keywords against name, description and topics", () => {
    const rule: Rule = { name: "Agents", match: { keywords: ["agent"] } }
    expect(matchesRule(repo({ description: "An agent runtime" }), rule)).toBe(true)
    expect(matchesRule(repo({ nameWithOwner: "acme/agent-kit" }), rule)).toBe(true)
    expect(matchesRule(repo({ description: "A UI kit" }), rule)).toBe(false)
  })

  it("narrows by owner when an owner list is present", () => {
    const rule: Rule = { name: "Microsoft", match: { topics: ["cli"], owners: ["microsoft"] } }
    expect(matchesRule(repo({ owner: "microsoft", topics: ["cli"] }), rule)).toBe(true)
    expect(matchesRule(repo({ owner: "acme", topics: ["cli"] }), rule)).toBe(false)
  })

  it("lets exclude veto a match", () => {
    const rule: Rule = { name: "AI", match: { keywords: ["llm"], exclude: ["deprecated"] } }
    expect(matchesRule(repo({ description: "An llm runtime" }), rule)).toBe(true)
    expect(matchesRule(repo({ description: "Deprecated llm runtime" }), rule)).toBe(false)
  })

  it("ignores empty signal arrays", () => {
    const rule: Rule = { name: "Empty", match: { topics: [], keywords: [] } }
    expect(matchesRule(repo(), rule)).toBe(false)
  })
})

describe("classifyRepo", () => {
  const listRules = rules([
    { name: "CLI", match: { topics: ["cli"] } },
    { name: "TypeScript", match: { languages: ["TypeScript"] } },
    { name: "Also CLI", match: { topics: ["cli"] } }
  ])

  it("returns the first matching list only when maxListsPerRepo is 1", () => {
    expect(classifyRepo(repo(), listRules)).toEqual(["CLI"])
    expect(suggestList(repo(), listRules)).toBe("CLI")
  })

  it("respects maxListsPerRepo", () => {
    expect(classifyRepo(repo(), { ...listRules, maxListsPerRepo: 2 })).toEqual([
      "CLI",
      "TypeScript"
    ])
  })

  it("returns no suggestion for unmatched repos", () => {
    const unmatched = repo({ topics: [], language: "COBOL", description: "Legacy" })
    expect(classifyRepo(unmatched, listRules)).toEqual([])
    expect(suggestList(unmatched, listRules)).toBeNull()
  })

  it("counts assignments per list", () => {
    const counts = countAssignments(
      [repo({ id: "a" }), repo({ id: "b", topics: ["cli"], language: "Rust" })],
      listRules
    )
    expect(counts.CLI).toBe(2)
    expect(counts.TypeScript).toBe(0)
  })
})

describe("validateRuleSet", () => {
  it("accepts the bundled defaults", () => {
    expect(validateRuleSet(DEFAULT_RULES)).toEqual([])
  })

  it("rejects duplicate names, long names and missing signals", () => {
    const errors = validateRuleSet({
      private: false,
      maxListsPerRepo: 1,
      lists: [
        { name: "Same", match: { topics: ["a"] } },
        { name: "same", match: { keywords: ["b"] } },
        { name: "x".repeat(33), match: { topics: ["c"] } },
        { name: "No signals", match: {} }
      ]
    })

    expect(errors.some((error) => error.includes("duplicated"))).toBe(true)
    expect(errors.some((error) => error.includes("32 characters"))).toBe(true)
    expect(errors.some((error) => error.includes("needs at least one"))).toBe(true)
  })

  it("rejects more than 32 lists", () => {
    const lists = Array.from({ length: 33 }, (_, index) => ({
      name: `List ${index}`,
      match: { topics: [`topic-${index}`] }
    }))
    expect(validateRuleSet({ private: false, maxListsPerRepo: 1, lists })).toContain(
      "GitHub allows at most 32 lists; this rule set has 33."
    )
  })

  it("normalizes whitespace when parsing", () => {
    const parsed = parseRuleSet({
      private: true,
      maxListsPerRepo: 2,
      lists: [{ name: "  Rust  ", match: { languages: [" Rust ", ""] } }]
    })
    expect(parsed.lists[0]?.name).toBe("Rust")
    expect(parsed.lists[0]?.match.languages).toEqual(["Rust"])
  })

  it("reports invalid JSON with a readable message", () => {
    expect(() => parseRuleSetJson("{ nope")).toThrow(RuleValidationError)
  })
})
