import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'AdPilot AI — Gerenciamento Inteligente de Tráfego Pago',
  description: 'Dashboard inteligente para gerenciar campanhas Facebook Ads com IA',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className="dark">
      <body className="antialiased">{children}</body>
    </html>
  )
}
