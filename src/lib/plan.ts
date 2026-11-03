import { suggestList } from "./rules"
import type {
  ApplyItem,
  GitHubList,
  PlanItem,
  PlanSummary,
  RuleSet,
  StarredRepo
} from "./types"

export const normalizeListName = (name: string): string => name.trim().toLowerCase()

/** Case insensitive lookup, because GitHub list names are not guaranteed unique. */
export function findListByName(lists: GitHubList[], name: string): GitHubList | undefined {
  const key = normalizeListName(name)
  return lists.find((list) => normalizeListName(list.name) === key)
}

export function isRepoInList(repoId: string, name: string, lists: GitHubList[]): boolean {
  const list = findListByName(lists, name)
  return Boolean(list?.repoIds.includes(repoId))
}

/**
 * Build the editable plan. Every starred repo is included so the UI can filter
 * locally; `target` starts at the rule suggestion.
 */
export function buildPlan(
  repos: StarredRepo[],
  rules: RuleSet,
  lists: GitHubList[]
): PlanItem[] {
  const inAnyList = new Set(lists.flatMap((list) => list.repoIds))

  return repos.map((repo) => {
    const suggested = suggestList(repo, rules)
    return {
      repoId: repo.id,
      nameWithOwner: repo.nameWithOwner,
      description: repo.description,
      language: repo.language,
      topics: repo.topics,
      suggested,
      target: suggested,
      alreadyInSuggested: suggested ? isRepoInList(repo.id, suggested, lists) : false,
      inAnyList: inAnyList.has(repo.id)
    }
  })
}

/** Apply per-repo dropdown overrides on top of a plan. */
export function applyOverrides(
  plan: PlanItem[],
  overrides: Record<string, string | null>
): PlanItem[] {
  return plan.map((item) =>
    Object.prototype.hasOwnProperty.call(overrides, item.repoId)
      ? { ...item, target: overrides[item.repoId] ?? null }
      : item
  )
}

export function summarizePlan(plan: PlanItem[], lists: GitHubList[]): PlanSummary {
  let moves = 0
  let skips = 0
  let unchanged = 0
  const touched = new Set<string>()

  for (const item of plan) {
    if (!item.target) {
      skips++
      continue
    }

    if (isRepoInList(item.repoId, item.target, lists)) {
      unchanged++
      continue
    }

    moves++
    touched.add(normalizeListName(item.target))
  }

  return { moves, skips, unchanged, listsTouched: touched.size }
}

/**
 * Only repos with a target that is not already satisfied become API calls.
 * New list names are kept because the worker creates them before filing.
 */
export function planToApplyItems(plan: PlanItem[], lists: GitHubList[]): ApplyItem[] {
  return plan
    .filter((item) => item.target && !isRepoInList(item.repoId, item.target, lists))
    .map((item) => ({
      repoId: item.repoId,
      nameWithOwner: item.nameWithOwner,
      targetList: item.target as string
    }))
}

/** Unique target list names, preserving first-seen spelling. */
export function targetListNames(items: ApplyItem[]): string[] {
  const names = new Map<string, string>()
  for (const item of items) {
    const key = normalizeListName(item.targetList)
    if (!names.has(key)) names.set(key, item.targetList.trim())
  }
  return [...names.values()]
}

/**
 * `updateUserListsForItem` replaces the full set, so the previous memberships
 * must be preserved and the new target appended.
 */
export function desiredListIds(current: string[], targetListId: string): string[] {
  return current.includes(targetListId) ? [...current] : [...current, targetListId]
}

export type PlanGroup = {
  name: string
  items: PlanItem[]
}

/** Group by suggested list; unsorted repos get their own group first. */
export function groupPlan(plan: PlanItem[], unsortedLabel = "Unsorted"): PlanGroup[] {
  const groups = new Map<string, PlanGroup>()

  for (const item of plan) {
    const name = item.suggested ?? unsortedLabel
    const group = groups.get(name) ?? { name, items: [] }
    group.items.push(item)
    groups.set(name, group)
  }

  return [...groups.values()].sort((a, b) => {
    if (a.name === unsortedLabel) return -1
    if (b.name === unsortedLabel) return 1
    return a.name.localeCompare(b.name)
  })
}
