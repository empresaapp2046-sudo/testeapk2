# Plano de Melhoria do Menu Clientes e Segurança

Este plano descreve as alterações para unificar o menu de Clientes, adicionar funcionalidades de senha temporária para acesso à vitrine e permitir a alteração de senha pelo cliente.

## Alterações de Interface (UI)

### 1. Unificação do Menu Clientes
- Modificar o componente `CustomerList` (usado na rota `/customers`) para espelhar a funcionalidade e o design presente na aba de clientes do `Inventory.tsx`.
- Incluir filtros avançados, busca e a lista detalhada de clientes com as mesmas ações (Info, Editar, Excluir).

### 2. Funcionalidade de Senha Temporária
- No modal de informações do cliente (`CustomerInfoModal.tsx`), adicionar um botão "Gerar Senha Temporária".
- Este botão irá:
  - Gerar uma senha aleatória segura.
  - Definir uma data de expiração (3 horas a partir de agora).
  - Abrir o WhatsApp com uma mensagem pré-configurada contendo o e-mail do cliente e a senha temporária, informando que a senha expira em 3 horas e deve ser alterada.

### 3. Tela de Configurações do Cliente (na Vitrine)
- Criar ou atualizar a área do cliente na vitrine (`/l/$storeSlug`) para incluir um botão/seção de "Configurações".
- Permitir que o cliente altere sua senha atual.

## Alterações Técnicas

### 1. Modelo de Dados (`types.ts` e Database)
- Garantir que o tipo `Customer` suporte os campos:
  - `tempPassword`: string (opcional)
  - `tempPasswordExpires`: string (ISO date, opcional)

### 2. Lógica de Negócio (`StoreContext.tsx`)
- Implementar a função `generateTempPassword(customerId)` no `StoreContext`.
- Atualizar a lógica de login na vitrine para aceitar a senha temporária se ela ainda não tiver expirado.
- Adicionar função `changeCustomerPassword(customerId, newPassword)` para permitir a troca de senha.

### 3. Segurança
- As senhas temporárias devem ser suficientemente complexas.
- A validação de expiração deve ser rigorosa no momento do login.

## Passos de Validação
- Verificar se o menu Clientes no sidebar abre a nova lista completa.
- Testar a geração de senha temporária e o redirecionamento para o WhatsApp.
- Validar se a senha temporária expira após o tempo definido.
- Testar a funcionalidade de alteração de senha na área do cliente.
