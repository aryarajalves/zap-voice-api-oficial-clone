@echo off
:: Verifica se esta rodando como Administrador
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo.
    echo ================================================================
    echo ERRO: VOCE PRECISA EXECUTAR ESTE ARQUIVO COMO ADMINISTRADOR!
    echo Clique com o botao direito no arquivo e escolha "Executar como Administrador".
    echo ================================================================
    echo.
    pause
    exit /b
)

echo Fechando o subsistema WSL (Docker)...
wsl --shutdown

echo.
echo Criando script temporario de compactacao...
set "VHDX_PATH=C:\Users\aryar\AppData\Local\Docker\wsl\disk\docker_data.vhdx"
set "SCRIPT_PATH=%temp%\compact_docker_diskpart.txt"

echo select vdisk file="%VHDX_PATH%" > "%SCRIPT_PATH%"
echo attach vdisk readonly >> "%SCRIPT_PATH%"
echo compact vdisk >> "%SCRIPT_PATH%"
echo detach vdisk >> "%SCRIPT_PATH%"

echo.
echo Iniciando a compactacao do disco do Docker (isso pode levar alguns minutos)...
echo Por favor, aguarde...
diskpart /s "%SCRIPT_PATH%"

echo.
echo Limpando arquivos temporarios...
del "%SCRIPT_PATH%"

echo.
echo ================================================================
echo COMPACTACAO CONCLUIDA COM SUCESSO!
echo O espaco livre no seu SSD ja deve aparecer no Windows Explorer.
echo ================================================================
echo.
pause
