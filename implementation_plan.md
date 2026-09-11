# Objetivo

O usuário deseja expandir a visualização de campanhas no AdPilot para suportar o detalhamento profundo da estrutura do Facebook Ads (Campanhas -> Conjuntos de Anúncios -> Anúncios -> Criativos). 
Além disso, deseja uma regra de negócios específica para a extração de resultados: se a conversão for no site, contabilizar como 'Venda' (Sales). Se for para o WhatsApp, contabilizar como 'Lead'.

## Perguntas em Aberto

> [!IMPORTANT]
> - Precisamos definir como vamos identificar "conversão no site" versus "WhatsApp" na API do Facebook. Geralmente, WhatsApp é trackeado como \onsite_conversion.messaging_conversation_started_7d\ ou similar, enquanto site é \offsite_conversion.fb_pixel_purchase\. Confirmar se o mapeamento padrão da API atende à sua conta de anúncios.
> - Você gostaria de poder editar (pausar/ativar) também os conjuntos de anúncios e anúncios individuais pela plataforma, ou apenas visualizar os dados e criativos neste primeiro momento?

## Mudanças Propostas

### 1. Atualizar \src/lib/facebook.ts\ (Backend)
- Criar funções para buscar Conjuntos de Anúncios (\dsets\) e Anúncios (\ds\) com seus respectivos \insights\ (métricas).
- Atualizar a função \extractCampaignResults\ e criar \extractAdResults\ para aplicar a regra de negócios solicitada (separar Leads de Vendas com base no tipo de conversão do Facebook).
- Obter os \dcreatives\ (criativos) atrelados a cada anúncio, permitindo extrair a URL da imagem ou vídeo (thumbnail) para exibir no painel.

### 2. Criar Nova API Route
- Criar \src/app/api/facebook/campaigns/[id]/route.ts\ ou um endpoint genérico que retorne os detalhes aprofundados (AdSets e Ads) de uma campanha específica quando o usuário clicar nela.

### 3. Reformular \src/app/dashboard/campaigns/[id]/page.tsx\
- Substituir a visualização estática atual por um layout com **Abas (Tabs)**:
  - **Aba Visão Geral**: Gráficos e KPIs totais da campanha.
  - **Aba Conjuntos de Anúncios**: Tabela com os conjuntos (Status, Orçamento, Resultados, CPA).
  - **Aba Anúncios & Criativos**: Tabela listando cada anúncio individualmente com a miniatura do criativo e seus dados individuais (Gastos, Cliques, Conversões).

## Plano de Verificação

### Verificação Manual
- Entrar no painel do AdPilot, abrir a tela de Campanhas e clicar em uma campanha ativa.
- Verificar se a página de detalhes carrega a lista de Conjuntos de Anúncios e Anúncios reais daquela campanha.
- Validar se os criativos aparecem e se a regra de negócio de "Site = Venda" e "WhatsApp = Lead" está sendo aplicada corretamente na coluna de resultados.
