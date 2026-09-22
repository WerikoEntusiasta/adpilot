export function getChatCompletionsUrl(endpoint: string): string {
  if (!endpoint) return 'https://api.openai.com/v1/chat/completions'
  let clean = endpoint.trim().replace(/\/+$/, '')
  if (clean.endsWith('/chat/completions')) {
    return clean
  }
  if (!clean.endsWith('/v1') && !clean.includes('/v1/')) {
    clean = `${clean}/v1`
  }
  return `${clean}/chat/completions`
}

export function getModelsUrl(endpoint: string): string {
  if (!endpoint) return 'https://api.openai.com/v1/models'
  let clean = endpoint.trim().replace(/\/+$/, '')
  if (clean.endsWith('/chat/completions')) {
    clean = clean.replace(/\/chat\/completions$/, '')
  }
  if (!clean.endsWith('/v1') && !clean.includes('/v1/')) {
    clean = `${clean}/v1`
  }
  return `${clean}/models`
}

export function getAiAuthHeaders(apiKey?: string, endpoint?: string): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  const cleanKey = apiKey && apiKey.trim() ? apiKey.trim() : '9router'
  
  // 1. Padrão oficial OpenAI e 9Router (Authorization: Bearer <key>)
  headers['Authorization'] = `Bearer ${cleanKey}`
  
  // 2. Headers alternativos compatíveis (x-api-key e api-key) usados por Anthropic, OpenCode e proxies
  headers['x-api-key'] = cleanKey
  headers['api-key'] = cleanKey
  
  // 3. Requisito de sessão específico para OpenCode Go (quando aplicável)
  if (endpoint && endpoint.toLowerCase().includes('opencode')) {
    headers['x-opencode-session'] = 'adpilot-session'
  }
  
  return headers
}

export interface ResolvedAiConfig {
  endpoint: string
  apiKey: string
  model: string
  isConfigured: boolean
}

