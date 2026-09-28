@echo off
setlocal EnableExtensions
cd /d "%~dp0"

echo ==========================================
echo    INICIANDO SMART PDV PRO - LOCAL
echo ==========================================
echo.

where node >nul 2>&1
if errorlevel 1 (
  echo Node.js nao foi encontrado. Instale o Node.js e tente novamente.
  pause
  exit /b 1
)
where npm >nul 2>&1
if errorlevel 1 (
  echo npm nao foi encontrado. Instale o Node.js e tente novamente.
  pause
  exit /b 1
)

echo Executando: npm install --no-audit --no-fund...
call npm install --no-audit --no-fund
if errorlevel 1 goto :install_error
echo Dependencias instaladas.
echo.
echo Iniciando o servidor de desenvolvimento em uma janela persistente minimizada...
start "Smart PDV PRO - Servidor" /min "%ComSpec%" /d /k "cd /d ""%~dp0"" && echo Executando: npm run dev && npm run dev"
echo Servidor iniciado. A extensao aguardara 5 segundos antes de abrir o localhost.
exit /b 0

:install_error
echo.
echo Falha ao instalar as dependencias.
echo Se aparecer ENOSPC, libere espaco no disco e limpe o cache do npm com: npm cache clean --force
echo Depois execute este arquivo novamente.
pause
exit /b 1
