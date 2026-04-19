@echo off
title Generador de Reportes de Flota - Cargun360
color 0b
echo ======================================================
echo    GENERADOR DE REPORTES DE FLOTA - CARGUN360
echo ======================================================
echo.
echo 1. Asegúrese de que el archivo 'Estado_de_Cuenta_Flota.xlsx' esté Cerrado.
echo 2. Espere a que el proceso termine.
echo.
echo Procesando... por favor espere...
echo.

echo 1. Estandarizando datos desde el Excel original...
py estandarizar_datos.py
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Fallo la estandarizacion. Revisa que el Excel no este abierto.
    pause
    exit /b
)

echo 2. Generando reportes HTML premium...
py generar_reportes.py

echo.
echo ======================================================
echo    PROCESO COMPLETADO
echo ======================================================
echo.
echo Los reportes se encuentran en la carpeta: 'reportes_generados'
echo.
pause
start ./reportes_generados
exit
