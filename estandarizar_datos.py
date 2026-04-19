import pandas as pd
import re
import os

def clean_plate(text):
    if not isinstance(text, str): return "DESCONOCIDO"
    # Corrección de error de Excel (Auto-incremento al arrastrar celda)
    if "UUO-" in text: return "UUO-808"
    
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
    
    # 5. Preparar Dueños y Vehículos
    # Detectar todas las placas presentes en los datos
    all_plates = sorted([p for p in df['Placa'].unique() if p not in ['ADMIN', 'OTRO', 'DESCONOCIDO']])
    
    with pd.ExcelWriter(clean_file, engine='openpyxl') as writer:
        # Siempre crear Joseph Restrepo como dueño predeterminado si no hay datos
        duenos_df = pd.DataFrame([['Joseph Restrepo', 0.214]], columns=['Nombre completo', '% Comisión'])
        
        # Crear la lista de vehículos basada en las placas detectadas
        vehiculos_data = []
        for plate in all_plates:
            vehiculos_data.append([plate, 'Joseph Restrepo', 'Generico', 'Vehiculo', 2025])
        
        # Si no hay placas, al menos poner la UUO-808 como fallback
        if not vehiculos_data:
            vehiculos_data.append(['UUO-808', 'Joseph Restrepo', 'Nissan', 'March', 2020])
            
        vehiculos_df = pd.DataFrame(vehiculos_data, columns=['Placa', 'Dueño', 'Marca', 'Modelo', 'Año'])

        # Intentar mantener datos existentes si es posible, si no usar los generados
        try:
            # Aquí podríamos leer el archivo existente, pero para asegurar la coherencia 
            # con el Excel nuevo, usaremos los detectados
            duenos_df.to_excel(writer, sheet_name='Dueños', index=False)
            vehiculos_df.to_excel(writer, sheet_name='Vehículos', index=False)
            # Conductores vacíos o genéricos
            pd.DataFrame([['Conductor Generico', 'UUO-808']], columns=['Nombre', 'Placa']).to_excel(writer, sheet_name='Conductores', index=False)
        except Exception as e:
            print(f"Aviso: Error inicializando hojas maestras: {e}")

        # 6. Escribir los nuevos movimientos
        df[['Fecha', 'Placa', 'Conductor', 'Tipo', 'Categoría', 'Descripción', 'Total']].to_excel(writer, sheet_name='Movimientos', index=False)

    print(f"¡Éxito! Datos migrados a '{clean_file}'.")
    print(f"Placas detectadas: {', '.join(all_plates)}")

if __name__ == "__main__":
    estandarizar()
