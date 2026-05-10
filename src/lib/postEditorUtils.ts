export const suggestedTags = ["discussion", "question", "tutorial", "code-snippet", "snippet", "bug"]

export function normalizeTag(tag: string) {
  return tag.trim().toLowerCase().replace(/\s+/g, "-")
}

export function isCodeLike(text: string) {
  const value = text.trim()
  if (!value) return false

  const signals = [
    /```/.test(value),
    /\b(function|class|interface|const|let|var|import|export|async|await|return|if|for|while|switch|case|try|catch)\b/.test(value),
    /[{};=<>()[\]]/.test(value),
    /\n\s{2,}/.test(value),
  ]

  return signals.filter(Boolean).length >= 2
}

export type ContentBlock = { type: 'text' | 'image' | 'code' | 'poll'; data: unknown }

export function buildContentBlocks(description: string): ContentBlock[] {
  const trimmed = description.trim()
  if (!trimmed) return []

  if (trimmed.includes("```")) {
    const parts = trimmed.split("```")
    const blocks: ContentBlock[] = []

    parts.forEach((part, index) => {
      const content = part.trim()
      if (!content) return

      if (index % 2 === 1) {
        const codeLines = content.split("\n")
        const firstLine = codeLines[0] || ""
        const codeBody = /^(javascript|js|ts|typescript|python|java|c|cpp|html|css|sql)$/i.test(firstLine)
          ? codeLines.slice(1).join("\n").trim()
          : content

        blocks.push({ type: "code", data: codeBody })
      } else {
        blocks.push({ type: "text", data: content })
      }
    })

    return blocks
  }

  return [{ type: "text", data: trimmed }]
}

export type EditorMode = "auto" | "text" | "code"

export function extractCodeSnippet(description: string, mode: EditorMode): string | null {
  const trimmed = description.trim()
  if (!trimmed) return null

  if (trimmed.includes("```")) {
    const parts = trimmed.split("```")
    const codeSegments = parts
      .filter((_, index) => index % 2 === 1)
      .map((segment) => {
        const content = segment.trim()
        if (!content) return ""
        const lines = content.split("\n")
        const firstLine = lines[0] || ""
        return /^(javascript|js|ts|typescript|python|java|c|cpp|html|css|sql)$/i.test(firstLine)
          ? lines.slice(1).join("\n").trim()
          : content
      })
      .filter(Boolean)

    return codeSegments.length > 0 ? codeSegments.join("\n\n") : null
  }

  if (mode === "code" || (mode === "auto" && isCodeLike(trimmed))) {
    return trimmed
  }

  return null
}
