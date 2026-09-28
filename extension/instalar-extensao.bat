@echo off
setlocal
set /p EXTENSION_ID=Digite o ID da extensao carregada no Chrome: 
if "%EXTENSION_ID%"=="" exit /b 1
set "HOST_DIR=%~dp0native-host"
set "HOST_JSON=%HOST_DIR%\com.smartpdvpro.launcher.json"
set "HOST_CMD=%HOST_DIR%\host.cmd"
powershell -NoProfile -ExecutionPolicy Bypass -Command "$j = Get-Content -Raw -Encoding UTF8 '%HOST_JSON%' | ConvertFrom-Json; $j.allowed_origins = @('chrome-extension://%EXTENSION_ID%/'); $j.path = [IO.Path]::GetFullPath('%HOST_CMD%'); $j | ConvertTo-Json | Set-Content -Encoding UTF8 '%HOST_JSON%'; New-Item -Force -Path 'HKCU:\Software\Google\Chrome\NativeMessagingHosts\com.smartpdvpro.launcher' | Out-Null; Set-ItemProperty -Path 'HKCU:\Software\Google\Chrome\NativeMessagingHosts\com.smartpdvpro.launcher' -Name '(Default)' -Value ([IO.Path]::GetFullPath('%HOST_JSON%'))"
if errorlevel 1 (echo Falha ao registrar o host.&pause&exit /b 1)
echo Host registrado.
echo O botao Abrir Pasta do Projeto abrira a pasta pai de extension.
echo Recarregue a extensao no Chrome e tente novamente.
pause