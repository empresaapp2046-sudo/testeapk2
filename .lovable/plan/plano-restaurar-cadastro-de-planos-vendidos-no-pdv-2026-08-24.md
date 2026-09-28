# Plano: restaurar cadastro de planos vendidos no PDV

## Objetivo
Corrigir a aba **Planos** da tela **Gestão** para voltar a administrar os planos de produtos vendidos no PDV, sem exibir nem editar os planos de assinatura da plataforma.

## Alterações
1. Ajustar `src/pages/Inventory.tsx` para usar a lista existente de produtos com categoria `Planos` (`filteredPlans`) na aba **Planos**.
2. Restaurar a interface de cadastro e edição com:
   - nome do plano;
   - preço de venda;
   - custo opcional;
   - descrição;
   - validade em dias.
3. Exibir os planos cadastrados em uma tabela/lista com preço, validade e ações de editar/excluir, mantendo o padrão visual da tela Gestão.
4. Reaproveitar os handlers já existentes (`handleSubmitPlan`, `handleEditPlan`, `addProduct`, `updateProduct`, `handleDeleteProduct`) para preservar a integração com o PDV e o isolamento por loja.
5. Remover da aba de inventário a dependência visual e funcional de `settings.customPlans`/`PLATFORM_PLANS`, que pertence apenas à assinatura da plataforma. Não alterar a seção de assinatura em Configurações nem o painel administrativo.
6. Garantir que a criação gere produto com categoria `Planos` e `validityDays`, para que a venda no PDV continue calculando a validade do cliente.

## Validação
- Verificar o fluxo de renderização, criação, edição e exclusão no código.
- Confirmar que os planos de assinatura não aparecem mais na aba de planos do Gestão.
- Rodar validação de sintaxe/build disponível e revisar a tela no preview.
