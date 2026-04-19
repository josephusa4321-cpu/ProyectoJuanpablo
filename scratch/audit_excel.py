import pandas as pd
import re

def clean_plate(text):
    if not isinstance(text, str): return "DESCONOCIDO"
    match = re.search(r'([A-Z]{3}-\d{3})', text)
    if match: return match.group(1)
    if "Administración" in text or "ADMIN" in text.upper(): return "ADMIN"
    return "OTRO"

df = pd.read_excel('Estado de cuenta JR (1).xlsx', sheet_name='EC JR', skiprows=1)
df['Placa_Calc'] = df['Origen del movimiento'].apply(clean_plate)

total_sum = df['Total'].sum()
plates_sum = df[df['Placa_Calc'].str.contains(r'[A-Z]{3}-\d{3}')]['Total'].sum()
admin_sum = df[df['Placa_Calc'] == 'ADMIN']['Total'].sum()
otro_sum = df[df['Placa_Calc'] == 'OTRO']['Total'].sum()
desconocido_sum = df[df['Placa_Calc'] == 'DESCONOCIDO']['Total'].sum()

print(f"Total General: {total_sum:,.0f}")
print(f"Suma Placas: {plates_sum:,.0f}")
print(f"Suma ADMIN: {admin_sum:,.0f}")
print(f"Suma OTRO: {otro_sum:,.0f}")
print(f"Suma DESCONOCIDO: {desconocido_sum:,.0f}")
print(f"Suma Placas + ADMIN: {plates_sum + admin_sum:,.0f}")
print(f"Diferencia: {total_sum - (plates_sum + admin_sum):,.0f}")
