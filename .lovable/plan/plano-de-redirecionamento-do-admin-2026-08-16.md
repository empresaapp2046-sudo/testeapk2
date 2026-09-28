# Plano de Redirecionamento do Admin

Ajustar a rota de redirecionamento para o usuário com o papel `AdminGeral` para que, após o login ou ao acessar a página inicial já autenticado, ele seja direcionado para `/dashboard` em vez de `/admin`, conforme solicitado.

## Alterações

### 1. Lógica de Login (Backend/Contexto)
- Localizar a função `login` em `src/context/StoreContext.tsx`.
- Alterar o redirecionamento do papel `AdminGeral` de `window.location.href = '/admin'` para `window.location.href = '/dashboard'`.

### 2. Lógica de Redirecionamento de Rotas (Frontend)
- Localizar o componente `AppLayout` em `src/routes/__root.tsx`.
- No `useEffect` que gerencia o redirecionamento automático:
    - Alterar o destino de `AdminGeral` de `/admin` para `/dashboard` quando o usuário tenta acessar `/login` ou a raiz `/`.

## Detalhes Técnicos
- Nenhuma alteração de banco de dados ou RLS é necessária.
- A alteração foca exclusivamente na navegação forçada pós-autenticação para alinhar com a preferência de fluxo do usuário.
