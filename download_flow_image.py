import os
import base64
import urllib.request
import urllib.parse

def download_mermaid_image():
    md_path = "user_signup_to_screening_flow.md"
    if not os.path.exists(md_path):
        print(f"Error: {md_path} not found.")
        return

    with open(md_path, "r", encoding="utf-8") as f:
        content = f.read()

    # Extract the mermaid block
    start_tag = "```mermaid"
    end_tag = "```"
    
    start_idx = content.find(start_tag)
    if start_idx == -1:
        print("Error: Mermaid block not found.")
        return
        
    start_idx += len(start_tag)
    end_idx = content.find(end_tag, start_idx)
    if end_idx == -1:
        print("Error: Closing code block tag not found.")
        return

    mermaid_code = content[start_idx:end_idx].strip()
    
    print("Extracted Mermaid Code length:", len(mermaid_code))
    
    # URL-safe Base64 encoding
    graph_bytes = mermaid_code.encode("utf-8")
    base64_bytes = base64.urlsafe_b64encode(graph_bytes)
    base64_string = base64_bytes.decode("ascii")
    
    # Build URL (using white background query parameter for contrast)
    url = f"https://mermaid.ink/img/{base64_string}?bgColor=white"
    
    output_png = "user_signup_to_screening_flow.png"
    artifact_dir = r"C:\Users\HP\.gemini\antigravity-ide\brain\66cbc8bd-6d4f-40d6-a449-6276e49af24f"
    artifact_png = os.path.join(artifact_dir, "user_signup_to_screening_flow.png")
    
    print(f"Downloading rendered image from: {url[:100]}...")
    
    try:
        # Set user agent to avoid bot blocks
        req = urllib.request.Request(
            url, 
            headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}
        )
        with urllib.request.urlopen(req) as response:
            image_data = response.read()
            
        # Save to workspace root
        with open(output_png, "wb") as f:
            f.write(image_data)
        print(f"Success: Image downloaded to workspace: {output_png}")
        
        # Save a copy in the artifact directory
        if os.path.exists(artifact_dir):
            with open(artifact_png, "wb") as f:
                f.write(image_data)
            print(f"Success: Copy saved to artifacts: {artifact_png}")
            
    except Exception as e:
        print("Failed to download image from mermaid.ink:", e)

if __name__ == "__main__":
    download_mermaid_image()
