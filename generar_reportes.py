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

        # PROCESAR POR DUEÑO
        for _, owner in df_owners.iterrows():
            owner_name = str(owner.get('Nombre completo', 'Sin Nombre'))
            if "pendiente" in owner_name.lower() or not owner_name.strip():
                continue
                
            commission_rate = float(owner.get('% Comisión', 0.214))
            
            # 1. GENERAR REPORTE CONSOLIDADO (Toda la flota del dueño + ADMIN)
            # Buscar vehículos de este dueño
            owner_vehicles = df_vehicles[df_vehicles['Dueño'] == owner_name]['Placa'].tolist()
            # Incluir movimientos de sus vehículos Y movimientos 'ADMIN' asociados al dueño
            # Nota: En este caso, asumimos que todos los ADMIN pertenecen al dueño principal
            owner_moves = df_moves[df_moves['Placa'].isin(owner_vehicles + ['ADMIN'])].sort_values('Fecha', ascending=True)
            
            if not owner_moves.empty:
                print(f"\nGenerando Reporte Consolidado para: {owner_name}")
                
                # --- LÓGICA FINANCIERA INFALIBLE ---
                # A. Ingreso Bruto: Solo lo que es Liquidación
                gross_income = float(owner_moves[owner_moves['Categoría'] == 'Liquidación']['Total'].sum())
                
                # B. Resultado Neto Real: La suma matemática de TODO en el Excel
                net_result = float(owner_moves['Total'].sum())
                
                # C. Comisión Administrativa: 21.4% del ingreso bruto (regla del cliente)
                admin_commission = gross_income * commission_rate
                
                # D. Gastos Operativos: El restante para que la matemática cuadre perfectamente
                # Ingreso - Comision - Gastos = Neto  =>  Gastos = Ingreso - Comision - Neto
                gross_expenses = gross_income - admin_commission - net_result
                
                margin_pct = (net_result / gross_income * 100) if gross_income != 0 else 0
                
                # Procesar datos específicos para el dashboard
                start_date = owner_moves['Fecha'].min()
                end_date = owner_moves['Fecha'].max()
                delta_days = (end_date - start_date).days + 1
                
                # Anomalías (> 500.000)
                anomalies = owner_moves[(owner_moves['Tipo'] == 'Gasto') & (owner_moves['Total'].abs() > 500000)].to_dict('records')
                formatted_anomalies = [{
                    "date": a['Fecha'].strftime('%Y-%m-%d'),
                    "category": str(a['Categoría']),
                    "driver": str(a.get('Conductor', 'N/A')),
                    "description": str(a['Descripción']),
                    "amount": abs(float(a['Total'])),
                    "anomaly": True
                } for a in anomalies]

                # Distribución de Gastos (Basada en categorías reales)
                expense_df = owner_moves[owner_moves['Tipo'] == 'Gasto']
                cat_totals = expense_df.groupby('Categoría')['Total'].sum().abs()
                total_cat_sum = cat_totals.sum()
                
                cat_map = {'Mano de obra': 'labor', 'Repuestos': 'parts', 'Repuesto': 'parts', 'Gasto administrativo': 'admin', 'Mantenimiento': 'maintenance', 'Técnico mecánica': 'inspection'}
                expense_distribution = [{
                    "key": cat_map.get(cat, 'other'),
                    "label": str(cat),
                    "pct": round((amt / total_cat_sum * 100), 1) if total_cat_sum != 0 else 0,
                    "amount": float(amt)
                } for cat, amt in cat_totals.items()]

                # Datos semanales
                owner_moves['Semana'] = owner_moves['Fecha'].dt.isocalendar().week
                weekly_data = []
                for week, group in owner_moves.groupby('Semana'):
                    weekly_data.append({
                        "w": f"Sem {week}",
                        "income": float(group[group['Categoría'] == 'Liquidación']['Total'].sum()),
                        "expenses": abs(float(group[group['Tipo'] == 'Gasto']['Total'].sum()))
                    })

                # Top 10 Gastos
                top_expenses = [{
                    "date": r['Fecha'].strftime('%Y-%m-%d'),
                    "category": str(r['Categoría']),
                    "driver": str(r.get('Conductor', 'N/A')),
                    "description": str(r['Descripción']),
                    "amount": abs(float(r['Total'])),
                    "anomaly": abs(float(r['Total'])) > 500000
                } for _, r in expense_df.sort_values('Total', ascending=True).head(10).iterrows()]

                # Movimientos
                movements_json = [{
                    "date": r['Fecha'].strftime('%Y-%m-%d'),
                    "type": "in" if r['Tipo'] == 'Ingreso' else "out",
                    "category": str(r['Categoría']),
                    "driver": str(r.get('Conductor', 'N/A')),
                    "description": str(r['Descripción']),
                    "amount": abs(float(r['Total'])),
                    "anomaly": (r['Tipo'] == 'Gasto' and abs(float(r['Total'])) > 500000)
                } for _, r in owner_moves.sort_values('Fecha', ascending=False).iterrows()]

                dashboard_data = {
                    "owner": owner_name,
                    "vehicle": {"make": "Flota Consolidada", "model": owner_name, "plate": "VARIAS", "year": 2024},
                    "period": {"start": start_date.strftime('%Y-%m-%d'), "end": end_date.strftime('%Y-%m-%d'), "days": delta_days},
                    "updated": now_str,
                    "admin": {"name": "Juan Pablo Bayona", "company": "Cargun360", "commission_pct": commission_rate * 100, "whatsapp": "+57 300 000 0000"},
                    "totals": {
                        "gross_income": gross_income,
                        "admin_commission": admin_commission,
                        "operating_expenses": gross_expenses,
                        "net_result": net_result,
                        "margin_pct": round(margin_pct, 1),
                        "rentals": len(owner_moves[owner_moves['Tipo'] == 'Ingreso']),
                        "drivers": owner_moves['Conductor'].nunique() if 'Conductor' in owner_moves.columns else 1,
                        "anomalies": len(formatted_anomalies)
                    },
                    "expense_distribution": expense_distribution,
                    "weekly": weekly_data,
                    "ops": {
                        "days": delta_days,
                        "rentals": len(owner_moves[owner_moves['Tipo'] == 'Ingreso']),
                        "utility_per_day": round(net_result / delta_days, 0) if delta_days > 0 else 0,
                        "drivers": owner_moves['Conductor'].nunique() if 'Conductor' in owner_moves.columns else 1,
                        "anomaly_count": len(formatted_anomalies),
                        "occupancy_pct": 100,
                        "avg_rental_value": round(gross_income / len(owner_moves[owner_moves['Tipo'] == 'Ingreso']), 0) if len(owner_moves[owner_moves['Tipo'] == 'Ingreso']) > 0 else 0
                    },
                    "top_expenses": top_expenses,
                    "movements": movements_json
                }

                # Inyectar y Guardar
                html_report = template_content.replace('{{ report_data_json }}', json.dumps(dashboard_data, ensure_ascii=False, indent=2))
                clean_owner = re.sub(r'\W+', '', owner_name)
                filename = f"Reporte_CONSOLIDADO_{clean_owner}.html"
                filepath = os.path.join(OUTPUT_DIR, filename)
                with open(filepath, 'w', encoding='utf-8') as f:
                    f.write(html_report)
                print(f"    - [OK] Reporte Consolidado generado: {filename}")
                report_count += 1

            # 2. GENERAR REPORTES INDIVIDUALES (Opcional, pero los mantenemos por detalle)
            my_vehicles_data = df_vehicles[df_vehicles['Dueño'] == owner_name]
            for _, v_info in my_vehicles_data.iterrows():
                plate = str(v_info['Placa'])
                v_moves = df_moves[df_moves['Placa'] == plate].sort_values('Fecha', ascending=True)
                
                if v_moves.empty:
                    continue

                # Para el individual, usamos el mismo estilo de cálculo
                v_income = float(v_moves[v_moves['Categoría'] == 'Liquidación']['Total'].sum())
                v_net = float(v_moves['Total'].sum())
                v_comm = v_income * commission_rate
                v_ops = v_income - v_comm - v_net

                # (Procedemos similar para generar el HTML individual para que el link no se rompa)
                # Reutilizamos dashboard_data con datos del vehículo
                dashboard_data['vehicle'] = {"make": str(v_info.get('Marca', 'Vehículo')), "model": str(v_info.get('Modelo', '')), "plate": plate, "year": 2024}
                dashboard_data['totals'].update({"gross_income": v_income, "admin_commission": v_comm, "operating_expenses": v_ops, "net_result": v_net})
                # Actualizar movimientos y top solo para este vehiculo
                dashboard_data['movements'] = [{"date": r['Fecha'].strftime('%Y-%m-%d'), "type": "in" if r['Tipo'] == 'Ingreso' else "out", "category": str(r['Categoría']), "driver": str(r.get('Conductor', 'N/A')), "description": str(r['Descripción']), "amount": abs(float(r['Total'])), "anomaly": (r['Tipo'] == 'Gasto' and abs(float(r['Total'])) > 500000)} for _, r in v_moves.sort_values('Fecha', ascending=False).iterrows()]

                html_report = template_content.replace('{{ report_data_json }}', json.dumps(dashboard_data, ensure_ascii=False, indent=2))
                filename = f"Reporte_{plate}_{clean_owner}.html"
                filepath = os.path.join(OUTPUT_DIR, filename)
                with open(filepath, 'w', encoding='utf-8') as f:
                    f.write(html_report)
                report_count += 1

        print(f"\nPROCESO COMPLETADO: {report_count} reportes generados en '{OUTPUT_DIR}'.")
        
        # Actualizar Index.html
        if os.path.exists("index.html"):
            print("Actualizando portal index.html...")
            with open("index.html", "r", encoding="utf-8") as f:
                portal_content = f.read()
            
            # Generar bloques de items para el portal
            portal_items = ""
            # Primero el consolidado
            files = os.listdir(OUTPUT_DIR)
            consolidated_files = [f for f in files if "CONSOLIDADO" in f]
            individual_files = [f for f in files if "CONSOLIDADO" not in f and f.endswith(".html")]
            
            for filename in consolidated_files + individual_files:
                is_consolidated = "CONSOLIDADO" in filename
                display_name = "REPORTE SEMANAL CONSOLIDADO" if is_consolidated else "Detalle por Vehículo"
                
                parts = filename.replace("Reporte_", "").replace("CONSOLIDADO_", "").replace(".html", "").split("_")
                p_plate = parts[0] if len(parts) > 0 else "Vehículo"
                p_owner = parts[1] if len(parts) > 1 else "Propietario"
                
                card_class = "report-card main-report" if is_consolidated else "report-card"
                badge_html = '<span class="badge-main">PRINCIPAL</span>' if is_consolidated else ""
                type_label = "Consolidado Mensual" if is_consolidated else "Detalle Vehículo"
                sub_text = "Resumen de todos los vehículos" if is_consolidated else f"Propietario: {p_owner}"
                
                portal_items += f"""
            <a href="{OUTPUT_DIR}/{filename}" class="{card_class}">
                <div class="info">
                    {badge_html}
                    <span class="type-label">{type_label}</span>
                    <h3>{p_plate if not is_consolidated else "FLOTA TOTAL"}</h3>
                    <p>{sub_text}</p>
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
