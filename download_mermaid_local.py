import urllib.request
import os

def download_file():
    url = "https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"
    output_path = "mermaid.min.js"
    
    print(f"Downloading {url} to local file {output_path}...")
    try:
        req = urllib.request.Request(
            url, 
            headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}
        )
        with urllib.request.urlopen(req) as response:
            js_data = response.read()
            
        with open(output_path, "wb") as f:
            f.write(js_data)
        print("Successfully downloaded mermaid.min.js locally!")
    except Exception as e:
        print("Failed to download file:", e)

if __name__ == "__main__":
    download_file()
