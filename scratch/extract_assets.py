import base64
import json
import zlib
import re
import os

def extract_all_from_bundle(html_path, out_dir):
    if not os.path.exists(out_dir):
        os.makedirs(out_dir)
        
    with open(html_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Extraer manifest
    manifest_match = re.search(r'type="__bundler/manifest">(.*?)</script>', content, re.DOTALL)
    if not manifest_match:
        print("Manifest no encontrado")
        return
    
    manifest = json.loads(manifest_match.group(1))
    
    for uuid, entry in manifest.items():
        data = base64.b64decode(entry['data'])
        if entry.get('compressed'):
            try:
                data = zlib.decompress(data, zlib.MAX_WBITS | 16)
            except:
                pass
        
        file_ext = entry['mime'].split('/')[-1]
        if file_ext == 'javascript': file_ext = 'js'
        
        out_path = os.path.join(out_dir, f"{uuid}.{file_ext}")
        with open(out_path, 'wb') as f:
            f.write(data)
        print(f"Extraído: {out_path}")

if __name__ == "__main__":
    extract_all_from_bundle("Reporte Semanal _standalone_.html", "scratch/bundle_extract")
