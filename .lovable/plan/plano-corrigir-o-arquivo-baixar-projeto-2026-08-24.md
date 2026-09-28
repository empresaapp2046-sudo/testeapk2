# Plano: corrigir o arquivo “Baixar projeto”

## Objetivo
Fazer o botão **Baixar projeto** entregar um ZIP com o código-fonte editável do Smart PDV PRO, e não os artefatos compilados do servidor (`_chunks`, `_ssr`, `_libs`, arquivos `.mjs` e manifesto gerado), mantendo o download utilizável localmente.

## Alterações previstas
- Ajustar a geração do arquivo no servidor para montar o pacote a partir dos arquivos-fonte e de configuração do projeto.
- Excluir explicitamente artefatos de build, cache, dependências, metadados internos e demais arquivos que não devem ser distribuídos.
- Preservar no ZIP os diretórios e arquivos necessários para editar e executar o projeto, incluindo `src`, `public`, `extension`, scripts de inicialização, `package.json`, lockfile e configurações de build.
- Evitar incluir `.env` e qualquer segredo ou configuração privada; se necessário, incluir apenas um arquivo de exemplo sem valores secretos.
- Manter o botão existente, o estado de carregamento, o nome do arquivo e o tratamento de erro.
- Validar o conteúdo do ZIP gerado para confirmar que ele contém código-fonte e não os arquivos compilados mostrados na imagem.

## Texto selecionado
A substituição indicada para o `span` é o mesmo caractere invisível `U+2063` já presente. Não haverá alteração redundante nem será inserido texto visível nesse elemento.

## Detalhes técnicos
- Manter `download.functions.ts` como um wrapper fino de `createServerFn`, deixando a lógica de empacotamento no módulo server-side.
- Implementar a seleção de arquivos com regras de inclusão/exclusão seguras e compatíveis com o ambiente atual.
- Não modificar rotas, autenticação, banco de dados ou a extensão além do necessário para o conteúdo do pacote baixado.
