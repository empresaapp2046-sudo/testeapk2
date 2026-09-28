# Plano: launcher local e ações da Landing Page

## Objetivo
Corrigir o carregamento da extensão e completar os controles solicitados na homepage, mantendo o download do projeto baseado na função já existente.

## Alterações previstas

1. **Extensão do navegador**
   - Remover do `manifest.json` a referência a `icon.png` inexistente (ou ajustar para um asset realmente presente), eliminando o erro de manifesto.
   - Atualizar o popup para iniciar o fluxo local pelo mecanismo disponível no navegador, deixando claro o limite: uma extensão Chrome não pode executar `npm install`/`npm run dev` diretamente por segurança.
   - Preservar a abertura de `http://localhost:8080` e, quando aplicável, acionar o script local existente como parte do fluxo documentado/configurado.

2. **Launcher Windows**
   - Reordenar `iniciar.bat` para executar `npm install`, iniciar `npm run dev`, aguardar o servidor ficar disponível e só então abrir o localhost.
   - Manter a janela minimizada após o período solicitado, evitando abrir o navegador antes do servidor estar pronto.

3. **Botão “Baixar Projeto”**
   - Integrar `downloadProjectAction` em `LandingPage.tsx` via `useServerFn`.
   - Converter a resposta base64 em arquivo ZIP no navegador, disparar o download com o nome retornado e exibir estados de processamento/erro.
   - Expor o botão no rodapé, onde ele ficará visível na homepage.

4. **Botão ao lado de “Entrar”**
   - Adicionar no cabeçalho um botão secundário ao lado de “Entrar”, apontando para a ação de cadastro/contato já usada pela Landing Page, com layout responsivo.

5. **Validação**
   - Verificar manifesto sem referência quebrada, revisar o script de inicialização e conferir no preview a presença dos dois controles e o comportamento do download.
   - Confirmar que os módulos `createServerFn` continuam como wrappers finos, sem mover runtime para o arquivo de função.

## Observação técnica
A extensão Chrome, sozinha, não tem permissão para executar comandos arbitrários do sistema operacional. A execução de `npm install` e `npm run dev` será feita pelo `iniciar.bat`; o popup pode abrir o endereço local, mas não substituir esse mecanismo sem um helper nativo adicional.