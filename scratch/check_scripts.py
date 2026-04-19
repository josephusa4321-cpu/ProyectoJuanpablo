import re

with open('dashboard_template.html', encoding='utf-8') as f:
    content = f.read()

scripts = re.finditer(r'<script.*?>([\s\S]*?)</script>', content)
for i, m in enumerate(scripts):
    print(f"\n--- SCRIPT {i} ---")
    print(m.group(1)[:300]) # First 300 chars of each script
