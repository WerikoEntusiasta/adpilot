import fs from 'fs'
import path from 'path'

/**
 * AdPilot AI Agent CLI Runner
 * Executes autonomous AI campaign analysis against OpenCode API endpoint
 */

async function runAdPilotAgent() {
  console.log('🚀 Iniciando AdPilot AI Agent...')

  const endpoint = process.env.AI_ENDPOINT || 'https://api.openai.com/v1'
  const apiKey = process.env.AI_API_KEY || 'sk-opencode-mock-key'
  const model = process.env.AI_MODEL || 'opencode-zen'

  const systemPromptPath = path.join(process.cwd(), 'agent', 'SYSTEM_PROMPT.md')
  let systemPrompt = 'Você é o AdPilot AI Agent especialista em Facebook Ads.'
  if (fs.existsSync(systemPromptPath)) {
    systemPrompt = fs.readFileSync(systemPromptPath, 'utf-8')
  }

  console.log(`🤖 Servidor de IA: ${endpoint}`)
  console.log(`🧠 Modelo: ${model}`)
  console.log('---------------------------------------------------')

  try {
    const cleanUrl = endpoint.replace(/\/+$/, '').replace(/\/chat\/completions$/, '')
    const url = `${cleanUrl}/chat/completions`

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: 'AdPilot Agent iniciado. Apresente-se e liste as diretrizes de otimização de campanhas.',
          },
        ],
        temperature: 0.7,
      }),
    })

    if (!res.ok) {
      console.error(`❌ Erro no agente (${res.status}): ${res.statusText}`)
      return
    }

    const data = await res.json()
    const responseText = data.choices?.[0]?.message?.content || 'Sem resposta.'
    console.log('AdPilot AI Agent Response:\n')
    console.log(responseText)
    console.log('\n---------------------------------------------------')
    console.log('✅ Agente executado com sucesso!')
  } catch (err) {
    console.error('❌ Erro na execução do agente:', err)
  }
}

runAdPilotAgent()
