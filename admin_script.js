// admin_script.js

const STORAGE_KEY = 'mySuperlinksData';

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
    const dataString = localStorage.getItem(STORAGE_KEY);
    if (dataString && dataString.length > 2) { // 检查是否为空数组
        try {
            return JSON.parse(dataString);
        } catch (e) {
            console.error("解析数据失败:", e);
            return defaultData;
        }
    }
    return defaultData; // 返回默认数据
}

// 获取下一个可用的ID
function getNextId() {
    const data = loadData();
    if (data.length === 0) return 1;
    const maxId = Math.max(...data.map(item => item.id || 0));
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
        // 如果编辑的是URL或类型，自动转换URL
        const field = cell.getField();
        if (field === 'url' || field === 'type') {
            const row = cell.getRow();
            const rowData = row.getData();
            if (field === 'type' && rowData.url) {
                // 类型改变时，重新转换URL
                const convertedUrl = convertUrlToRss(rowData.url, rowData.type);
                if (convertedUrl !== rowData.url) {
                    row.update({ url: convertedUrl });
                }
            } else if (field === 'url' && rowData.type) {
                // URL改变时，根据类型转换
                const convertedUrl = convertUrlToRss(rowData.url, rowData.type);
                if (convertedUrl !== rowData.url) {
                    row.update({ url: convertedUrl });
                }
            }
        }
        saveData(table.getData());
    },
    dataChanged: function(data) {
        saveData(data);
    },
    rowMoved: function(row) {
        saveData(table.getData());
    },
    rowDeleted: function(row) {
        saveData(table.getData());
    }
});

// 3. 保存数据到 LocalStorage
function saveData(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    console.log("数据已自动保存！");
}

// 4. "添加新行" 按钮
document.getElementById("add-row-btn").addEventListener("click", function() {
    const newRow = {
        id: getNextId(), // 使用递增ID
        name: "新链接", 
        type: "youtube", 
        url: "",
        tags: "新"
    };
    table.addRow(newRow, true); // 添加到表格顶部
    saveData(table.getData()); // 立即保存
});

// 5. "备份数据" 按钮
document.getElementById("download-json-btn").addEventListener("click", function() {
    table.download("json", "my_dashboard_backup.json");
});