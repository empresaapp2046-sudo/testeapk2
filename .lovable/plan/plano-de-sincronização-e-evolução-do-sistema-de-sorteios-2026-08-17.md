# Plano de Sincronização e Evolução do Sistema de Sorteios

O objetivo deste plano é aprimorar o sistema de campanhas promocionais, permitindo múltiplos prêmios por campanha, definição de imagens/arquivos para cada prêmio, e sorteios sequenciais limitados à quantidade de prêmios definidos, com exibição detalhada dos ganhadores.

## Alterações Técnicas

### 1. Atualização dos Tipos (`src/types.ts`)
- Modificar `RaffleCampaign` para suportar `prizes`: um array de objetos contendo `id`, `name`, `imageUrl`, `winner` (opcional).
- Atualizar a estrutura de `winner` para um array `winners` na campanha, permitindo rastrear a ordem (1º ganhador, 2º ganhador, etc.).

### 2. Contexto de Dados (`src/context/StoreContext.tsx`)
- Adaptar funções `addRaffleCampaign` e `updateRaffleCampaign` para lidar com a nova estrutura de prêmios.
- Garantir que a persistência local e no Firestore suporte as listas de prêmios e ganhadores.

### 3. Interface de Gerenciamento (`src/components/RaffleCampaignsManager.tsx`)
- Atualizar o formulário de criação/edição de campanha:
    - Campo para definir a quantidade de prêmios.
    - Campos dinâmicos (inputs) para nome e URL da imagem (ou upload simulado) para cada prêmio.
- Validar se todos os prêmios têm nome definido antes de salvar.

### 4. Interface de Sorteio (`src/components/CampaignDrawView.tsx`)
- Modificar o fluxo de sorteio:
    - Se a campanha tiver N prêmios, permitir realizar o sorteio N vezes.
    - Exibir o prêmio atual que está sendo sorteado (ex: "Sorteando 1º prêmio: TV").
    - Após cada sorteio, registrar o ganhador na lista `winners` da campanha vinculando-o ao prêmio correspondente.
    - Exibir a lista de ganhadores um abaixo do outro (1º ganhador, 2º ganhador, etc.) com seus respectivos dados e prêmios.
- Bloqueio de re-sorteio:
    - Se todos os prêmios já tiverem ganhadores, desativar o botão de sortear e mostrar "Sorteado".
    - Impedir que a tela de sorteio inicie uma nova sequência se a campanha estiver finalizada.

## Design e Experiência do Usuário
- Utilizar ícones da `lucide-react` para representar prêmios e ganhadores.
- Manter o estilo visual atual com `tailwind-css` v4, garantindo responsividade na lista de ganhadores.
- Feedback sonoro e visual (confete) mantido para cada ganhador individual.
