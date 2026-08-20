# 🚀 AdPilot AI — SaaS de Gestão de Tráfego Pago com Inteligência Artificial

![Next.js](https://img.shields.io/badge/Next.js-15.3-black?style=for-the-badge&logo=next.js)
![React](https://img.shields.io/badge/React-19.0-blue?style=for-the-badge&logo=react)
![TailwindCSS](https://img.shields.io/badge/Tailwind-v4.0-38BDF8?style=for-the-badge&logo=tailwindcss)
![Docker](https://img.shields.io/badge/Docker-Supported-2496ED?style=for-the-badge&logo=docker)
![Stripe](https://img.shields.io/badge/Stripe-R%24%20250%2Fm%C3%AAs-635BFF?style=for-the-badge&logo=stripe)

O **AdPilot AI** é uma plataforma SaaS completa de inteligência e automação para tráfego pago no **Facebook Ads**. Conecte suas credenciais da Meta API e utilize a Inteligência Artificial autônoma (**OpenCode**) para analisar resultados, receber recomendações acionáveis, planejar e criar novas campanhas com upload de criativos em apenas 1 clique.

---

## 🌟 Principais Funcionalidades

### 1. 📊 Visão Geral Dinâmica & Métricas Modulares
- **Integração Real em Tempo Real**: Conexão síncrona com o **Facebook Marketing API (v21.0)**.
- **Métricas Adaptativas por Objetivo**:
  - 💬 **Mensagens Iniciadas (WhatsApp / Direct)** + **Custo por Mensagem**
  - 📋 **Leads Gerados** + **CPL (Custo por Lead)**
  - 🛍️ **Vendas / Compras (Pixel)** + **ROAS Real (Return on Ad Spend)**
  - 🚀 **Cliques no Link**, **CTR** e **CPC Médio**
  - 📢 **Alcance Total (Reach)** e **Impressões**
- **Filtro Contextual por Objetivo**: Destaque e cálculo em tempo real das métricas relevantes ao objetivo selecionado (Vendas, Tráfego, Leads, WhatsApp ou Alcance).

### 2. 🤖 IA Advisor Autônoma (OpenCode & OpenAI)
- **Descoberta Dinâmica de Modelos (`/v1/models`)**: Conecta-se ao seu servidor OpenCode/OpenAI e lista dinamicamente todos os modelos expostos (ex: `opencode-zen`, `opencode-go`, `claude-3-5-sonnet`).
- **Chat Interativo com Contexto Real**: Faça perguntas como *"Como estão minhas campanhas hoje?"* ou *"Como reduzir o CPL?"* e receba análises baseadas nos números reais da sua conta de anúncios.
- **Sugestões Automáticas de Melhoria**: Diagnóstico contínuo identificando oportunidades de escala ou alertas de fadiga de criativos.

### 3. 🎯 Planejador de Campanhas com IA + Upload de Criativos
- **Workflow de 4 Etapas**:
  1. **Briefing**: O usuário descreve a oferta/produto em poucas palavras.
  2. **Planejamento por IA**: A IA projeta público-alvo, objetivo, orçamento e escreve **Headlines, Cópias e CTAs**.
  3. **Upload de Mídias**: Arraste e solte imagens ou vídeos correspondentes para cada anúncio.
  4. **Criação em 1 Clique**: Criação direta na sua conta do Facebook Ads com status **PAUSADA** por segurança.

### 4. 💳 Assinatura via Stripe (R$ 250,00/mês) no Cadastro
- Fluxo de onboarding integrado: Ao criar a conta no SaaS, o usuário é redirecionado diretamente para o **Stripe Checkout** para contratar a assinatura recorrente de **R$ 250,00/mês**.
- Gerenciamento de Webhooks Stripe (`checkout.session.completed` e `invoice.payment_succeeded`).
- Variáveis de ambiente seguras (`.env`) sem exposição de chaves no front-end.

### 5. 🛡️ Experiência do Usuário (UX) & Confirmações Sensíveis
- **Confirmação Dupla para Ações Sensíveis**: Diálogos de confirmação com checkbox exigido antes de pausar/ativar ou subir campanhas com orçamento real.
- **Seleção Dinâmica de Contas**: Menu dropdown automático que lista todas as Contas de Anúncios associadas ao seu Access Token.
- **Autenticação Segura**: Cadastro e Login com criptografia de senha via `bcryptjs`.

---

## 🛠️ Tecnologias Utilizadas

- **Framework**: [Next.js 15 (App Router)](https://nextjs.org/)
- **Linguagem**: TypeScript
- **Estilização**: Tailwind CSS v4 & Shadcn UI
- **Gráficos**: Recharts
- **Estado Local**: Zustand (`persist`)
- **APIs Integradas**: Facebook Marketing API v21.0, OpenCode / OpenAI Base URL API, Stripe Payments SDK
- **Containerização**: Docker & Docker Compose
- **CI/CD**: GitHub Actions (Docker Hub Pipeline)

---

## 📦 Estrutura de Pastas

```text
adpilot/
├── .github/
│   └── workflows/
│       └── docker-publish.yml      # CI/CD para publicar a imagem no Docker Hub
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── ai/                 # Endpoints do OpenCode (chat, models, plan, analyze)
│   │   │   ├── auth/               # Endpoints de cadastro e login
│   │   │   ├── facebook/           # Endpoints do Facebook Ads API (campaigns, accounts, validate)
│   │   │   └── stripe/             # Endpoints do Stripe Checkout & Webhooks
│   │   ├── dashboard/
│   │   │   ├── advisor/            # Tela da IA Advisor
│   │   │   ├── campaigns/          # Tabela detalhada de campanhas
│   │   │   ├── planner/            # Planejador autônomo com upload de criativos
│   │   │   └── settings/           # Configurações de API e Conta
│   │   ├── layout.tsx
│   │   └── page.tsx                # Tela de Login & Cadastro com Stripe Onboarding
│   ├── components/
│   │   ├── dashboard/              # KPI Cards, Tabela de Campanhas, Gráficos
│   │   ├── shared/                 # Modal de confirmação sensível
│   │   └── ui/                     # Componentes Shadcn (Button, Card, Select, etc.)
│   └── lib/
│       ├── ai-helpers.ts           # Normalizador de URLs e headers OpenCode
│       ├── facebook.ts             # Cliente oficial Meta Graph API v21.0
│       ├── store.ts                # Store Zustand para configurações
│       └── stripe.ts               # Cliente Stripe SDK para checkout de R$ 250/mês
├── Dockerfile                      # Build de produção Node 20
├── docker-compose.yml              # Configuração para orquestração Docker
├── .env.example                    # Modelo de variáveis de ambiente
└── package.json
```

---

## ⚙️ Variáveis de Ambiente (`.env`)

Crie um arquivo `.env` na raiz do projeto baseado no `.env.example`:

```env
# Stripe Integration (Plano Pro R$ 250,00/mês)
STRIPE_SECRET_KEY=sk_live_ou_sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_ou_pk_test_...

# Configuração da Aplicação
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## 🚀 Como Executar Localmente

### Pré-requisitos
- Node.js 20+
- npm ou yarn

### Passo a Passo

```bash
# 1. Clone o repositório
git clone https://github.com/WerikoEntusiasta/adpilot.git
cd adpilot

# 2. Instale as dependências
npm install

# 3. Configure o arquivo de ambiente
cp .env.example .env

# 4. Inicie o servidor de desenvolvimento com Turbopack
npm run dev
```

Acesse **`http://localhost:3000`** no seu navegador.

---

## 🐳 Como Hospedar com Docker Compose

O projeto está totalmente pronto para produção em container:

```bash
# 1. Suba o container em segundo plano
docker compose up -d --build

# 2. Verifique o status dos containers
docker compose ps
```

O container rodará na porta `3000`.

---

## 🔄 CI/CD Automatizado (GitHub Actions -> Docker Hub)

Este repositório inclui uma pipeline automática no GitHub Actions (`.github/workflows/docker-publish.yml`).

Sempre que você enviar um `push` para a branch `main`, a Action compilará e publicará a imagem Docker atualizada diretamente no **Docker Hub**.

### Secrets Necessários no GitHub Repository:
Vá em `Settings -> Secrets and variables -> Actions` no seu repositório GitHub e adicione:
- `DOCKERHUB_USERNAME`: Seu usuário do Docker Hub.
- `DOCKERHUB_TOKEN`: Seu Token de Acesso (Personal Access Token) do Docker Hub.

---

## 📄 Licença

Este projeto é desenvolvido para uso comercial e privado. Todos os direitos reservados.
