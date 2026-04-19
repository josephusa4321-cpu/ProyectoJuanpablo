import pandas as pd
import os
import sys

# Forzar encoding utf-8 para la salida
if sys.platform == "win32":
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

def analyze_excel_specific(file_path):
    try:
        xl = pd.ExcelFile(file_path)
        print(f"Hojas: {xl.sheet_names}")
        
        for sheet in ['Vehículos', 'Movimientos']:
            if sheet in xl.sheet_names:
                print(f"\n--- {sheet} ---")
                df = xl.parse(sheet)
                print(f"Dimensiones: {df.shape}")
                print(f"Columnas: {df.columns.tolist()}")
                print("Primeras 5 filas:")
                print(df.head(5).to_string())
            else:
                print(f"Hoja {sheet} no encontrada.")
                
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    analyze_excel_specific("Estado_de_Cuenta_Flota.xlsx")
