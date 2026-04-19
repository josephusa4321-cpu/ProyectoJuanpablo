@echo off
title Cargun360 - Publicador de Reportes
color 0b

echo ======================================================
echo    PUBLICADOR AUTOMATICO DE REPORTES - CARGUN360
echo ======================================================
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
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Fallo la generacion de reportes.
    pause
    exit /b
)

echo 3. Subiendo a GitHub para generar links...
git add .
git commit -m "Actualizacion de reportes %date% %time%"
git push
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] No se pudo subir a GitHub. Revisa tu conexion o credenciales.
    pause
    exit /b
)

echo.
echo ======================================================
echo    PROCESO COMPLETADO EXITOSAMENTE
echo ======================================================
echo.
echo Tus reportes ya estan en camino a la nube. 
echo En unos minutos estaran disponibles en:
echo https://josephusa4321-cpu.github.io/ProyectoJuanpablo/reportes_generados/Reporte_UUO-808_JosephRestrepo.html
echo.
pause
exit