export function getResolvedAiConfig(
  clientEndpoint?: string | null,
  clientApiKey?: string | null,
  clientModel?: string | null,
  dbSettings?: { aiEndpoint?: string | null; aiApiKey?: string | null; aiModel?: string | null } | null
): ResolvedAiConfig {
  // 1. Endpoint: Check client override, then .env (OPENAI_API_BASE / OPENAI_BASE_URL), then DB, then default OpenAI
  const envEndpoint = process.env.OPENAI_API_BASE || process.env.OPENAI_BASE_URL
  const endpoint = (clientEndpoint && clientEndpoint !== 'https://api.openai.com/v1' ? clientEndpoint : null)
    || envEndpoint
    || dbSettings?.aiEndpoint
    || 'https://api.openai.com/v1'

  // 2. ApiKey: Check client override, then .env (OPENAI_API_KEY), then DB
  const envKey = process.env.OPENAI_API_KEY
  let apiKey = (!clientApiKey || clientApiKey === 'ENV_CONFIGURED')
    ? (envKey || dbSettings?.aiApiKey || '')
    : clientApiKey

  // If local gateway/proxy (9Router, Ollama, OpenCode, localhost:20128) and no apiKey provided, default to '9router'
  const isLocalProxy = /localhost|127\.0\.0\.1|20128|9router|opencode/i.test(endpoint)
  if (!apiKey && (isLocalProxy || envEndpoint)) {
    apiKey = '9router'
  }

  // 3. Model: Check client override, then .env (OPENAI_MODEL), then DB, then default 'gpt-4o'
  const envModel = process.env.OPENAI_MODEL
  let model = (clientModel && clientModel !== 'opencode-zen' && clientModel !== 'gpt-4o' ? clientModel : null)
    || envModel
    || dbSettings?.aiModel
    || 'Full-Automatic'

  // Normalize model ID if passed with 9router/ prefix
  if (model && model.startsWith('9router/')) {
    model = model.replace(/^9router\//, '')
  }

  const isConfigured = !!apiKey || !!envEndpoint || !!envKey || !!dbSettings?.aiApiKey

  return {
    endpoint,
    apiKey,
    model,
    isConfigured,
  }
}

export async function parseAiCompletionResponse(res: Response): Promise<{ content: string; raw?: any }> {
  const text = await res.text()
  try {
    const data = JSON.parse(text)
    return {
      content: data.choices?.[0]?.message?.content || '',
      raw: data
    }
  } catch {
    // Fallback: If returned as SSE stream (e.g. data: {"choices":[{"delta":{"content":"..."}}]})
    const lines = text.split('\n')
    let combined = ''
    for (const line of lines) {
      const trimmed = line.trim()
      if (trimmed.startsWith('data:') && !trimmed.includes('[DONE]')) {
        try {
          const jsonStr = trimmed.replace(/^data:\s*/, '')
          const parsed = JSON.parse(jsonStr)
          const delta = parsed.choices?.[0]?.delta?.content || parsed.choices?.[0]?.message?.content || ''
          combined += delta
        } catch {}
      }
    }
    return { content: combined }
  }
}

/**
 * Extrai sugestões estruturadas mesmo de respostas com JSON truncado ou markdown irregular
 */
export function extractStructuredAiSuggestions(rawContent: string): any[] {
  if (!rawContent || typeof rawContent !== 'string') return []

  const cleaned = rawContent
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim()

  // 1. Tentar parse direto do JSON completo
  try {
    const direct = JSON.parse(cleaned)
    if (Array.isArray(direct)) return direct
    if (Array.isArray(direct.suggestions)) return direct.suggestions
  } catch {}

  // 2. Tentar encontrar envelope { "suggestions": [ ... ] }
  const firstBrace = cleaned.indexOf('{')
  if (firstBrace !== -1) {
    const candidate = cleaned.slice(firstBrace)
    try {
      const parsed = JSON.parse(candidate)
      if (Array.isArray(parsed.suggestions)) return parsed.suggestions
    } catch {}

    // 3. Reparar JSON truncado (quando estourou limite de tokens e cortou antes de fechar)
    const lastCloseBrace = candidate.lastIndexOf('}')
    if (lastCloseBrace !== -1) {
      const truncated = candidate.slice(0, lastCloseBrace + 1)
      const attempts = [
        truncated + ']}',
        truncated + '}',
        truncated + '"]}',
        truncated + '"}]}',
      ]
      for (const attempt of attempts) {
        try {
          const repaired = JSON.parse(attempt)
          if (Array.isArray(repaired.suggestions) && repaired.suggestions.length > 0) {
            return repaired.suggestions
          }
        } catch {}
      }
    }
  }

  // 4. Extração individual de cada bloco de sugestão via Regex
  const blockRegex = /\{[\s\n\r]*"id"[\s\S]*?"(title|action|description)"[\s\S]*?\}(?=\s*,\s*\{|\s*\])/g
  const matches = cleaned.match(blockRegex)
  if (matches && matches.length > 0) {
    const recovered: any[] = []
    for (const m of matches) {
      try {
        const item = JSON.parse(m)
        if (item && item.title) recovered.push(item)
      } catch {
        try {
          const item = JSON.parse(m + '}')
          if (item && item.title) recovered.push(item)
        } catch {}
      }
    }
    if (recovered.length > 0) return recovered
  }

  return []
}

/**
 * Desempacota e limpa sugestões, garantindo que nenhum JSON cru seja exibido na UI
 */
export function unpackAndSanitizeSuggestions(list: any[]): any[] {
  if (!Array.isArray(list)) return []
  const result: any[] = []

  for (const item of list) {
    if (!item) continue

    // Se o item contém um JSON cru embutido dentro da description (como aconteceu no erro do screenshot)
    if (
      typeof item.description === 'string' &&
      (item.description.includes('"suggestions"') || item.description.trim().startsWith('{'))
    ) {
      const extracted = extractStructuredAiSuggestions(item.description)
      if (extracted.length > 0) {
        result.push(...extracted)
        continue
      }
    }

    result.push(item)
  }

  return result
}


