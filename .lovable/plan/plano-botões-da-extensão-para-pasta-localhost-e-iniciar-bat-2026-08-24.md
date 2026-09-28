# Plano: botões da extensão para pasta, localhost e iniciar.bat

## Objetivo
Configurar a extensão para oferecer ações independentes: abrir a pasta raiz onde o projeto está instalado, abrir `http://localhost:8080` e executar o arquivo `iniciar.bat`.

## Implementação
1. Atualizar `extension/popup.html` com três botões claramente separados: **Abrir Localhost**, **Iniciar.bat** e **Abrir Pasta do Projeto**.
2. Ajustar `extension/popup.js` para:
   - abrir o localhost diretamente no botão correspondente;
   - enviar a ação `start` ao host nativo pelo botão **Iniciar.bat**;
   - manter o botão de pasta apontando para a raiz do projeto e apresentar feedback de sucesso/erro.
3. Preservar `extension/native-host/host.js` como ponte segura para localizar a raiz pela presença de `package.json`, abrir essa pasta no Explorer e executar `iniciar.bat` via CMD independente.
4. Revisar o fluxo de instalação/configuração do host apenas se necessário para manter os caminhos absolutos e o funcionamento dos três botões.

## Validação
- Validar a sintaxe JavaScript e JSON.
- Confirmar que `SERVER_URL` é exatamente `http://localhost:8080`.
- Confirmar que o botão **Iniciar.bat** envia `action: 'start'` e que o botão da pasta envia `action: 'open-project-folder'`.
- Não alterar o texto invisível idêntico `U+2063`.

## Detalhes técnicos
- Alterar somente arquivos da extensão.
- Não mudar o backend nem o restante da aplicação.
- Preservar a espera de 5 segundos para o fluxo de inicialização quando o botão **Iniciar.bat** for usado.