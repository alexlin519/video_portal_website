// main.js - Folo-style UI with categories and subcategories

const DATA_FILE = 'data.json';

// ============================================
// CONFIGURATION - Easy to edit variables
// ============================================
// Maximum number of items to show for categories (first level)
const MAX_ITEMS_CATEGORY = 1;

// Maximum number of items to show for classes/subcategories (second level)
const MAX_ITEMS_CLASS =1;

// Maximum number of items for Daily Random category
const MAX_ITEMS_DAILY_RANDOM = 1;
// ============================================

// State management
let cachedData = null;
let currentCategoryId = null;
let currentSubcategoryId = null;
let expandedCategories = new Set();
let expandedSubcategories = new Set();
let showAllCategory = false; // Show all items for current category
let showAllSubcategory = false; // Show all items for current subcategory

// Load data from JSON file
async function getData() {
    if (cachedData !== null) {
        return cachedData;
    }
    
    try {
        const response = await fetch(DATA_FILE);
        if (!response.ok) {
            console.error('加载数据文件失败:', response.statusText);
            return null;
        }
        const data = await response.json();
        cachedData = data;
        console.log('✅ 成功加载数据');
        return data;
    } catch (error) {
        console.error('❌ 加载数据文件时出错:', error);
        return null;
    }
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Extract YouTube video ID from URL
function getYouTubeVideoId(url) {
    const patterns = [
        /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)([^&\n?#]+)/,
        /youtube\.com\/shorts\/([^&\n?#]+)/
    ];
    
    for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match) return match[1];
    }
    return null;
}

// Extract YouTube channel ID or username from URL
function getYouTubeChannelInfo(url) {
    // Channel ID format: /channel/UCxxxxx
    const channelMatch = url.match(/youtube\.com\/channel\/([^\/\?]+)/);
    if (channelMatch) return { type: 'channel', id: channelMatch[1] };
    
    // Username format: /@username or /user/username
    const userMatch = url.match(/youtube\.com\/(?:@|user\/)([^\/\?]+)/);
    if (userMatch) return { type: 'user', id: userMatch[1] };
    
    return null;
}

// Extract Bilibili video BV number from URL
function getBilibiliVideoId(url) {
    const match = url.match(/\/video\/(BV\w+)/);
    return match ? match[1] : null;
}

// Extract Bilibili UID from URL
function getBilibiliUID(url) {
    const match = url.match(/space\.bilibili\.com\/(\d+)/);
    return match ? match[1] : null;
}

// Get thumbnail URL for a video link
function getThumbnailUrl(url) {
    if (!url) return null;
    
    // YouTube video
    const youtubeVideoId = getYouTubeVideoId(url);
    if (youtubeVideoId) {
        return `https://img.youtube.com/vi/${youtubeVideoId}/maxresdefault.jpg`;
    }
    
    // YouTube channel/user - use oEmbed or default
    const youtubeChannel = getYouTubeChannelInfo(url);
    if (youtubeChannel) {
        // For channels, we can't easily get thumbnails, return null
        return null;
    }
    
    // Bilibili video
    const bvId = getBilibiliVideoId(url);
    if (bvId) {
        // Bilibili doesn't have a simple thumbnail API, but we can try
        // The actual thumbnail would require API call, so we'll leave it for now
        return null;
    }
    
    // Bilibili user/space
    const bilibiliUID = getBilibiliUID(url);
    if (bilibiliUID) {
        return null;
    }
    
    return null;
}

// Count items in a category (including subcategories)
function countItems(category, data) {
    // For Daily Random, count all items from all categories
    if (category.isRandom && data) {
        return collectAllItems(data).length;
    }
    
    let count = 0;
    if (category.items) {
        count += category.items.length;
    }
    if (category.subcategories) {
        category.subcategories.forEach(sub => {
            if (sub.items) {
                count += sub.items.length;
            }
        });
    }
    return count;
}

// Count items in a subcategory
function countSubcategoryItems(subcategory) {
    return subcategory.items ? subcategory.items.length : 0;
}

// Render sidebar with categories
async function renderSidebar() {
    const data = await getData();
    if (!data || !data.categories) {
        console.error('数据格式错误');
        return;
    }

    const sidebarNav = document.getElementById('sidebar-nav');
    let html = '';

    data.categories.forEach(category => {
        const itemCount = countItems(category, data);
        const hasSubcategories = category.subcategories && category.subcategories.length > 0;
        const isExpanded = expandedCategories.has(category.id);
        const isActive = currentCategoryId === category.id && !currentSubcategoryId;

        // Category header
        html += `
            <div class="category" data-category-id="${category.id}">
                <div class="category-header ${isActive ? 'active' : ''}" 
                     onclick="selectCategory('${category.id}')">
                    <div class="category-header-content">
                        ${hasSubcategories ? `
                            <span class="category-toggle ${isExpanded ? 'expanded' : ''}" 
                                  onclick="event.stopPropagation(); toggleCategory('${category.id}')">
                                ▶
                            </span>
                        ` : ''}
                        <span class="category-icon">${category.icon || '📁'}</span>
                        <span class="category-name">${escapeHtml(category.name)}</span>
                    </div>
                    <span class="category-count">${itemCount}</span>
                </div>`;

        // Subcategories
        if (hasSubcategories) {
            const subcategoriesClass = isExpanded ? 'expanded' : 'collapsed';
            html += `<div class="subcategories ${subcategoriesClass}">`;
            
            category.subcategories.forEach(subcategory => {
                const subCount = countSubcategoryItems(subcategory);
                const isSubActive = currentSubcategoryId === subcategory.id;
                
                html += `
                    <div class="subcategory" data-subcategory-id="${subcategory.id}">
                        <div class="subcategory-header ${isSubActive ? 'active' : ''}" 
                             onclick="selectSubcategory('${category.id}', '${subcategory.id}')">
                            <span class="subcategory-name">${escapeHtml(subcategory.name)}</span>
                            <span class="subcategory-count">${subCount}</span>
                        </div>
                    </div>
                `;
            });
            
            html += `</div>`;
        }

        html += `</div>`;
    });

    sidebarNav.innerHTML = html;
}

// Toggle category expansion
function toggleCategory(categoryId) {
    if (expandedCategories.has(categoryId)) {
        expandedCategories.delete(categoryId);
    } else {
        expandedCategories.add(categoryId);
    }
    renderSidebar();
}

// Collect all items from all categories (for Daily Random)
function collectAllItems(data) {
    const allItems = [];
    
    data.categories.forEach(category => {
        // Skip daily random itself
        if (category.id === 'daily-random') return;
        
        // Add direct items
        if (category.items) {
            category.items.forEach(item => {
                allItems.push({...item, source: category.name});
            });
        }
        
        // Add items from subcategories
        if (category.subcategories) {
            category.subcategories.forEach(sub => {
                if (sub.items) {
                    sub.items.forEach(item => {
                        allItems.push({...item, source: `${category.name} - ${sub.name}`});
                    });
                }
            });
        }
    });
    
    return allItems;
}

// Shuffle array randomly
function shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

// Select a category
async function selectCategory(categoryId) {
    currentCategoryId = categoryId;
    currentSubcategoryId = null;
    showAllSubcategory = false; // Reset subcategory show all
    
    const data = await getData();
    if (!data || !data.categories) return;

    const category = data.categories.find(cat => cat.id === categoryId);
    if (!category) return;

    let items = [];
    
    // Handle Daily Random category
    if (category.isRandom) {
        const allItems = collectAllItems(data);
        const maxItems = category.maxItems || MAX_ITEMS_DAILY_RANDOM;
        const shuffled = shuffleArray(allItems);
        items = shuffled.slice(0, Math.min(maxItems, shuffled.length));
    } else {
        // Regular category - get direct items
        items = category.items || [];
        
        // Always randomize order
        items = shuffleArray(items);
        
        // Apply maxItems limit if not showing all
        if (!showAllCategory && items.length > 0) {
            const maxItems = category.maxItems || MAX_ITEMS_CATEGORY;
            if (items.length > maxItems) {
                items = items.slice(0, maxItems);
            }
        }
    }

    // Render items
    renderContent(items, category.name, category.icon);

    // Update UI
    renderSidebar();
    updateContentHeader(category.name, category.icon);
    document.getElementById('refresh-btn').style.display = 'inline-block';
    updateShowAllButton();
}

// Select a subcategory
async function selectSubcategory(categoryId, subcategoryId) {
    currentCategoryId = categoryId;
    currentSubcategoryId = subcategoryId;
    showAllCategory = false; // Reset category show all
    
    const data = await getData();
    if (!data || !data.categories) return;

    const category = data.categories.find(cat => cat.id === categoryId);
    if (!category || !category.subcategories) return;

    const subcategory = category.subcategories.find(sub => sub.id === subcategoryId);
    if (!subcategory) return;

    // Expand parent category if collapsed
    if (!expandedCategories.has(categoryId)) {
        expandedCategories.add(categoryId);
    }

    // Get items
    let items = subcategory.items || [];
    
    // Always randomize order
    items = shuffleArray(items);
    
    // Apply maxItems limit if not showing all
    if (!showAllSubcategory && items.length > 0) {
        const maxItems = subcategory.maxItems || MAX_ITEMS_CLASS;
        if (items.length > maxItems) {
            items = items.slice(0, maxItems);
        }
    }

    // Render items
    renderContent(items, subcategory.name, category.icon);

    // Update UI
    renderSidebar();
    updateContentHeader(subcategory.name, category.icon);
    document.getElementById('refresh-btn').style.display = 'inline-block';
    updateShowAllButton();
}

// Render content (buttons)
function renderContent(items, title, icon) {
    const contentBody = document.getElementById('content-body');
    
    if (!items || items.length === 0) {
        contentBody.innerHTML = `
            <div class="empty-state">
                <p>此分类下暂无内容</p>
            </div>
        `;
        return;
    }

    let html = '<div class="button-grid">';
    
    items.forEach((item, index) => {
        const buttonText = item.text || item.name || '未命名';
        const videoUrl = item.url || '#';
        const thumbnailUrl = getThumbnailUrl(videoUrl);
        const itemId = `item-${item.id || index}`;
        
        // Get thumbnail if available, otherwise use default
        const hasThumbnail = thumbnailUrl !== null;
        
        html += `
            <div class="video-button-wrapper" data-item-id="${itemId}">
                <a href="${escapeHtml(videoUrl)}" target="_blank" class="video-button ${hasThumbnail ? 'has-thumbnail' : ''}" 
                   title="${escapeHtml(buttonText)}"
                   data-url="${escapeHtml(videoUrl)}">
                    ${hasThumbnail ? `
                        <img src="${escapeHtml(thumbnailUrl)}" alt="${escapeHtml(buttonText)}" 
                             class="button-thumbnail" loading="lazy" 
                             onerror="this.style.display='none'; this.parentElement.classList.remove('has-thumbnail');">
                    ` : ''}
                    <span class="button-text">${escapeHtml(buttonText)}</span>
                </a>
                <div class="preview-container" id="preview-${itemId}"></div>
            </div>
        `;
    });
    
    html += '</div>';
    contentBody.innerHTML = html;
    
    // Add hover preview functionality
    setupHoverPreview();
}

// Setup hover preview for buttons
function setupHoverPreview() {
    const buttons = document.querySelectorAll('.video-button');
    let previewTimeout = null;
    let activePreview = null;
    let activeButton = null;
    
    buttons.forEach(button => {
        const url = button.getAttribute('data-url');
        const wrapper = button.closest('.video-button-wrapper');
        const previewContainer = wrapper.querySelector('.preview-container');
        
        button.addEventListener('mouseenter', () => {
            // Clear any existing timeout
            if (previewTimeout) {
                clearTimeout(previewTimeout);
            }
            
            // Show preview after a short delay
            previewTimeout = setTimeout(() => {
                showPreview(url, previewContainer, button);
                activePreview = previewContainer;
                activeButton = button;
            }, 500); // 500ms delay before showing preview
        });
        
        button.addEventListener('mouseleave', () => {
            if (previewTimeout) {
                clearTimeout(previewTimeout);
            }
            hidePreview(previewContainer);
            if (activePreview === previewContainer) {
                activePreview = null;
                activeButton = null;
            }
        });
    });
    
    // Update preview position on scroll
    let scrollUpdateTimeout = null;
    window.addEventListener('scroll', () => {
        if (scrollUpdateTimeout) {
            clearTimeout(scrollUpdateTimeout);
        }
        scrollUpdateTimeout = setTimeout(() => {
            if (activePreview && activeButton && activePreview.classList.contains('active')) {
                positionPreview(activePreview, activeButton);
            }
        }, 10);
    }, { passive: true });
}

// Show preview on hover
function showPreview(url, container, button) {
    if (!url || url === '#') return;
    
    // Check if it's a YouTube or Bilibili link
    const youtubeVideoId = getYouTubeVideoId(url);
    const bvId = getBilibiliVideoId(url);
    
    let previewHtml = '';
    
    if (youtubeVideoId) {
        // YouTube video embed
        previewHtml = `
            <iframe 
                src="https://www.youtube.com/embed/${youtubeVideoId}?autoplay=0&mute=1" 
                frameborder="0" 
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                allowfullscreen
                class="preview-iframe">
            </iframe>
        `;
    } else if (bvId) {
        // Bilibili video embed
        previewHtml = `
            <iframe 
                src="https://player.bilibili.com/player.html?bvid=${bvId}&autoplay=0&page=1" 
                frameborder="0" 
                allowfullscreen
                class="preview-iframe">
            </iframe>
        `;
    } else {
        // For other links, show a simple preview with the URL
        const thumbnailUrl = getThumbnailUrl(url);
        if (thumbnailUrl) {
            previewHtml = `
                <img src="${escapeHtml(thumbnailUrl)}" alt="Preview" class="preview-image">
            `;
        } else {
            // Show a simple preview box
            previewHtml = `
                <div class="preview-placeholder">
                    <p>${escapeHtml(url)}</p>
                </div>
            `;
        }
    }
    
    container.innerHTML = previewHtml;
    container.classList.add('active');
    
    // Position preview near the button
    positionPreview(container, button);
}

// Hide preview
function hidePreview(container) {
    container.classList.remove('active');
    // Clear content after animation
    setTimeout(() => {
        if (!container.classList.contains('active')) {
            container.innerHTML = '';
        }
    }, 200);
}

// Position preview container relative to button
function positionPreview(container, button) {
    const rect = button.getBoundingClientRect();
    const scrollX = window.pageXOffset || document.documentElement.scrollLeft;
    const scrollY = window.pageYOffset || document.documentElement.scrollTop;
    
    // Position to the right of the button
    let left = rect.right + scrollX + 20;
    let top = rect.top + scrollY;
    
    // Check if preview would go off screen horizontally
    if (left + 560 > window.innerWidth + scrollX) {
        // Position to the left instead
        left = rect.left + scrollX - 560 - 20;
    }
    
    // Check if preview would go off screen vertically
    if (top + 315 > window.innerHeight + scrollY) {
        top = window.innerHeight + scrollY - 315 - 20;
    }
    
    if (top < scrollY + 20) top = scrollY + 20;
    if (left < scrollX + 20) left = scrollX + 20;
    
    container.style.left = `${left}px`;
    container.style.top = `${top}px`;
}

// Update content header
function updateContentHeader(title, icon) {
    const contentTitle = document.getElementById('content-title');
    contentTitle.textContent = `${icon || ''} ${title}`;
}

// Update show all checkbox visibility
function updateShowAllButton() {
    const showAllCheckbox = document.getElementById('show-all-checkbox');
    const showAllLabel = document.getElementById('show-all-label');
    if (showAllCheckbox && showAllLabel) {
        // Show checkbox only for categories/subcategories (not daily random)
        const data = cachedData;
        if (data && data.categories) {
            const category = data.categories.find(cat => cat.id === currentCategoryId);
            if (category && !category.isRandom) {
                showAllCheckbox.style.display = 'inline-block';
                showAllLabel.style.display = 'inline-block';
                if (currentSubcategoryId) {
                    showAllCheckbox.checked = showAllSubcategory;
                } else {
                    showAllCheckbox.checked = showAllCategory;
                }
            } else {
                showAllCheckbox.style.display = 'none';
                showAllLabel.style.display = 'none';
            }
        }
    }
}

// Toggle show all for current category/subcategory
function toggleShowAll() {
    const checkbox = document.getElementById('show-all-checkbox');
    if (!checkbox) return;
    
    if (currentSubcategoryId) {
        showAllSubcategory = checkbox.checked;
    } else {
        showAllCategory = checkbox.checked;
    }
    
    // Refresh current view
    if (currentSubcategoryId) {
        selectSubcategory(currentCategoryId, currentSubcategoryId);
    } else if (currentCategoryId) {
        selectCategory(currentCategoryId);
    }
}

// Refresh current category (Random)
function refreshCurrentCategory() {
    // Reset show all when refreshing
    showAllCategory = false;
    showAllSubcategory = false;
    
    // Update checkbox state
    const checkbox = document.getElementById('show-all-checkbox');
    if (checkbox) {
        checkbox.checked = false;
    }
    
    if (currentSubcategoryId) {
        selectSubcategory(currentCategoryId, currentSubcategoryId);
    } else if (currentCategoryId) {
        selectCategory(currentCategoryId);
    }
}

// Initialize app
async function initApp() {
    await renderSidebar();
    
    // Auto-select first category if available
    const data = await getData();
    if (data && data.categories && data.categories.length > 0) {
        const firstCategory = data.categories[0];
        if (firstCategory.subcategories && firstCategory.subcategories.length > 0) {
            // If has subcategories, expand and select first subcategory
            expandedCategories.add(firstCategory.id);
            if (firstCategory.subcategories[0].items && firstCategory.subcategories[0].items.length > 0) {
                selectSubcategory(firstCategory.id, firstCategory.subcategories[0].id);
            }
        } else if (firstCategory.items && firstCategory.items.length > 0) {
            selectCategory(firstCategory.id);
        }
    }
}
