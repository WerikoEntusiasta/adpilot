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

export function getAiAuthHeaders(apiKey?: string): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  if (apiKey && apiKey.trim()) {
    headers['Authorization'] = `Bearer ${apiKey.trim()}`
  } else {
    // Default fallback header for local servers like OpenCode/Ollama that accept any bearer
    headers['Authorization'] = 'Bearer opencode'
  }
  return headers
}
