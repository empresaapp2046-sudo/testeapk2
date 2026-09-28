# Criar ícones da extensão

## Objetivo
- Adicionar os arquivos de ícone ausentes à pasta `extension/` para que a extensão possa ser instalada sem erro e tenha identidade visual no navegador.

## Implementação
- Criar um conjunto de ícones PNG em tamanhos compatíveis com extensões Chromium: 16x16, 32x32, 48x48 e 128x128.
- Atualizar `extension/manifest.json` para declarar os ícones da extensão no nível geral e no `action`, mantendo o popup e as permissões existentes.
- Usar uma marca visual simples e legível em tamanhos pequenos, alinhada ao Smart PDV PRO.
- Não alterar o texto invisível selecionado, pois o valor de origem e o substituto são idênticos.

## Validação
- Confirmar que todos os arquivos declarados no manifesto existem e têm os tamanhos esperados.
- Validar o JSON do manifesto e verificar que não há referências quebradas.
