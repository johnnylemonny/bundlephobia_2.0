import os

def cleanup_duplicates(root_dir):
    for root, dirs, files in os.walk(root_dir):
        for file in files:
            if file.endswith('.js'):
                base = file[:-3]
                tsx = base + '.tsx'
                ts = base + '.ts'
                page_tsx = base + '.page.tsx'
                
                if tsx in files or ts in files or page_tsx in files:
                    js_path = os.path.join(root, file)
                    print(f"Removing duplicate: {js_path}")
                    os.remove(js_path)

if __name__ == "__main__":
    cleanup_duplicates("pages")
    cleanup_duplicates("client")
