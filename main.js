// main.js

const RSS_TO_JSON_API = "https://api.rss2json.com/v1/api.json?rss_url=";
const DATA_FILE = 'data.json'; // 静态数据文件

/**
 * 直接解析RSS feed XML（当RSS2JSON API失败时使用）
 * @param {string} xmlText - RSS XML文本
 * @returns {Object} 解析后的数据
 */
function parseRSSFeed(xmlText) {
    try {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
        
        // 检查是否有解析错误
        const parserError = xmlDoc.querySelector('parsererror');
        if (parserError) {
            console.error('RSS解析错误:', parserError.textContent);
            return null;
        }
        
        const feed = xmlDoc.querySelector('feed'); // Atom格式
        const channel = xmlDoc.querySelector('channel'); // RSS格式
        
        let feedTitle = '';
        let items = [];
        
        if (feed) {
            // Atom格式
            feedTitle = feed.querySelector('title')?.textContent || '';
            const entries = feed.querySelectorAll('entry');
            items = Array.from(entries).map(entry => {
                const title = entry.querySelector('title')?.textContent || '';
                const link = entry.querySelector('link')?.getAttribute('href') || entry.querySelector('link')?.textContent || '';
                const published = entry.querySelector('published')?.textContent || entry.querySelector('updated')?.textContent || '';
                
                // 获取缩略图
                let thumbnail = '';
                const mediaThumbnail = entry.querySelector('media\\:thumbnail, thumbnail');
                if (mediaThumbnail) {
                    thumbnail = mediaThumbnail.getAttribute('url') || mediaThumbnail.textContent || '';
                }
                
                // 如果没有，尝试从媒体组获取
                const mediaGroup = entry.querySelector('media\\:group, group');
                if (mediaGroup && !thumbnail) {
                    const thumb = mediaGroup.querySelector('media\\:thumbnail, thumbnail');
                    if (thumb) {
                        thumbnail = thumb.getAttribute('url') || thumb.textContent || '';
                    }
                }
                
                return { title, link, published, thumbnail };
            });
        } else if (channel) {
            // RSS格式
            feedTitle = channel.querySelector('title')?.textContent || '';
            const itemElements = channel.querySelectorAll('item');
            items = Array.from(itemElements).map(item => {
                const title = item.querySelector('title')?.textContent || '';
                const link = item.querySelector('link')?.textContent || '';
                const pubDate = item.querySelector('pubDate')?.textContent || '';
                
                // 获取缩略图
                let thumbnail = '';
                const mediaThumbnail = item.querySelector('media\\:thumbnail, thumbnail');
                if (mediaThumbnail) {
                    thumbnail = mediaThumbnail.getAttribute('url') || mediaThumbnail.textContent || '';
                }
                
                // 尝试从enclosure获取
                const enclosure = item.querySelector('enclosure');
                if (enclosure && enclosure.getAttribute('type')?.startsWith('image/')) {
                    thumbnail = enclosure.getAttribute('url') || '';
                }
                
                return { title, link, published: pubDate, thumbnail };
            });
        }
        
        return {
            status: 'ok',
            feed: { title: feedTitle },
            items: items
        };
    } catch (e) {
        console.error('解析RSS feed时出错:', e);
        return null;
    }
}

// 从 JSON 文件加载数据
let cachedData = null; // 缓存数据，避免重复加载

async function getMyFollowList() {
    // 如果已有缓存，直接返回
    if (cachedData !== null) {
        return cachedData;
    }
    
    try {
        const response = await fetch(DATA_FILE);
        if (!response.ok) {
            console.error('加载数据文件失败:', response.statusText);
            return [];
        }
        const data = await response.json();
        cachedData = data;
        console.log('✅ 成功加载数据，共', data.length, '条记录');
        return data;
    } catch (error) {
        console.error('❌ 加载数据文件时出错:', error);
        return [];
    }
}

/**
 * 清理和验证视频链接，确保链接格式正确
 * @param {string} link - RSS返回的视频链接
 * @param {string} type - 类型 (youtube, bilibili等)
 * @returns {string} 清理后的视频链接
 */
