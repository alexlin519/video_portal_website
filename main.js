// main.js - Folo-style UI with categories and subcategories

const DATA_FILE = 'data.json';

// ============================================
// CONFIGURATION - Easy to edit variables
// ============================================
// Maximum number of items to show for categories (first level)
const MAX_ITEMS_CATEGORY = 2;

// Maximum number of items to show for classes/subcategories (second level)
const MAX_ITEMS_CLASS =2;

// Maximum number of items for Daily Random category
const MAX_ITEMS_DAILY_RANDOM = 2;
// ============================================

// State management
let cachedData = null;
let currentCategoryId = null;
let currentSubcategoryId = null;
let expandedCategories = new Set();
let expandedSubcategories = new Set();
let showAllCategory = false; // Show all items for current category
let showAllSubcategory = false; // Show all items for current subcategory

// Favorites management (using localStorage)
const FAVORITES_KEY = 'video_portal_favorites';
const PINS_KEY = 'video_portal_pins';

function getFavorites() {
    try {
        const favorites = localStorage.getItem(FAVORITES_KEY);
        return favorites ? JSON.parse(favorites) : [];
    } catch (e) {
        console.error('Error loading favorites:', e);
        return [];
    }
}

function saveFavorites(favorites) {
    try {
        localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
    } catch (e) {
        console.error('Error saving favorites:', e);
    }
}

function toggleFavorite(itemId) {
    const favorites = getFavorites();
    const index = favorites.indexOf(itemId);
    if (index > -1) {
        favorites.splice(index, 1);
        saveFavorites(favorites);
        return false; // Removed
    } else {
        favorites.push(itemId);
        saveFavorites(favorites);
        return true; // Added
    }
}

function isFavorite(itemId) {
    return getFavorites().includes(itemId);
}

// Pins management (using localStorage)
function getPins() {
    try {
        const pins = localStorage.getItem(PINS_KEY);
        return pins ? JSON.parse(pins) : [];
    } catch (e) {
        console.error('Error loading pins:', e);
        return [];
    }
}

function savePins(pins) {
    try {
        localStorage.setItem(PINS_KEY, JSON.stringify(pins));
    } catch (e) {
        console.error('Error saving pins:', e);
    }
}

function togglePin(itemId) {
    const pins = getPins();
    const index = pins.indexOf(itemId);
    if (index > -1) {
        pins.splice(index, 1);
        savePins(pins);
        return false; // Unpinned
    } else {
        pins.push(itemId);
        savePins(pins);
        return true; // Pinned
    }
}

function isItemPinned(itemId) {
    return getPins().includes(itemId);
}

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


