import json
import base64
import zlib
import re
import os

file_path = r'C:\Users\USUARIO\Desktop\Nisuy Proyectos\Juan pablo Bayaona-Cathub\Reporte Semanal _standalone_.html'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Find the manifest
manifest_match = re.search(r'<script type="__bundler/manifest">(.*?)</script>', content, re.DOTALL)
template_match = re.search(r'<script type="__bundler/template">(.*?)</script>', content, re.DOTALL)

if not manifest_match or not template_match:
    print("Could not find manifest or template")
    exit(1)

manifest_json = json.loads(manifest_match.group(1))
template_str = json.loads(template_match.group(1))

output_dir = 'unpacked_report'
os.makedirs(output_dir, exist_ok=True)

# Unpack assets
assets = {}
for uuid, entry in manifest_json.items():
    data = base64.b64decode(entry['data'])
    if entry.get('compressed'):
        # Decompress gzip
        data = zlib.decompress(data, 16+zlib.MAX_WBITS)
    
    file_ext = entry['mime'].split('/')[-1]
    asset_path = os.path.join(output_dir, f"{uuid}.{file_ext}")
    with open(asset_path, 'wb') as f:
        f.write(data)
    assets[uuid] = asset_path
    print(f"Unpacked {uuid} ({entry['mime']})")

# Replace UUIDs in template
for uuid, asset_path in assets.items():
    template_str = template_str.replace(uuid, asset_path)

with open(os.path.join(output_dir, 'template_raw.html'), 'w', encoding='utf-8') as f:
    f.write(template_str)

print("Template raw saved to unpacked_report/template_raw.html")
