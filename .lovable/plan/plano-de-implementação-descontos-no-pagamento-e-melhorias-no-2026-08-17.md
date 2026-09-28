# Plano de Implementação: Descontos no Pagamento e Melhorias no Carnê

Este plano detalha as alterações para permitir descontos no momento do pagamento, inclusão de QR Code Pix no carnê e opções de exibição de valores (original vs. corrigido) na reimpressão do carnê.

## Alterações Técnicas

### 1. Sistema de Pagamento (PaymentModal.tsx)
- Adicionar campos para desconto em porcentagem (%) ou valor fixo (R$).
- Atualizar o cálculo do valor final em tempo real antes da confirmação.
- Ajustar a lógica de registro de pagamento para processar o desconto concedido, registrando-o no histórico do registro financeiro.

### 2. Carnê (CarnePrinter.tsx & printerService.ts)
- **QR Code por Parcela:** Integrar a geração de QR Code Pix (com payload dinâmico incluindo valor e dados da loja) em cada folha do carnê.
- **Valores Corrigidos vs. Originais:**
  - Adicionar um seletor (toggle/checkbox) na interface do `CarnePrinter` para o usuário escolher entre "Valor Original" ou "Valor Corrigido".
  - Se "Valor Corrigido" for selecionado: Mostrar o saldo restante da parcela (ex: se era R$ 30,00 e pagou R$ 10,00, mostra R$ 20,00).
  - Se "Valor Original" for selecionado: Mostrar o valor total inicial, mas manter a indicação de "PAGO" com data para parcelas totalmente quitadas.
- **Layout:** Ajustar o CSS e HTML da via do cliente e da loja para acomodar o QR Code e as informações de saldo.

### 3. Contexto e Tipos (StoreContext.tsx & types.ts)
- Se necessário, ajustar a interface `PaymentHistory` ou `FinancialRecord` para suportar explicitamente o campo `discountAmount` em cada baixa.

## Segurança e Validação
- Validar que o desconto não exceda o valor restante da parcela.
- Garantir que a geração do payload Pix utilize a chave configurada corretamente nas `CompanySettings`.

## Passos de Implementação
1. Modificar `PaymentModal.tsx` para incluir a interface de desconto.
2. Atualizar `CarnePrinter.tsx` com o seletor de modo de exibição e integração de QR Code.
3. Refatorar a função de geração de QR Code Pix para ser reutilizável no carnê.
4. Validar as impressões e os cálculos de saldo.
