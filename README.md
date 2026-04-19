# Automatización de Reportes de Flota 🚗

Este proyecto permite generar reportes individuales en formato HTML para cada dueño de vehículo a partir de un archivo Excel maestro.

## Requisitos

- Python 3.10+
- Librerías: `pandas`, `openpyxl`

## Instalación

Instala las dependencias necesarias ejecutando:

```bash
pip install -r requirements.txt
```

## Uso

1. Asegúrate de que el archivo `Estado_de_Cuenta_Flota.xlsx` esté actualizado con los últimos movimientos y que los vehículos estén correctamente asignados a sus dueños en la hoja `Vehículos`.
2. Ejecuta el script de automatización:

```bash
python generar_reportes.py
```

3. Los reportes se generarán en la carpeta `reportes_generados/`. Cada archivo tendrá el formato `Reporte_Semanal_[PLACA]_[DUEÑO].html`.

## Estructura del Excel

- **Dueños**: Lista de propietarios con sus datos de contacto.
- **Vehículos**: Relación de placas con sus respectivos dueños.
- **Movimientos**: Registro central de todos los ingresos y gastos de toda la flota. El script filtrará automáticamente por placa para cada reporte.
- **KPIs / Resumen Flota**: Herramientas integradas en el Excel para el análisis rápido de Juan Pablo.

---
*Desarrollado para la optimización de gestión de flota Cargun360.*
