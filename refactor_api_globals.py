import os
import re

dir_path = r'c:\Users\User\Desktop\admin\admin\client\src'

# Match the long messy string I inserted earlier, including any /api suffix
# Old string part: ${process.env.REACT_APP_API_URL || (window.location.hostname.includes('vercel.app') ? 'https://ddrems-mongo.onrender.com' : `http://${window.location.hostname}:5000`)}
pattern_api = re.compile(r'\$\{process\.env\.REACT_APP_API_URL \|\| \(window\.location\.hostname\.includes\(\'vercel\.app\'\) \? \'https\://ddrems-mongo\.onrender\.com\' \: `http\://\$\{window\.location\.hostname\}\:5000`\)\}/api')
pattern_base = re.compile(r'\$\{process\.env\.REACT_APP_API_URL \|\| \(window\.location\.hostname\.includes\(\'vercel\.app\'\) \? \'https\://ddrems-mongo\.onrender\.com\' \: `http\://\$\{window\.location\.hostname\}\:5000`\)\}')

count = 0
for root, _, files in os.walk(dir_path):
    for f in files:
        if f.endswith('.js') or f.endswith('.jsx'):
            file_path = os.path.join(root, f)
            with open(file_path, 'r', encoding='utf-8') as file:
                content = file.read()
            
            new_content = pattern_api.sub(r'${window.API_URL}', content)
            new_content = pattern_base.sub(r'${window.API_BASE}', new_content)
            
            if new_content != content:
                with open(file_path, 'w', encoding='utf-8') as file:
                    file.write(new_content)
                count += 1

print(f'Modified {count} files.')