// Count items in a category (including subcategories)
function countItems(category, data) {
    // For Daily Random, count all items from all categories
    if (category.isRandom && data) {
        return collectAllItems(data).length;
    }
    
    // For Favorites, count items in favorites
    if (category.id === 'favorites' && data) {
        const favorites = getFavorites();
        const allItems = collectAllItems(data);
        return allItems.filter(item => favorites.includes(item.id)).length;
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

    // Add Favorites category first (if it doesn't exist in data)
    const hasFavorites = data.categories.some(cat => cat.id === 'favorites');
    if (!hasFavorites) {
        const favoritesCount = countItems({ id: 'favorites' }, data);
        const isFavoritesActive = currentCategoryId === 'favorites' && !currentSubcategoryId;
        
        html += `
            <div class="category" data-category-id="favorites">
                <div class="category-header ${isFavoritesActive ? 'active' : ''}" 
                     onclick="selectCategory('favorites')">
                    <div class="category-header-content">
                        <span class="category-icon">⭐</span>
                        <span class="category-name">收藏</span>
                    </div>
                    <span class="category-count">${favoritesCount}</span>
                </div>
            </div>
        `;
    }

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
        // Skip daily random itself and favorites
        if (category.id === 'daily-random' || category.id === 'favorites') return;
        
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

// Get all items with pinning support
function getItemsWithPinning(items) {
    if (!items || items.length === 0) return { pinned: [], unpinned: [] };
    
    const pinned = [];
    const unpinned = [];
    
    items.forEach(item => {
        if (item.pinned === true) {
            pinned.push(item);
        } else {
            unpinned.push(item);
        }
    });
    
    return { pinned, unpinned };
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
    
    // Get checkbox state BEFORE selecting items
    const checkbox = document.getElementById('show-all-checkbox');
    if (checkbox) {
        showAllCategory = checkbox.checked;
        console.log(`[Category] Checkbox state read: ${showAllCategory}`);
    } else {
        showAllCategory = false; // Default to false if checkbox doesn't exist
        console.log(`[Category] Checkbox not found, defaulting to false`);
    }
    
    const data = await getData();
    if (!data || !data.categories) return;

    // Handle favorites category (not in data.json)
    if (categoryId === 'favorites') {
        const favorites = getFavorites();
        const allItems = collectAllItems(data);
        
        // Filter items that are in favorites
        let items = allItems.filter(item => favorites.includes(item.id));
        
        // Always randomize order
        items = shuffleArray(items);
        
        // Apply maxItems limit if not showing all
        const maxItems = MAX_ITEMS_CATEGORY;
        
        if (showAllCategory) {
            console.log(`[Favorites] Showing all ${items.length} items (showAllCategory is true)`);
        } else if (items.length > 0) {
            if (items.length > maxItems) {
                items = items.slice(0, maxItems);
                console.log(`[Favorites] Limited to ${maxItems} items, now showing ${items.length}`);
            } else {
                items = items.slice(0, maxItems);
                console.log(`[Favorites] Showing ${items.length} items (limit is ${maxItems}, had ${items.length} available)`);
            }
        }
        
        // Render items
        renderContent(items, '收藏', '⭐');
        
        // Update UI
        renderSidebar();
        updateContentHeader('收藏', '⭐');
        document.getElementById('refresh-btn').style.display = 'inline-block';
        updateShowAllButton();
        return;
    }

    const category = data.categories.find(cat => cat.id === categoryId);
    if (!category) return;

    let items = [];
    
    // Handle Daily Random category
    if (category.isRandom) {
        const allItems = collectAllItems(data);
        // Always use the constant, ignore category.maxItems from data.json
        const maxItems = MAX_ITEMS_DAILY_RANDOM;
        
        // Separate pinned and unpinned items (from localStorage only for Daily Random)
        const pins = getPins();
        const pinned = [];
        const unpinned = [];
        
        allItems.forEach(item => {
            // Check localStorage pinned
            const isPinnedFromStorage = pins.includes(item.id);
            
            if (isPinnedFromStorage) {
                pinned.push({...item, pinned: true}); // Mark as pinned
            } else {
                unpinned.push(item);
            }
        });
        
        // Randomize unpinned items
        const shuffledUnpinned = shuffleArray(unpinned);
        
        // Apply maxItems limit to unpinned items if not showing all
        let limitedUnpinned = [];
        
        if (showAllCategory) {
            limitedUnpinned = shuffledUnpinned;
            console.log(`[Daily Random] Showing all items (${pinned.length} pinned, ${shuffledUnpinned.length} unpinned)`);
        } else if (unpinned.length > 0) {
            limitedUnpinned = shuffledUnpinned.slice(0, Math.min(maxItems, shuffledUnpinned.length));
            console.log(`[Daily Random] Showing ${pinned.length} pinned + ${limitedUnpinned.length} unpinned items (maxItems: ${maxItems}, total available: ${allItems.length})`);
        }
        
        // Combine: pinned items first, then unpinned
        items = [...pinned, ...limitedUnpinned];
    } else {
        // Regular category - get direct items
        items = category.items || [];
        
        // Separate pinned and unpinned items (from both data.json and localStorage)
        const pins = getPins();
        const pinned = [];
        const unpinned = [];
        
        items.forEach(item => {
            // Check both data.json pinned and localStorage pinned
            const isPinnedFromData = item.pinned === true;
            const isPinnedFromStorage = pins.includes(item.id);
            
            if (isPinnedFromData || isPinnedFromStorage) {
                pinned.push({...item, pinned: true}); // Mark as pinned
            } else {
                unpinned.push(item);
            }
        });
        
        // Randomize unpinned items
        const shuffledUnpinned = shuffleArray(unpinned);
        
        // Apply maxItems limit to unpinned items if not showing all
        const maxItems = MAX_ITEMS_CATEGORY;
        let limitedUnpinned = [];
        
        if (showAllCategory) {
            limitedUnpinned = shuffledUnpinned;
            console.log(`[Category] Showing all ${items.length} items (${pinned.length} pinned, ${shuffledUnpinned.length} unpinned)`);
        } else if (unpinned.length > 0) {
            if (unpinned.length > maxItems) {
                limitedUnpinned = shuffledUnpinned.slice(0, maxItems);
                console.log(`[Category] Limited unpinned to ${maxItems} items, now showing ${pinned.length} pinned + ${limitedUnpinned.length} unpinned`);
            } else {
                limitedUnpinned = shuffledUnpinned.slice(0, maxItems);
                console.log(`[Category] Showing ${pinned.length} pinned + ${limitedUnpinned.length} unpinned items`);
            }
        }
        
        // Combine: pinned items first, then unpinned
        items = [...pinned, ...limitedUnpinned];
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
    
    // Get checkbox state BEFORE selecting items
    const checkbox = document.getElementById('show-all-checkbox');
    if (checkbox) {
        showAllSubcategory = checkbox.checked;
        console.log(`[Subcategory] Checkbox state read: ${showAllSubcategory}`);
    } else {
        showAllSubcategory = false; // Default to false if checkbox doesn't exist
        console.log(`[Subcategory] Checkbox not found, defaulting to false`);
    }
    
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
    
    // Separate pinned and unpinned items (from both data.json and localStorage)
    const pins = getPins();
    const pinned = [];
    const unpinned = [];
    
    items.forEach(item => {
        // Check both data.json pinned and localStorage pinned
        const isPinnedFromData = item.pinned === true;
        const isPinnedFromStorage = pins.includes(item.id);
        
        if (isPinnedFromData || isPinnedFromStorage) {
            pinned.push({...item, pinned: true}); // Mark as pinned
        } else {
            unpinned.push(item);
        }
    });
    
    // Randomize unpinned items
    const shuffledUnpinned = shuffleArray(unpinned);
    
    // Apply maxItems limit to unpinned items if not showing all
    const maxItems = MAX_ITEMS_CLASS;
    let limitedUnpinned = [];
    
    if (showAllSubcategory) {
        limitedUnpinned = shuffledUnpinned;
        console.log(`[Subcategory] Showing all ${items.length} items (${pinned.length} pinned, ${shuffledUnpinned.length} unpinned)`);
    } else if (unpinned.length > 0) {
        if (unpinned.length > maxItems) {
            limitedUnpinned = shuffledUnpinned.slice(0, maxItems);
            console.log(`[Subcategory] Limited unpinned to ${maxItems} items, now showing ${pinned.length} pinned + ${limitedUnpinned.length} unpinned`);
        } else {
            limitedUnpinned = shuffledUnpinned.slice(0, maxItems);
            console.log(`[Subcategory] Showing ${pinned.length} pinned + ${limitedUnpinned.length} unpinned items`);
        }
    }
    
    // Combine: pinned items first, then unpinned
    items = [...pinned, ...limitedUnpinned];

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
    
    items.forEach((item) => {
        const buttonText = item.text || item.name || '未命名';
        const videoUrl = item.url || '#';
        const itemId = item.id;
        // Check both data.json pinned and localStorage pinned
        const isPinnedFromData = item.pinned === true;
        const isPinnedFromStorage = isItemPinned(itemId);
        const isPinned = isPinnedFromData || isPinnedFromStorage;
        const isFav = isFavorite(itemId);
        
        // Check if we're in favorites category (hide pin button in favorites)
        const isFavoritesCategory = currentCategoryId === 'favorites';
        
        html += `
            <div class="video-button-wrapper">
                ${!isFavoritesCategory ? `
                    <button class="pin-btn ${isPinned ? 'active' : ''}" onclick="togglePinItem(${itemId}, event);" title="${isPinned ? 'Unpin' : 'Pin'}">
                        ${isPinned ? '📌' : '📎'}
                    </button>
                ` : ''}
                <a href="${escapeHtml(videoUrl)}" target="_blank" class="video-button ${isPinned ? 'pinned' : ''}" title="${escapeHtml(buttonText)}">
                    <span class="button-text">${escapeHtml(buttonText)}</span>
                </a>
                <button class="favorite-btn ${isFav ? 'active' : ''}" onclick="toggleFavoriteItem(${itemId}, event);" title="${isFav ? 'Remove from favorites' : 'Add to favorites'}">
                    ${isFav ? '⭐' : '☆'}
                </button>
            </div>
        `;
    });
    
    html += '</div>';
    contentBody.innerHTML = html;
}

// Toggle favorite item
function toggleFavoriteItem(itemId, event) {
    if (event) {
        event.stopPropagation();
    }
    
    const wasAdded = toggleFavorite(itemId);
    
    // Update sidebar to reflect new favorite count
    renderSidebar();
    
    // Only refresh if removing from favorites (to update the favorites page)
    // When adding, don't refresh to avoid randomizing the page
    if (!wasAdded) {
        // Was removed - refresh if on favorites page
        if (currentCategoryId === 'favorites') {
            selectCategory('favorites');
            return;
        }
    }
    
    // Just update the star icon without refreshing (to avoid randomizing)
    const favoriteBtn = event ? event.target.closest('.favorite-btn') : null;
    if (favoriteBtn) {
        favoriteBtn.textContent = wasAdded ? '⭐' : '☆';
        favoriteBtn.classList.toggle('active', wasAdded);
        favoriteBtn.title = wasAdded ? 'Remove from favorites' : 'Add to favorites';
    }
}

// Toggle pin item
function togglePinItem(itemId, event) {
    if (event) {
        event.stopPropagation();
    }
    
    const wasPinned = togglePin(itemId);
    
    // Refresh current view to update pin status and reorder items
    if (currentSubcategoryId) {
        selectSubcategory(currentCategoryId, currentSubcategoryId);
    } else if (currentCategoryId) {
        selectCategory(currentCategoryId);
    }
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
        // Show checkbox for all categories (including daily random and favorites)
        const data = cachedData;
        if (data && data.categories) {
            const category = data.categories.find(cat => cat.id === currentCategoryId);
            // Show checkbox if category exists OR if it's favorites (which is not in data.json)
            if (category || currentCategoryId === 'favorites') {
                showAllCheckbox.style.display = 'inline-block';
                showAllLabel.style.display = 'inline-block';
                // Sync checkbox with current state (don't change it, just update display)
                if (currentSubcategoryId) {
                    showAllCheckbox.checked = showAllSubcategory;
                } else {
                    showAllCheckbox.checked = showAllCategory;
                }
                console.log(`[updateShowAllButton] Checkbox synced: ${showAllCheckbox.checked} (subcategory: ${currentSubcategoryId ? showAllSubcategory : 'N/A'}, category: ${currentSubcategoryId ? 'N/A' : showAllCategory})`);
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
    // Don't reset show all state - just refresh the view to randomize items
    // The checkbox state should be preserved
    
    // Refresh the view (this will re-randomize items while keeping showAll state)
    if (currentSubcategoryId) {
        selectSubcategory(currentCategoryId, currentSubcategoryId);
    } else if (currentCategoryId) {
        selectCategory(currentCategoryId);
    }
}

// Initialize app
async function initApp() {
    await renderSidebar();
    
    // Auto-select Daily Random category by default
    const data = await getData();
    if (data && data.categories && data.categories.length > 0) {
        // Find Daily Random category
        const dailyRandom = data.categories.find(cat => cat.id === 'daily-random');
        if (dailyRandom) {
            selectCategory('daily-random');
        } else {
            // Fallback to first category if Daily Random doesn't exist
            const firstCategory = data.categories[0];
            if (firstCategory.subcategories && firstCategory.subcategories.length > 0) {
                expandedCategories.add(firstCategory.id);
                if (firstCategory.subcategories[0].items && firstCategory.subcategories[0].items.length > 0) {
                    selectSubcategory(firstCategory.id, firstCategory.subcategories[0].id);
                }
            } else if (firstCategory.items && firstCategory.items.length > 0) {
                selectCategory(firstCategory.id);
            }
        }
    }
}
