import os
import re

def check_file(path):
    if not os.path.exists(path):
        return None
    with open(path, 'r') as f:
        return f.read()

print("--- src/routes/admin.tsx ---")
print(check_file('src/routes/admin.tsx'))

print("\n--- src/pages/Login.tsx ---")
print(check_file('src/pages/Login.tsx'))

print("\n--- src/routes/index.tsx ---")
print(check_file('src/routes/index.tsx'))

