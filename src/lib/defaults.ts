import type { RuleSet } from "./types"

/**
 * Bundled starter rule set.
 *
 * Rules are evaluated top to bottom and the first match wins, so the narrower
 * rules (Web3, Claude) sit above the broader ones (AI agents, dev tools).
 */
export const DEFAULT_RULES: RuleSet = {
  private: false,
  maxListsPerRepo: 1,
  lists: [
    {
      name: "Web3 & Blockchain",
      description: "Solidity, smart contracts, DeFi and tooling",
      match: {
        topics: [
          "blockchain",
          "ethereum",
          "solidity",
          "web3",
          "smart-contracts",
          "defi",
          "foundry",
          "hardhat"
        ],
        languages: ["Solidity"],
        keywords: [
          "blockchain",
          "ethereum",
          "solidity",
          "smart contract",
          "web3",
          "defi",
          "wallet"
        ]
      }
    },
    {
      name: "Claude & Prompting",
      description: "Claude Code, skills and prompt engineering",
      match: {
        topics: ["claude", "claude-code", "anthropic", "prompt-engineering"],
        keywords: ["claude", "anthropic", "prompt"]
      }
    },
    {
      name: "AI Agents & LLMs",
      description: "Agent frameworks, LLM libraries and RAG",
      match: {
        topics: [
          "llm",
          "ai-agents",
          "agents",
          "rag",
          "openai",
          "langchain",
          "machine-learning",
          "deep-learning"
        ],
        keywords: [
          "agent",
          "llm",
          "gpt",
          "rag",
          "openai",
          "speech-text",
          "neural",
          "ml-powered"
        ]
      }
    },
    {
      name: "DevOps & Cloud",
      description: "Kubernetes, AWS, Docker and infrastructure",
      match: {
        topics: [
          "devops",
          "kubernetes",
          "docker",
          "aws",
          "terraform",
          "cloud",
          "microservices",
          "istio"
        ],
        keywords: [
          "kubernetes",
          "devops",
          "docker",
          "aws",
          "terraform",
          "microservices",
          "emulator",
          "push notifications"
        ]
      }
    },
    {
      name: "Architecture & Scalability",
      description: "System design, patterns and distributed systems",
      match: {
        topics: ["system-design", "scalability", "architecture"],
        keywords: ["scalab", "system design", "architecture", "distributed"]
      }
    },
    {
      name: "Interview & Algorithms",
      description: "Practice, data structures and interview prep",
      match: {
        topics: [
          "interview",
          "interview-questions",
          "algorithms",
          "codility",
          "leetcode",
          "hackerrank",
          "data-structures"
        ],
        keywords: [
          "interview",
          "codility",
          "hackerrank",
          "leetcode",
          "topcoder",
          "code challenges",
          "algorithm"
        ]
      }
    },
    {
      name: "Frontend & React",
      description: "React, Next.js and UI libraries",
      match: {
        topics: ["react", "nextjs", "frontend", "tailwindcss", "svg", "css"],
        keywords: ["react", "next.js", "frontend", "ui library", "tailwind", "svg output"]
      }
    },
    {
      name: "Backend & Databases",
      description: "NestJS, SQL, GraphQL and APIs",
      match: {
        topics: ["nestjs", "postgresql", "sql", "graphql", "api", "orm", "database"],
        keywords: ["nestjs", "postgres", "sql", "graphql", "database", "orm"]
      }
    },
    {
      name: "Rust",
      description: "Rust projects",
      match: { languages: ["Rust"] }
    },
    {
      name: "Go",
      description: "Go projects",
      match: { languages: ["Go"] }
    },
    {
      name: "Dev Tools & Productivity",
      description: "CLI, automation and local-first apps",
      match: {
        topics: [
          "cli",
          "automation",
          "productivity",
          "tauri",
          "local-first",
          "self-hosted",
          "browser-automation"
        ],
        keywords: [
          "cli",
          "automation",
          "local-first",
          "self-host",
          "browser automation",
          "sync",
          "notification"
        ]
      }
    },
    {
      name: "SEO & Marketing",
      description: "SEO, growth and marketing",
      match: { topics: ["seo"], keywords: ["seo", "marketing", "backlink"] }
    }
  ]
}

/** Formatted default rule set, used by the JSON editors. */
export const DEFAULT_RULES_JSON = JSON.stringify(DEFAULT_RULES, null, 2)

/** GitHub allows at most 32 lists per account. */
export const MAX_GITHUB_LISTS = 32
