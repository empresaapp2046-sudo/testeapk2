# Plano: corrigir abertura da pasta pai do projeto

## Objetivo
Fazer o botão **Abrir Pasta do Projeto** abrir exatamente a pasta pai de `extension`, por exemplo, transformar `C:\Users\couti\Downloads\SMART PDV PRO OFFLINE\extension` em `C:\Users\couti\Downloads\SMART PDV PRO OFFLINE\`.

## Escopo
- Corrigir a resolução do caminho no host Native Messaging para partir da localização real de `host.js` e subir dois níveis até a raiz do projeto.
- Garantir que o host valide a existência da pasta e de um marcador da raiz antes de chamar `explorer.exe`.
- Ajustar o `host.cmd` para iniciar o script usando o diretório do próprio host, independentemente do diretório de trabalho do Chrome.
- Melhorar o instalador para registrar caminhos absolutos corretamente e orientar o recarregamento da extensão.
- Manter o botão **Abrir Localhost** e o restante da interface sem mudanças desnecessárias.

## Observação sobre a edição visual selecionada
O elemento selecionado aponta para `body`, e o texto atual e o substituto são o mesmo caractere invisível (`U+2063`); não existe alteração textual real a aplicar.

## Validação
- Conferir sintaxe e referências dos arquivos da extensão.
- Validar que a expressão de caminho resulta na raiz do projeto para `extension/native-host/host.js`.
- Não executar comandos Windows no ambiente Linux e não incorporar a imagem de referência.