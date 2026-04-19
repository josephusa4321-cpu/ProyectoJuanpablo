import json
import re

with open('reportes_generados/Reporte_UUO-808_JosephRestrepo.html', encoding='utf-8') as f:
    content = f.read()
    
match = re.search(r'<script type="application/json" id="report-data">([\s\S]*?)</script>', content)
if match:
    data = json.loads(match.group(1))
    print(data['totals'])
    print("Rentals:", data['totals']['rentals'])
    print("Movements amount:", len(data['movements']))
    
with open('reportes_generados/Reporte_CONSOLIDADO_JosephRestrepo.html', encoding='utf-8') as f:
    content_c = f.read()

match_c = re.search(r'<script type="application/json" id="report-data">([\s\S]*?)</script>', content_c)
if match_c:
    data_c = json.loads(match_c.group(1))
    print("CONSOLIDATED TOTALS:", data_c['totals'])
