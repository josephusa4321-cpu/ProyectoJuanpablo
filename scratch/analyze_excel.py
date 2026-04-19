import pandas as pd
import os

def analyze_excel(file_path):
    if not os.path.exists(file_path):
        print(f"Error: {file_path} not found.")
        return
    
    try:
        df = pd.read_excel(file_path)
        print("--- Columnas detectadas ---")
        print(df.columns.tolist())
        print("\n--- Primeras filas ---")
        print(df.head())
        print("\n--- Dueños únicos ---")
        owner_col = [col for col in df.columns if 'Dueño' in col or 'Propietario' in col or 'Nombre' in col]
        if owner_col:
            print(df[owner_col[0]].unique().tolist())
        else:
            print("No se encontró una columna obvia de 'Dueño'.")
    except Exception as e:
        print(f"Error al leer el archivo: {e}")

if __name__ == "__main__":
    analyze_excel("Estado_de_Cuenta_Flota.xlsx")
