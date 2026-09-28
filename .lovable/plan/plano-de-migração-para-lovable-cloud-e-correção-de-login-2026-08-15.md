# Plano de Migração para Lovable Cloud e Correção de Login

Este plano detalha a transição do Firebase para o Lovable Cloud (PostgreSQL via Supabase), permitindo que o administrador configure manualmente chaves do Firebase/Supabase e corrigindo o problema de conexão do administrador.

## Mudanças e Melhorias

### Backend (Lovable Cloud / Supabase)
- **Migração de Banco de Dados**: Criação do esquema no PostgreSQL para substituir as coleções do Firestore.
- **Tabelas Principais**: `users`, `settings`, `products`, `customers`, `sales`, `financial_records`, `raffle_campaigns`, etc.
- **Configuração Dinâmica**: Adição de campos na tabela `settings` para armazenar `firebase_config` e `supabase_config` (criptografados).
- **Segurança**: Implementação de RLS (Row Level Security) e funções de validação de papéis (`has_role`).

### Autenticação
- **Correção de Login**: Investigação e correção do redirecionamento após o login do administrador.
- **Híbrido de Auth**: Manter suporte ao Firebase Auth atual enquanto integra o Supabase Auth ou autenticação baseada em tabela local.

### Frontend
- **Interface de Configuração**: Adição de campos no `Settings.tsx` para o administrador inserir as chaves.
- **StoreContext**: Atualização do provedor para priorizar dados do Lovable Cloud, permitindo fallback ou integração com chaves manuais.

## Detalhes Técnicos

### Esquema do Banco de Dados (SQL)
```sql
CREATE TABLE public.settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL,
    firebase_config JSONB,
    supabase_config JSONB,
    general_settings JSONB DEFAULT '{}',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Habilitar RLS e permissões
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
GRANT SELECT, UPDATE ON public.settings TO authenticated;
```

### Funções de Servidor (TanStack Start)
- Criar `src/lib/cloud.functions.ts` para operações de CRUD via servidor.
- Criar `src/server/db.server.ts` para inicializar o cliente admin do banco.

## Passos de Execução

1. **Ativar Lovable Cloud**: Ativar a integração para provisionar o banco de dados.
2. **Criar Tabelas**: Executar as migrações SQL necessárias.
3. **Refatorar StoreContext**: Mudar a lógica de persistência de Firestore para Lovable Cloud.
4. **Adicionar UI de Configuração**: Atualizar a página de Configurações.
5. **Corrigir Roteamento**: Garantir que o administrador seja redirecionado para `/dashboard` após o login.
