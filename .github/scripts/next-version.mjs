#!/usr/bin/env node
/**
 * Resolve the next release version for the release workflow.
 *
 * Rules:
 * - If the current package.json version has no tag yet, release it as-is
 *   (this makes the first release v1.0.0 instead of v1.0.1).
 * - Otherwise bump patch by default, or minor/major when requested by the
 *   workflow input / commit message.
 * - Colliding tags are skipped so a partially failed run can never reuse a tag.
 */
import { execFileSync } from "node:child_process"
import fs from "node:fs"
import path from "node:path"

const pkgPath = path.resolve("package.json")
const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"))

const tagFor = (version) => `v${version}`

const tagExists = (version) => {
  try {
    execFileSync("git", ["rev-parse", "--quiet", "--verify", `refs/tags/${tagFor(version)}`], {
      stdio: "ignore"
    })
    return true
  } catch {
    return false
  }
}

const bump = (version, type) => {
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(version)
  if (!match) throw new Error(`Unsupported version "${version}" in package.json (expected x.y.z)`)

  let major = Number(match[1])
  let minor = Number(match[2])
  let patch = Number(match[3])

  if (type === "major") {
    major += 1
    minor = 0
    patch = 0
  } else if (type === "minor") {
    minor += 1
    patch = 0
  } else if (type === "patch") {
    patch += 1
  } else {
    throw new Error(`Unknown bump type "${type}" (expected patch, minor or major)`)
  }

  return `${major}.${minor}.${patch}`
}

const commitMessage = process.env.COMMIT_MESSAGE ?? ""
const requested =
  process.env.BUMP ||
  (commitMessage.includes("[major]") ? "major" : commitMessage.includes("[minor]") ? "minor" : "patch")

let version = pkg.version
let changed = false

if (tagExists(version)) {
  version = bump(version, requested)
  changed = true

  let guard = 0
  while (tagExists(version)) {
    version = bump(version, "patch")
    guard += 1
    if (guard > 100) throw new Error("Could not find a free version tag")
  }
}

if (version !== pkg.version) {
  pkg.version = version
  fs.writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`)
  changed = true
}

const tag = tagFor(version)

if (process.env.GITHUB_OUTPUT) {
  fs.appendFileSync(
    process.env.GITHUB_OUTPUT,
    `version=${version}\ntag=${tag}\nchanged=${changed}\n`
  )
}

console.log(`Next release: ${tag} (${changed ? "version bumped" : "current package version"})`)
