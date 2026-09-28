# Plano de Implementação: Visibilidade de Menus, Bloqueio por Plano e Atualização de Preços

Este plano visa atender à solicitação de exibir menus adicionais para os donos de loja, restringir o acesso a esses menus com base na validade do plano (exibindo uma tela de contratação quando necessário) e atualizar os preços dos planos conforme as definições do administrador.

## 1. Visibilidade de Menus Adicionais
*   **Ação:** Atualizar o componente `Sidebar.tsx` para garantir que os menus "Empresas", "Financeiro", "Relatórios de Caixa", "Relatórios Empresariais" e "Relatórios Financeiros" estejam visíveis para o perfil `DonoLoja`.
*   **Detalhe:** Atualmente, a função `isVisible` já parece contemplar esses menus, mas vamos validar se as chaves batem com o que o usuário solicitou.

## 2. Bloqueio de Acesso e Tela de Contratação
*   **Ação:** Criar um componente de "Gate" ou atualizar as páginas correspondentes (`Companies.tsx`, `Finance.tsx`, `CashReports.tsx`, `CorporateReports.tsx`, `Reports.tsx`) para verificar a validade do plano do usuário.
*   **Lógica:**
    *   Se o usuário for `DonoLoja` e não possuir um plano ativo/válido (usando `isFreeVersion` ou checando `licenseExpiry` no `StoreContext`), exibir uma tela amigável informando que a funcionalidade é exclusiva para planos pagos.
    *   Nesta tela, exibir os planos disponíveis (preços atualizados) com um botão para assinar.
*   **Páginas a proteger:**
    *   `/companies` -> `Companies.tsx`
    *   `/finance` -> `Finance.tsx`
    *   `/cash-reports` -> `CashReports.tsx`
    *   `/corporate-reports` -> `CorporateReports.tsx`
    *   `/reports` -> `Reports.tsx`

## 3. Atualização de Preços dos Planos
*   **Ação:** Atualizar a lista `defaultPlans` no `StoreContext.tsx` com os valores exibidos na "Imagem 3" fornecida pelo usuário.
*   **Novos Preços:**
    *   **Mensal Básico:** R$ 79,90
    *   **Anual Econômico:** R$ 799,90
    *   **Vitalício Premium:** R$ 1499,90
    *   **Mensal Fidelidade:** R$ 129,90
*   **Sincronização:** Garantir que o componente de exibição de planos utilize os dados de `settings.customPlans` (que vêm do banco/admin) em vez de hardcoded, se aplicável.

## Detalhes Técnicos
*   **Arquivos impactados:**
    *   `src/context/StoreContext.tsx`: Atualização dos `defaultPlans`.
    *   `src/components/Sidebar.tsx`: Ajuste de visibilidade.
    *   `src/components/PlanGate.tsx` (Novo): Componente para exibir o aviso de "Plano Necessário".
    *   Páginas de Relatórios/Financeiro: Integração com o `PlanGate`.
*   **Lógica de Expiração:** Utilizar a função `isFreeVersion` já existente no `StoreContext` ou criar uma nova propriedade `hasActivePlan` para centralizar essa regra.
