// admin_script.js

const STORAGE_KEY = 'mySuperlinksData';

// 检测 LocalStorage 是否可用
function isLocalStorageAvailable() {
    try {
        const test = '__localStorage_test__';
        localStorage.setItem(test, test);
        localStorage.removeItem(test);
        return true;
    } catch (e) {
        console.error("❌ LocalStorage 不可用！", e);
        return false;
    }
}

// 默认的初始数据，方便您上手（您可以删除或修改）
const defaultData = [
    {
        id: 1, 
        name: "YouTube 示例 - @rusiru87time", 
        type: "youtube", 
        url: "https://rsshub.app/youtube/channel/rusiru87time", 
        tags: "示例, YouTube"
    },
    {
        id: 2, 
        name: "Bilibili 示例 - UID 3632310553413638", 
        type: "bilibili", 
        url: "https://rsshub.app/bilibili/user/video/3632310553413638", 
        tags: "示例, B站"
    },
    {
        id: 3, 
        name: "手动合集示例", 
        type: "collection", 
        url: "https://www.bilibili.com/video/BV1jZ4y1g7Gk/", 
        thumbnail: "https://i0.hdslb.com/bfs/archive/c616f2de6f3f01b17a02e604ef7d04f479d4b684.png@672w_378h_1c_!web-search-common-feed.avif",
        tags: "合集, 学习"
    }
];

// 从 LocalStorage 加载数据，如果为空，则使用默认数据
function loadData() {
    // 检查 LocalStorage 是否可用
    if (!isLocalStorageAvailable()) {
        console.error("❌ LocalStorage 不可用！请检查浏览器设置。");
        alert("⚠️ 警告：LocalStorage 不可用，数据无法保存！\n\n请检查：\n1. 浏览器是否允许网站存储数据\n2. 是否处于隐私/无痕模式\n3. Arc浏览器设置中是否阻止了本地存储");
        return defaultData;
    }
    
    try {
        const dataString = localStorage.getItem(STORAGE_KEY);
        console.log("加载数据，LocalStorage内容:", dataString);
        
        if (!dataString) {
            console.log("LocalStorage为空，使用默认数据");
            return defaultData;
        }
        
        // 检查是否为空数组 "[]"
        if (dataString.trim() === '[]' || dataString.length <= 2) {
            console.log("LocalStorage为空数组，使用默认数据");
            return defaultData;
        }
        
        try {
            const parsed = JSON.parse(dataString);
            console.log("成功加载数据，共", parsed.length, "条记录");
            // 确保返回的是数组
            if (Array.isArray(parsed) && parsed.length > 0) {
                return parsed;
            } else {
                console.log("解析后的数据不是有效数组，使用默认数据");
                return defaultData;
            }
        } catch (e) {
            console.error("解析数据失败:", e, "原始数据:", dataString);
            return defaultData;
        }
    } catch (storageError) {
        console.error("❌ 访问 LocalStorage 时出错:", storageError);
        alert("⚠️ 无法访问 LocalStorage！\n\n可能的原因：\n1. 浏览器阻止了本地存储\n2. 存储空间已满\n3. 浏览器隐私设置过严\n\n错误信息: " + storageError.message);
        return defaultData;
    }
}

// 获取下一个可用的ID（从表格当前数据获取，避免使用可能过时的loadData）
function getNextId(tableData) {
    if (!tableData || tableData.length === 0) return 1;
    const maxId = Math.max(...tableData.map(item => item.id || 0));
    return maxId + 1;
}

