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
