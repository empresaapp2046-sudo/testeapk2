# Plano: adicionar abertura do localhost e da pasta do projeto

## Objetivo
Alterar a extensão para oferecer dois comandos independentes: abrir o sistema em `http://localhost:8080` e abrir no Explorer a pasta pai do projeto, que é a raiz onde a extensão está instalada.

## Escopo
- Trocar o botão atual de inicialização por um botão **Abrir Localhost**, que apenas abre `http://localhost:8080` em uma nova aba.
- Adicionar o botão **Abrir Pasta do Projeto**, acionando o host Native Messaging para abrir a pasta pai correta no Windows.
- Manter o host Native Messaging e o registro da extensão, mas adicionar uma ação segura para abrir somente a pasta calculada a partir de `extension/native-host` até a raiz do projeto.
- Atualizar mensagens de erro e estados do popup em português.
- Remover do popup a expectativa de executar `npm install`/`npm run dev`; o arquivo `iniciar.bat` continuará disponível para execução manual quando necessário.
- Preservar o manifesto, permissões existentes e o fluxo de instalação do host.

## Observação sobre a edição visual selecionada
O elemento selecionado aponta para `body`, não para um `span` editável do aplicativo. O texto atual e o substituto são o mesmo caractere invisível (`U+2063`), sem ocorrência correspondente no código; portanto, nenhuma alteração textual real será feita.

## Detalhes técnicos
- Atualizar `extension/popup.html` e `extension/popup.js` com dois controles distintos.
- Atualizar `extension/native-host/host.js` para aceitar `open-project-folder` e executar o Explorer com a pasta pai do projeto; manter `start` apenas por compatibilidade, sem vinculá-lo ao popup.
- Validar o manifesto, os scripts e a resolução da pasta raiz, sem executar comandos Windows no ambiente Linux.
- Não modificar a aplicação web nem incorporar a imagem de referência.