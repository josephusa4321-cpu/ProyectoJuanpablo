import pandas as pd
import json
import os
import sys
import re
from datetime import datetime

# Configuración
EXCEL_FILE = "Estado_de_Cuenta_Flota.xlsx"
TEMPLATE_FILE = "dashboard_template.html"
OUTPUT_DIR = "reportes_generados"

def log_error(msg):
    print(f"ERROR: {msg}")
    with open("error_log.txt", "a", encoding="utf-8") as f:
        f.write(f"[{datetime.now().isoformat()}] {msg}\n")

def check_dependencies():
    try:
        import pandas
        import openpyxl
    except ImportError:
        print("Faltan librerías. Instalando pandas y openpyxl...")
        os.system(f"{sys.executable} -m pip install pandas openpyxl")

def generar_reportes():
    check_dependencies()
    
    if not os.path.exists(OUTPUT_DIR):
        os.makedirs(OUTPUT_DIR)

    if not os.path.exists(EXCEL_FILE):
        log_error(f"No se encontró el archivo '{EXCEL_FILE}'. Por favor asegúrate de que el nombre sea exacto.")
        return

    try:
        print(f"Cargando datos desde {EXCEL_FILE}...")
        xl = pd.ExcelFile(EXCEL_FILE)
        
        # Cargar hojas
        df_owners = xl.parse('Dueños')
        df_vehicles = xl.parse('Vehículos')
        df_moves = xl.parse('Movimientos')
        
        # Limpieza inicial
        df_moves['Fecha'] = pd.to_datetime(df_moves['Fecha'], errors='coerce')
        df_moves['Total'] = pd.to_numeric(df_moves['Total'], errors='coerce').fillna(0)
        df_moves = df_moves.dropna(subset=['Fecha', 'Placa'])
        
        # Leer plantilla
        if not os.path.exists(TEMPLATE_FILE):
            log_error(f"No se encontró la plantilla '{TEMPLATE_FILE}'. Asegúrate de que 'dashboard_template.html' esté en la misma carpeta.")
            return
            
        with open(TEMPLATE_FILE, 'r', encoding='utf-8') as f:
            template_content = f.read()

        report_count = 0
        now_str = datetime.now().strftime('%Y-%m-%dT%H:%M:%S-05:00')

        # Procesar por Dueño
        for _, owner in df_owners.iterrows():
            owner_name = str(owner.get('Nombre completo', 'Sin Nombre'))
            if "pendiente" in owner_name.lower() or not owner_name.strip():
                continue
                
            commission_pct = float(owner.get('% Comisión', 0.214))
            whatsapp = str(owner.get('Celular', '300 000 0000'))
            
            # Encontrar vehículos del dueño
            my_vehicles_data = df_vehicles[df_vehicles['Dueño'] == owner_name]
            
            for _, v_info in my_vehicles_data.iterrows():
                plate = str(v_info['Placa'])
                v_moves = df_moves[df_moves['Placa'] == plate].sort_values('Fecha', ascending=True)
                
                if v_moves.empty:
                    print(f"    - {plate}: Sin movimientos este periodo.")
                    continue

                # Calculos de periodo
                start_date = v_moves['Fecha'].min()
                end_date = v_moves['Fecha'].max()
                delta_days = (end_date - start_date).days + 1
                
                # Totales
                gross_income = float(v_moves[v_moves['Categoría'] == 'Liquidación']['Total'].sum())
                
                # Gastos: Gasto administrativo es la comisión
                admin_commission = abs(float(v_moves[v_moves['Categoría'] == 'Gasto administrativo']['Total'].sum()))
                
                # El resto de gastos son operativos
                operating_expense_df = v_moves[(v_moves['Tipo'] == 'Gasto') & (v_moves['Categoría'] != 'Gasto administrativo')]
                gross_expenses = abs(float(operating_expense_df['Total'].sum()))
                
                net_result = gross_income - admin_commission - gross_expenses
                margin_pct = (net_result / gross_income * 100) if gross_income != 0 else 0
                
                # Anomalías (> 500.000)
                anomalies = v_moves[(v_moves['Tipo'] == 'Gasto') & (v_moves['Total'].abs() > 500000)].to_dict('records')
                # Formatear anomalías para el JSON
                formatted_anomalies = []
                for a in anomalies:
                    formatted_anomalies.append({
                        "date": a['Fecha'].strftime('%Y-%m-%d'),
                        "category": str(a['Categoría']),
                        "driver": str(a.get('Conductor', 'N/A')),
                        "description": str(a['Descripción']),
                        "amount": abs(float(a['Total'])),
                        "anomaly": True
                    })

                # Distribución de Gastos (Todos los gastos incluyendo admin para el donut)
                expense_df = v_moves[v_moves['Tipo'] == 'Gasto']
                cat_totals = expense_df.groupby('Categoría')['Total'].sum().abs()
                total_cat_sum = cat_totals.sum()
                expense_distribution = []
                
                cat_map = {
                    'Mano de obra': 'labor',
                    'Repuestos': 'parts',
                    'Repuesto': 'parts',
                    'Gasto administrativo': 'admin',
                    'Accesorios': 'accessories',
                    'Accesorio': 'accessories',
                    'Mantenimiento': 'maintenance',
                    'Técnico mecánica': 'inspection',
                    'Revisión técnica': 'inspection'
                }
                
                for cat, amt in cat_totals.items():
                    expense_distribution.append({
                        "key": cat_map.get(cat, 'other'),
                        "label": str(cat),
                        "pct": round((amt / total_cat_sum * 100), 1) if total_cat_sum != 0 else 0,
                        "amount": float(amt)
                    })

                # Datos semanales
                v_moves['Semana'] = v_moves['Fecha'].dt.isocalendar().week
                weekly_groups = v_moves.groupby('Semana')
                weekly_data = []
                for week, group in weekly_groups:
                    weekly_data.append({
                        "w": f"Sem {week}",
                        "income": float(group[group['Categoría'] == 'Liquidación']['Total'].sum()),
                        "expenses": abs(float(group[group['Tipo'] == 'Gasto']['Total'].sum()))
                    })

                # Top 10 Gastos
                top_10 = expense_df.sort_values('Total', ascending=True).head(10) # Mayor gasto es mas negativo
                top_expenses = []
                for _, r in top_10.iterrows():
                    top_expenses.append({
                        "date": r['Fecha'].strftime('%Y-%m-%d'),
                        "category": str(r['Categoría']),
                        "driver": str(r.get('Conductor', 'N/A')),
                        "description": str(r['Descripción']),
                        "amount": abs(float(r['Total'])),
                        "anomaly": abs(float(r['Total'])) > 500000
                    })

                # Movimientos completos
                movements_json = []
                for _, r in v_moves.sort_values('Fecha', ascending=False).iterrows():
                    movements_json.append({
                        "date": r['Fecha'].strftime('%Y-%m-%d'),
                        "type": "in" if r['Tipo'] == 'Ingreso' else "out",
                        "category": str(r['Categoría']),
                        "driver": str(r.get('Conductor', 'N/A')),
                        "description": str(r['Descripción']),
                        "amount": abs(float(r['Total'])),
                        "anomaly": (r['Tipo'] == 'Gasto' and abs(float(r['Total'])) > 500000)
                    })

                # Ops Metrics
                rentals_count = len(v_moves[v_moves['Tipo'] == 'Ingreso'])
                unique_drivers = v_moves['Conductor'].nunique() if 'Conductor' in v_moves.columns else 1
                
                dashboard_data = {
                    "owner": owner_name,
                    "vehicle": {
                        "make": str(v_info.get('Marca', 'Vehículo')),
                        "model": str(v_info.get('Modelo', '')),
                        "plate": plate,
                        "year": int(v_info.get('Año', 2020)) if pd.notna(v_info.get('Año')) else 2020
                    },
                    "period": {
                        "start": start_date.strftime('%Y-%m-%d'),
                        "end": end_date.strftime('%Y-%m-%d'),
                        "days": delta_days
                    },
                    "updated": now_str,
                    "admin": {
                        "name": "Juan Pablo Bayona",
                        "company": "Cargun360",
                        "commission_pct": commission_pct * 100,
                        "whatsapp": "+57 300 000 0000" # Dinámico si se requiere
                    },
                    "totals": {
                        "gross_income": gross_income,
                        "admin_commission": admin_commission,
                        "operating_expenses": gross_expenses,
                        "net_result": net_result,
                        "margin_pct": round(margin_pct, 1),
                        "rentals": rentals_count,
                        "drivers": unique_drivers,
                        "anomalies": len(formatted_anomalies)
                    },
                    "expense_distribution": expense_distribution,
                    "weekly": weekly_data,
                    "ops": {
                        "days": delta_days,
                        "rentals": rentals_count,
                        "utility_per_day": round(net_result / delta_days, 0) if delta_days > 0 else 0,
                        "drivers": unique_drivers,
                        "anomaly_count": len(formatted_anomalies),
                        "occupancy_pct": round((rentals_count / (delta_days/7)) * 100, 1) if delta_days > 0 else 0, # Estimación
                        "avg_rental_value": round(gross_income / rentals_count, 0) if rentals_count > 0 else 0
                    },
                    "top_expenses": top_expenses,
                    "movements": movements_json
                }

                # Inyectar en plantilla
                html_report = template_content.replace('{{ report_data_json }}', json.dumps(dashboard_data, ensure_ascii=False, indent=2))
                
                # Guardar archivo
                clean_owner = re.sub(r'\W+', '', owner_name)
                filename = f"Reporte_{plate}_{clean_owner}.html"
                filepath = os.path.join(OUTPUT_DIR, filename)
                
                with open(filepath, 'w', encoding='utf-8') as f:
                    f.write(html_report)
                
                print(f"    - [OK] {plate}: Generado correctamente.")
                report_count += 1

        print(f"\nPROCESO COMPLETADO: {report_count} reportes generados en '{OUTPUT_DIR}'.")
        
        # Actualizar Index.html
        if os.path.exists("index.html"):
            print("Actualizando portal index.html...")
            with open("index.html", "r", encoding="utf-8") as f:
                portal_content = f.read()
            
            # Generar bloques de items para el portal
            portal_items = ""
            for filename in os.listdir(OUTPUT_DIR):
                if filename.endswith(".html"):
                    # Extraer placa y dueño del nombre del archivo: Reporte_PLACA_Dueno.html
                    parts = filename.replace("Reporte_", "").replace(".html", "").split("_")
                    p_plate = parts[0] if len(parts) > 0 else "Vehículo"
                    p_owner = parts[1] if len(parts) > 1 else "Propietario"
                    
                    portal_items += f"""
            <a href="{OUTPUT_DIR}/{filename}" class="report-card">
                <div class="info">
                    <h3>{p_plate}</h3>
                    <p>Propietario: {p_owner}</p>
                </div>
                <div class="arrow">→</div>
            </a>"""
            
            # Reemplazar el bloque entre comentarios
            start_tag = "<!-- REPORTE_ITEM -->"
            end_tag = "<!-- FIN_REPORTE_ITEM -->"
            if start_tag in portal_content and end_tag in portal_content:
                new_portal = portal_content.split(start_tag)[0] + start_tag + portal_items + "\n            " + end_tag + portal_content.split(end_tag)[1]
                with open("index.html", "w", encoding="utf-8") as f:
                    f.write(new_portal)
            print("Portal actualizado con éxito.")

    except Exception as e:
        log_error(f"Error inesperado al procesar el Excel: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    generar_reportes()
    print("\nProceso finalizado con éxito.")
    # input("\nPresiona ENTER para salir...") # Removido para que el agente pueda ver el resultado
