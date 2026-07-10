import shutil
import os

src = r"C:\Users\HP\.gemini\antigravity-ide\brain\66cbc8bd-6d4f-40d6-a449-6276e49af24f\user_signup_to_screening_flow_1782389280856.png"
dst_workspace = r"c:\Users\HP\Downloads\AI_Screeming\user_signup_to_screening_flow.png"
dst_artifact = r"C:\Users\HP\.gemini\antigravity-ide\brain\66cbc8bd-6d4f-40d6-a449-6276e49af24f\user_signup_to_screening_flow.png"

print(f"Copying {src}...")

try:
    if os.path.exists(src):
        # Copy to workspace
        shutil.copy2(src, dst_workspace)
        print(f"Copied to workspace: {dst_workspace}")
        
        # Copy to artifacts
        shutil.copy2(src, dst_artifact)
        print(f"Copied to artifacts: {dst_artifact}")
    else:
        print(f"Error: Source file {src} does not exist.")
except Exception as e:
    print(f"Failed to copy file: {e}")
