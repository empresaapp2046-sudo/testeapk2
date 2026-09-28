# Plano: corrigir inicialização pela extensão

## Objetivo
Fazer o botão “Abrir Localhost” executar de forma confiável `npm install` e `npm run dev` pelo CMD, mantendo o processo do servidor aberto e abrindo o localhost somente depois da inicialização.

## Alterações
1. **`iniciar.bat`**
   - Corrigir o encadeamento dos comandos para executar sempre `npm install` e, em seguida, `npm run dev`.
   - Iniciar o servidor em uma janela persistente do CMD, sem usar um fluxo que encerre a janela junto com o script.
   - Manter a janela do servidor aberta enquanto o Vite estiver rodando, exibindo erros de instalação ou inicialização em vez de fechar silenciosamente.
   - Evitar que o batch abra uma segunda janela do navegador; a extensão será responsável por abrir o localhost após a espera.

2. **`extension/native-host/host.js`**
   - Ajustar a execução do batch pelo CMD para que o processo do servidor fique desacoplado do host nativo e não seja finalizado quando a comunicação com a extensão terminar.
   - Garantir que o comando seja executado a partir da raiz correta do projeto.

3. **`extension/popup.js`**
   - Manter o clique de “Abrir Localhost” acionando a ação `start` do host nativo.
   - Aguardar 5 segundos após a confirmação e só então abrir `http://localhost:8080`.
   - Preservar tratamento de erro e impedir cliques duplicados durante a inicialização.

## Validação
- Conferir a ordem dos comandos no batch.
- Validar sintaxe dos scripts JavaScript.
- Confirmar que não existe fechamento explícito da janela que hospeda `npm run dev` e que a extensão continua sendo a única responsável por abrir o localhost.

## Detalhes técnicos
- Alterações limitadas ao batch e à extensão local, sem mudanças na aplicação, banco de dados ou interface principal.
- O fluxo continua compatível com Windows, CMD e Native Messaging já configurados.
