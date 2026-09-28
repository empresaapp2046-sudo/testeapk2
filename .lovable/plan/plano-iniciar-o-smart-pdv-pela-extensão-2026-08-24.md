# Plano: iniciar o Smart PDV pela extensão

## Objetivo
Fazer o botão da extensão iniciar corretamente o `iniciar.bat` localizado na pasta pai de `extension`, por exemplo:

```text
C:\Users\couti\Downloads\SMART PDV PRO OFFLINE\extension
C:\Users\couti\Downloads\SMART PDV PRO OFFLINE\iniciar.bat
```

## Abordagem
Como uma extensão Chrome não pode executar arquivos `.bat` diretamente, usar Native Messaging no Windows:

1. Criar um pequeno host local para Native Messaging dentro de `extension/native-host`.
2. O host descobrirá sua própria pasta instalada e calculará o caminho `..\iniciar.bat` sem depender do nome de usuário ou de um caminho fixo.
3. O host validará que o arquivo está exatamente na pasta pai esperada e executará o batch por meio do `cmd.exe` com a pasta do projeto como diretório de trabalho.
4. Atualizar o manifesto da extensão para declarar a permissão `nativeMessaging` e o nome do host.
5. Atualizar `popup.js` para tentar `chrome.runtime.connectNative(...)` ao clicar em “Abrir Sistema”, aguardar a resposta e abrir `http://localhost:8080` somente após o disparo bem-sucedido.
6. Ajustar `iniciar.bat`/um instalador auxiliar para registrar o manifesto Native Messaging no Registro do Windows para o ID da extensão, preservando o fluxo atual de instalação e inicialização.
7. Mostrar no popup uma mensagem objetiva quando o host ainda não foi instalado, com instrução para executar o instalador incluído na pasta do projeto; não fingir que o `.bat` foi executado.

## Arquivos a revisar/alterar
- `extension/manifest.json`: permissão e configuração do host.
- `extension/popup.js`: chamada Native Messaging, estados de sucesso/erro e abertura da aba.
- `extension/popup.html`: texto de status para instalação ausente/erro de execução.
- `extension/native-host/*`: host e manifesto Windows.
- `iniciar.bat` e/ou instalador da extensão: registro do host e fluxo local.

## Validação
- Validar JSON do manifesto da extensão e do host.
- Confirmar que o código usa caminho relativo à pasta pai, sem caminho absoluto específico do computador.
- Confirmar que a extensão não abre o sistema como se tivesse iniciado quando o host falha.
- Testar o fallback de servidor já ativo e documentar a limitação: o registro Native Messaging precisa ser feito uma vez no Windows; o Chrome não permite que a extensão faça isso sozinha.
