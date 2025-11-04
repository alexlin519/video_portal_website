// admin_script.js

const STORAGE_KEY = 'mySuperlinksData';

// 默认的初始数据，方便您上手（您可以删除或修改）
const defaultData = [
    {
        id: 1, 
        name: "YouTube 官方频道", 
        type: "youtube", 
        url: "https://www.youtube.com/feeds/videos.xml?channel_id=UCBR8-60-B28hp2GkUhE8RYQ", 
        tags: "官方, 科技"
    },
    {
        id: 2, 
        name: "RSSHub 官方", 
        type: "bilibili", 
        url: "https://rsshub.app/bilibili/user/video/208226022", 
        tags: "B站, 开源"
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
        return JSON.parse(dataString);
    }
    return defaultData; // 返回默认数据
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
    table.addRow({
        id: Math.floor(Math.random() * 10000), // 随机ID
        name: "新链接", 
        type: "youtube", 
        tags: "新"
    }, true); // 添加到表格顶部
});

// 5. "备份数据" 按钮
document.getElementById("download-json-btn").addEventListener("click", function() {
    table.download("json", "my_dashboard_backup.json");
});