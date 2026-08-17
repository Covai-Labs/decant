import os
import json
import zipfile

def create_zip(source_dir, output_zip, prefix=""):
    print(f"Creating archive: {output_zip}")
    with zipfile.ZipFile(output_zip, 'w', zipfile.ZIP_DEFLATED) as zipf:
        for root, _, files in os.walk(source_dir):
            for file in files:
                file_path = os.path.join(root, file)
                arcname = os.path.relpath(file_path, source_dir)
                if prefix:
                    arcname = os.path.join(prefix, arcname)
                zipf.write(file_path, arcname)

def main():
    with open('package.json', 'r') as f:
        pkg = json.load(f)
    version = pkg.get('version', '1.0.0')

    os.makedirs('releases', exist_ok=True)

    chrome_zip = "releases/decant-chromium.zip"
    firefox_zip = "releases/decant-firefox.zip"
    source_zip = "releases/decant-source.zip"

    # 1. Package Chromium build
    if os.path.exists('.output/chrome-mv3'):
        create_zip('.output/chrome-mv3', chrome_zip)

    # 2. Package Firefox build
    if os.path.exists('.output/firefox-mv3'):
        create_zip('.output/firefox-mv3', firefox_zip)

    # 3. Package Source for Firefox AMO submission requirements
    print(f"Creating source archive: {source_zip}")
    with zipfile.ZipFile(source_zip, 'w', zipfile.ZIP_DEFLATED) as zipf:
        for root, dirs, files in os.walk('.'):
            # Ignore node_modules, dist, dist-firefox, .git, releases, Scratch, .output, .wxt
            dirs[:] = [d for d in dirs if d not in ['node_modules', 'dist', 'dist-firefox', '.git', 'releases', 'Scratch', '.output', '.wxt']]
            for file in files:
                file_path = os.path.join(root, file)
                arcname = os.path.relpath(file_path, '.')
                zipf.write(file_path, arcname)

    print("\n✅ Packaging complete! Zip files prepared in releases/:")
    print(f"  - Chromium (Chrome/Edge): {chrome_zip}")
    print(f"  - Firefox AMO:           {firefox_zip}")
    print(f"  - AMO Source Zip:        {source_zip}\n")

if __name__ == '__main__':
    main()
