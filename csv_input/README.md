# CSV 输入文件夹

## 使用方法

1. 将你的 CSV 文件放入这个文件夹
2. 运行 `python update_data.py` 或 `./update_data.py`
3. 脚本会自动：
   - 查找这个文件夹中的 CSV 文件
   - 转换为 JSON 格式
   - 覆盖 `data.json` 文件

## CSV 格式要求

CSV 文件应包含以下列（按顺序）：
1. **link** - 视频链接
2. **category** - 分类名称
3. **class** - 子分类名称（可选）
4. **source** - 来源（可选，当前未使用）
5. **subclass** - 子子分类名称（可选）
6. **text** - 显示文本

## 示例

如果文件夹中有多个 CSV 文件，脚本会使用最新的文件（按修改时间）。

