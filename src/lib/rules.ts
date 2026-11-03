import { MAX_GITHUB_LISTS } from "./defaults"
import type { Rule, RuleSet, StarredRepo } from "./types"

export class RuleValidationError extends Error {
  readonly errors: string[]

  constructor(errors: string[]) {
    super(errors.join(" "))
    this.name = "RuleValidationError"
    this.errors = errors
  }
}

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((entry) => typeof entry === "string")

/** Lowercased haystack used for keyword matching. */
export function repoHaystack(repo: StarredRepo): string {
  return [repo.nameWithOwner, repo.description, repo.topics.join(" ")]
    .join(" ")
    .toLowerCase()
}

/** Empty or whitespace-only arrays are treated as "no constraint". */
function hasEntries(values: string[] | undefined): values is string[] {
  return Array.isArray(values) && values.some((value) => value.trim().length > 0)
}

/**
 * A repo matches a rule when at least one topic, language or keyword hits, and
 * no exclude keyword does. Owner is an additional narrowing signal and does not
 * replace the other signals.
 */
export function matchesRule(repo: StarredRepo, rule: Rule): boolean {
  const match = rule.match ?? {}
  const haystack = repoHaystack(repo)
  const owner = repo.owner.toLowerCase()
  const language = repo.language.toLowerCase()

  if (
    hasEntries(match.exclude) &&
    match.exclude.some((keyword) => keyword.trim() && haystack.includes(keyword.toLowerCase()))
  ) {
    return false
  }

  if (hasEntries(match.owners) && !match.owners.some((entry) => entry.toLowerCase() === owner)) {
    return false
  }

  const topicHit =
    hasEntries(match.topics) &&
    match.topics.some((entry) =>
      repo.topics.some((topic) => topic.toLowerCase() === entry.toLowerCase())
    )
  const languageHit =
    hasEntries(match.languages) && match.languages.some((entry) => entry.toLowerCase() === language)
  const keywordHit =
    hasEntries(match.keywords) &&
    match.keywords.some((entry) => entry.trim() && haystack.includes(entry.toLowerCase()))

  return topicHit || languageHit || keywordHit
}

/** Rules evaluated top to bottom; a repo takes the first N matching lists. */
export function classifyRepo(repo: StarredRepo, rules: RuleSet): string[] {
  const limit = Math.max(1, Math.min(rules.maxListsPerRepo || 1, MAX_GITHUB_LISTS))
  const hits: string[] = []

  for (const rule of rules.lists) {
    if (matchesRule(repo, rule)) {
      hits.push(rule.name)
      if (hits.length >= limit) break
    }
  }

  return hits
}

/** First suggested list for a repo, or null when unsorted. */
export function suggestList(repo: StarredRepo, rules: RuleSet): string | null {
  return classifyRepo(repo, rules)[0] ?? null
}

/** How many repos each rule would claim, using the real first-match behaviour. */
export function countAssignments(repos: StarredRepo[], rules: RuleSet): Record<string, number> {
  const counts: Record<string, number> = {}
  for (const rule of rules.lists) counts[rule.name] = 0

  for (const repo of repos) {
    for (const name of classifyRepo(repo, rules)) {
      counts[name] = (counts[name] ?? 0) + 1
    }
  }

  return counts
}

/** Validate unknown JSON (a parsed file or editor value) as a rule set. */
export function validateRuleSet(value: unknown): string[] {
  const errors: string[] = []

  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return ["Rules must be a JSON object with `private`, `maxListsPerRepo` and `lists`."]
  }

  const candidate = value as Partial<RuleSet>

  if (typeof candidate.private !== "boolean") {
    errors.push("`private` must be true or false.")
  }

  const max = candidate.maxListsPerRepo
  if (typeof max !== "number" || !Number.isInteger(max) || max < 1) {
    errors.push("`maxListsPerRepo` must be a whole number of at least 1.")
  }

  if (!Array.isArray(candidate.lists)) {
    errors.push("`lists` must be an array of rules.")
    return errors
  }

  if (candidate.lists.length === 0) {
    errors.push("Add at least one rule.")
  }

  if (candidate.lists.length > MAX_GITHUB_LISTS) {
    errors.push(
      `GitHub allows at most ${MAX_GITHUB_LISTS} lists; this rule set has ${candidate.lists.length}.`
    )
  }

  const seen = new Set<string>()

  candidate.lists.forEach((rule, index) => {
    const at = `lists[${index}]`
    if (typeof rule !== "object" || rule === null) {
      errors.push(`${at} must be an object.`)
      return
    }

    const name = (rule as Rule).name
    if (typeof name !== "string" || !name.trim()) {
      errors.push(`${at}.name is required.`)
    } else {
      if (name.length > 32) errors.push(`${at}.name must be 32 characters or fewer.`)
      const key = name.trim().toLowerCase()
      if (seen.has(key)) errors.push(`${at}.name "${name}" is duplicated.`)
      seen.add(key)
    }

    if ((rule as Rule).description !== undefined && typeof (rule as Rule).description !== "string") {
      errors.push(`${at}.description must be a string.`)
    }

    const match = (rule as Rule).match
    if (typeof match !== "object" || match === null) {
      errors.push(`${at}.match is required.`)
      return
    }

    for (const key of ["topics", "languages", "keywords", "owners", "exclude"] as const) {
      const field = match[key]
      if (field !== undefined && !isStringArray(field)) {
        errors.push(`${at}.match.${key} must be an array of strings.`)
      }
    }

    const hasSignal = (["topics", "languages", "keywords", "owners"] as const).some(
      (key) => hasEntries(match[key]) && match[key]!.some((entry) => entry.trim())
    )
    if (!hasSignal) {
      errors.push(`${at} needs at least one topic, language, keyword or owner signal.`)
    }
  })

  return errors
}

/** Validate and return a normalized, deeply cloned rule set. */
export function parseRuleSet(value: unknown): RuleSet {
  const errors = validateRuleSet(value)
  if (errors.length > 0) throw new RuleValidationError(errors)

  const candidate = value as RuleSet
  return {
    private: candidate.private,
    maxListsPerRepo: candidate.maxListsPerRepo,
    lists: candidate.lists.map((rule) => ({
      name: rule.name.trim(),
      description: rule.description?.trim() || undefined,
      match: {
        topics: rule.match.topics?.map((entry) => entry.trim()).filter(Boolean),
        languages: rule.match.languages?.map((entry) => entry.trim()).filter(Boolean),
        keywords: rule.match.keywords?.map((entry) => entry.trim()).filter(Boolean),
        owners: rule.match.owners?.map((entry) => entry.trim()).filter(Boolean),
        exclude: rule.match.exclude?.map((entry) => entry.trim()).filter(Boolean)
      }
    }))
  }
}

/** Parse rule set JSON text, throwing RuleValidationError with readable messages. */
export function parseRuleSetJson(text: string): RuleSet {
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch (error) {
    throw new RuleValidationError([
      `Invalid JSON: ${error instanceof Error ? error.message : String(error)}`
    ])
  }
  return parseRuleSet(parsed)
}

/** Names a rule set would create, deduplicated case insensitively. */
export function ruleListNames(rules: RuleSet): string[] {
  const names = new Map<string, string>()
  for (const rule of rules.lists) {
    const key = rule.name.trim().toLowerCase()
    if (!names.has(key)) names.set(key, rule.name.trim())
  }
  return [...names.values()]
}
