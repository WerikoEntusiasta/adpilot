import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface GuardianRule {
  id: string
  name: string
  description: string
  category: 'STOP_LOSS' | 'CPA_CEILING' | 'FATIGUE' | 'SCALE'
  enabled: boolean
  threshold: number // valor numérico (ex: R$ 50 para stop-loss, R$ 35 para CPA, 3.5 para frequência, 3.0 para ROAS)
  thresholdUnit: 'BRL' | 'PERCENT' | 'NUMBER'
  actionType: 'PAUSE' | 'NOTIFY' | 'SCALE_BUDGET'
}

export interface GuardianIncident {
  id: string
  adId: string
  adName: string
  campaignName?: string
  ruleId: string
  ruleName: string
  category: 'STOP_LOSS' | 'CPA_CEILING' | 'FATIGUE' | 'SCALE'
  severity: 'CRITICAL' | 'WARNING' | 'OPPORTUNITY'
  reason: string
  detectedAt: string
  metrics: {
    spend: number
    conversions: number
    cpa: number
    roas: number
    frequency: number
    ctr: number
  }
  status: 'PENDING' | 'RESOLVED' | 'DISMISSED'
  resolvedAction?: string
}

interface GuardianState {
  rules: GuardianRule[]
  incidents: GuardianIncident[]
  lastScanAt: string | null
  isScanning: boolean
  autoScanEnabled: boolean
  toggleRule: (id: string) => void
  updateRuleThreshold: (id: string, threshold: number) => void
  updateRuleAction: (id: string, actionType: 'PAUSE' | 'NOTIFY' | 'SCALE_BUDGET') => void
  setIncidents: (incidents: GuardianIncident[]) => void
  dismissIncident: (id: string) => void
  resolveIncident: (id: string, action: string) => void
  setLastScanAt: (date: string) => void
  setIsScanning: (scanning: boolean) => void
  setAutoScanEnabled: (enabled: boolean) => void
  resetToDefaults: () => void
}

export const defaultGuardianRules: GuardianRule[] = [
  {
    id: 'rule_stop_loss_no_conv',
    name: 'Stop-Loss Anti-Prejuízo (Zero Conversões)',
    description: 'Pausa o anúncio ou emite alerta crítico se gastar mais que o limite sem gerar nenhuma venda ou conversa.',
    category: 'STOP_LOSS',
    enabled: false,
    threshold: 50, // R$ 50
    thresholdUnit: 'BRL',
    actionType: 'PAUSE',
  },
  {
    id: 'rule_cpa_ceiling',
    name: 'Teto Máximo de CPA / Custo por Conversão',
    description: 'Identifica anúncios cujo custo por aquisição estourou a margem aceitável.',
    category: 'CPA_CEILING',
    enabled: false,
    threshold: 40, // R$ 40
    thresholdUnit: 'BRL',
    actionType: 'NOTIFY',
  },
  {
    id: 'rule_fatigue_frequency',
    name: 'Alerta de Fadiga & Saturação de Público',
    description: 'Detecta anúncios onde o mesmo usuário já foi impactado excessivas vezes e o CTR começou a despencar.',
    category: 'FATIGUE',
    enabled: false,
    threshold: 3.2, // Freq > 3.2
    thresholdUnit: 'NUMBER',
    actionType: 'NOTIFY',
  },
  {
    id: 'rule_scale_winner',
    name: 'Oportunidade de Escala de Campeões',
    description: 'Identifica anúncios com ROAS excepcional e estabilidade de conversões para aumento de 15% no orçamento.',
    category: 'SCALE',
    enabled: false,
    threshold: 2.8, // ROAS > 2.8x
    thresholdUnit: 'NUMBER',
    actionType: 'SCALE_BUDGET',
  },
]

export const useGuardianStore = create<GuardianState>()(
  persist(
    (set) => ({
      rules: defaultGuardianRules,
      incidents: [],
      lastScanAt: null,
      isScanning: false,
      autoScanEnabled: true,

      toggleRule: (id) =>
        set((state) => ({
          rules: state.rules.map((r) => (r.id === id ? { ...r, enabled: !r.enabled } : r)),
        })),

      updateRuleThreshold: (id, threshold) =>
        set((state) => ({
          rules: state.rules.map((r) => (r.id === id ? { ...r, threshold } : r)),
        })),

      updateRuleAction: (id, actionType) =>
        set((state) => ({
          rules: state.rules.map((r) => (r.id === id ? { ...r, actionType } : r)),
        })),

      setIncidents: (incidents) => set({ incidents }),

      dismissIncident: (id) =>
        set((state) => ({
          incidents: state.incidents.map((i) =>
            i.id === id ? { ...i, status: 'DISMISSED' as const } : i
          ),
        })),

      resolveIncident: (id, action) =>
        set((state) => ({
          incidents: state.incidents.map((i) =>
            i.id === id ? { ...i, status: 'RESOLVED' as const, resolvedAction: action } : i
          ),
        })),

      setLastScanAt: (date) => set({ lastScanAt: date }),
      setIsScanning: (isScanning) => set({ isScanning }),
      setAutoScanEnabled: (autoScanEnabled) => set({ autoScanEnabled }),

      resetToDefaults: () =>
        set({
          rules: defaultGuardianRules,
          incidents: [],
        }),
    }),
    {
      name: 'adpilot_guardian_store_v2',
    }
  )
)
