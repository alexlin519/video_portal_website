// main.js

const RSS_TO_JSON_API = "https://api.rss2json.com/v1/api.json?rss_url=";
const STORAGE_KEY = 'mySuperlinksData';

// 从 LocalStorage 加载数据
function getMyFollowList() {
    const dataString = localStorage.getItem(STORAGE_KEY);
    return dataString ? JSON.parse(dataString) : [];
}

/**
 * 将博主主页链接转换为RSS feed URL
 * @param {string} url - 用户输入的URL
 * @param {string} type - 类型 (youtube, bilibili等)
 * @returns {string} RSS feed URL
 */
function convertUrlToRssFeed(url, type) {
    if (!url) return url;
    
    // 如果已经是RSS feed URL，直接返回
    if (url.includes('/feeds/videos.xml') || url.includes('rsshub.app') || url.includes('/rss')) {
        return url;
    }
    
    try {
        if (type === 'youtube') {
            // YouTube频道ID格式: https://www.youtube.com/channel/UCxxxxx
            const channelMatch = url.match(/youtube\.com\/channel\/([^\/\?]+)/);
            if (channelMatch) {
                const channelId = channelMatch[1];
                return `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;
            }
            
            // YouTube博主主页格式: https://www.youtube.com/@username
            const atMatch = url.match(/youtube\.com\/@([^\/\?]+)/);
            if (atMatch) {
                const username = atMatch[1];
                // 使用RSSHub获取YouTube频道RSS (支持@username格式)
                return `https://rsshub.app/youtube/channel/${username}`;
            }
            
            // YouTube用户格式: https://www.youtube.com/user/username
            const userMatch = url.match(/youtube\.com\/user\/([^\/\?]+)/);
            if (userMatch) {
                const username = userMatch[1];
                return `https://rsshub.app/youtube/user/${username}`;
            }
            
            // YouTube短链接格式: https://youtu.be/VIDEO_ID 或 https://www.youtube.com/watch?v=VIDEO_ID
            if (url.includes('/watch?v=') || url.includes('youtu.be/')) {
                return url;
            }
        }
        
        if (type === 'bilibili') {
            // Bilibili UP主主页格式: https://space.bilibili.com/UID
            const spaceMatch = url.match(/space\.bilibili\.com\/(\d+)/);
            if (spaceMatch) {
                const uid = spaceMatch[1];
                return `https://rsshub.app/bilibili/user/video/${uid}`;
            }
            
            // 如果是单个视频链接，直接返回
            if (url.includes('/video/BV')) {
                return url;
            }
        }
    } catch (error) {
        console.error('URL转换失败:', error);
    }
    
    // 如果无法转换，返回原URL
    return url;
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
                let feedUrl = item.url;
                if (!feedUrl) continue;
                
                // 自动转换博主主页链接为RSS feed
                feedUrl = convertUrlToRssFeed(feedUrl, item.type);
                
                // 如果是单个视频链接（不是RSS feed），直接创建卡片
                if (!feedUrl.includes('rsshub.app') && !feedUrl.includes('/feeds/videos.xml') && !feedUrl.includes('/rss')) {
                    // 这是单个视频链接，直接使用
                    videoTitle = item.name;
                    videoLink = feedUrl;
                    infoText = item.type === 'youtube' ? 'YouTube视频' : item.type === 'bilibili' ? 'Bilibili视频' : '视频';
                    // 尝试从URL提取视频ID并获取缩略图
                    if (item.type === 'youtube') {
                        // 支持多种YouTube URL格式
                        let videoId = null;
                        const watchMatch = feedUrl.match(/[?&]v=([^&]+)/);
                        const shortMatch = feedUrl.match(/youtu\.be\/([^?&]+)/);
                        if (watchMatch) {
                            videoId = watchMatch[1];
                        } else if (shortMatch) {
                            videoId = shortMatch[1];
                        }
                        if (videoId) {
                            videoThumbnail = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
                        }
                    } else if (item.type === 'bilibili') {
                        const bvMatch = feedUrl.match(/\/video\/(BV\w+)/);
                        if (bvMatch) {
                            // B站视频封面可以通过API获取，这里先用默认图片
                            videoThumbnail = item.thumbnail || videoThumbnail;
                        }
                    }
                } else {
                    // 这是RSS feed，获取最新视频
                    const response = await fetch(RSS_TO_JSON_API + encodeURIComponent(feedUrl));
                    const data = await response.json();
                    
                    if (data.status !== 'ok' || data.items.length === 0) continue;

                    const latestVideo = data.items[0];
                    videoTitle = latestVideo.title;
                    videoLink = latestVideo.link;
                    infoText = data.feed.title || item.name; // UP主/博主的名字

                    // 智能获取封面 - 多种方式尝试
                    if (item.type === 'youtube') {
                        // YouTube: 优先使用RSS返回的thumbnail
                        videoThumbnail = latestVideo.thumbnail || latestVideo.media?.thumbnail?.url || videoThumbnail;
                        
                        // 如果thumbnail不存在，尝试从视频链接提取ID获取缩略图
                        if (!videoThumbnail || videoThumbnail.includes('placeholder')) {
                            const videoIdMatch = videoLink.match(/[?&]v=([^&]+)/);
                            if (videoIdMatch) {
                                videoThumbnail = `https://img.youtube.com/vi/${videoIdMatch[1]}/maxresdefault.jpg`;
                            }
                        }
                    } else if (item.type === 'bilibili') {
                        // B站RSS (RSSHub) 封面在 description 里
                        const imgMatch = latestVideo.description?.match(/<img[^>]+src=["']([^"']+)["']/i);
                        if (imgMatch) {
                            videoThumbnail = imgMatch[1];
                        } else if (latestVideo.thumbnail) {
                            videoThumbnail = latestVideo.thumbnail;
                        } else if (latestVideo.media?.thumbnail?.url) {
                            videoThumbnail = latestVideo.media.thumbnail.url;
                        }
                        
                        // 如果还是没找到，尝试从视频链接提取BV号
                        if (!videoThumbnail || videoThumbnail.includes('placeholder')) {
                            const bvMatch = videoLink.match(/\/video\/(BV\w+)/);
                            if (bvMatch) {
                                // B站视频封面可以通过API获取，这里先用默认图片
                                videoThumbnail = item.thumbnail || videoThumbnail;
                            }
                        }
                    } else if (item.type === 'instagram') {
                        // Instagram (RSSHub) 封面也在 description 里
                        const imgMatch = latestVideo.description?.match(/<img[^>]+src=["']([^"']+)["']/i);
                        if (imgMatch) {
                            videoThumbnail = imgMatch[1];
                        } else if (latestVideo.thumbnail) {
                            videoThumbnail = latestVideo.thumbnail;
                        } else if (latestVideo.media?.thumbnail?.url) {
                            videoThumbnail = latestVideo.media.thumbnail.url;
                        }
                    }
                }
            }

            // 组装HTML卡片 - 添加图片加载失败处理
            // 转义HTML特殊字符，防止XSS攻击
            function escapeHtml(text) {
                const div = document.createElement('div');
                div.textContent = text;
                return div.innerHTML;
            }
            
            const escapedTitle = escapeHtml(videoTitle);
            const escapedInfo = escapeHtml(infoText);
            const escapedLink = escapeHtml(videoLink);
            const escapedThumbnail = escapeHtml(videoThumbnail);
            const shortTitle = videoTitle.substring(0, 20).replace(/[^\w\s\u4e00-\u9fa5]/g, '');
            
            htmlContent += `
                <div class="video-card">
                    <a href="${escapedLink}" target="_blank" title="${escapedTitle}">
                        <img src="${escapedThumbnail}" 
                             alt="${escapedTitle}" 
                             loading="lazy"
                             onerror="this.onerror=null; this.src='https://via.placeholder.com/300x150?text='+encodeURIComponent('${shortTitle}');">
                        <h3>${escapedTitle}</h3>
                        <div class="card-info">${escapedInfo}</div>
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