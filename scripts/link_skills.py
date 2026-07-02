#!/usr/bin/env python3
import os
import shutil
import subprocess
import sys

REPO_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
HOME_DIR = os.path.expanduser("~")

# 連結目標路徑
DESTS = [
    os.path.join(HOME_DIR, ".gemini", "config", "skills"),
    os.path.join(HOME_DIR, ".agents", "skills")
]

def get_skills_to_link():
    skills = []
    skills_root = os.path.join(REPO_DIR, "skills")
    
    for root, dirs, files in os.walk(skills_root):
        # 排除 deprecated 和 node_modules
        if "deprecated" in root or "node_modules" in root:
            continue
        if "SKILL.md" in files:
            skill_name = os.path.basename(root)
            skills.append((skill_name, root))
    return skills

def create_link(src, dest):
    # 確保目的地如果存在，就被徹底清理
    if os.path.lexists(dest):
        try:
            if os.path.isdir(dest) and not os.path.islink(dest):
                shutil.rmtree(dest)
            else:
                os.unlink(dest)
        except Exception as e:
            # 在 Windows 下，Junction 可能需要使用 rmdir 或者是 rmtree 的方式清理
            try:
                subprocess.run(f'rmdir "{dest}"', shell=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
            except Exception:
                pass

    # 嘗試建立軟連結或 Junction
    linked = False
    try:
        if sys.platform == "win32":
            # Windows Junction
            res = subprocess.run(f'mklink /J "{dest}" "{src}"', shell=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
            if res.returncode == 0:
                linked = True
                print(f"[SUCCESS] Linked (Junction): {os.path.basename(dest)} -> {src}")
        else:
            os.symlink(src, dest, target_is_directory=True)
            linked = True
            print(f"[SUCCESS] Linked (Symlink): {os.path.basename(dest)} -> {src}")
    except Exception as e:
        linked = False

    # 若建立連結失敗，回退至複製資料夾
    if not linked:
        try:
            shutil.copytree(src, dest)
            print(f"[SUCCESS] Copied (Fallback): {os.path.basename(dest)} -> {src}")
        except Exception as e:
            print(f"[FAILED] to link/copy {src} to {dest}: {e}")
            return False
    return True

def main():
    skills = get_skills_to_link()
    print(f"Found {len(skills)} skills to link.")
    
    for dest_dir in DESTS:
        # 如果目標路徑與本專案本身相同，就跳過
        if os.path.abspath(dest_dir) == os.path.abspath(os.path.join(REPO_DIR, "skills")):
            print(f"Skipping link to own project directory: {dest_dir}")
            continue
            
        print(f"\nLinking skills to: {dest_dir}")
        os.makedirs(dest_dir, exist_ok=True)
        
        for name, src in skills:
            target = os.path.join(dest_dir, name)
            create_link(src, target)

if __name__ == "__main__":
    main()
