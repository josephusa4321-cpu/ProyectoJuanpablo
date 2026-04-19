import base64
import json
import zlib
import re
import os

def find_data_in_js(html_path):
    with open(html_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    manifest_match = re.search(r'type="__bundler/manifest">(.*?)</script>', content, re.DOTALL)
    if not manifest_match:
        return
    
    manifest = json.loads(manifest_match.group(1))
    
    targets = ["-14150", "-23000", "Joseph Restrepo"]
    
    for uuid, entry in manifest.items():
        data = base64.b64decode(entry['data'])
        if entry.get('compressed'):
            try:
                data = zlib.decompress(data, zlib.MAX_WBITS | 16)
            except:
                pass
        
        try:
            text = data.decode('utf-8', errors='ignore')
            for t in targets:
                if t in text:
                    print(f"Target '{t}' found in asset {uuid}")
                    # Analizar si es un bloque JSON
                    if "[" in text and "{" in text:
                        print(f"Asset {uuid} contains a JSON-like structure.")
        except:
            pass

if __name__ == "__main__":
    find_data_in_js("Reporte Semanal _standalone_.html")
