# Overwrite 方案分析

## 当前方案（检查方案）

### 流程：
1. 遍历 data.json 中的每个项目
2. 对于每个项目，在 userAddedItems 中查找相同 ID（O(m)）
3. 如果找到，使用编辑后的版本；否则使用原始版本
4. 添加 userAddedItems 中的新项目（负 ID 或不在 data.json 中的）

### 时间复杂度：
- **O(n × m)**，其中 n = data.json 项目数，m = userAddedItems 项目数
- 对于每个 data.json 项目，都要遍历 userAddedItems 查找

### 问题：
- 性能较差，特别是当项目数量多时
- 每次都要查找

## Overwrite 方案

### 流程：
1. 创建一个 Map/对象，以 ID 为 key
2. 遍历 data.json 中的所有项目，添加到 Map 中（ID → item）
3. 遍历 userAddedItems 中的所有项目，覆盖 Map 中的对应项（ID → edited item）
4. 将 Map 转换为数组
5. 过滤删除的项目

### 时间复杂度：
- **O(n + m)**，其中 n = data.json 项目数，m = userAddedItems 项目数
- 只需要遍历一次，Map 查找是 O(1)

### 优势：
- ✅ 性能更好（线性时间）
- ✅ 代码更简单
- ✅ 易于理解和维护

### 潜在问题：

#### 1. 同一个 ID 在不同 location 出现？
**不会**：因为 location key 不同（`categoryId`, `categoryId:subcategoryId`, `categoryId:subcategoryId:subclassId`）

#### 2. userAddedItems 中的项目可能在不同 location 有相同 ID？
**不会**：因为编辑项目时，会根据当前 location 保存（`updateItemInLocation`）

#### 3. 需要知道项目的 location（category/subcategory/subclass）吗？
**需要**：对于某些功能（如显示 source），但可以通过以下方式处理：
- 在覆盖时，保留或添加 location 信息
- 或者在最后收集时，根据项目的原始位置添加 source

#### 4. 如何处理新添加的项目（负 ID）？
**可以**：Map 中同时存储正 ID 和负 ID，最后过滤时只保留需要的

#### 5. 如何处理子分类/子类中的项目？
**需要**：在收集所有项目时，需要遍历所有层级（category → subcategory → subclass）

## 实现方案

### 方案 1：简单 Overwrite（推荐）
```javascript
function collectAllItemsWithOverwrite(data) {
    const userAddedItems = getUserAddedItems();
    const deletedItems = getDeletedItems();
    const filter = getDailyRandomFilter();
    
    // Step 1: 创建 Map，以 ID 为 key
    const itemsMap = new Map();
    
    // Step 2: 收集所有 data.json 项目到 Map
    data.categories.forEach(category => {
        // ... 遍历所有层级，添加到 Map
        if (category.items) {
            category.items.forEach(item => {
                itemsMap.set(item.id, {
                    ...item,
                    source: category.name,
                    location: category.id
                });
            });
        }
        // ... subcategories, subclasses
    });
    
    // Step 3: 用 userAddedItems 覆盖
    Object.keys(userAddedItems).forEach(locationKey => {
        userAddedItems[locationKey].forEach(item => {
            // 覆盖相同 ID 的项目，或添加新项目
            const existing = itemsMap.get(item.id);
            if (existing) {
                // 覆盖（编辑的项目）
                itemsMap.set(item.id, {
                    ...item,
                    source: existing.source,
                    location: existing.location
                });
            } else {
                // 新项目（负 ID 或不在 data.json 中的）
                // 需要从 locationKey 解析出 source
                const source = getSourceFromLocationKey(locationKey, data);
                itemsMap.set(item.id, {
                    ...item,
                    source: source,
                    location: locationKey
                });
            }
        });
    });
    
    // Step 4: 转换为数组，过滤删除的项目和筛选
    const allItems = Array.from(itemsMap.values())
        .filter(item => !deletedItems.includes(item.id))
        .filter(item => isItemIncluded(item, filter));
    
    return allItems;
}
```

### 方案 2：分阶段 Overwrite
1. 先收集所有 data.json 项目到 Map
2. 根据 filter 筛选
3. 用 userAddedItems 覆盖
4. 过滤删除的项目

## 对比

| 方案 | 时间复杂度 | 代码复杂度 | 性能 | 可维护性 |
|------|-----------|-----------|------|----------|
| 当前（检查） | O(n × m) | 中等 | 较慢 | 中等 |
| Overwrite | O(n + m) | 简单 | 快 | 好 |

## 结论

**Overwrite 方案更好**：
- ✅ 性能更好
- ✅ 代码更简单
- ✅ 没有潜在问题（只要正确处理 location 和 source）
- ✅ 易于理解和维护

## 需要注意的点

1. **Source 信息**：需要从 location key 解析出 source（category name, subcategory name 等）
2. **Filter 逻辑**：需要在覆盖后应用 filter
3. **删除项目**：需要在最后过滤删除的项目
4. **新项目**：负 ID 的项目需要正确处理

