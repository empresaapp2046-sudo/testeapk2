# Plano de Sincronização Global de Planos

O objetivo é garantir que os planos configurados pelo administrador no Firestore sejam exibidos corretamente em todas as partes do sistema, especialmente na tela de bloqueio (PlanGate) quando um lojista não possui licença ativa.

## Alterações

### 1. Contexto da Loja (StoreContext)
- Refinar a sincronização do documento `settings/PLATFORM_PLANS` no Firestore.
- Garantir que, ao carregar os planos da plataforma, eles sobrescrevam os planos locais nos `settings`.
- Garantir que, se o documento não existir, ele seja inicializado com os valores padrão corretos.

### 2. Tela de Bloqueio (PlanGate)
- Atualizar o componente para usar `settings.customPlans` ou `defaultPlans` vindo do contexto, garantindo que os dados exibidos sejam os mais recentes sincronizados.

### 3. Página de Administração (AdminDashboard)
- Garantir que as alterações feitas pelo administrador nos planos sejam salvas no documento central `settings/PLATFORM_PLANS` e propagadas para todos os usuários.

## Detalhes Técnicos
- Utilizar `onSnapshot` no `StoreContext` para monitorar mudanças globais nos planos.
- Corrigir a lógica de `defaultPlans` para refletir os valores atualizados (R$ 79,90, etc.).
- Garantir isolamento de dados mas sincronização de tabelas de preços globais.