function cleanVideoLink(link, type) {
    if (!link) return link;
    
    try {
        // 移除可能的跟踪参数和多余参数
        const url = new URL(link);
        
        if (type === 'youtube') {
            // YouTube: 确保是标准的 watch?v= 格式
            const videoId = url.searchParams.get('v');
            if (videoId) {
                // 清理所有参数，只保留 v 参数
                return `https://www.youtube.com/watch?v=${videoId}`;
            }
            // 如果是短链接格式，保持原样
            if (link.includes('youtu.be/')) {
                return link.split('?')[0]; // 移除参数
            }
        } else if (type === 'bilibili') {
            // Bilibili: 确保是标准的 /video/BV 格式
            const bvMatch = link.match(/\/video\/(BV\w+)/);
            if (bvMatch) {
                const bvId = bvMatch[1];
                return `https://www.bilibili.com/video/${bvId}/`;
            }
            // 如果已经是完整链接，清理参数
            if (link.includes('bilibili.com/video/')) {
                const cleanUrl = link.split('?')[0].split('#')[0];
                // 确保以 / 结尾
                return cleanUrl.endsWith('/') ? cleanUrl : cleanUrl + '/';
            }
        }
        
        // 默认：移除跟踪参数
        const cleanUrl = link.split('?')[0].split('#')[0];
        return cleanUrl;
    } catch (e) {
        console.warn('清理链接时出错，使用原链接:', e);
        return link;
    }
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

    const myFollowList = await getMyFollowList(); // 等待数据加载完成
    console.log(`[${type}] 加载数据，共 ${myFollowList.length} 条记录`);
    
    if (myFollowList.length === 0) {
        grid.innerHTML = `<h3 class="loading-msg">数据文件为空或加载失败，请检查 data.json 文件。</h3>`;
        return;
    }

    // 1. 按类型/标签过滤
    let filteredList;
    if (type === 'all') {
        filteredList = myFollowList.filter(item => item.type !== 'collection'); // 随机池不过滤类型，但排除手动合集
    } else {
        filteredList = myFollowList.filter(item => item.type === type);
    }
    
    console.log(`[${type}] 过滤后，共 ${filteredList.length} 条记录`);
    
    if (filteredList.length === 0) {
        grid.innerHTML = `<h3 class="loading-msg">没有找到类型为 "${type}" 的内容。请检查 data.json 文件。</h3>`;
        return;
    }

    // 2. 随机
    const shuffledList = filteredList.sort(() => 0.5 - Math.random());
    const selectedItems = shuffledList.slice(0, count);
    console.log(`[${type}] 选择了 ${selectedItems.length} 个项目`);

    // 3. 获取数据 & 生成卡片
    let htmlContent = "";
    for (const item of selectedItems) {
        let videoTitle = item.name; // 默认标题
        let videoLink = "#";
        let videoThumbnail = "https://via.placeholder.com/300x150?text=No+Image"; // 默认图片
        let infoText = item.name; // 默认信息

        try {
            if (item.type === 'collection') {
                // A. 手动合集/单个视频
                videoTitle = item.name;
                videoLink = cleanVideoLink(item.url, 'youtube'); // 先尝试youtube，如果不是会返回原链接
                videoLink = cleanVideoLink(videoLink, 'bilibili'); // 再尝试bilibili
                
                // 尝试从URL提取缩略图
                if (!item.thumbnail) {
                    // YouTube视频缩略图
                    const youtubeMatch = videoLink.match(/[?&]v=([^&]+)/) || videoLink.match(/\/shorts\/([^?&]+)/);
                    if (youtubeMatch) {
                        videoThumbnail = `https://img.youtube.com/vi/${youtubeMatch[1]}/maxresdefault.jpg`;
                    } else {
                        // Bilibili视频缩略图 - 使用B站API获取
                        const bvMatch = videoLink.match(/\/video\/(BV\w+)/);
                        if (bvMatch) {
                            const bvId = bvMatch[1];
                            // 使用B站API获取封面（需要CORS代理，但先尝试直接访问）
                            try {
                                const biliApiUrl = `https://api.bilibili.com/x/web-interface/view?bvid=${bvId}`;
                                // 注意：由于CORS限制，这个可能无法直接使用
                                // 作为备选，使用已知的B站图片URL格式
                                videoThumbnail = `https://i0.hdslb.com/bfs/archive/${bvId}.jpg`; // 这个可能不工作
                                // 更好的方案：使用SVG占位符或让用户提供thumbnail
                            } catch (e) {
                                console.warn('获取B站封面失败:', e);
                            }
                        }
                    }
                } else {
                    videoThumbnail = item.thumbnail;
                }
                
                // 如果还是没有缩略图，使用SVG占位符
                if (!videoThumbnail || videoThumbnail === "https://via.placeholder.com/300x150?text=No+Image") {
                    // 生成一个简单的SVG占位符，显示标题
                    const titleEncoded = encodeURIComponent(item.name.substring(0, 20));
                    videoThumbnail = `data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='300' height='150'><rect fill='%231e1e1e' width='300' height='150'/><text x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%23888' font-size='14' font-family='sans-serif'>${titleEncoded}</text></svg>`;
                }
                
                infoText = "手动合集";
            } else {
                // B. RSS 作者
                let feedUrl = item.url;
                if (!feedUrl) continue;
                
                // 自动转换博主主页链接为RSS feed
                feedUrl = convertUrlToRssFeed(feedUrl, item.type);
                
                // 如果是单个视频链接（不是RSS feed），直接创建卡片
                if (!feedUrl.includes('rsshub.app') && !feedUrl.includes('/feeds/videos.xml') && !feedUrl.includes('/rss')) {
                    // 这是单个视频链接，清理后使用
                    videoTitle = item.name;
                    videoLink = cleanVideoLink(feedUrl, item.type);
                    console.log(`[${item.name}] 单个视频链接清理后:`, videoLink);
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
                    try {
                        // 首先尝试使用RSS2JSON API
                        let data = null;
                        try {
                            const apiResponse = await fetch(RSS_TO_JSON_API + encodeURIComponent(feedUrl));
                            if (apiResponse.ok) {
                                const apiData = await apiResponse.json();
                                if (apiData.status === 'ok' && apiData.items && apiData.items.length > 0) {
                                    data = apiData;
                                }
                            }
                        } catch (apiError) {
                            console.warn(`[${item.name}] RSS2JSON API失败，尝试直接解析:`, apiError);
                        }
                        
                        // 如果API失败，直接获取并解析RSS feed
                        if (!data) {
                            console.log(`[${item.name}] 直接解析RSS feed:`, feedUrl);
                            const rssResponse = await fetch(feedUrl);
                            if (rssResponse.ok) {
                                const xmlText = await rssResponse.text();
                                data = parseRSSFeed(xmlText);
                            } else {
                                throw new Error(`RSS feed请求失败: ${rssResponse.status}`);
                            }
                        }
                        
                        if (!data || data.status !== 'ok' || !data.items || data.items.length === 0) {
                            console.warn(`[${item.name}] RSS feed 返回的数据无效或为空`);
                            // 即使RSS失败，也显示一个卡片
                            videoTitle = item.name;
                            videoLink = feedUrl;
                            infoText = item.type === 'youtube' ? 'YouTube频道' : item.type === 'bilibili' ? 'Bilibili UP主' : '频道';
                            
                            // 生成SVG占位符
                            const titleEncoded = encodeURIComponent(item.name.substring(0, 20));
                            videoThumbnail = `data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='300' height='150'><rect fill='%231e1e1e' width='300' height='150'/><text x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%23888' font-size='14' font-family='sans-serif'>${titleEncoded}</text></svg>`;
                        } else {
                            const latestVideo = data.items[0];
                            videoTitle = latestVideo.title;
                            
                            // 获取并清理视频链接
                            let rawLink = latestVideo.link;
                            console.log(`[${item.name}] RSS返回的原始链接:`, rawLink);
                            
                            // 清理和验证链接
                            videoLink = cleanVideoLink(rawLink, item.type);
                            console.log(`[${item.name}] 清理后的链接:`, videoLink);
                            
                            infoText = data.feed.title || item.name; // UP主/博主的名字

                            // 智能获取封面 - 多种方式尝试
                            if (item.type === 'youtube') {
                                // YouTube: 优先使用RSS返回的thumbnail
                                videoThumbnail = latestVideo.thumbnail || latestVideo.media?.thumbnail?.url || '';
                                
                                // 如果thumbnail不存在，尝试从视频链接提取ID获取缩略图
                                if (!videoThumbnail || videoThumbnail.includes('placeholder')) {
                                    const videoIdMatch = videoLink.match(/[?&]v=([^&]+)/) || videoLink.match(/\/shorts\/([^?&]+)/);
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
                                        videoThumbnail = item.thumbnail || '';
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
                            
                            // 如果还是没有缩略图，使用SVG占位符
                            if (!videoThumbnail || videoThumbnail.includes('placeholder')) {
                                const titleEncoded = encodeURIComponent(videoTitle.substring(0, 20));
                                videoThumbnail = `data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='300' height='150'><rect fill='%231e1e1e' width='300' height='150'/><text x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%23888' font-size='14' font-family='sans-serif'>${titleEncoded}</text></svg>`;
                            }
                        }
                    } catch (fetchError) {
                        console.error(`[${item.name}] 获取RSS feed时出错:`, fetchError);
                        // 即使出错，也显示一个卡片
                        videoTitle = item.name;
                        videoLink = feedUrl;
                        infoText = item.type === 'youtube' ? 'YouTube频道' : item.type === 'bilibili' ? 'Bilibili UP主' : '频道';
                        
                        // 生成SVG占位符
                        const titleEncoded = encodeURIComponent(item.name.substring(0, 20));
                        videoThumbnail = `data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='300' height='150'><rect fill='%231e1e1e' width='300' height='150'/><text x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%23888' font-size='14' font-family='sans-serif'>${titleEncoded}</text></svg>`;
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
            
            // 如果缩略图是data URI（SVG），不需要转义
            const escapedThumbnail = videoThumbnail.startsWith('data:') ? videoThumbnail : escapeHtml(videoThumbnail);
            
            htmlContent += `
                <div class="video-card">
                    <a href="${escapedLink}" target="_blank" title="${escapedTitle}">
                        <img src="${escapedThumbnail}" 
                             alt="${escapedTitle}" 
                             loading="lazy"
                             style="background-color: #1e1e1e; min-height: 150px;">
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