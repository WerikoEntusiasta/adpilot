'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface SettingsState {
  // Facebook
  fbAppId: string
  fbAppSecret: string
  fbAccessToken: string
  fbAdAccountId: string
  fbStatus: 'idle' | 'valid' | 'invalid'

  // AI (OpenAI / OpenCode compatible)
  aiEndpoint: string
  aiApiKey: string
  aiModel: string

  // Stripe & Billing (R$ 250,00/mês)
  stripeSecretKey: string
  isPro: boolean
  subscriptionStatus: 'active' | 'free'

  // Actions
  setFbKeys: (keys: Partial<Pick<SettingsState, 'fbAppId' | 'fbAppSecret' | 'fbAccessToken' | 'fbAdAccountId'>>) => void
  setFbStatus: (status: 'idle' | 'valid' | 'invalid') => void
  setAiConfig: (config: Partial<Pick<SettingsState, 'aiEndpoint' | 'aiApiKey' | 'aiModel'>>) => void
  setStripeKey: (key: string) => void
  setProStatus: (isPro: boolean) => void
  hasFbKeys: () => boolean
  hasAiKeys: () => boolean
}

export const useSettings = create<SettingsState>()(
  persist(
    (set, get) => ({
      fbAppId: '',
      fbAppSecret: '',
      fbAccessToken: '',
      fbAdAccountId: '',
      fbStatus: 'idle',

      aiEndpoint: 'https://api.openai.com/v1',
      aiApiKey: '',
      aiModel: 'opencode-zen',

      stripeSecretKey: '',
      isPro: false,
      subscriptionStatus: 'free',

      setFbKeys: (keys) => set({ ...keys, fbStatus: 'idle' }),
      setFbStatus: (fbStatus) => set({ fbStatus }),
      setAiConfig: (config) => set(config),
      setStripeKey: (stripeSecretKey) => set({ stripeSecretKey }),
      setProStatus: (isPro) => set({ isPro, subscriptionStatus: isPro ? 'active' : 'free' }),

      hasFbKeys: () => {
        const s = get()
        return !!(s.fbAccessToken && s.fbAdAccountId)
      },
      hasAiKeys: () => {
        const s = get()
        return !!(s.aiApiKey || (s.aiEndpoint && s.aiEndpoint !== 'https://api.openai.com/v1'))
      },
    }),
    { name: 'adpilot-settings' }
  )
)
