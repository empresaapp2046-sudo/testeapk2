# Plano: substituir o texto do span selecionado

## Objetivo
Confirmar a origem do conteúdo exibido no `<span>` selecionado e aplicar a substituição literal solicitada somente se houver diferença real.

## Abordagem
1. Usar a localização fornecida pelo preview e a busca no código para identificar o componente ou fonte de dados responsável pelo texto.
2. Comparar o valor atual com o valor solicitado, preservando a estrutura dinâmica caso o conteúdo venha de estado, props, configuração ou dados externos.
3. Como os dois valores informados são visualmente o mesmo caractere invisível (`⁣`) e a busca no código não encontrou esse literal, não alterar arquivos do aplicativo para evitar uma modificação incorreta.
4. Se uma origem editável for identificada posteriormente, atualizar apenas essa fonte e verificar o resultado no preview.

## Escopo técnico
- Nenhuma alteração de UI, lógica, banco de dados ou rotas.
- Não será criada uma cópia visível ou substituto textual para um caractere que já corresponde ao pedido.
- A validação consiste na confirmação da igualdade dos valores e na ausência de uma ocorrência correspondente no código-fonte.