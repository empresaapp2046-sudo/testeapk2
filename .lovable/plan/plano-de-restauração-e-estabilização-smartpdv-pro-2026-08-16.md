# Plano de Restauração e Estabilização - SmartPDV Pro

O usuário solicitou a restauração dos arquivos do sistema a partir de um novo upload (`remix_-smartpdv-pro_-apk_1.zip`) e a migração para o banco de dados da Lovable Cloud, permitindo a configuração manual de chaves externas (Firebase/Supabase) pelo administrador.

## Objetivos
- Restaurar a lógica de negócio e componentes do novo arquivo ZIP.
- Implementar a transição para Lovable Cloud (Supabase) como banco primário.
- Manter a compatibilidade com Firebase/Supabase externo via configuração manual no `/admin`.
- Corrigir o fluxo de login e redirecionamento do administrador.

## Etapas de Implementação

### 1. Preparação do Banco de Dados (Lovable Cloud)
- Criar migrações SQL para:
    - Tabela `profiles` (estendendo `auth.users`).
    - Tabela `user_roles` (gerenciamento de permissões: `AdminGeral`, `DonoLoja`, etc.).
    - Tabela `system_configs` (para armazenar chaves de integração criptografadas).
    - Tabela `settings` (configurações globais da loja).
- Implementar políticas RLS e a função `has_role`.

### 2. Funções de Servidor (TanStack Start)
- Criar `src/lib/external-configs.functions.ts`:
    - `saveExternalKeys`: Salva chaves Firebase/Supabase no banco da Lovable.
    - `getExternalKeys`: Recupera chaves para uso no frontend (Firebase initialize).
- Garantir que as chaves sejam tratadas com segurança (sem exposição desnecessária).

### 3. Ajustes no `StoreContext.tsx`
- Modificar o `StoreProvider` para:
    - Tentar carregar configurações da Lovable Cloud primeiro.
    - Se chaves externas estiverem presentes, inicializar o Firebase dinamicamente.
    - Atualizar a lógica de `login` para usar `supabase.auth` e redirecionar corretamente:
        - `AdminGeral` / `admin` -> `/admin`
        - Demais -> `/dashboard`
- Sincronizar estados locais com o banco da Lovable Cloud (Profiles, Settings).

### 4. Interface Administrativa (`src/pages/AdminDashboard.tsx`)
- Adicionar seção "Configurações de Backend":
    - Campos para JSON do Firebase.
    - Campos para URL e Key do Supabase externo.
- Integrar com as novas `server functions`.

### 5. Restauração de Componentes e Rotas
- Copiar e adaptar componentes do ZIP para o padrão TanStack Router (se houver novos arquivos).
- Garantir que todas as rotas em `src/routes/` estejam apontando para os componentes restaurados.
- Revisar `src/routes/__root.tsx` para garantir a proteção de rotas correta.

## Detalhes Técnicos
- **Segurança**: Uso de `security definer` nas funções PostgreSQL para evitar recursão em RLS.
- **SSR**: Garantir que acessos ao `window` ou `localStorage` estejam protegidos contra execução no servidor.
- **Criptografia**: Utilizar `CryptoJS` para proteger chaves sensíveis antes de salvar no banco, se necessário.
