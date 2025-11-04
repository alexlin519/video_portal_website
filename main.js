// main.js

const RSS_TO_JSON_API = "https://api.rss2json.com/v1/api.json?rss_url=";
const STORAGE_KEY = 'mySuperlinksData';

// 从 LocalStorage 加载数据
function getMyFollowList() {
    const dataString = localStorage.getItem(STORAGE_KEY);
    return dataString ? JSON.parse(dataString) : [];
}

/**
 * 核心函数：渲染一个视频区块
 * @param {string} containerId - 要渲染到哪个div
 * @param {string} type - 要筛选哪个类型 (e.g., 'youtube', 'bilibili', 'all')
 * @param {number} count - 要随机显示几个
 * @param {boolean} isRefresh - (可选) 是否是用户点击刷新
 */
async function renderSection(containerId, type, count, isRefresh = false) {
    const grid = document.getElementById(containerId);
    grid.innerHTML = `<h3 class="loading-msg">加载中...</h3>`;

    const myFollowList = getMyFollowList();
    if (myFollowList.length === 0) {
        grid.innerHTML = `<h3 class="loading-msg">您的管理后台还没有数据，请先 <a href="admin.html">添加</a>。</h3>`;
        return;
    }

    // 1. 按类型/标签过滤
    let filteredList;
    if (type === 'all') {
        filteredList = myFollowList.filter(item => item.type !== 'collection'); // 随机池不过滤类型，但排除手动合集
    } else {
        filteredList = myFollowList.filter(item => item.type === type);
    }

    // 2. 随机
    const shuffledList = filteredList.sort(() => 0.5 - Math.random());
    const selectedItems = shuffledList.slice(0, count);

    // 3. 获取数据 & 生成卡片
    let htmlContent = "";
    for (const item of selectedItems) {
        let videoTitle = item.name; // 默认标题
        let videoLink = "#";
        let videoThumbnail = "https://via.placeholder.com/300x150?text=No+Image"; // 默认图片
        let infoText = item.name; // 默认信息

        try {
            if (item.type === 'collection') {
                // A. 手动合集
                videoTitle = item.name;
                videoLink = item.url;
                videoThumbnail = item.thumbnail || videoThumbnail; // 允许在后台定义封面
                infoText = "手动合集";
            } else {
                // B. RSS 作者
                const feedUrl = item.url;
                if (!feedUrl) continue;
                
                const response = await fetch(RSS_TO_JSON_API + encodeURIComponent(feedUrl));
                const data = await response.json();
                
                if (data.status !== 'ok' || data.items.length === 0) continue;

                const latestVideo = data.items[0];
                videoTitle = latestVideo.title;
                videoLink = latestVideo.link;
                infoText = data.feed.title || item.name; // UP主/博主的名字

                // 智能获取封面
                if (item.type === 'youtube') {
                    videoThumbnail = latestVideo.thumbnail;
                } else if (item.type === 'bilibili') {
                    // B站RSS (RSSHub) 封面在 description 里
                    const imgMatch = latestVideo.description.match(/<img src="([^"]+)"/);
                    if (imgMatch) videoThumbnail = imgMatch[1];
                } else if (item.type === 'instagram') {
                    // Instagram (RSSHub) 封面也在 description 里
                    const imgMatch = latestVideo.description.match(/<img src="([^"]+)"/);
                    if (imgMatch) videoThumbnail = imgMatch[1];
                }
            }

            // 组装HTML卡片
            htmlContent += `
                <div class="video-card">
                    <a href="${videoLink}" target="_blank" title="${videoTitle}">
                        <img src="${videoThumbnail}" alt="" loading="lazy">
                        <h3>${videoTitle}</h3>
                        <div class="card-info">${infoText}</div>
                    </a>
                </div>
            `;
        } catch (error) {
            console.error("加载失败:", item.name, error);
            htmlContent += `
                <div class="video-card">
                    <a href="#" target="_blank">
                        <img src="${videoThumbnail}" alt="">
                        <h3>${item.name} (加载失败)</h3>
                        <div class="card-info">${error.message}</div>
                    </a>
                </div>`;
        }
    }

    if (htmlContent === "") {
        grid.innerHTML = `<h3 class="loading-msg">没有找到类型为 "${type}" 的内容。</h3>`;
    } else {
        grid.innerHTML = htmlContent;
    }
}