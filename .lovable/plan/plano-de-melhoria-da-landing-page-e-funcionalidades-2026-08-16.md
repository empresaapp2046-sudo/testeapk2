# Plano de Melhoria da Landing Page e Funcionalidades

Este plano detalha as alterações para atualizar a Landing Page com a identidade visual do administrador, configurar os botões de ação para contato via WhatsApp e expandir a lista de funcionalidades apresentadas.

## Alterações

### Frontend

- **Landing Page (`src/pages/LandingPage.tsx`)**
    - **Logo Dinâmica:** Atualizar o componente para exibir a logo definida pelo administrador em `settings.logo`. Caso não exista, manter a logo padrão.
    - **Botões de WhatsApp:** Configurar os botões "Criar Minha Loja" e "Começar Agora" para abrir o link do WhatsApp (`https://wa.me/5541988192359`) com uma mensagem pré-definida solicitando o link de cadastro.
    - **Expansão de Funcionalidades:** Adicionar novos cards de funcionalidades para incluir:
        - Geração de carnês
        - Vendas a prazo
        - Campanhas e sorteios
        - Gestão de contas e finanças
        - Mensagens rápidas para clientes
        - Gerenciamento de funcionários
        - Gestão empresarial (contratos e descontos em folha)
    - **Links de Rodapé:** Atualizar links de termos e privacidade para apontar para rotas internas ou placeholders adequados.

### Backend (Configuração)

- Nenhuma alteração de esquema necessária. O componente apenas consumirá o estado `settings.logo` já existente no `StoreContext`.

## Detalhes Técnicos

- Utilização do hook `useStore` para acessar `settings.logo`.
- Formatação de link de WhatsApp usando `encodeURIComponent` para a mensagem: "Olá, gostaria de gerar um link de cadastro para começar a usar o sistema SmartPDV Pro."
- Adição de novos ícones da biblioteca `lucide-react` para as novas funcionalidades (ex: `FileText`, `Calendar`, `BadgePercent`, `Wallet`, `MessageSquare`, `UserCog`, `Briefcase`).
- Ajuste no layout de grid das funcionalidades para acomodar os novos itens de forma responsiva.
