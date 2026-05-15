import os

dir_path = r'c:\Users\User\Desktop\admin\admin\client\src'
old_str = r'http://localhost:5000'
new_str = r'${process.env.REACT_APP_API_URL || `http://${window.location.hostname}:5000`}'

count = 0
for root, _, files in os.walk(dir_path):
    for f in files:
        if f.endswith('.js') or f.endswith('.jsx'):
            file_path = os.path.join(root, f)
            with open(file_path, 'r', encoding='utf-8') as file:
                content = file.read()
            
            if old_str in content:
                new_content = content.replace(old_str, new_str)
                with open(file_path, 'w', encoding='utf-8') as file:
                    file.write(new_content)
                count += 1

print(f'Modified {count} files.')
