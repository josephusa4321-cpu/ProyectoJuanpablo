import base64
import json
import zlib
import re

def search_in_bundle(html_path, search_term):
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
                # El bundle usa DecompressionStream(gzip), probemos zlib con wbits para gzip
                data = zlib.decompress(data, zlib.MAX_WBITS | 16)
            except:
                pass
        
        try:
            decoded_text = data.decode('utf-8', errors='ignore')
            if search_term in decoded_text:
                print(f"Encontrado en asset {uuid} ({entry['mime']})")
                # Mostrar un snippet
                idx = decoded_text.find(search_term)
                print("Snippet:", decoded_text[max(0, idx-100):idx+100])
        except:
            pass

if __name__ == "__main__":
    search_in_bundle("Reporte Semanal _standalone_.html", "Joseph Restrepo")
