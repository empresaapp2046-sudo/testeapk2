# Plano: inicialização local pela extensão

## Objetivo
Garantir que o fluxo local sempre execute `npm install`, depois `npm run dev`, aguarde 5 segundos e só então abra `http://localhost:8080`.

## Alterações
1. **`iniciar.bat`**
   - Remover o atalho que pula `npm install` quando `node_modules` já existe.
   - Executar `npm install --no-audit --no-fund` em toda inicialização.
   - Interromper com mensagem clara se a instalação falhar.
   - Iniciar `npm run dev` em uma janela separada e aguardar 5 segundos antes da abertura do navegador.

2. **Extensão / host nativo**
   - Manter o botão “Abrir Localhost” acionando o host nativo, que executa `iniciar.bat` pelo `cmd.exe`.
   - Preservar a espera de 5 segundos no popup antes de abrir a aba local, evitando abertura prematura.
   - Ajustar o fluxo para evitar abertura duplicada caso o batch também abra o navegador: a responsabilidade de abrir a aba ficará no popup da extensão.
   - Manter o botão de abertura da pasta do projeto sem alteração funcional.

3. **Validação**
   - Conferir os comandos presentes no batch e a ordem `npm install` → `npm run dev` → espera de 5 segundos → localhost.
   - Validar a sintaxe dos scripts da extensão e revisar mensagens em português.

## Detalhes técnicos
- Não serão alteradas regras de negócio, telas ou banco de dados.
- O comportamento será compatível com Windows, usando `cmd.exe` e o host nativo já existente.
- A instalação continuará usando as opções sem auditoria/fundação para reduzir consumo desnecessário, mas será executada sempre conforme solicitado.
