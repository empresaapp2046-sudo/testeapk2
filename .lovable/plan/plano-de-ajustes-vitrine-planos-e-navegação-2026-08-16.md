# Plano de Ajustes: Vitrine, Planos e Navegação

Este plano detalha a remoção da seção de planos da vitrine pública, a integração desta seção na tela de configurações dos lojistas, e a restauração do menu lateral após o login.

## Alterações

### 1. Vitrine (`src/pages/Vitrine.tsx`)
- Remover a seção "Nossos Planos" que aparece quando `!storeSlug` (vitrine do admin).
- Manter apenas o catálogo de produtos e funcionalidades de interação (WhatsApp, Chat, etc.).

### 2. Configurações (`src/pages/Settings.tsx`)
- Garantir que a seção "Nossos Planos" (`isVisible('plans')`) esteja acessível para donos de loja.
- Adicionar um gate de licenciamento ou link direto para contato com suporte ao tentar contratar um plano.

### 3. Acesso Restrito (`src/components/PlanGate.tsx` e `src/components/Sidebar.tsx`)
- Verificar a visibilidade dos menus no `Sidebar.tsx`. Atualmente, donos de loja veem todos os menus, mas o `PlanGate` bloqueia o conteúdo se não houver licença ativa.
- Garantir que o `Sidebar` permaneça visível e funcional após o login, respeitando as permissões de funcionários e status do plano do dono.

### 4. Layout Global (`src/routes/__root.tsx`)
- Corrigir a lógica de renderização do `AppLayout` para garantir que o `Sidebar` seja montado corretamente para usuários autenticados.

## Detalhes Técnicos
- A seção de planos na vitrine admin era controlada pela condição `!storeSlug && sortedPlans.length > 0`. Ela será removida.
- No `Sidebar.tsx`, a visibilidade depende da função `isVisible`. Vou assegurar que donos de loja e administradores tenham acesso total à estrutura do menu, enquanto o conteúdo das páginas é protegido pelo `PlanGate`.
- A navegação entre as telas de "Empresas", "Financeiro", etc., já está envolta em `PlanGate` em seus respectivos arquivos (ex: `Inventory.tsx`), o que solicita a assinatura ao tentar acessar.
