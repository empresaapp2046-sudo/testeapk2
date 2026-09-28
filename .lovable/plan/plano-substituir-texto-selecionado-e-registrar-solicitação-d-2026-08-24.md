# Plano: substituir texto selecionado e registrar solicitação da extensão

## Escopo imediato
Aplicar somente a substituição visual solicitada no elemento selecionado. O texto atual e o substituto informados são o mesmo caractere invisível (`U+2063`), e a busca não encontrou essa ocorrência em conteúdo editável da aplicação.

## Resultado da substituição
- Não alterar arquivos da aplicação para evitar uma mudança redundante ou incorreta.
- Não escrever o conteúdo do pedido anexado no `span`; o documento é uma solicitação funcional separada, não texto visual para exibição.

## Solicitação funcional identificada para eventual implementação
O arquivo `VOIDPRO-15.md` pede uma alteração posterior na extensão:
- Ao clicar em “Abrir Sistema”, executar automaticamente `iniciar.bat` na pasta raiz do projeto, sem o usuário abrir o arquivo manualmente.
- Adicionar na extensão um botão para abrir a pasta raiz do projeto.
- Revisar o fluxo de instalação/registro do Native Messaging para que o botão não solicite novamente o conteúdo do script.

Essa funcionalidade não será implementada neste turno, pois a instrução ativa solicita exclusivamente a edição literal do elemento selecionado.

## Validação
- Confirmar que não há ocorrência editável de `U+2063` fora dos arquivos de plano.
- Confirmar que nenhum arquivo da extensão, inicialização ou backend foi modificado.
