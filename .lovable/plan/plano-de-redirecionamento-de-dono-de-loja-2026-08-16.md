# Plano de Redirecionamento de Dono de Loja

O objetivo é garantir que um Dono de Loja, ao fazer login pelo link principal (`https://smart-pdv-pro.lovable.app/login`), seja redirecionado para a URL específica de sua loja (ex: `https://smart-pdv-pro.lovable.app/teste333/dashboard`), em vez de uma URL genérica.

## Alterações

### 1. `src/context/StoreContext.tsx`
- Refinar a lógica de redirecionamento no método `login`.
- Garantir que `d.id` ou `d.tenantId` seja usado corretamente como o slug da loja no redirecionamento do `DonoLoja`.
- Se o usuário for um `DonoLoja` e não houver um `storeSlug` no contexto da URL atual, usar seu próprio identificador para compor a rota.

## Detalhes Técnicos
- O sistema já possui rotas multi-tenant (`/$storeSlug/dashboard`).
- A função `login` no `StoreContext` utiliza `window.location.href` para forçar o redirecionamento, o que é adequado para mudar a estrutura da URL e garantir que o `storeSlug` seja injetado nos `useParams` das rotas subsequentes.

```typescript
// Exemplo da lógica a ser verificada/ajustada:
if (d.role === 'DonoLoja') {
    const slug = d.tenantId || d.id;
    window.location.href = `/${slug}/dashboard`;
}
```
