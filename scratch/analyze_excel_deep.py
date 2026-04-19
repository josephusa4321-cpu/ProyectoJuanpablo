import pandas as pd
import os

def analyze_excel_deep(file_path):
    if not os.path.exists(file_path):
        print(f"Error: {file_path} not found.")
        return
    
    try:
        xl = pd.ExcelFile(file_path)
        print(f"Hojas encontradas: {xl.sheet_names}")
        
        for sheet in xl.sheet_names:
            print(f"\n--- Analizando hoja: {sheet} ---")
            df = xl.parse(sheet, header=None)
            print("Primeras 20 filas (Vista preliminar):")
            print(df.head(20).to_string())
            
            # Buscar una fila que parezca un encabezado (muchas columnas con texto)
            for i, row in df.head(50).iterrows():
                # Si la fila tiene más de 3 valores no nulos, podría ser el inicio de una tabla
                if row.count() > 3:
                     print(f"\nPosible encabezado en fila {i}:")
                     print(row.values)
                     # break # No paramos para ver si hay más tablas
    except Exception as e:
        print(f"Error al leer el archivo: {e}")

if __name__ == "__main__":
    analyze_excel_deep("Estado_de_Cuenta_Flota.xlsx")
