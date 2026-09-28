# Plano de Aprimoramento de Fluxos de Acesso e Multi-tenant

Este plano visa unificar os fluxos de acesso à vitrine, login e cadastro, garantindo isolamento entre lojas, validade temporal para convites de lojistas e conformidade com os requisitos de experiência do usuário (Splash Screen e redirecionamentos).

## Ações a serem realizadas

### 1. Roteamento e Splash Screen
- **Unificação de Rotas**: Manter o suporte para `/l/$storeSlug` (Vitrine), `/$storeSlug/login` e `/$storeSlug/register`.
- **Fluxo Inicial**: Ajustar o `src/routes/__root.tsx` para que o `AppLayout` sempre exiba a `SplashScreen` ao detectar uma nova navegação para uma loja específica, garantindo que o redirecionamento pós-splash leve ao destino correto (Vitrine, Login ou Registro).
- **Proteção de Rotas**: Refinar a detecção de rotas públicas para incluir padrões dinâmicos e garantir que sub-rotas de lojas sejam acessíveis sem autenticação prévia.

### 2. Isolamento de Loja e Acesso de Clientes
- **Bloqueio de Acesso**: No `StoreContext.tsx`, garantir que um cliente cadastrado na Loja A não consiga logar na Loja B. 
- **Cadastro Direcionado**: Vincular automaticamente novos clientes ao `ownerId` da loja pelo link de cadastro utilizado.
- **Acesso Restrito**: Clientes (role 'Vendedor' ou similar adaptada para 'Cliente') terão acesso exclusivo à vitrine após o login, sendo bloqueados de acessar o PDV ou outras áreas administrativas.
- **Exceção Admin**: Manter o acesso total do `AdminGeral` a qualquer loja através do link.

### 3. Sistema de Convites e Links de Lojistas
- **Validade Temporal**: Implementar expiração de 3 horas para o link de convite (token) gerado pelo administrador.
- **Duração de Cadastro**: Configurar uma duração de teste de 12 horas após a conclusão do cadastro via link de convite.
- **Geração de Links**: Corrigir a função `generateInviteLink` para criar URLs compatíveis com a estrutura do TanStack Router.

### 4. Gerenciamento de Clientes para Lojistas
- **Nova Tela de Clientes**: Criar a tela de gerenciamento de clientes vinculada ao menu lateral, permitindo que o lojista visualize e gerencie apenas seus clientes.
- **Integração com Sidebar**: Adicionar o item "Clientes" ao menu lateral, respeitando as permissões de visibilidade.

## Detalhes Técnicos

- **Contexto de Autenticação**: O `login` e `registerUser` no `StoreContext.tsx` serão atualizados para validar o `storeSlug`.
- **Persistência de Convites**: Armazenar timestamps de expiração nos metadados do token no banco de dados.
- **Roles e Permissões**: Mapear acessos baseados na `UserRole` para redirecionar usuários do tipo cliente diretamente para a vitrine logada.
- **Páginas e Componentes**:
    - `src/pages/CustomerList.tsx` (Nova): Listagem de clientes do lojista.
    - `src/routes/customers.tsx` (Nova): Rota para a listagem de clientes.
    - `src/routes/$storeSlug.login.tsx` / `register.tsx`: Garantir comportamento idêntico ao solicitado.

As chaves de acesso externas (Firebase/Supabase) inseridas pelo Admin no painel administrativo serão respeitadas pela arquitetura híbrida já implementada.
