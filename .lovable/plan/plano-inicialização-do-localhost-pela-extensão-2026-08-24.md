# Plano: inicialização do localhost pela extensão

## Objetivo
Garantir que o botão **Abrir Localhost** execute o `iniciar.bat` através do host nativo, aguarde 5 segundos para o `npm run dev` iniciar e só depois abra `http://localhost:8080`.

## Alterações
1. Atualizar `extension/popup.js` para:
   - conectar ao host nativo ao clicar em **Abrir Localhost**;
   - enviar a ação `start`, que executa o `iniciar.bat`;
   - bloquear o botão durante a inicialização e exibir status de sucesso/erro;
   - aguardar 5 segundos após a confirmação do host antes de criar a aba do localhost;
   - tratar host ausente ou desconexão sem abrir uma página que ainda não iniciou.
2. Manter `extension/native-host/host.js` usando a ação `start` para chamar o `iniciar.bat`, preservando o comando `npm run dev` e o `timeout /t 5` já existentes no script.
3. Revisar o fluxo para evitar múltiplas conexões, mensagens duplicadas e chamadas de `disconnect` após a conexão já ter sido encerrada.

## Validação
- Verificar a configuração e o código da extensão.
- Confirmar que o `iniciar.bat` continua instalando dependências apenas quando necessário, iniciando `npm run dev` e aguardando 5 segundos.
- Rodar a validação disponível do projeto após a implementação.
