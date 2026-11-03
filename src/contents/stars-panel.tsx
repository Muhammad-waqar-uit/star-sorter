import cssText from "data-text:~style.css"
import type { PlasmoCSConfig } from "plasmo"
import { useEffect, useState } from "react"
import { Star } from "../components/icons"

import { Panel } from "../components/Panel"
import { getSettings } from "../lib/storage"
import type { Settings } from "../lib/types"

export const config: PlasmoCSConfig = {
  matches: ["https://github.com/*"],
  run_at: "document_idle"
}

export const getStyle = () => {
  const style = document.createElement("style")
  style.textContent = cssText
  return style
}

function isStarsPage(url = window.location.href): boolean {
  try {
    const parsed = new URL(url)
    if (parsed.hostname !== "github.com") return false
    if (parsed.pathname === "/stars" || parsed.pathname.startsWith("/stars/")) return true
    return parsed.searchParams.get("tab") === "stars"
  } catch {
    return false
  }
}

function detectTheme(): "dark" | "light" {
  const html = document.documentElement
  const mode = (html.getAttribute("data-color-mode") ?? "").toLowerCase()
  if (mode === "dark") return "dark"
  if (mode === "light") return "light"

  const scheme = (html.getAttribute("data-color-scheme") ?? "").toLowerCase()
  if (scheme === "dark") return "dark"
  if (scheme === "light") return "light"

  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light"
}

/** GitHub is a Turbo app: URL changes do not reload the document. */
function useStarsPage(): boolean {
  const [onStars, setOnStars] = useState(() => isStarsPage())

  useEffect(() => {
    const update = () => setOnStars(isStarsPage())

    document.addEventListener("turbo:load", update)
    document.addEventListener("turbo:render", update)
    window.addEventListener("popstate", update)
    const timer = window.setInterval(update, 1000)

    return () => {
      document.removeEventListener("turbo:load", update)
      document.removeEventListener("turbo:render", update)
      window.removeEventListener("popstate", update)
      window.clearInterval(timer)
    }
  }, [])

  return onStars
}

function useGithubTheme(): "dark" | "light" {
  const [theme, setTheme] = useState<"dark" | "light">(() => detectTheme())

  useEffect(() => {
    const update = () => setTheme(detectTheme())
    const observer = new MutationObserver(update)
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-color-mode", "data-color-scheme", "class"]
    })

    const media = window.matchMedia?.("(prefers-color-scheme: dark)")
    media?.addEventListener?.("change", update)

    return () => {
      observer.disconnect()
      media?.removeEventListener?.("change", update)
    }
  }, [])

  return theme
}

export default function StarsPanel() {
  const onStars = useStarsPage()
  const githubTheme = useGithubTheme()
  const [open, setOpen] = useState(false)
  const [everOpened, setEverOpened] = useState(false)
  const [settings, setSettings] = useState<Settings>({ includeSorted: false, theme: "auto" })

  useEffect(() => {
    if (!open) return

    const read = () => {
      void getSettings().then(setSettings).catch(() => undefined)
    }
    read()

    const onChange = (changes: Record<string, chrome.storage.StorageChange>, area: string) => {
      if (area === "local" && changes.settings) read()
    }
    chrome.storage.onChanged.addListener(onChange)
    return () => chrome.storage.onChanged.removeListener(onChange)
  }, [open])

  if (!onStars) return null

  const theme = settings.theme === "auto" ? githubTheme : settings.theme

  return (
    <>
      {!open && (
        <button
          type="button"
          className={`ss-fab ${theme === "dark" ? "ss-theme-dark" : "ss-theme-light"}`}
          aria-label="Sort my GitHub stars"
          onClick={() => {
            setOpen(true)
            setEverOpened(true)
          }}>
          <Star className="h-4 w-4" strokeWidth={2.4} fill="currentColor" aria-hidden="true" />
          <span>Sort stars</span>
        </button>
      )}

      {everOpened && (
        <div hidden={!open} style={{ display: open ? "contents" : "none" }}>
          <Panel theme={theme} onClose={() => setOpen(false)} />
        </div>
      )}
    </>
  )
}
