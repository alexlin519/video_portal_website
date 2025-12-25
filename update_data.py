#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
便捷脚本：自动从 csv_input 文件夹读取 CSV 文件并更新 data.json

使用方法：
1. 将 CSV 文件放入 csv_input 文件夹
2. 运行: python update_data.py
"""

import csv
import json
import os
import glob
from pathlib import Path

# 配置
CSV_INPUT_FOLDER = 'csv_input'  # CSV 文件所在文件夹
OUTPUT_FILE = 'data.json'  # 输出的 JSON 文件

# Emoji mapping for categories, subcategories, and subclasses
EMOJI_MAP = {
    # Categories
    '影视': '🎬',
    '游戏实况': '🎮',
    '游戏综合': '🎯',
    '新游试玩': '🆕',
    '有益': '📚',
    '悠闲轻松': '😌',
    'hehe': '😏',
    'scp/怪谈': '👻',
    '专注音乐/视频当背景版': '🎵',
    '体育赛事': '⚽',
    '信息源': '📰',
    '漫画/小说': '📖',
    '音乐区': '🎤',
    
    # Subcategories (classes)
    '完整': '🎯',
    '画质': '✨',
    '杂': '🔀',
    '格斗': '👊',
    '第三人称射击': '🔫',
    '完整合集': '📦',
    '单独合集': '📦',
    '恐怖猎奇': '😱',
    '测评': '📊',
    '电子榨菜': '🍜',
    '抽象': '🎨',
    '欢乐': '😄',
    '微恐': '👻',
    '推理': '🔍',
    '文艺': '🎭',
    '时政点评': '🗳️',
    '访谈': '🎤',
    '科普': '🔬',
    '工科': '⚙️',
    '理科': '🧮',
    '文科': '📜',
    '英语': '🇬🇧',
    'AI': '🤖',
    '摄影': '📷',
    '厨艺': '👨‍🍳',
    '国标': '💃',
    '权术/勾心斗角': '🎭',
    '社会学': '👥',
    '心理学': '🧠',
    '历史': '📜',
    '哲学': '🤔',
    '码农': '💻',
    '学习观': '📖',
    '数学': '🔢',
    '机械': '🔧',
    '教学': '👨‍🏫',
    'mod': '🔧',
    '整活': '🎪',
    '僵毁': '🧟',
    'MC': '⛏️',
    '以撒': '💀',
    '泰拉瑞亚': '🗺️',
    '肉鸽': '🎲',
    '电影': '🎞️',
    '短视频': '📹',
    '定格动画': '🎭',
    '美漫': '🦸',
    'san': '😵',
    '自制': '🎨',
    '战锤': '⚔️',
    '解说': '🗣️',
    '原片+解析': '🎬',
    '原片': '🎬',
    '长剧情游戏': '🎮',
    '感人': '😢',
    '动态': '📱',
    '互动小说': '📱',
    '美女': '💃',
    '攻略': '🗺️',
    '技巧': '💡',
    '综艺': '📺',
    '米米米': '🎵',
    '鬼畜': '😈',
    '足球': '⚽',
    '射击': '🎯',
    '挂机': '⏸️',
    '渲染': '🎨',
    '训练': '🏋️',
    '评测': '📊',
    '吃播': '🍽️',
    '韩语': '🇰🇷',
    '火影手游': '🥷',
    '单口': '🎤',
    
    # Subclasses
    'mk': '🥊',
    '3a大作': '🎮',
    '生存类': '🏕️',
    '机器鸡': '🐔',
    'mc': '⛏️',
    '声控': '🎙️',
    '教学': '👨‍🏫',
    '课程': '📚',
    '乐高大赛': '🧱',
    '对战类': '⚔️',
    '电子斗蛐蛐': '🦗',
    '躲猫猫': '🙈',
    '火影手游/究极风暴': '🥷',
    '战锤 / 其他游戏动画': '⚔️',
}

def get_emoji_for_name(name, level='category'):
    """Get emoji for a category, subcategory, or subclass name"""
    if not name:
        return None
    
    # Try exact match first
    if name in EMOJI_MAP:
        return EMOJI_MAP[name]
    
    # Try partial matches for subcategories/subclasses
    if level in ['subcategory', 'subclass']:
        for key, emoji in EMOJI_MAP.items():
            if key in name or name in key:
                return emoji
    
    # Default emojis based on level
    if level == 'category':
        return '📁'
    elif level == 'subcategory':
        return '📂'
    elif level == 'subclass':
        return '📄'
    
    return '📁'

def parse_csv_with_multiline(csv_file):
    """Parse CSV file preserving multi-line text fields"""
    data = []
    
    with open(csv_file, 'r', encoding='utf-8') as f:
        # Read entire file content
        content = f.read()
    
    # Parse CSV manually to handle multi-line quoted fields
    lines = []
    i = 0
    current_line = ''
    in_quotes = False
    
    for char in content:
        if char == '"':
            in_quotes = not in_quotes
            current_line += char
        elif char == '\n':
            if in_quotes:
                # Inside quoted field, preserve newline
                current_line += '\n'
            else:
                # End of row
                if current_line.strip():
                    lines.append(current_line)
                    current_line = ''
        else:
            current_line += char
    
    # Add last line if exists
    if current_line.strip():
        lines.append(current_line)
    
    # Parse lines into rows
    rows = []
    for line in lines:
        # Skip empty lines
        if not line.strip():
            continue
        
        # Parse CSV row
        row = []
        field = ''
        in_quotes = False
        quote_char = None
        
        i = 0
        while i < len(line):
            char = line[i]
            
            if char == '"':
                if in_quotes:
                    # Check if next char is also quote (escaped quote)
                    if i + 1 < len(line) and line[i + 1] == '"':
                        field += '"'
                        i += 2
                        continue
                    else:
                        # End of quoted field
                        in_quotes = False
                else:
                    # Start of quoted field
                    in_quotes = True
                    quote_char = char
                i += 1
            elif char == ',' and not in_quotes:
                # End of field
                row.append(field)
                field = ''
                i += 1
            else:
                field += char
                i += 1
        
        # Add last field
        if field or len(row) < 5:
            row.append(field)
        
        # Ensure we have 5 columns (link, category, class, subclass, text)
        while len(row) < 5:
            row.append('')
        
        rows.append(row[:5])
    
    return rows

def find_csv_file(folder):
    """查找文件夹中的 CSV 文件"""
    folder_path = Path(folder)
    
    if not folder_path.exists():
        print(f"❌ 错误: 文件夹 '{folder}' 不存在")
        print(f"   请创建文件夹 '{folder}' 并将 CSV 文件放入其中")
        return None
    
    # 查找所有 CSV 文件
    csv_files = list(folder_path.glob('*.csv'))
    
    if not csv_files:
        print(f"❌ 错误: 在文件夹 '{folder}' 中未找到 CSV 文件")
        print(f"   请将 CSV 文件放入 '{folder}' 文件夹")
        return None
    
    if len(csv_files) > 1:
        print(f"⚠️  警告: 在文件夹 '{folder}' 中找到 {len(csv_files)} 个 CSV 文件:")
        for i, f in enumerate(csv_files, 1):
            print(f"   {i}. {f.name}")
        print(f"   将使用最新的文件: {csv_files[0].name}")
        # 按修改时间排序，使用最新的
        csv_files.sort(key=lambda x: x.stat().st_mtime, reverse=True)
    
    csv_file = csv_files[0]
    print(f"✅ 找到 CSV 文件: {csv_file.name}")
    return csv_file

def convert_csv_to_json(csv_file):
    """将 CSV 转换为 JSON 格式"""
    # Parse CSV
    data = parse_csv_with_multiline(csv_file)
    
    # Skip header row (first row)
    if len(data) > 0:
        data = data[1:]
    
    # Now convert to JSON structure
    categories = {}
    item_id = 1
    
    for row in data:
        link = row[0].strip() if len(row) > 0 and row[0] else ''
        category = row[1].strip() if len(row) > 1 and row[1] else ''
        class_name = row[2].strip() if len(row) > 2 and row[2] else ''
        subclass = row[3].strip() if len(row) > 3 and row[3] else ''
        text = row[4] if len(row) > 4 and row[4] else ''  # Don't strip - preserve line breaks
        
        # Skip if no link or category
        if not link or not category:
            continue
        
        # Clean up link (remove extra spaces and quotes)
        link = link.strip().strip('"').strip()
        
        # Clean up text - preserve line breaks but remove extra spaces at start/end
        # Remove surrounding quotes but keep internal newlines
        text = text.strip('"').strip()
        # Remove leading/trailing whitespace but preserve internal newlines
        if text:
            # Remove leading whitespace from first line
            text = text.lstrip()
            # Remove trailing whitespace from last line
            text = text.rstrip()
            # Normalize multiple spaces to single space (but preserve newlines)
            lines = text.split('\n')
            text = '\n'.join(' '.join(line.split()) for line in lines)
        
        # If no text, use link as fallback
        if not text:
            text = link
        
        # Create category if not exists
        if category not in categories:
            cat_id = category.lower().replace(' ', '-').replace('/', '-')
            categories[category] = {
                'id': cat_id,
                'name': category,
                'icon': get_emoji_for_name(category, 'category'),
                'maxItems': 50,
                'items': [],
                'subcategories': {}
            }
        
        # Create item
        # Use text as name (will show on button, preserving line breaks)
        item = {
            'id': item_id,
            'name': text,  # Name shows on button - preserve line breaks as requested
            'url': link,
            'text': text  # Text also preserves line breaks
        }
        item_id += 1
        
        # Determine where to place the item
        if class_name:
            # Has class
            if class_name not in categories[category]['subcategories']:
                cat_id = categories[category]['id']
                class_id = f"{cat_id}-{class_name.lower().replace(' ', '-')}"
                categories[category]['subcategories'][class_name] = {
                    'id': class_id,
                    'name': class_name,
                    'icon': get_emoji_for_name(class_name, 'subcategory'),
                    'maxItems': 50,
                    'items': [],
                    'subclasses': {}
                }
            
            if subclass:
                # Has subclass
                if subclass not in categories[category]['subcategories'][class_name]['subclasses']:
                    class_id = categories[category]['subcategories'][class_name]['id']
                    subclass_id = f"{class_id}-{subclass.lower().replace(' ', '-')}"
                    categories[category]['subcategories'][class_name]['subclasses'][subclass] = {
                        'id': subclass_id,
                        'name': subclass,
                        'icon': get_emoji_for_name(subclass, 'subclass'),
                        'maxItems': 50,
                        'items': []
                    }
                categories[category]['subcategories'][class_name]['subclasses'][subclass]['items'].append(item)
            else:
                # No subclass, put in class
                categories[category]['subcategories'][class_name]['items'].append(item)
        else:
            # No class, put in category
            categories[category]['items'].append(item)
    
    # Convert to final structure
    result = {
        'categories': [
            {
                'id': 'daily-random',
                'name': '每日随机',
                'icon': '🌟',
                'isRandom': True,
                'maxItems': 20,
                'items': []
            }
        ]
    }
    
    for cat_name, cat_data in sorted(categories.items()):
        # Convert subcategories dict to list
        subcategories = []
        for subcat_name, subcat_data in sorted(cat_data['subcategories'].items()):
            # Convert subclasses dict to list
            subclasses = []
            for subclass_name, subclass_data in sorted(subcat_data['subclasses'].items()):
                subclass_obj = {
                    'id': subclass_data['id'],
                    'name': subclass_data['name'],
                    'icon': subclass_data.get('icon', get_emoji_for_name(subclass_data['name'], 'subclass')),
                    'maxItems': subclass_data['maxItems'],
                    'items': subclass_data['items']
                }
                subclasses.append(subclass_obj)
            
            subcat_obj = {
                'id': subcat_data['id'],
                'name': subcat_data['name'],
                'icon': subcat_data.get('icon', get_emoji_for_name(subcat_data['name'], 'subcategory')),
                'maxItems': subcat_data['maxItems'],
                'items': subcat_data['items']
            }
            
            if subclasses:
                subcat_obj['subclasses'] = subclasses
            
            subcategories.append(subcat_obj)
        
        cat_obj = {
            'id': cat_data['id'],
            'name': cat_data['name'],
            'icon': cat_data['icon'],
            'maxItems': cat_data['maxItems'],
            'items': cat_data['items']
        }
        
        if subcategories:
            cat_obj['subcategories'] = subcategories
        
        result['categories'].append(cat_obj)
    
    # Add raw-films category (special category with markdown content stored in localStorage)
    # This category should always exist
    result['categories'].append({
        'id': 'raw-films',
        'name': '原片分类',
        'icon': '🎬',
        'isTextOnly': True,
        'maxItems': 50,
        'items': []
    })
    
    # Add collection placeholder
    result['categories'].append({
        'id': 'collection',
        'name': '我的合集',
        'icon': '📚',
        'maxItems': 50,
        'items': []
    })
    
    return result, item_id - 1, len(categories)

def main():
    """主函数"""
    print("=" * 50)
    print("📊 CSV 转 JSON 工具")
    print("=" * 50)
    print()
    
    # 查找 CSV 文件
    csv_file = find_csv_file(CSV_INPUT_FOLDER)
    if not csv_file:
        return
    
    print()
    print("🔄 正在转换 CSV 文件...")
    
    try:
        # 转换 CSV 到 JSON
        result, item_count, category_count = convert_csv_to_json(csv_file)
        
        # 写入 data.json
        output_path = Path(OUTPUT_FILE)
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(result, f, ensure_ascii=False, indent=2)
        
        print()
        print("=" * 50)
        print("✅ 转换成功！")
        print("=" * 50)
        print(f"📁 输出文件: {OUTPUT_FILE}")
        print(f"📊 总项目数: {item_count}")
        print(f"📂 总分类数: {category_count}")
        print()
        print("💡 提示: data.json 已更新，可以刷新网页查看效果")
        print()
        
    except Exception as e:
        print()
        print("=" * 50)
        print("❌ 转换失败！")
        print("=" * 50)
        print(f"错误信息: {str(e)}")
        import traceback
        traceback.print_exc()
        print()

if __name__ == '__main__':
    main()

