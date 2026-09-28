# Plano: restaurar o download completo do projeto

## Objetivo
Corrigir o botão de download para que o ZIP contenha os arquivos do projeto (código-fonte, configuração, extensão e scripts), em vez de gerar um arquivo vazio ou incompleto.

## Alterações
1. Ajustar o gerador de ZIP para localizar o diretório real do projeto de forma confiável no ambiente de execução, evitando depender de um diretório de trabalho que pode não apontar para a raiz do projeto.
2. Incluir as pastas e arquivos necessários que já existem no projeto, mantendo fora do backup dependências instaladas, credenciais, metadados Git, caches e artefatos de build.
3. Garantir que o fluxo de resposta do servidor e os dois pontos de download da interface usem o mesmo conteúdo Base64 e produzam um ZIP válido com nome consistente.
4. Preservar arquivos de configuração essenciais, incluindo `package.json`, lockfile, configurações do Vite/TypeScript, `iniciar.bat`, `extension/`, `src/`, `public/` e `supabase/`, sem copiar `.env`.
5. Validar o resultado verificando o tamanho do arquivo e listando o conteúdo do ZIP; também verificar que o botão continua funcionando na interface.

## Segurança e compatibilidade
- Não incluir `.env`, chaves, `node_modules`, `.git` ou diretórios internos do ambiente.
- Manter a função de servidor como um wrapper fino, deixando a lógica de geração no módulo server-only.
- Não usar o arquivo de imagem enviado como asset: ele é apenas uma referência visual do ZIP vazio exibido pelo usuário.

## Critério de conclusão
Ao baixar o projeto, o arquivo deverá abrir como ZIP válido e conter múltiplos diretórios/arquivos do projeto, incluindo os arquivos de código que existiam antes do download.