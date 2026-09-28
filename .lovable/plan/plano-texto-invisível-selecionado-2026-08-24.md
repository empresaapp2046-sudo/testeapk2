# Plano: texto invisível selecionado

## Objetivo
Aplicar somente a substituição visual solicitada no elemento selecionado, escrevendo o valor de substituição como texto literal quando houver uma diferença real.

## Verificação
- Procurar o caractere `U+2063` no código-fonte e nos assets textuais da aplicação.
- Confirmar a origem do elemento selecionado (`span` apontando para `body`) e comparar o texto atual com o substituto informado.

## Implementação
- Se a origem for encontrada e os valores forem diferentes, editar a fonte de dados/conteúdo correspondente, preservando a estrutura dinâmica.
- Se forem idênticos ou se o elemento não tiver uma origem editável no código, não realizar alteração redundante.
- Não alterar a extensão, scripts de inicialização, backend ou arquivos anexados, pois não fazem parte desta solicitação visual.

## Validação
- Reexaminar a ocorrência e confirmar que nenhuma mudança fora do escopo foi feita.
