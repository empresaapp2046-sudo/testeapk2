# Corrigir falha de inicialização local

## Objetivo
Ajustar o `iniciar.bat` para que o fluxo local não reinstale dependências desnecessariamente e trate corretamente falhas de espaço em disco, mantendo o aviso de peer dependency como não bloqueante.

## Implementação
- Atualizar o script de inicialização para:
  - validar se `node` e `npm` estão disponíveis;
  - reutilizar `node_modules` quando já estiver completo, evitando um novo download a cada abertura;
  - quando a instalação for necessária, usar opções que reduzam arquivos temporários e logs (`--no-audit --no-fund`), mantendo a resolução normal das dependências;
  - detectar explicitamente o erro `ENOSPC` e exibir uma mensagem clara indicando que é necessário liberar espaço no disco/cache do Windows antes de tentar novamente;
  - somente iniciar o servidor e abrir o navegador após uma instalação bem-sucedida ou após confirmar dependências existentes.
- Ajustar a versão mínima do `zod` no `package.json` para compatibilidade com `@hookform/resolvers` e reduzir o aviso `ERESOLVE`, preservando a faixa compatível do projeto.
- Não alterar a extensão, backend, telas da aplicação ou o conteúdo invisível selecionado, pois a substituição informada é o mesmo caractere (`U+2063`) e não produz mudança visual.

## Validação
- Verificar a sintaxe do arquivo batch e a consistência do `package.json`.
- Confirmar que o script não executa `npm install` quando as dependências locais já estão presentes.
- Confirmar que falhas de instalação interrompem o fluxo sem abrir o navegador e apresentam instruções em português.
