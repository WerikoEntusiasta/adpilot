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
  headers['Authorization'] = `Bearer ${cleanKey}`
  
  // OpenCode Go compatibility requirement
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
  const model = (clientModel && clientModel !== 'opencode-zen' && clientModel !== 'gpt-4o' ? clientModel : null)
    || envModel
    || dbSettings?.aiModel
    || 'gpt-4o'

  const isConfigured = !!apiKey || !!envEndpoint || !!envKey || !!dbSettings?.aiApiKey

  return {
    endpoint,
    apiKey,
    model,
    isConfigured,
  }
}

