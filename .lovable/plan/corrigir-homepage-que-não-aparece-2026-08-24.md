# Corrigir homepage que não aparece

## Objetivo
Garantir que a tela inicial (`/`) seja renderizada corretamente, sem redirecionamento indevido para o dashboard e sem bloqueio persistente pelo splash screen.

## Implementação
1. Ajustar o layout raiz para não redirecionar automaticamente usuários autenticados da rota `/` para `/dashboard`.
2. Preservar os redirecionamentos específicos após login e para áreas privadas, sem alterar a lógica de tenants, lojas ou permissões.
3. Tornar o fluxo do splash compatível com a homepage: ele poderá aparecer apenas como carregamento inicial, mas não impedirá a exibição da Landing Page após o tempo previsto.
4. Verificar a rota `/`, a renderização da `LandingPage` e a ausência de erros de runtime no preview.
5. Não transformar o caractere invisível selecionado em texto visível, pois não há origem editável correspondente no componente.

## Detalhes técnicos
- Alterações limitadas a `src/routes/__root.tsx` e, somente se a validação indicar necessidade, ao arquivo da rota/componente da homepage.
- Manter TanStack Router e a estrutura atual de `StoreProvider`, `AppLayout` e `Outlet`.
- Validar com build e inspeção do preview em `/`.