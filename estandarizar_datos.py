import pandas as pd
import re
import os

def clean_plate(text):
    if not isinstance(text, str): return "DESCONOCIDO"
    match = re.search(r'([A-Z]{3}-\d{3})', text)
    if match: return match.group(1)
    if "Administración" in text or "ADMIN" in text.upper(): return "ADMIN"
    return "OTRO"

def estandarizar():
    print("Iniciando estandarización de datos...")
    input_file = "Estado de cuenta JR (1).xlsx"
    clean_file = "Estado_de_Cuenta_Flota.xlsx"
    
    if not os.path.exists(input_file):
        print(f"Error: No se encuentra {input_file}")
        return

    # 1. Cargar el Excel sucio
    # La fila 1 (0-indexed) tiene los encabezados reales
    df = pd.read_excel(input_file, sheet_name='EC JR', skiprows=1)
    
    # 2. Renombrar columnas para consistencia si es necesario
    # Headers detectados: ['Fecha', 'Origen del movimiento', 'Conductor', 'Ingreso/Gasto', 'Categoria', 'Descripción', 'Total']
    # Normalizar nombres
    mapping = {
        'Fecha': 'Fecha',
        'Origen del movimiento': 'Origen',
        'Conductor': 'Conductor',
        'Ingreso/Gasto': 'Tipo',
        'Categoria': 'Categoría',
        'Descripcián': 'Descripción',
        'Descripcin': 'Descripción', # Fallback para encoding
        'Total': 'Total'
    }
    df = df.rename(columns=mapping)
    
    # Quedarnos solo con las columnas que nos sirven
    cols_to_keep = ['Fecha', 'Origen', 'Conductor', 'Tipo', 'Categoría', 'Descripción', 'Total']
    df = df[cols_to_keep].dropna(subset=['Total'])
    
    # 3. Extraer Placa
    df['Placa'] = df['Origen'].apply(clean_plate)
    
    # 4. Asegurar tipos de datos
    df['Fecha'] = pd.to_datetime(df['Fecha'], errors='coerce')
    df['Total'] = pd.to_numeric(df['Total'], errors='coerce').fillna(0)
    
    print(f"Total movimientos procesados: {len(df)}")
    
    # 5. Cargar Dueños y Vehículos del archivo estándar (para no perderlos)
    with pd.ExcelWriter(clean_file, engine='openpyxl') as writer:
        # Intentar leer los dueños/vehículos existentes del archivo de flota
        try:
            xl_clean = pd.ExcelFile(clean_file)
            if 'Dueños' in xl_clean.sheet_names:
                xl_clean.parse('Dueños').to_writer(writer, sheet_name='Dueños', index=False)
            if 'Vehículos' in xl_clean.sheet_names:
                xl_clean.parse('Vehículos').to_writer(writer, sheet_name='Vehículos', index=False)
            if 'Conductores' in xl_clean.sheet_names:
                xl_clean.parse('Conductores').to_writer(writer, sheet_name='Conductores', index=False)
        except:
            # Si falla, crear unos básicos (esto no debería pasar por el backup)
            pd.DataFrame([['Joseph Restrepo', 0.214]], columns=['Nombre completo', '% Comisión']).to_excel(writer, sheet_name='Dueños', index=False)
            pd.DataFrame([['UUO-808', 'Joseph Restrepo', 'Nissan', 'March', 2020]], columns=['Placa', 'Dueño', 'Marca', 'Modelo', 'Año']).to_excel(writer, sheet_name='Vehículos', index=False)

        # 6. Escribir los nuevos movimientos
        df[['Fecha', 'Placa', 'Conductor', 'Tipo', 'Categoría', 'Descripción', 'Total']].to_excel(writer, sheet_name='Movimientos', index=False)

    print(f"¡Éxito! Datos migrados a '{clean_file}'.")

if __name__ == "__main__":
    estandarizar()