// URL转换函数：将YouTube/Bilibili主页链接转换为RSS feed
function convertUrlToRss(originalUrl, type) {
    if (!originalUrl || originalUrl.trim() === '') return originalUrl;
    
    const url = originalUrl.trim();
    
    // 如果已经是RSS feed格式，直接返回
    if (url.includes('feeds/videos.xml') || url.includes('rsshub.app')) {
        return url;
    }
    
    if (type === 'youtube') {
        // YouTube频道主页链接转换
        // 格式1: https://www.youtube.com/@username (最常用)
        const atMatch = url.match(/youtube\.com\/@([^\/\?&#]+)/);
        if (atMatch) {
            const username = atMatch[1];
            // 使用RSSHub转换为RSS feed (RSSHub支持@username格式)
            return `https://rsshub.app/youtube/channel/${username}`;
        }
        
        // 格式2: https://www.youtube.com/channel/CHANNEL_ID
        const channelMatch = url.match(/youtube\.com\/channel\/([^\/\?&#]+)/);
        if (channelMatch) {
            const channelId = channelMatch[1];
            return `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;
        }
        
        // 格式3: https://www.youtube.com/c/username 或 /user/username
        const userMatch = url.match(/youtube\.com\/(?:c|user)\/([^\/\?&#]+)/);
        if (userMatch) {
            const username = userMatch[1];
            return `https://rsshub.app/youtube/channel/${username}`;
        }
    } else if (type === 'bilibili') {
        // Bilibili用户主页链接转换
        // 格式1: https://space.bilibili.com/UID
        const spaceMatch = url.match(/space\.bilibili\.com\/(\d+)/);
        if (spaceMatch) {
            const uid = spaceMatch[1];
            return `https://rsshub.app/bilibili/user/video/${uid}`;
        }
        
        // 格式2: https://www.bilibili.com/video/BV号 (单个视频，保持原链接)
        const videoMatch = url.match(/bilibili\.com\/video\/(BV\w+)/);
        if (videoMatch) {
            return url;
        }
    }
    
    // 无法转换，返回原链接
    return url;
}

// 1. 初始化 "Notion" 表格
const table = new Tabulator("#admin-table", {
    height: "600px",
    data: loadData(), // 加载数据
    layout: "fitColumns",
    movableRows: true, // 允许拖拽排序
    columns: [
        { title: "ID", field: "id", width: 50, sorter: "number", hozAlign: "center" },
        { title: "名称", field: "name", editor: "input", width: 200, headerFilter: "input" }, // 带筛选
        { 
            title: "类型", 
            field: "type", 
            width: 120, 
            editor: "select", // 下拉选择
            editorParams: {
                values: ["youtube", "bilibili", "instagram", "collection", "other"]
            },
            headerFilter: true // 允许按类型筛选
        },
        { title: "URL / Feed", field: "url", editor: "input", widthGrow: 2, headerFilter: "input" },
        { title: "封面 (合集用)", field: "thumbnail", editor: "input", widthGrow: 1, hozAlign: "center" },
        { title: "标签 (逗号分隔)", field: "tags", editor: "input", widthGrow: 1, headerFilter: "input" },
        { 
            title: "操作", 
            width: 80,
            hozAlign: "center",
            formatter: function(cell, formatterParams, onRendered){
                return "<button class='del-btn'>删除</button>";
            },
            cellClick: function(e, cell){
                if(confirm("确定要删除这一行吗？")) {
                    cell.getRow().delete();
                }
            }
        }
    ],
    // 2. 数据变化时自动保存到 LocalStorage
    cellEdited: function(cell) {
        const field = cell.getField();
        const newValue = cell.getValue();
        console.log("单元格被编辑:", field, "=", newValue);
        
        const row = cell.getRow();
        const rowData = row.getData();
        
        // 对于非URL/type字段的编辑，立即保存
        if (field !== 'url' && field !== 'type') {
            // 立即保存，不延迟
            setTimeout(() => {
                const currentData = table.getData();
                console.log("✅ 立即保存（非URL/type字段）:", field, "=", newValue);
                console.log("保存的数据条数:", currentData.length);
                saveData(currentData);
            }, 50);
            return; // 直接返回，不处理URL转换
        }
        
        // 对于URL或type字段，需要处理URL转换
        setTimeout(() => {
            // 获取最新的行数据（可能已被用户编辑）
            const latestRowData = row.getData();
            
            if (field === 'type' && latestRowData.url) {
                // 类型改变时，重新转换URL
                const convertedUrl = convertUrlToRss(latestRowData.url, latestRowData.type);
                if (convertedUrl !== latestRowData.url) {
                    console.log("URL自动转换:", latestRowData.url, "->", convertedUrl);
                    row.update({ url: convertedUrl }, false); // false表示不触发cellEdited
                    // URL更新后，再次保存
                    setTimeout(() => {
                        const currentData = table.getData();
                        console.log("✅ 保存（URL转换后）");
                        saveData(currentData);
                    }, 100);
                } else {
                    // 不需要转换，直接保存
                    const currentData = table.getData();
                    console.log("✅ 保存（类型改变，无需转换）");
                    saveData(currentData);
                }
            } else if (field === 'url' && latestRowData.type) {
                // URL改变时，根据类型转换
                const convertedUrl = convertUrlToRss(latestRowData.url, latestRowData.type);
                if (convertedUrl !== latestRowData.url) {
                    console.log("URL自动转换:", latestRowData.url, "->", convertedUrl);
                    row.update({ url: convertedUrl }, false); // false表示不触发cellEdited
                    // URL更新后，再次保存
                    setTimeout(() => {
                        const currentData = table.getData();
                        console.log("✅ 保存（URL转换后）");
                        saveData(currentData);
                    }, 100);
                } else {
                    // 不需要转换，直接保存
                    const currentData = table.getData();
                    console.log("✅ 保存（URL改变，无需转换）");
                    saveData(currentData);
                }
            } else {
                // 其他情况，直接保存
                const currentData = table.getData();
                console.log("✅ 保存（URL/type字段）");
                saveData(currentData);
            }
        }, 100);
    },
    dataChanged: function(data) {
        console.log("数据变化事件触发，共", data.length, "条记录");
        // 延迟保存，确保Tabulator内部状态已更新
        setTimeout(() => {
            const currentData = table.getData();
            console.log("✅ 数据变化后保存，共", currentData.length, "条记录");
            saveData(currentData);
        }, 50);
    },
    rowMoved: function(row) {
        console.log("行被移动");
        saveData(table.getData());
    },
    rowDeleted: function(row) {
        console.log("行被删除");
        saveData(table.getData());
    },
    rowAdded: function(row) {
        console.log("行被添加");
        setTimeout(() => {
            const currentData = table.getData();
            console.log("✅ 行添加后保存，共", currentData.length, "条记录");
            saveData(currentData);
        }, 100);
    },
    cellEditCancelled: function(cell) {
        // 编辑取消时也保存，确保数据一致性
        console.log("单元格编辑被取消");
        setTimeout(() => {
            const currentData = table.getData();
            saveData(currentData);
        }, 50);
    }
});

// 3. 保存数据到 LocalStorage
function saveData(data) {
    if (!data || !Array.isArray(data)) {
        console.error("保存失败：数据不是有效数组", data);
        return false;
    }
    
    // 检查 LocalStorage 是否可用
    if (!isLocalStorageAvailable()) {
        console.error("❌ LocalStorage 不可用，无法保存数据！");
        alert("⚠️ 无法保存数据！LocalStorage 不可用。\n\n请检查浏览器设置：\n1. Arc浏览器 → 设置 → 隐私\n2. 确保允许网站存储数据\n3. 检查是否处于隐私模式");
        return false;
    }
    
    try {
        const dataString = JSON.stringify(data);
        
        // 显示保存的数据摘要（前几条记录）
        console.log("=== 准备保存数据 ===");
        console.log("数据条数:", data.length);
        if (data.length > 0) {
            console.log("前3条记录:", data.slice(0, 3).map(item => ({
                id: item.id,
                name: item.name,
                type: item.type
            })));
        }
        
        localStorage.setItem(STORAGE_KEY, dataString);
        console.log("✅ 数据已保存到LocalStorage！共", data.length, "条记录");
        console.log("保存的数据（前200字符）:", dataString.substring(0, 200) + "...");
        
        // 验证保存是否成功
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved === dataString) {
            console.log("✅ 保存验证成功");
            
            // 验证保存的数据内容是否正确
            try {
                const savedParsed = JSON.parse(saved);
                console.log("✅ 保存的数据解析成功，共", savedParsed.length, "条记录");
                if (savedParsed.length > 0) {
                    console.log("保存后的前3条记录:", savedParsed.slice(0, 3).map(item => ({
                        id: item.id,
                        name: item.name,
                        type: item.type
                    })));
                }
            } catch (e) {
                console.error("❌ 保存的数据解析失败:", e);
            }
            
            return true;
        } else {
            console.error("❌ 保存验证失败！保存的数据与读取的不一致");
            console.error("保存的数据长度:", dataString.length);
            console.error("读取的数据长度:", saved ? saved.length : 0);
            console.error("保存的前100字符:", dataString.substring(0, 100));
            console.error("读取的前100字符:", saved ? saved.substring(0, 100) : "null");
            alert("⚠️ 警告：数据保存验证失败！\n\n数据可能没有正确保存。请检查浏览器控制台获取更多信息。");
            return false;
        }
    } catch (e) {
        console.error("❌ 保存数据时出错:", e);
        if (e.name === 'QuotaExceededError') {
            alert("❌ 存储空间不足！\n\n请清除浏览器缓存或删除一些数据。");
        } else if (e.name === 'SecurityError') {
            alert("❌ 安全错误：无法访问 LocalStorage！\n\n可能的原因：\n1. 浏览器阻止了本地存储\n2. 网站协议不匹配（http vs https）\n3. 浏览器隐私设置过严");
        } else {
            alert("❌ 保存数据时出错：" + e.message + "\n\n请检查浏览器控制台获取详细信息。");
        }
        return false;
    }
}

// 4. "添加新行" 按钮
document.getElementById("add-row-btn").addEventListener("click", function() {
    const currentData = table.getData();
    const newRow = {
        id: getNextId(currentData), // 使用递增ID
        name: "新链接", 
        type: "youtube", 
        url: "",
        tags: "新"
    };
    console.log("添加新行:", newRow);
    table.addRow(newRow, true); // 添加到表格顶部
    
    // 延迟保存，确保Tabulator内部状态已更新
    setTimeout(() => {
        const updatedData = table.getData();
        console.log("添加行后，当前数据共", updatedData.length, "条");
        saveData(updatedData);
    }, 200);
});

// 5. "备份数据" 按钮
document.getElementById("download-json-btn").addEventListener("click", function() {
    table.download("json", "my_dashboard_backup.json");
});

// 6. 页面加载时的调试信息和调试按钮
function initDebugTools() {
    console.log("=== 页面加载完成 ===");
    
    // 检测 LocalStorage 可用性
    const localStorageAvailable = isLocalStorageAvailable();
    console.log("LocalStorage 可用性:", localStorageAvailable ? "✅ 可用" : "❌ 不可用");
    
    if (!localStorageAvailable) {
        const warningDiv = document.createElement('div');
        warningDiv.style.cssText = 'background-color: #ff4444; color: white; padding: 15px; border-radius: 8px; margin-bottom: 20px; font-weight: bold;';
        warningDiv.innerHTML = '⚠️ 警告：LocalStorage 不可用！数据无法保存。<br>请检查 Arc 浏览器设置 → 隐私 → 允许网站存储数据。';
        const main = document.querySelector('main');
        if (main) {
            main.insertBefore(warningDiv, main.firstChild);
        }
    }
    
    if (!localStorageAvailable) {
        console.error("LocalStorage 不可用，无法读取数据");
        return;
    }
    
    try {
        const savedData = localStorage.getItem(STORAGE_KEY);
        console.log("LocalStorage中的数据:", savedData);
        
        if (savedData) {
            try {
                const parsed = JSON.parse(savedData);
                console.log("解析后的数据:", parsed);
                console.log("数据条数:", parsed.length);
            } catch (e) {
                console.error("解析失败:", e);
            }
        } else {
            console.log("LocalStorage中没有数据，将使用默认数据");
        }
    } catch (e) {
        console.error("读取 LocalStorage 时出错:", e);
    }
    
    // 添加调试按钮
    const debugBtn = document.createElement('button');
    debugBtn.className = 'refresh-btn';
    debugBtn.textContent = '🔍 调试：查看当前数据';
    debugBtn.style.marginLeft = '10px';
    debugBtn.onclick = function() {
        // 首先检查 LocalStorage 是否可用
        const isAvailable = isLocalStorageAvailable();
        console.log("=== LocalStorage 可用性检测 ===");
        console.log("可用:", isAvailable);
        
        if (!isAvailable) {
            alert("❌ LocalStorage 不可用！\n\n请检查：\n1. Arc浏览器设置 → 隐私 → 允许网站存储数据\n2. 是否处于隐私/无痕模式\n3. 浏览器扩展是否阻止了存储");
            return;
        }
        
        // 测试写入和读取
        try {
            const testKey = '__test_write__';
            const testValue = 'test_' + Date.now();
            localStorage.setItem(testKey, testValue);
            const readValue = localStorage.getItem(testKey);
            localStorage.removeItem(testKey);
            console.log("写入测试:", readValue === testValue ? "✅ 成功" : "❌ 失败");
        } catch (e) {
            console.error("写入测试失败:", e);
        }
        
        const currentData = table.getData();
        console.log("=== 当前表格数据 ===");
        console.log("数据条数:", currentData.length);
        console.log("完整数据:", JSON.stringify(currentData, null, 2));
        
        const savedData = localStorage.getItem(STORAGE_KEY);
        console.log("=== LocalStorage中的数据 ===");
        console.log("保存的数据:", savedData);
        
        if (savedData) {
            try {
                const parsed = JSON.parse(savedData);
                console.log("解析后的数据:", parsed);
                console.log("数据是否一致:", JSON.stringify(currentData) === JSON.stringify(parsed));
            } catch (e) {
                console.error("解析失败:", e);
            }
        }
        
        alert("调试信息已输出到控制台，请按F12查看");
    };
    
    const adminControls = document.querySelector('.admin-controls');
    if (adminControls) {
        adminControls.appendChild(debugBtn);
    }
}

// 页面加载完成后初始化调试工具
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initDebugTools);
} else {
    // DOM已经加载完成
    initDebugTools();
}