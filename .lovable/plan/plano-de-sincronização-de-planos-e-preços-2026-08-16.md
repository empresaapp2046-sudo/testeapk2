# Plano de Sincronização de Planos e Preços

O objetivo é garantir que os planos e preços configurados pelo Administrador sejam refletidos corretamente para todos os donos de loja em tempo real.

## Alterações Propostas

### Backend (Banco de Dados)
- Criar/Confirmar a existência do documento `settings/PLATFORM_PLANS` no Firebase Firestore, que servirá como a fonte da verdade para os planos globais.
- A migração inicial deve garantir que este documento contenha os planos padrão.

### Contexto da Loja (`StoreContext.tsx`)
- Ajustar a inicialização do estado `settings` para usar os planos do `PLATFORM_PLANS` como padrão para novos usuários e fallbacks.
- Melhorar o listener em tempo real para `PLATFORM_PLANS` para garantir que `settings.customPlans` seja atualizado sempre que o administrador fizer uma alteração.
- Garantir que a lógica de "Nossos Planos" na tela de configurações dos lojistas utilize `settings.customPlans` (que agora virá sincronizado do global).

### Painel Administrativo (`AdminDashboard.tsx`)
- Garantir que as edições feitas na seção "Gerenciar Planos e Benefícios" atualizem o documento central `PLATFORM_PLANS` no Firestore.
- O botão de salvar (ou a atualização automática via `updateSettings`) deve persistir os dados no local correto para afetar todos os usuários.

### Tela de Configurações (`Settings.tsx`)
- Ajustar a exibição dos planos na seção "Nossos Planos" para ler sempre de `settings.customPlans`.
- Remover qualquer hardcode ou lógica que utilize `defaultPlans` local se `customPlans` estiver disponível e sincronizado.

## Detalhes Técnicos
- Utilizar `onSnapshot` no `PLATFORM_PLANS` dentro do `StoreProvider`.
- Garantir que `cleanForCloud` seja aplicado antes de salvar no Firestore para evitar problemas de tamanho de documento com imagens base64.
- Adicionar logs para facilitar a depuração da sincronização.

## Verificação
- Abrir o Painel Admin e alterar o preço de um plano.
- Verificar em uma conta de Dono de Loja se o novo preço aparece imediatamente na tela de Configurações > Nossos Planos.
