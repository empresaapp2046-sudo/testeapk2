# Plano: substituir o texto invisível selecionado

## Objetivo
Aplicar literalmente o valor solicitado ao elemento `span` selecionado, sem interpretar o conteúdo como uma instrução adicional.

## Verificação realizada
- A busca no código-fonte não encontrou o caractere invisível `U+2063` nem a sequência textual `\\u2063` em `src`.
- O elemento selecionado aparece como `span` no `body`, sem arquivo/componente associado, indicando que ele é um marcador gerado pelo preview/editor e não uma fonte de conteúdo rastreável no aplicativo.
- Não há alteração de dados, estado, rotas ou lógica que possa ser feita com segurança a partir dessa seleção.

## Implementação após aprovação
1. Reinspecionar o DOM do preview para localizar o nó efetivamente editável, caso exista.
2. Se houver uma fonte de texto identificável, alterar apenas essa fonte para o literal solicitado.
3. Se continuar sendo um marcador sem origem no projeto, não modificar arquivos do aplicativo e informar que não existe conteúdo persistido correspondente para editar.