#!/usr/bin/env python3
"""
批量为所有 HTML 文件插入 Google Analytics (GA4) 统计代码
运行前请确认下方的 MEASUREMENT_ID 变量
"""

import os
import re

# ==================== 用户配置区域 ====================
MEASUREMENT_ID = "G-0RMW1VY2KK"  # 请在这里填入你的 GA Measurement ID
# ====================================================

GA_CODE_TEMPLATE = """<script async src="https://www.googletagmanager.com/gtag/js?id={ga_id}"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){{dataLayer.push(arguments);}}
  gtag('js', new Date());
  gtag('config', '{ga_id}');
</script>"""

# 用于检测文件中是否已包含该 GA ID，避免重复插入
CHECK_PATTERN = re.compile(re.escape(MEASUREMENT_ID))


def find_html_files(root_dir="."):
    """递归查找所有 .html 文件（排除常见隐藏/依赖目录）"""
    html_files = []
    exclude_dirs = {".git", ".idea", ".claude", "node_modules", "venv", ".venv", "__pycache__"}
    for dirpath, dirnames, filenames in os.walk(root_dir):
        # 跳过排除目录
        dirnames[:] = [d for d in dirnames if d not in exclude_dirs]
        for filename in filenames:
            if filename.lower().endswith(".html"):
                html_files.append(os.path.join(dirpath, filename))
    return sorted(html_files)


def insert_after_head(filepath, snippet):
    """在 <head> 标签（不区分大小写）之后第一行插入代码片段"""
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()

    # 检查是否已存在该 GA ID
    if CHECK_PATTERN.search(content):
        return False, "已包含相同的 Measurement ID，跳过"

    # 查找 <head> 标签位置（支持属性如 <head lang="zh">）
    match = re.search(r"(<head[^>]*>)", content, flags=re.IGNORECASE)
    if not match:
        return False, "未找到 <head> 标签，跳过"

    insert_pos = match.end()
    new_content = content[:insert_pos] + "\n" + snippet + content[insert_pos:]

    with open(filepath, "w", encoding="utf-8") as f:
        f.write(new_content)

    return True, "已插入"


def main():
    ga_code = GA_CODE_TEMPLATE.format(ga_id=MEASUREMENT_ID)
    html_files = find_html_files()

    if not html_files:
        print("未找到任何 .html 文件。")
        return

    # 第一阶段：扫描并列出将要修改的文件
    to_modify = []
    skipped = []
    for fp in html_files:
        with open(fp, "r", encoding="utf-8") as f:
            raw = f.read()
        if CHECK_PATTERN.search(raw):
            skipped.append((fp, "已包含相同的 Measurement ID"))
        elif not re.search(r"<head[^>]*>", raw, flags=re.IGNORECASE):
            skipped.append((fp, "未找到 <head> 标签"))
        else:
            to_modify.append(fp)

    print(f"扫描完成，共发现 {len(html_files)} 个 HTML 文件。\n")

    if to_modify:
        print("以下文件将被修改（在 <head> 后插入 GA 代码）：")
        for fp in to_modify:
            print(f"  - {fp}")
        print()

    if skipped:
        print("以下文件将被跳过：")
        for fp, reason in skipped:
            print(f"  - {fp}（{reason}）")
        print()

    if not to_modify:
        print("没有需要修改的文件，退出。")
        return

    # 请求用户确认
    confirm = input("确认修改以上文件？(yes/no): ").strip().lower()
    if confirm not in ("yes", "y"):
        print("已取消操作，未做任何修改。")
        return

    # 第二阶段：执行修改
    success_count = 0
    for fp in to_modify:
        ok, msg = insert_after_head(fp, ga_code)
        print(f"{fp}: {msg}")
        if ok:
            success_count += 1

    print(f"\n处理完成，成功修改 {success_count} 个文件。")


if __name__ == "__main__":
    main()
