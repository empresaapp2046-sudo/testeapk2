# Plano: inicialização local persistente pela extensão

## Objetivo
Garantir que o botão **Abrir Localhost** execute o `iniciar.bat` via CMD, mantenha o servidor `npm run dev` ativo em uma janela minimizada e só abra `http://localhost:8080` após 5 segundos. A troca visual enviada é idêntica (`U+2063` para `U+2063`), portanto não gera alteração de texto.

## Implementação
1. Ajustar `iniciar.bat` para separar claramente a instalação das dependências da execução do servidor, preservar o código de saída da instalação e iniciar um CMD persistente (`/k`) no diretório correto.
2. Ajustar `extension/native-host/host.js` para iniciar o batch de forma independente do ciclo de vida da conexão Native Messaging, sem fechar a janela do servidor quando o host responder ou a extensão for desconectada.
3. Melhorar o feedback do `extension/popup.js`: indicar que o `npm install` pode estar em andamento, manter o atraso de 5 segundos depois da confirmação do lançamento e evitar que a desconexão normal do host seja tratada como erro.
4. Revisar o manifesto/configuração do host e o instalador para preservar caminhos absolutos e a codificação UTF-8 das mensagens exibidas.

## Validação
- Conferir sintaxe e referências dos três scripts alterados.
- Verificar que o comando de inicialização contém `npm install` seguido de `npm run dev`, que o CMD usa `/k` e que o popup mantém `STARTUP_WAIT_MS = 5000`.
- Confirmar que nenhum texto invisível idêntico foi alterado.

## Detalhes técnicos
- Não alterar o código da aplicação nem o backend.
- Não incluir credenciais ou caminhos específicos da máquina do usuário.
- Preservar o fluxo existente de abrir a pasta do projeto e a mensagem de host não instalado.