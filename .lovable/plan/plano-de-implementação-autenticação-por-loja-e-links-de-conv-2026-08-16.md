# Plano de Implementação - Autenticação por Loja e Links de Convite

O objetivo deste plano é restringir o acesso a lojas específicas com base na URL (subdomínio ou caminho), garantir que o cadastro de clientes seja vinculado à loja correta, e consertar o redirecionamento dos links de convite para lojistas. Também incluiremos a capacidade do administrador de acessar qualquer loja.

## Alterações de Arquitetura

1.  **Roteamento Dinâmico por Loja**:
    *   As rotas de login e cadastro serão alteradas para suportar um identificador de loja: `/:storeSlug/login` e `/:storeSlug/register`.
    *   A rota `/register` sem slug será reservada exclusivamente para o cadastro de **novos lojistas** (via token do admin).

2.  **Identificação da Loja**:
    *   Utilizaremos o `username` ou um `slug` da conta do dono da loja (User com role 'admin' do ponto de vista do cliente, mas 'user' na estrutura de tenants) para identificar a loja.

3.  **Acesso Administrativo (Supremo)**:
    *   Usuários com `role: 'AdminGeral'` ou `role: 'admin'` poderão se autenticar em qualquer loja ou acessar o painel administrativo global.

## Passos da Implementação

### 1. Ajuste nos Links de Convite (Lojistas)
*   Corrigir `generateInviteLink` no `StoreContext.tsx` para usar o caminho correto do TanStack Router (`/register-store-owner?token=...`) em vez do caminho legado do HashRouter (`/#/register?token=...`).

### 2. Novas Rotas e Filtros
*   Criar rotas dinâmicas em `src/routes`:
    *   `src/routes/$storeSlug/login.tsx`
    *   `src/routes/$storeSlug/register.tsx`
*   Atualizar `src/routes/index.tsx` para redirecionar ou mostrar erro caso não haja uma loja especificada (exigindo que clientes entrem via link da loja).

### 3. Lógica de Autenticação Vinculada à Loja
*   No `StoreContext.tsx`, atualizar a função `login` para verificar se o usuário que está tentando logar pertence ao `ownerId` da loja identificada pelo `storeSlug`.
*   Se o usuário for `AdminGeral`, ignorar a restrição de loja.

### 4. Cadastro de Clientes por Loja
*   A tela de cadastro em `/:storeSlug/register` criará usuários automaticamente vinculados ao `ownerId` correspondente ao `storeSlug`.

### 5. Interface de Login e Cadastro Customizada
*   Adaptar `Login.tsx` e criar `Register.tsx` (para clientes) que exibam o nome da loja se disponível.

## Detalhes Técnicos
*   **Banco de Dados**: Usar as tabelas `users` e `settings` do Lovable Cloud/Supabase (e Firebase se configurado).
*   **Validação de Rota**: Usar `beforeLoad` nas rotas do TanStack para validar a existência da loja pelo slug.
*   **Redirecionamento**: Garantir que após o login, o cliente permaneça no contexto daquela loja.

---
**Nota**: O administrador supremo sempre terá acesso via `/admin` ou acessando diretamente o link de qualquer cliente.
