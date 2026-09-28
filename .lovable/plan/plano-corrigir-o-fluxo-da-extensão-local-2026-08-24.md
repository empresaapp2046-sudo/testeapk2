# Plano: corrigir o fluxo da extensão local

## Objetivo
Garantir que o botão **Abrir Sistema** execute `iniciar.bat` na pasta raiz do projeto, iniciando `npm install` e depois `npm run dev`, e só abra `http://localhost:8080` após o início do processo.

## Escopo
- Manter o manifesto da extensão e os ícones já existentes.
- Ajustar o host Native Messaging para localizar a raiz do projeto de forma consistente e executar exclusivamente `iniciar.bat`, nunca `instalar-extensao.bat`.
- Melhorar o instalador do host para registrar o manifesto com o caminho correto e orientar o usuário sobre o ID da extensão.
- Atualizar o popup para exibir um menu/estado claro de inicialização e mensagens em português corretamente codificadas, incluindo erro de host não instalado.
- Preservar o `iniciar.bat` como responsável por `npm install`, execução minimizada de `npm run dev`, espera de 5 segundos e abertura do localhost.
- Validar JSON, referências de arquivos, sintaxe dos scripts e o comportamento possível no ambiente local.

## Observação sobre a edição visual selecionada
O elemento selecionado aponta para `body`, não para um `span` editável do aplicativo. O texto atual e o substituto são o mesmo caractere invisível (`U+2063`), e não há ocorrência correspondente no código; portanto, nenhuma alteração textual real será feita.

## Detalhes técnicos
- Revisar `extension/popup.html`, `extension/popup.js`, `extension/native-host/host.js`, `extension/native-host/com.smartpdvpro.launcher.json`, `extension/instalar-extensao.bat` e `iniciar.bat`.
- Usar mensagens Native Messaging com confirmação de disparo do batch.
- Evitar afirmar que o projeto iniciou quando o host não puder ser conectado.
- Não executar o instalador de extensão automaticamente pelo popup: por segurança do Chrome, a instalação/registro do Native Messaging continua sendo uma etapa do Windows.
- Não modificar áreas da aplicação web nem executar a solicitação anexada como texto literal, pois ela é um pedido funcional separado da substituição invisível.