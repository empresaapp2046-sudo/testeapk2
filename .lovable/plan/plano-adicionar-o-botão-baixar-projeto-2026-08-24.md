# Plano: adicionar o botão “Baixar projeto”

## Objetivo
Disponibilizar no rodapé da Landing Page um botão visível para baixar o projeto, utilizando a função de geração de arquivo ZIP que já existe no aplicativo.

## Implementação
1. Importar na Landing Page a ação `downloadProjectAction` e os recursos visuais necessários para o botão.
2. Criar um handler de download que:
   - chama a função existente de geração do arquivo;
   - converte o conteúdo retornado em um Blob ZIP no navegador;
   - dispara o download com o nome de arquivo fornecido pelo backend;
   - apresenta estado de carregamento e impede cliques duplicados durante a geração;
   - trata falhas com a notificação já adotada pelo projeto, se disponível.
3. Adicionar o botão “Baixar projeto” ao footer, próximo aos links existentes, mantendo o layout responsivo e a hierarquia visual atual.
4. Verificar no preview que o botão aparece no rodapé e que a ação inicia o download sem erro de renderização.

## Escopo técnico
- Reutilizar `src/lib/download.functions.ts` e `src/lib/download.server.ts`; não duplicar a lógica de compactação.
- Alterar somente a Landing Page e, se necessário, o mecanismo de notificação já existente.
- Não alterar autenticação, banco de dados, rotas ou a extensão do navegador nesta etapa.