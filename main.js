// main.js - Folo-style UI with categories and subcategories

const DATA_FILE = 'data.json';

// ============================================
// CONFIGURATION - Easy to edit variables
// ============================================
// Maximum number of items to show for categories (first level)
const MAX_ITEMS_CATEGORY = 4;

// Maximum number of items to show for classes/subcategories (second level)
const MAX_ITEMS_CLASS =3;

// Maximum number of items for Daily Random category
const MAX_ITEMS_DAILY_RANDOM =10;

// Maximum number of items for Favorites category
const MAX_ITEMS_FAVORITES = 4;

// Maximum number of items for Subclasses (third level)
const MAX_ITEMS_SUBCLASS = 3;
// ============================================

// State management
let cachedData = null;
let currentCategoryId = null;
let currentSubcategoryId = null;
let currentSubclassId = null;
let expandedCategories = new Set();
let expandedSubcategories = new Set();
let expandedSubclasses = new Set();
let showAllCategory = false; // Show all items for current category
let showAllSubcategory = false; // Show all items for current subcategory
let showAllSubclass = false; // Show all items for current subclass
let rawFilmsSectionPanelOutsideClickHandler = null;
let rawFilmsSectionDraggedItem = null;
let rawFilmsSectionPanelShouldOpen = false;

// Favorites management (using localStorage)
const FAVORITES_KEY = 'video_portal_favorites';
const PINS_KEY = 'video_portal_pins';
const CATEGORY_ORDER_KEY = 'video_portal_category_order';
const SUBCATEGORY_ORDER_KEY_PREFIX = 'video_portal_subcategory_order_';
const FILTER_CATEGORY_ORDER_KEY = 'video_portal_filter_category_order';
const USER_ADDED_ITEMS_KEY = 'video_portal_user_added_items';
const DELETED_ITEMS_KEY = 'video_portal_deleted_items';
const DAILY_RANDOM_FILTER_KEY = 'video_portal_daily_random_filter';
const FAVORITES_FILTER_KEY = 'video_portal_favorites_filter';
const RAW_FILMS_CONTENT_KEY = 'video_portal_raw_films_content';
const RAW_FILMS_RATINGS_KEY = 'video_portal_raw_films_ratings';
const RAW_FILMS_SORT_MODE_KEY = 'video_portal_raw_films_sort_mode';
const RAW_FILMS_SECTION_ORDER_KEY = 'video_portal_raw_films_section_order';

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

// User-added items management
function getUserAddedItems() {
    try {
        const items = localStorage.getItem(USER_ADDED_ITEMS_KEY);
        return items ? JSON.parse(items) : {};
    } catch (e) {
        console.error('Error loading user-added items:', e);
        return {};
    }
}

function saveUserAddedItems(items) {
    try {
        localStorage.setItem(USER_ADDED_ITEMS_KEY, JSON.stringify(items));
    } catch (e) {
        console.error('Error saving user-added items:', e);
    }
}

// Deleted items management
function getDeletedItems() {
    try {
        const items = localStorage.getItem(DELETED_ITEMS_KEY);
        return items ? JSON.parse(items) : [];
    } catch (e) {
        console.error('Error loading deleted items:', e);
        return [];
    }
}

function saveDeletedItems(items) {
    try {
        localStorage.setItem(DELETED_ITEMS_KEY, JSON.stringify(items));
    } catch (e) {
        console.error('Error saving deleted items:', e);
    }
}

function deleteItem(itemId) {
    const deleted = getDeletedItems();
    if (!deleted.includes(itemId)) {
        deleted.push(itemId);
        saveDeletedItems(deleted);
    }
}

function restoreItem(itemId) {
    const deleted = getDeletedItems();
    const index = deleted.indexOf(itemId);
    if (index > -1) {
        deleted.splice(index, 1);
        saveDeletedItems(deleted);
    }
}

function isItemDeleted(itemId) {
    const deleted = getDeletedItems();
    return deleted.includes(itemId);
}

// Get items for a specific location (category/subcategory/subclass)
// This merges data.json items with user-added items and filters deleted items
function getItemsForLocation(categoryId, subcategoryId = null, subclassId = null) {
    const userAddedItems = getUserAddedItems();
    
    // Build location key
    let locationKey = categoryId;
    if (subcategoryId) locationKey += `:${subcategoryId}`;
    if (subclassId) locationKey += `:${subclassId}`;
    
    // Get user-added items for the location
    const userItems = userAddedItems[locationKey] || [];
    
    return userItems;
}

// Add item to a specific location
function addItemToLocation(categoryId, subcategoryId, subclassId, name, url, text) {
    const userAddedItems = getUserAddedItems();
    
    // Build location key
    let locationKey = categoryId;
    if (subcategoryId) locationKey += `:${subcategoryId}`;
    if (subclassId) locationKey += `:${subclassId}`;
    
    // Generate a unique ID (use negative numbers to avoid conflicts with data.json IDs)
    let maxId = -1;
    Object.values(userAddedItems).forEach(items => {
        items.forEach(item => {
            if (item.id < 0 && item.id < maxId) {
                maxId = item.id;
            }
        });
    });
    const newId = maxId - 1;
    
    // Create new item (name is displayed on button, text is note/remark)
    const newItem = {
        id: newId,
        name: name,
        url: url,
        text: text || '' // text is now a note/remark, not displayed on button
    };
    
    // Add to location
    if (!userAddedItems[locationKey]) {
        userAddedItems[locationKey] = [];
    }
    userAddedItems[locationKey].push(newItem);
    
    saveUserAddedItems(userAddedItems);
    return newItem;
}

// Update item in a specific location
function updateItemInLocation(itemId, name, url, text) {
    const userAddedItems = getUserAddedItems();
    
    // Determine the location key for the current context
    const locationKey = currentSubclassId 
        ? `${currentCategoryId}:${currentSubcategoryId}:${currentSubclassId}`
        : currentSubcategoryId 
        ? `${currentCategoryId}:${currentSubcategoryId}`
        : currentCategoryId;
    
    // Initialize location if it doesn't exist
    if (!userAddedItems[locationKey]) {
        userAddedItems[locationKey] = [];
    }
    
    // Check if item already exists in userAddedItems at this location
    const existingIndex = userAddedItems[locationKey].findIndex(item => item.id === itemId);
    
    if (existingIndex !== -1) {
        // Update existing item in userAddedItems
        userAddedItems[locationKey][existingIndex].name = name;
        userAddedItems[locationKey][existingIndex].url = url;
        userAddedItems[locationKey][existingIndex].text = text || '';
    } else {
        // Item is from data.json, create a modified copy in userAddedItems
        // This will replace the original item when rendering (same ID)
        const modifiedItem = {
            id: itemId,
            name: name,
            url: url,
            text: text || ''
        };
        userAddedItems[locationKey].push(modifiedItem);
    }
    
    saveUserAddedItems(userAddedItems);
    return true;
}

// Get item by ID (from both data.json and userAddedItems)
async function getItemById(itemId) {
    const data = await getData();
    const userAddedItems = getUserAddedItems();
    const deletedItems = getDeletedItems();
    
    // Check if item is deleted
    if (deletedItems.includes(itemId)) {
        return null;
    }
    
    // Check user-added items first
    for (const locationKey in userAddedItems) {
        const items = userAddedItems[locationKey];
        const item = items.find(item => item.id === itemId);
        if (item) {
            return { ...item, isUserAdded: true };
        }
    }
    
    // Check data.json items
    if (data && data.categories) {
        for (const category of data.categories) {
            // Check category items
            if (category.items) {
                const item = category.items.find(item => item.id === itemId);
                if (item) {
                    return { ...item, isUserAdded: false };
                }
            }
            
            // Check subcategory items
            if (category.subcategories) {
                for (const subcategory of category.subcategories) {
                    if (subcategory.items) {
                        const item = subcategory.items.find(item => item.id === itemId);
                        if (item) {
                            return { ...item, isUserAdded: false };
                        }
                    }
                    
                    // Check subclass items
                    if (subcategory.subclasses) {
                        for (const subclass of subcategory.subclasses) {
                            if (subclass.items) {
                                const item = subclass.items.find(item => item.id === itemId);
                                if (item) {
                                    return { ...item, isUserAdded: false };
                                }
                            }
                        }
                    }
                }
            }
        }
    }
    
    return null;
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


// Count items in a category
// Returns the total number of buttons that will be shown when clicking the category
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
    
    // For regular categories, only count items directly in the category
    // (when you click a category, it only shows items directly in the category, not subcategories)
    if (category.items) {
        return category.items.length;
    }
    return 0;
}

// Count items in a subcategory
function countSubcategoryItems(subcategory) {
    let count = 0;
    // Count items directly in subcategory
    if (subcategory.items) {
        count += subcategory.items.length;
    }
    // Count items in subclasses
    if (subcategory.subclasses) {
        subcategory.subclasses.forEach(subclass => {
            if (subclass.items) {
                count += subclass.items.length;
            }
        });
    }
    return count;
}

function countSubclassItems(subclass) {
    if (subclass.items) {
        return subclass.items.length;
    }
    return 0;
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

    // Get saved category order from localStorage
    const savedCategoryOrder = JSON.parse(localStorage.getItem(CATEGORY_ORDER_KEY) || '[]');
    
    // Sort categories based on saved order
    const sortedCategories = [...data.categories].sort((a, b) => {
        const indexA = savedCategoryOrder.indexOf(a.id);
        const indexB = savedCategoryOrder.indexOf(b.id);
        // If both are in saved order, use their order
        if (indexA !== -1 && indexB !== -1) return indexA - indexB;
        // If only A is in saved order, A comes first
        if (indexA !== -1) return -1;
        // If only B is in saved order, B comes first
        if (indexB !== -1) return 1;
        // If neither is in saved order, keep original order
        return 0;
    });

    // Add Favorites category first (if it doesn't exist in data)
    const hasFavorites = data.categories.some(cat => cat.id === 'favorites');
    if (!hasFavorites) {
        const isFavoritesActive = currentCategoryId === 'favorites' && !currentSubcategoryId;
        
        html += `
            <div class="category" data-category-id="favorites" draggable="true" ondragstart="handleCategoryDragStart(event)" ondragover="handleCategoryDragOver(event)" ondrop="handleCategoryDrop(event)" ondragend="handleCategoryDragEnd(event)">
                <div class="category-header ${isFavoritesActive ? 'active' : ''}" 
                     onclick="selectCategory('favorites')">
                    <div class="category-header-content">
                        <span class="drag-handle">⋮⋮</span>
                        <span class="category-icon">⭐</span>
                        <span class="category-name">收藏</span>
                    </div>
                </div>
            </div>
        `;
    }

    sortedCategories.forEach(category => {
        const hasSubcategories = category.subcategories && category.subcategories.length > 0;
        const isExpanded = expandedCategories.has(category.id);
        const isActive = currentCategoryId === category.id && !currentSubcategoryId;

        // Category header
        html += `
            <div class="category" data-category-id="${category.id}" draggable="true" ondragstart="handleCategoryDragStart(event)" ondragover="handleCategoryDragOver(event)" ondrop="handleCategoryDrop(event)" ondragend="handleCategoryDragEnd(event)">
                <div class="category-header ${isActive ? 'active' : ''}" 
                     onclick="selectCategory('${category.id}')">
                    <div class="category-header-content">
                        <span class="drag-handle">⋮⋮</span>
                        ${hasSubcategories ? `
                            <span class="category-toggle ${isExpanded ? 'expanded' : ''}" 
                                  onclick="event.stopPropagation(); toggleCategory('${category.id}')">
                                ▶
                            </span>
                        ` : ''}
                        <span class="category-icon">${category.icon || '📁'}</span>
                        <span class="category-name">${escapeHtml(category.name)}</span>
                    </div>
                </div>`;

        // Subcategories
        if (hasSubcategories) {
            const subcategoriesClass = isExpanded ? 'expanded' : 'collapsed';
            html += `<div class="subcategories ${subcategoriesClass}">`;
            
            // Get saved subcategory order for this category
            const savedSubcategoryOrder = JSON.parse(localStorage.getItem(`${SUBCATEGORY_ORDER_KEY_PREFIX}${category.id}`) || '[]');
            
            // Sort subcategories based on saved order
            const sortedSubcategories = [...category.subcategories].sort((a, b) => {
                const indexA = savedSubcategoryOrder.indexOf(a.id);
                const indexB = savedSubcategoryOrder.indexOf(b.id);
                if (indexA !== -1 && indexB !== -1) return indexA - indexB;
                if (indexA !== -1) return -1;
                if (indexB !== -1) return 1;
                return 0;
            });
            
            sortedSubcategories.forEach(subcategory => {
                const hasSubclasses = subcategory.subclasses && subcategory.subclasses.length > 0;
                const subcategoryKey = `${category.id}-${subcategory.id}`;
                const isSubExpanded = expandedSubcategories.has(subcategoryKey);
                const isSubActive = currentSubcategoryId === subcategory.id && !currentSubclassId;
                
                html += `
                    <div class="subcategory" data-subcategory-id="${subcategory.id}" data-parent-category="${category.id}" draggable="true" ondragstart="handleSubcategoryDragStart(event)" ondragover="handleSubcategoryDragOver(event)" ondrop="handleSubcategoryDrop(event)" ondragend="handleSubcategoryDragEnd(event)">
                        <div class="subcategory-header ${isSubActive ? 'active' : ''}" 
                             onclick="selectSubcategory('${category.id}', '${subcategory.id}')">
                            <div class="subcategory-header-content">
                                <span class="drag-handle">⋮⋮</span>
                                ${hasSubclasses ? `
                                    <span class="subcategory-toggle ${isSubExpanded ? 'expanded' : ''}" 
                                          onclick="event.stopPropagation(); toggleSubcategory('${category.id}', '${subcategory.id}')">
                                        ▶
                                    </span>
                                ` : ''}
                                <span class="subcategory-name">${escapeHtml(subcategory.name)}</span>
                            </div>
                        </div>
                        
                        ${hasSubclasses ? `
                            <div class="subclasses ${isSubExpanded ? 'expanded' : 'collapsed'}">
                                ${subcategory.subclasses.map(subclass => {
                                    const isSubclassActive = currentSubclassId === subclass.id;
                                    return `
                                        <div class="subclass" data-subclass-id="${subclass.id}">
                                            <div class="subclass-header ${isSubclassActive ? 'active' : ''}" 
                                                 onclick="selectSubclass('${category.id}', '${subcategory.id}', '${subclass.id}')">
                                                <span class="subclass-name">${escapeHtml(subclass.name)}</span>
                                            </div>
                                        </div>
                                    `;
                                }).join('')}
                            </div>
                        ` : ''}
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

// Toggle subcategory expansion
function toggleSubcategory(categoryId, subcategoryId) {
    const key = `${categoryId}-${subcategoryId}`;
    if (expandedSubcategories.has(key)) {
        expandedSubcategories.delete(key);
    } else {
        expandedSubcategories.add(key);
    }
    renderSidebar();
}

// Drag and Drop handlers for Categories
let draggedCategoryElement = null;

function handleCategoryDragStart(event) {
    draggedCategoryElement = event.currentTarget;
    event.currentTarget.classList.add('dragging');
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/html', event.currentTarget.outerHTML);
}

function handleCategoryDragOver(event) {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    
    const categoryElement = event.currentTarget.closest('.category');
    if (!categoryElement || categoryElement === draggedCategoryElement) return;
    
    // Remove drag-over classes from all categories first
    document.querySelectorAll('.category').forEach(cat => {
        if (cat !== categoryElement && cat !== draggedCategoryElement) {
            cat.classList.remove('drag-over-top', 'drag-over-bottom');
        }
    });
    
    const rect = categoryElement.getBoundingClientRect();
    const next = (event.clientY - rect.top) / (rect.bottom - rect.top) > 0.5;
    
    categoryElement.classList.remove('drag-over-top', 'drag-over-bottom');
    categoryElement.classList.add(next ? 'drag-over-bottom' : 'drag-over-top');
}

function handleCategoryDrop(event) {
    event.preventDefault();
    event.stopPropagation();
    
    const categoryElement = event.currentTarget.closest('.category');
    if (!categoryElement || categoryElement === draggedCategoryElement) return;
    
    const rect = categoryElement.getBoundingClientRect();
    const next = (event.clientY - rect.top) / (rect.bottom - rect.top) > 0.5;
    
    if (next) {
        categoryElement.parentNode.insertBefore(draggedCategoryElement, categoryElement.nextSibling);
    } else {
        categoryElement.parentNode.insertBefore(draggedCategoryElement, categoryElement);
    }
    
    // Save new order
    saveCategoryOrder();
}

function handleCategoryDragEnd(event) {
    event.currentTarget.classList.remove('dragging');
    
    // Remove all drag-over classes
    document.querySelectorAll('.category').forEach(el => {
        el.classList.remove('drag-over-top', 'drag-over-bottom');
    });
    
    draggedCategoryElement = null;
}

function saveCategoryOrder() {
    const categories = Array.from(document.querySelectorAll('.category[data-category-id]'));
    const order = categories.map(cat => cat.getAttribute('data-category-id'));
    localStorage.setItem(CATEGORY_ORDER_KEY, JSON.stringify(order));
}

// Drag and Drop handlers for Subcategories
let draggedSubcategoryElement = null;
let draggedSubcategoryParentCategory = null;

function handleSubcategoryDragStart(event) {
    draggedSubcategoryElement = event.currentTarget;
    draggedSubcategoryParentCategory = event.currentTarget.getAttribute('data-parent-category');
    event.currentTarget.classList.add('dragging');
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/html', event.currentTarget.outerHTML);
}

function handleSubcategoryDragOver(event) {
    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = 'move';
    
    const subcategoryElement = event.currentTarget.closest('.subcategory');
    if (!subcategoryElement || subcategoryElement === draggedSubcategoryElement) return;
    
    // Only allow dropping within the same category
    const parentCategory = subcategoryElement.getAttribute('data-parent-category');
    if (parentCategory !== draggedSubcategoryParentCategory) return;
    
    // Remove drag-over classes from all subcategories in the same category first
    document.querySelectorAll(`.subcategory[data-parent-category="${parentCategory}"]`).forEach(sub => {
        if (sub !== subcategoryElement && sub !== draggedSubcategoryElement) {
            sub.classList.remove('drag-over-top', 'drag-over-bottom');
        }
    });
    
    const rect = subcategoryElement.getBoundingClientRect();
    const next = (event.clientY - rect.top) / (rect.bottom - rect.top) > 0.5;
    
    subcategoryElement.classList.remove('drag-over-top', 'drag-over-bottom');
    subcategoryElement.classList.add(next ? 'drag-over-bottom' : 'drag-over-top');
}

function handleSubcategoryDrop(event) {
    event.preventDefault();
    event.stopPropagation();
    
    const subcategoryElement = event.currentTarget.closest('.subcategory');
    if (!subcategoryElement || subcategoryElement === draggedSubcategoryElement) return;
    
    // Only allow dropping within the same category
    const parentCategory = subcategoryElement.getAttribute('data-parent-category');
    if (parentCategory !== draggedSubcategoryParentCategory) return;
    
    const rect = subcategoryElement.getBoundingClientRect();
    const next = (event.clientY - rect.top) / (rect.bottom - rect.top) > 0.5;
    
    if (next) {
        subcategoryElement.parentNode.insertBefore(draggedSubcategoryElement, subcategoryElement.nextSibling);
    } else {
        subcategoryElement.parentNode.insertBefore(draggedSubcategoryElement, subcategoryElement);
    }
    
    // Save new order
    saveSubcategoryOrder(parentCategory);
}

function handleSubcategoryDragEnd(event) {
    event.currentTarget.classList.remove('dragging');
    
    // Remove all drag-over classes from subcategories in the same category
    if (draggedSubcategoryParentCategory) {
        document.querySelectorAll(`.subcategory[data-parent-category="${draggedSubcategoryParentCategory}"]`).forEach(el => {
            el.classList.remove('drag-over-top', 'drag-over-bottom');
        });
    }
    
    draggedSubcategoryElement = null;
    draggedSubcategoryParentCategory = null;
}

function saveSubcategoryOrder(categoryId) {
    const subcategories = Array.from(document.querySelectorAll(`.subcategory[data-parent-category="${categoryId}"]`));
    const order = subcategories.map(sub => sub.getAttribute('data-subcategory-id'));
    localStorage.setItem(`${SUBCATEGORY_ORDER_KEY_PREFIX}${categoryId}`, JSON.stringify(order));
}

// Get daily random filter settings
function getDailyRandomFilter() {
    try {
        const filter = localStorage.getItem(DAILY_RANDOM_FILTER_KEY);
        return filter ? JSON.parse(filter) : null; // null means no filter (show all)
    } catch (e) {
        console.error('Error loading daily random filter:', e);
        return null;
    }
}

// Save daily random filter settings
function saveDailyRandomFilter(filter) {
    try {
        if (filter === null) {
            // Remove the key if filter is null (means show all)
            localStorage.removeItem(DAILY_RANDOM_FILTER_KEY);
                    } else {
            localStorage.setItem(DAILY_RANDOM_FILTER_KEY, JSON.stringify(filter));
        }
    } catch (e) {
        console.error('Error saving daily random filter:', e);
    }
}

// Get favorites filter settings (defaults to null = show all)
function getFavoritesFilter() {
    try {
        const filter = localStorage.getItem(FAVORITES_FILTER_KEY);
        return filter ? JSON.parse(filter) : null; // null means no filter (show all)
                            } catch (e) {
        console.error('Error loading favorites filter:', e);
        return null;
    }
}

// Save favorites filter settings
function saveFavoritesFilter(filter) {
    try {
        if (filter === null) {
            // Remove the key if filter is null (means show all)
            localStorage.removeItem(FAVORITES_FILTER_KEY);
                } else {
            localStorage.setItem(FAVORITES_FILTER_KEY, JSON.stringify(filter));
        }
    } catch (e) {
        console.error('Error saving favorites filter:', e);
    }
}

// Check if category should be included based on filter
function isCategoryIncluded(categoryId, filter) {
    if (!filter || Object.keys(filter).length === 0) return true; // No filter or empty filter means include all
    if (!filter.categories) return true; // No categories in filter means include all
    return filter.categories.includes(categoryId);
}

// Check if subcategory should be included based on filter
function isSubcategoryIncluded(categoryId, subcategoryId, filter) {
    if (!filter || Object.keys(filter).length === 0) return true; // No filter or empty filter means include all
    const key = `${categoryId}:${subcategoryId}`;
    
    // Check if explicitly excluded
    if (filter.excludedSubcategories && filter.excludedSubcategories.includes(key)) {
        return false;
    }
    
    // If parent category is included, subcategory is automatically included (unless excluded)
    if (filter.categories && filter.categories.includes(categoryId)) {
        return true;
    }
    
    // Otherwise, check if subcategory is specifically included
    if (filter.subcategories && filter.subcategories.includes(key)) {
        return true;
    }
    
    return false;
}

// Check if subclass should be included based on filter
function isSubclassIncluded(categoryId, subcategoryId, subclassId, filter) {
    if (!filter || Object.keys(filter).length === 0) return true; // No filter or empty filter means include all
    const key = `${categoryId}:${subcategoryId}:${subclassId}`;
    const subcategoryKey = `${categoryId}:${subcategoryId}`;
    
    // Check if explicitly excluded
    if (filter.excludedSubclasses && filter.excludedSubclasses.includes(key)) {
        return false;
    }
    
    // Check if parent subcategory is excluded (if so, all subclasses are excluded)
    if (filter.excludedSubcategories && filter.excludedSubcategories.includes(subcategoryKey)) {
        return false;
    }
    
    // If parent category is included, subclass is automatically included (unless excluded)
    if (filter.categories && filter.categories.includes(categoryId)) {
        return true;
    }
    
    // If parent subcategory is included, subclass is automatically included (unless excluded)
    if (filter.subcategories && filter.subcategories.includes(subcategoryKey)) {
        return true;
    }
    
    // Otherwise, check if subclass is specifically included
    if (filter.subclasses && filter.subclasses.includes(key)) {
        return true;
    }
    
    return false;
}

// Collect all items from all categories (for Daily Random and Favorites)
// Uses overwrite approach: faster O(n+m) instead of O(n*m)
// filter: optional filter object, if null uses daily random filter
function collectAllItems(data, filter = undefined) {
    const deletedItems = getDeletedItems();
    const userAddedItems = getUserAddedItems();
    // Use provided filter, or fall back to daily random filter if not provided (undefined)
    // If filter is null or empty object {}, treat as no filter (show all)
    // This allows favorites to show all items when favoritesFilter is null
    if (filter === undefined) {
        // No filter provided, use daily random filter (for backward compatibility)
        filter = getDailyRandomFilter();
    } else if (filter === null || (typeof filter === 'object' && Object.keys(filter).length === 0)) {
        // Explicitly no filter (null or empty object), show all items
        filter = null;
    }
    
    // Step 1: Create a Map to store items by ID (for fast lookup and overwrite)
    const itemsMap = new Map();
    
    // Step 2: Collect all items from data.json into the Map
    data.categories.forEach(category => {
        // Skip daily random itself and favorites
        if (category.id === 'daily-random' || category.id === 'favorites') return;
        
        // Check if category is included in filter
        const categoryIncluded = isCategoryIncluded(category.id, filter);
        
        // Helper function to add item to map
        const addItemToMap = (item, source, locationKey) => {
            itemsMap.set(item.id, {
                ...item,
                name: item.name || item.text || '未命名',
                source: source,
                locationKey: locationKey
            });
        };
        
        if (categoryIncluded) {
            // Add direct items from category
            if (category.items) {
                category.items.forEach(item => {
                    addItemToMap(item, category.name, category.id);
                });
            }
            
            // Add subcategories and their items (check if subcategory is included)
            if (category.subcategories) {
                category.subcategories.forEach(sub => {
                    const subcategoryIncluded = isSubcategoryIncluded(category.id, sub.id, filter);
                    
                    if (subcategoryIncluded) {
                        // Add items directly in subcategory
                        if (sub.items) {
                            sub.items.forEach(item => {
                                addItemToMap(item, `${category.name} - ${sub.name}`, `${category.id}:${sub.id}`);
                            });
                        }
                        
                        // Add subclasses and their items (check if subclass is included)
                        if (sub.subclasses) {
                            sub.subclasses.forEach(subclass => {
                                const subclassIncluded = isSubclassIncluded(category.id, sub.id, subclass.id, filter);
                                
                                if (subclassIncluded && subclass.items) {
                                    subclass.items.forEach(item => {
                                        addItemToMap(item, `${category.name} - ${sub.name} - ${subclass.name}`, `${category.id}:${sub.id}:${subclass.id}`);
                                    });
                                }
                            });
                    }
                } else {
                        // Subcategory is excluded, but check if any subclasses are specifically included
                        if (sub.subclasses) {
                            sub.subclasses.forEach(subclass => {
                                const subclassIncluded = isSubclassIncluded(category.id, sub.id, subclass.id, filter);
                                
                                if (subclassIncluded && subclass.items) {
                                    subclass.items.forEach(item => {
                                        addItemToMap(item, `${category.name} - ${sub.name} - ${subclass.name}`, `${category.id}:${sub.id}:${subclass.id}`);
                                    });
                                }
                            });
                        }
                    }
                });
            }
        } else {
            // Category not included, but check if any subcategories are specifically included
            if (category.subcategories) {
                category.subcategories.forEach(sub => {
                    const subcategoryKey = `${category.id}:${sub.id}`;
                    const subcategoryIncluded = isSubcategoryIncluded(category.id, sub.id, filter);
                    
                    if (subcategoryIncluded) {
                        // Add items directly in subcategory
                        if (sub.items) {
                            sub.items.forEach(item => {
                                addItemToMap(item, `${category.name} - ${sub.name}`, subcategoryKey);
                            });
                        }
                        
                        // Add all subclasses under this subcategory
                        if (sub.subclasses) {
                            sub.subclasses.forEach(subclass => {
                                if (subclass.items) {
                                    subclass.items.forEach(item => {
                                        addItemToMap(item, `${category.name} - ${sub.name} - ${subclass.name}`, `${category.id}:${sub.id}:${subclass.id}`);
                                    });
                                }
                            });
                        }
            } else {
                        // Subcategory not included, but check if any subclasses are specifically included
                        if (sub.subclasses) {
                            sub.subclasses.forEach(subclass => {
                                const subclassKey = `${category.id}:${sub.id}:${subclass.id}`;
                                const subclassIncluded = isSubclassIncluded(category.id, sub.id, subclass.id, filter);
                                
                                if (subclassIncluded) {
                                    if (subclass.items) {
                                        subclass.items.forEach(item => {
                                            addItemToMap(item, `${category.name} - ${sub.name} - ${subclass.name}`, subclassKey);
                                        });
                                    }
                                }
                            });
                        }
                    }
                });
            }
        }
    });
    
    // Step 3: Overwrite with userAddedItems (edits and new items)
    Object.keys(userAddedItems).forEach(locationKey => {
        userAddedItems[locationKey].forEach(item => {
            // Parse locationKey to check if it should be included in filter
            const parts = locationKey.split(':');
            const categoryId = parts[0];
            const subcategoryId = parts.length > 1 ? parts[1] : null;
            const subclassId = parts.length > 2 ? parts[2] : null;
            
            // Check if this location should be included based on filter
            // If filter is null, include all (no filter)
            let shouldInclude = true;
            if (filter !== null) {
                if (subclassId) {
                    // Check subclass filter
                    shouldInclude = isSubclassIncluded(categoryId, subcategoryId, subclassId, filter);
                } else if (subcategoryId) {
                    // Check subcategory filter
                    shouldInclude = isSubcategoryIncluded(categoryId, subcategoryId, filter);
                } else {
                    // Check category filter
                    shouldInclude = isCategoryIncluded(categoryId, filter);
                }
            }
            
            // Only add/overwrite if location is included in filter (or no filter)
            if (shouldInclude) {
                const existingItem = itemsMap.get(item.id);
                
                // Get source from existing item or parse from locationKey
                let source = existingItem?.source;
                if (!source) {
                    // Parse source from locationKey (e.g., "category:subcategory:subclass")
                    const cat = data.categories.find(c => c.id === categoryId);
                    if (cat) {
                        if (parts.length === 1) {
                            source = cat.name;
                        } else if (parts.length === 2) {
                            const sub = cat.subcategories?.find(s => s.id === subcategoryId);
                            source = sub ? `${cat.name} - ${sub.name}` : cat.name;
                        } else if (parts.length === 3) {
                            const sub = cat.subcategories?.find(s => s.id === subcategoryId);
                            const subclass = sub?.subclasses?.find(sc => sc.id === subclassId);
                            source = subclass ? `${cat.name} - ${sub.name} - ${subclass.name}` : (sub ? `${cat.name} - ${sub.name}` : cat.name);
                        }
                    }
                }
                
                // Overwrite existing item or add new item
                itemsMap.set(item.id, {
                    ...item,
                    name: item.name || item.text || '未命名',
                    source: source || '未知来源',
                    locationKey: locationKey
                });
            }
        });
    });
    
    // Step 4: Convert Map to array and filter deleted items
    const allItems = Array.from(itemsMap.values())
        .filter(item => !deletedItems.includes(item.id));
    
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
    currentSubclassId = null; // Reset subclass selection
    showAllSubcategory = false; // Reset subcategory show all
    showAllSubclass = false; // Reset subclass show all
    
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
        // Use favorites filter (independent from daily random filter)
        // For favorites, we need to collect ALL items first, then apply favorites filter
        // This ensures that items in favorites are always shown, regardless of filter
        const favoritesFilter = getFavoritesFilter();
        
        // If favorites filter is null (default all), collect all items without filter
        // Otherwise, collect items with favorites filter
        const allItems = favoritesFilter === null 
            ? collectAllItems(data, {})  // Empty filter object means show all
            : collectAllItems(data, favoritesFilter);
        
        // Filter items that are in favorites
        let items = allItems.filter(item => favorites.includes(item.id));
        
        // Always randomize order
        items = shuffleArray(items);
        
        // Apply maxItems limit if not showing all
        const maxItems = MAX_ITEMS_FAVORITES;
        
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

    // Handle raw films category (text-only markdown viewer)
    if (category.isTextOnly && categoryId === 'raw-films') {
        renderRawFilmsContent();
        renderSidebar();
        updateContentHeader(category.name, category.icon);
        document.getElementById('refresh-btn').style.display = 'none';
        document.getElementById('add-new-btn').style.display = 'none';
        document.getElementById('filter-btn').style.display = 'none';
        document.getElementById('show-all-label').style.display = 'none';
        updateShowAllButton();
        return;
    }

    let items = [];
    const deletedItems = getDeletedItems();
    
    // Handle Daily Random category
    if (category.isRandom) {
        // collectAllItems already filters deleted items and applies edits via overwrite
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
        // Regular category - get direct items from data.json
        let baseItems = category.items || [];
        
        // Filter out deleted items and ensure items have name for display
        baseItems = baseItems
            .filter(item => !deletedItems.includes(item.id))
            .map(item => ({
                ...item,
                name: item.name || item.text || '未命名' // backwards compatibility
            }));
        
        // Get user-added items for this category
        const userAddedItems = getItemsForLocation(categoryId);
        
        // Get user-added item IDs to filter out from baseItems (edited items should replace original)
        const userAddedItemIds = new Set(userAddedItems.map(item => item.id));
        
        // Filter out base items that have been edited (exist in userAddedItems with same ID)
        const baseItemsNotEdited = baseItems.filter(item => !userAddedItemIds.has(item.id));
        
        // Merge: base items (not edited) + user-added items (including edited items)
        items = [...baseItemsNotEdited, ...userAddedItems];
        
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
    const addNewBtn = document.getElementById('add-new-btn');
    const filterBtn = document.getElementById('filter-btn');
    if (addNewBtn) {
        if (category.isRandom || categoryId === 'favorites') {
            addNewBtn.style.display = 'none';
                        } else {
            addNewBtn.style.display = 'inline-block';
        }
    }
    if (filterBtn) {
        if (category.isRandom) {
            filterBtn.style.display = 'inline-block';
        } else {
            filterBtn.style.display = 'none';
        }
    }
    updateShowAllButton();
}

// Select a subcategory
async function selectSubcategory(categoryId, subcategoryId) {
    currentCategoryId = categoryId;
    currentSubcategoryId = subcategoryId;
    currentSubclassId = null; // Reset subclass selection
    showAllCategory = false; // Reset category show all
    showAllSubclass = false; // Reset subclass show all
    
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

    // Get items from subcategory directly
    let items = subcategory.items || [];
    const deletedItems = getDeletedItems();
    
    // Filter out deleted items and ensure items have name for display
    items = items
        .filter(item => !deletedItems.includes(item.id))
        .map(item => ({
            ...item,
            name: item.name || item.text || '未命名' // backwards compatibility
        }));
    
    // Also collect items from all subclasses within this subcategory
    if (subcategory.subclasses) {
        subcategory.subclasses.forEach(subclass => {
            if (subclass.items) {
                const subclassItems = subclass.items.filter(item => !deletedItems.includes(item.id));
                items = items.concat(subclassItems);
            }
        });
    }
    
    // Get user-added items for this subcategory
    const userAddedItemsList = getItemsForLocation(categoryId, subcategoryId);
    
    // Get user-added item IDs to filter out from base items (edited items should replace original)
    const userAddedItemIds = new Set(userAddedItemsList.map(item => item.id));
    
    // Filter out base items that have been edited (exist in userAddedItems with same ID)
    items = items.filter(item => !userAddedItemIds.has(item.id));
    
    // Ensure user-added items have name for display (backwards compatibility)
    const userAddedItemsWithName = userAddedItemsList.map(item => ({
        ...item,
        name: item.name || item.text || '未命名'
    }));
    
    // Merge: base items (not edited) + user-added items (including edited items)
    items = [...items, ...userAddedItemsWithName];
    
    // Separate pinned and unpinned items (from both data.json and localStorage)
    // This handles pinned items from both subcategory items and subclass items
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
    document.getElementById('add-new-btn').style.display = 'inline-block';
    updateShowAllButton();
}

// Select a subclass
async function selectSubclass(categoryId, subcategoryId, subclassId) {
    currentCategoryId = categoryId;
    currentSubcategoryId = subcategoryId;
    currentSubclassId = subclassId;
    showAllCategory = false; // Reset category show all
    showAllSubcategory = false; // Reset subcategory show all
    
    // Get checkbox state BEFORE selecting items
    const checkbox = document.getElementById('show-all-checkbox');
    if (checkbox) {
        showAllSubclass = checkbox.checked;
        console.log(`[Subclass] Checkbox state read: ${showAllSubclass}`);
    } else {
        showAllSubclass = false; // Default to false if checkbox doesn't exist
        console.log(`[Subclass] Checkbox not found, defaulting to false`);
    }
    
    const data = await getData();
    if (!data || !data.categories) return;

    const category = data.categories.find(cat => cat.id === categoryId);
    if (!category || !category.subcategories) return;

    const subcategory = category.subcategories.find(sub => sub.id === subcategoryId);
    if (!subcategory || !subcategory.subclasses) return;

    const subclass = subcategory.subclasses.find(sub => sub.id === subclassId);
    if (!subclass) return;

    // Expand parent category and subcategory if collapsed
    if (!expandedCategories.has(categoryId)) {
        expandedCategories.add(categoryId);
    }
    const subcategoryKey = `${categoryId}-${subcategoryId}`;
    if (!expandedSubcategories.has(subcategoryKey)) {
        expandedSubcategories.add(subcategoryKey);
    }

    // Get items
    let items = subclass.items || [];
    const deletedItems = getDeletedItems();
    const userAddedItems = getUserAddedItems();
    const subclassKey = `${categoryId}:${subcategoryId}:${subclassId}`;
    
    // Filter out deleted items and check for modifications
    items = items
        .filter(item => !deletedItems.includes(item.id))
        .map(item => {
            // Check if this item has been modified in userAddedItems
            const modifiedItem = userAddedItems[subclassKey]?.find(userItem => userItem.id === item.id);
            if (modifiedItem) {
                // Use modified version
                return modifiedItem;
            }
            // Use original with name for display (backwards compatibility)
            return {
                ...item,
                name: item.name || item.text || '未命名',
                text: item.text || ''
            };
        });
    
    // Get user-added items for this subclass (new items, not modifications)
    const userAddedItemsList = getItemsForLocation(categoryId, subcategoryId, subclassId);
    
    // Filter out items that are modifications (they're already in items)
    const originalItemIds = new Set();
    if (subclass.items) {
        subclass.items.forEach(item => originalItemIds.add(item.id));
    }
    
    const newUserAddedItems = userAddedItemsList.filter(userItem => !originalItemIds.has(userItem.id));
    
    // Ensure user-added items have name for display (backwards compatibility)
    const userAddedItemsWithName = newUserAddedItems.map(item => ({
        ...item,
        name: item.name || item.text || '未命名'
    }));
    
    items = [...items, ...userAddedItemsWithName];
    
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
    const maxItems = MAX_ITEMS_SUBCLASS;
    let limitedUnpinned = [];
    
    if (showAllSubclass) {
        limitedUnpinned = shuffledUnpinned;
        console.log(`[Subclass] Showing all ${items.length} items (${pinned.length} pinned, ${shuffledUnpinned.length} unpinned)`);
    } else if (unpinned.length > 0) {
        if (unpinned.length > maxItems) {
            limitedUnpinned = shuffledUnpinned.slice(0, maxItems);
            console.log(`[Subclass] Limited unpinned to ${maxItems} items, now showing ${pinned.length} pinned + ${limitedUnpinned.length} unpinned`);
    } else {
            limitedUnpinned = shuffledUnpinned.slice(0, maxItems);
            console.log(`[Subclass] Showing ${pinned.length} pinned + ${limitedUnpinned.length} unpinned items`);
        }
    }
    
    // Combine: pinned items first, then unpinned
    items = [...pinned, ...limitedUnpinned];

    // Render items
    renderContent(items, subclass.name, category.icon);

    // Update UI
    renderSidebar();
    updateContentHeader(subclass.name, category.icon);
    document.getElementById('refresh-btn').style.display = 'inline-block';
    const addNewBtn = document.getElementById('add-new-btn');
    if (addNewBtn) {
        addNewBtn.style.display = 'inline-block';
    }
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
        // Display name on button, text is now a note (not displayed)
        const buttonText = item.name || '未命名';
        const videoUrl = item.url || '#';
        const itemId = item.id;
        // Check both data.json pinned and localStorage pinned
        const isPinnedFromData = item.pinned === true;
        const isPinnedFromStorage = isItemPinned(itemId);
        const isPinned = isPinnedFromData || isPinnedFromStorage;
        const isFav = isFavorite(itemId);
        
        // Check if we're in favorites category (hide pin button and pin styling in favorites)
        const isFavoritesCategory = currentCategoryId === 'favorites';
        
        html += `
            <div class="video-button-wrapper">
                ${!isFavoritesCategory ? `
                    <button class="pin-btn ${isPinned ? 'active' : ''}" onclick="togglePinItem(${itemId}, event);" title="${isPinned ? 'Unpin' : 'Pin'}">
                        ${isPinned ? '📌' : '📎'}
                    </button>
                ` : ''}
                <a href="${escapeHtml(videoUrl)}" target="_blank" class="video-button ${isPinned && !isFavoritesCategory ? 'pinned' : ''}" title="${escapeHtml(buttonText)}">
                    <span class="button-text">${escapeHtml(buttonText).replace(/\n/g, '<br>')}</span>
                </a>
                <button class="favorite-btn ${isFav ? 'active' : ''}" onclick="toggleFavoriteItem(${itemId}, event);" title="${isFav ? 'Remove from favorites' : 'Add to favorites'}">
                    ${isFav ? '⭐' : '☆'}
                </button>
                <button class="edit-btn" onclick="showEditModal(${itemId}, event);" title="Edit">
                    ✎
                </button>
                <button class="delete-btn" onclick="deleteItemWithConfirm(${itemId}, event);" title="Delete">
                    ×
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
    if (currentSubclassId) {
        selectSubclass(currentCategoryId, currentSubcategoryId, currentSubclassId);
    } else if (currentSubcategoryId) {
        selectSubcategory(currentCategoryId, currentSubcategoryId);
    } else if (currentCategoryId) {
        selectCategory(currentCategoryId);
    }
}

// Delete item with confirmation
function deleteItemWithConfirm(itemId, event) {
    if (event) {
        event.stopPropagation();
        event.preventDefault();
    }
    
    const confirmed = confirm('确定要删除这个按钮吗？');
    if (!confirmed) {
        return;
    }
    
    deleteItem(itemId);
    
    // Refresh current view to show updated items
    if (currentSubclassId) {
        selectSubclass(currentCategoryId, currentSubcategoryId, currentSubclassId);
    } else if (currentSubcategoryId) {
        selectSubcategory(currentCategoryId, currentSubcategoryId);
    } else if (currentCategoryId) {
        selectCategory(currentCategoryId);
    }
    
    // Update sidebar counts
    renderSidebar();
}

// Show add new item modal
function showAddNewModal() {
    const modal = document.getElementById('add-item-modal');
    if (modal) {
        modal.style.display = 'flex';
        modal.setAttribute('data-mode', 'add');
        // Clear form
        document.getElementById('add-item-name').value = '';
        document.getElementById('add-item-url').value = '';
        document.getElementById('add-item-text').value = '';
        document.getElementById('add-item-modal-title').textContent = '新增按钮';
        // Focus on name input
        document.getElementById('add-item-name').focus();
    }
}

// Show edit item modal
async function showEditModal(itemId, event) {
    if (event) {
        event.stopPropagation();
        event.preventDefault();
    }
    
    const item = await getItemById(itemId);
    if (!item) {
        alert('无法找到该项目');
        return;
    }
    
    const modal = document.getElementById('add-item-modal');
    if (modal) {
        modal.style.display = 'flex';
        modal.setAttribute('data-mode', 'edit');
        modal.setAttribute('data-item-id', itemId);
        // Fill form with item data
        document.getElementById('add-item-name').value = item.name || '';
        document.getElementById('add-item-url').value = item.url || '';
        document.getElementById('add-item-text').value = item.text || '';
        document.getElementById('add-item-modal-title').textContent = '编辑按钮';
        // Focus on name input
        document.getElementById('add-item-name').focus();
    }
}

// Hide add/edit item modal
function hideAddNewModal() {
    const modal = document.getElementById('add-item-modal');
    if (modal) {
        modal.style.display = 'none';
        modal.removeAttribute('data-mode');
        modal.removeAttribute('data-item-id');
    }
}

// Add new item or update existing item
async function addNewItem() {
    const modal = document.getElementById('add-item-modal');
    const mode = modal.getAttribute('data-mode');
    
    // Get name value - preserve line breaks but trim only start/end whitespace
    const nameElement = document.getElementById('add-item-name');
    let name = nameElement.value;
    // Trim only leading and trailing whitespace, preserve internal line breaks
    name = name.replace(/^\s+|\s+$/g, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    
    const url = document.getElementById('add-item-url').value.trim();
    const text = document.getElementById('add-item-text').value.trim();
    
    if (!name || !url) {
        alert('请输入名称和链接');
        return;
    }
    
    if (mode === 'edit') {
        // Edit existing item
        const itemId = parseInt(modal.getAttribute('data-item-id'));
        updateItemInLocation(itemId, name, url, text);
    } else {
        // Add new item
        addItemToLocation(currentCategoryId, currentSubcategoryId, currentSubclassId, name, url, text);
    }
    
    // Hide modal
    hideAddNewModal();
    
    // Refresh current view
    if (currentSubclassId) {
        selectSubclass(currentCategoryId, currentSubcategoryId, currentSubclassId);
    } else if (currentSubcategoryId) {
        selectSubcategory(currentCategoryId, currentSubcategoryId);
    } else if (currentCategoryId) {
        selectCategory(currentCategoryId);
    }
    
    // Update sidebar counts
    renderSidebar();
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
            if ((category && !category.isTextOnly) || currentCategoryId === 'favorites') {
                showAllCheckbox.style.display = 'inline-block';
                showAllLabel.style.display = 'inline-block';
                // Sync checkbox with current state (don't change it, just update display)
                if (currentSubclassId) {
                    showAllCheckbox.checked = showAllSubclass;
                } else if (currentSubcategoryId) {
                    showAllCheckbox.checked = showAllSubcategory;
    } else {
                    showAllCheckbox.checked = showAllCategory;
                }
                console.log(`[updateShowAllButton] Checkbox synced: ${showAllCheckbox.checked} (subclass: ${currentSubclassId ? showAllSubclass : 'N/A'}, subcategory: ${currentSubcategoryId ? showAllSubcategory : 'N/A'}, category: ${currentSubcategoryId ? 'N/A' : showAllCategory})`);
                        } else {
                showAllCheckbox.style.display = 'none';
                showAllLabel.style.display = 'none';
            }
        }
    }
}

// Toggle show all for current category/subcategory/subclass
function toggleShowAll() {
    const checkbox = document.getElementById('show-all-checkbox');
    if (!checkbox) return;
    
    if (currentSubclassId) {
        showAllSubclass = checkbox.checked;
        selectSubclass(currentCategoryId, currentSubcategoryId, currentSubclassId);
    } else if (currentSubcategoryId) {
        showAllSubcategory = checkbox.checked;
        selectSubcategory(currentCategoryId, currentSubcategoryId);
    } else if (currentCategoryId) {
        showAllCategory = checkbox.checked;
        selectCategory(currentCategoryId);
    }
}

// Refresh current category (Random)
function refreshCurrentCategory() {
    // Don't reset show all state - just refresh the view to randomize items
    // The checkbox state should be preserved
    
    // Refresh the view (this will re-randomize items while keeping showAll state)
    if (currentSubclassId) {
        selectSubclass(currentCategoryId, currentSubcategoryId, currentSubclassId);
    } else if (currentSubcategoryId) {
        selectSubcategory(currentCategoryId, currentSubcategoryId);
    } else if (currentCategoryId) {
        selectCategory(currentCategoryId);
    }
}

// Initialize app
async function initApp() {
    // Initialize sidebar state
    initSidebarState();
    
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
    
    // Add Escape key support for modals (no Enter key submission, only button click)
    document.addEventListener('keydown', (e) => {
        const addModal = document.getElementById('add-item-modal');
        const filterModal = document.getElementById('filter-modal');
        
        if (e.key === 'Escape') {
            if (addModal && addModal.style.display === 'flex') {
                hideAddNewModal();
            } else if (filterModal && filterModal.style.display === 'flex') {
                hideFilterModal();
            }
        }
        // Note: Enter key no longer submits - only click on confirm button
    });
    
    // Note: Removed click outside to close modal - user must use cancel button or Escape key
}

// Toggle sidebar collapse
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    if (sidebar) {
        sidebar.classList.toggle('collapsed');
        // Save state to localStorage
        const isCollapsed = sidebar.classList.contains('collapsed');
        localStorage.setItem('sidebar_collapsed', JSON.stringify(isCollapsed));
    }
}

// Initialize sidebar state from localStorage
function initSidebarState() {
    const sidebar = document.getElementById('sidebar');
    if (sidebar) {
        const savedState = localStorage.getItem('sidebar_collapsed');
        if (savedState) {
            const isCollapsed = JSON.parse(savedState);
            if (isCollapsed) {
                sidebar.classList.add('collapsed');
            }
        }
    }
}

// Show filter modal for Daily Random
let selectedFilterCategoryId = null;

async function showFilterModal() {
    const modal = document.getElementById('filter-modal');
    if (!modal) return;
    
    const data = await getData();
    if (!data || !data.categories) return;
    
    selectedFilterCategoryId = null;
    
    // Determine which filter to use based on current category
    const isFavorites = currentCategoryId === 'favorites';
    
    // Clear the filter sidebar and details area completely to avoid using wrong filter's state
    // This ensures we always read from the correct filter, not from DOM state
    const sidebar = document.getElementById('filter-categories-sidebar');
    const detailsArea = document.getElementById('filter-details-area');
    if (sidebar) {
        sidebar.innerHTML = '';
    }
    if (detailsArea) {
        detailsArea.innerHTML = '';
    }
    
    // Render filter sidebar and details (will use appropriate filter)
    renderFilterSidebar(data, isFavorites);
    renderFilterDetails(data, null, isFavorites);
    
    modal.style.display = 'flex';
}

// Hide filter modal
function hideFilterModal() {
    const modal = document.getElementById('filter-modal');
    if (modal) {
        modal.style.display = 'none';
    }
}

// Render filter sidebar (categories list)
// isFavorites: true if this is for favorites filter, false for daily random filter
async function renderFilterSidebar(data, isFavorites = false) {
    const sidebar = document.getElementById('filter-categories-sidebar');
    if (!sidebar) return;
    
    // Use appropriate filter based on context
    const filter = isFavorites ? getFavoritesFilter() : getDailyRandomFilter();
    let categories = data.categories.filter(cat => cat.id !== 'daily-random' && cat.id !== 'favorites');
    
    // Get saved filter category order from localStorage
    const savedFilterCategoryOrder = JSON.parse(localStorage.getItem(FILTER_CATEGORY_ORDER_KEY) || '[]');
    
    // Sort categories based on saved order
    const sortedCategories = [...categories].sort((a, b) => {
        const indexA = savedFilterCategoryOrder.indexOf(a.id);
        const indexB = savedFilterCategoryOrder.indexOf(b.id);
        // If both are in saved order, use their order
        if (indexA !== -1 && indexB !== -1) return indexA - indexB;
        // If only A is in saved order, A comes first
        if (indexA !== -1) return -1;
        // If only B is in saved order, B comes first
        if (indexB !== -1) return 1;
        // If neither is in saved order, keep original order
        return 0;
    });
    
    let html = '';
    
    sortedCategories.forEach(category => {
        const categoryId = category.id;
        
        // Check current checkbox state in DOM (if exists) to preserve user's manual changes
        const existingCheckbox = document.querySelector(`.filter-category-checkbox[data-category-id="${categoryId}"]`);
        const categoryCheckedFromDOM = existingCheckbox ? existingCheckbox.checked : null;
        
        // Category is checked if:
        // 1. DOM checkbox exists and is checked (user's current selection takes priority)
        // 2. OR no filter (default all selected)
        // 3. OR filter.categories includes this category
        // 4. OR filter is empty/null (means show all)
        const categoryChecked = categoryCheckedFromDOM !== null
            ? categoryCheckedFromDOM
            : (!filter || (filter.categories && filter.categories.length > 0 && filter.categories.includes(categoryId)) || (!filter.categories && !filter.subcategories && !filter.subclasses));
        
        const isActive = selectedFilterCategoryId === categoryId;
        
        html += `
            <div class="filter-category-item ${isActive ? 'active' : ''}" 
                 data-category-id="${categoryId}"
                 ondragover="handleFilterCategoryDragOver(event)"
                 ondrop="handleFilterCategoryDrop(event)">
                <span class="filter-drag-handle" 
                      draggable="true"
                      ondragstart="handleFilterCategoryDragStart(event, '${categoryId}')"
                      ondragend="handleFilterCategoryDragEnd(event)"
                      onmousedown="event.stopPropagation()">⋮⋮</span>
                <div class="filter-category-content" onclick="selectFilterCategory('${categoryId}')">
                    <input type="checkbox" class="filter-category-checkbox" 
                           data-category-id="${categoryId}"
                           ${categoryChecked ? 'checked' : ''}
                           onchange="handleCategoryFilterChange('${categoryId}', this.checked, event)"
                           onclick="event.stopPropagation()">
                    <span class="filter-category-item-name">${escapeHtml(category.icon || '')} ${escapeHtml(category.name)}</span>
                </div>
            </div>
        `;
    });
    
    sidebar.innerHTML = html;
}

// Select filter category (show details on right)
async function selectFilterCategory(categoryId) {
    selectedFilterCategoryId = categoryId;
    const data = await getData();
    if (!data || !data.categories) return;
    
    // Determine which filter to use based on current category
    const isFavorites = currentCategoryId === 'favorites';
    
    // Update sidebar active state
    renderFilterSidebar(data, isFavorites);
    
    // Render details
    renderFilterDetails(data, categoryId, isFavorites);
}

// Render filter details (subcategories as tabs, subclasses below)
// isFavorites: true if this is for favorites filter, false for daily random filter
async function renderFilterDetails(data, categoryId, isFavorites = false) {
    const detailsArea = document.getElementById('filter-details-area');
    if (!detailsArea) return;
    
    if (!categoryId) {
        detailsArea.innerHTML = `
            <div class="filter-placeholder">
                <p>请从左侧选择一个分类</p>
            </div>
        `;
        return;
    }
    
    const category = data.categories.find(cat => cat.id === categoryId);
    if (!category) return;
    
    // Check current checkbox state in DOM (if exists) to preserve user's manual changes
    const categoryCheckbox = document.querySelector(`.filter-category-checkbox[data-category-id="${categoryId}"]`);
    const categoryCheckedFromDOM = categoryCheckbox ? categoryCheckbox.checked : null;
    
    // Use appropriate filter based on context
    const filter = isFavorites ? getFavoritesFilter() : getDailyRandomFilter();
    // Category is checked if:
    // 1. DOM checkbox exists and is checked (user's current selection takes priority)
    // 2. OR no filter (default all selected) - for favorites, default to all selected
    // 3. OR it's in filter.categories
    const categoryChecked = categoryCheckedFromDOM !== null 
        ? categoryCheckedFromDOM 
        : (!filter || (filter.categories && filter.categories.length > 0 && filter.categories.includes(categoryId)) || (!filter.categories && !filter.subcategories && !filter.subclasses));
    
    // Check if category has subcategories
    if (!category.subcategories || category.subcategories.length === 0) {
        detailsArea.innerHTML = `
            <div class="filter-placeholder">
                <p>此分类下没有子分类</p>
            </div>
        `;
        return;
    }
    
    // Get first subcategory as default selected tab (or keep current active tab if exists)
    let selectedSubcategoryId = category.subcategories[0]?.id;
    
    // Try to preserve the currently active tab
    const currentActiveTab = document.querySelector('.filter-subcategory-tab.active');
    if (currentActiveTab) {
        const currentActiveSubcategoryId = currentActiveTab.querySelector('.filter-subcategory-checkbox')?.getAttribute('data-subcategory-id');
        // Only use it if it belongs to this category
        if (currentActiveSubcategoryId && category.subcategories.some(sub => sub.id === currentActiveSubcategoryId)) {
            selectedSubcategoryId = currentActiveSubcategoryId;
        }
    }
    
    let html = `
        <div class="filter-subcategory-tabs">
    `;
    
    // Render subcategories as tabs
    category.subcategories.forEach((subcategory) => {
        const subcategoryKey = `${categoryId}:${subcategory.id}`;
        
        // Check current checkbox state in DOM (if exists) to preserve user's manual changes
        const existingSubcategoryCheckbox = document.querySelector(
            `.filter-subcategory-checkbox[data-category-id="${categoryId}"][data-subcategory-id="${subcategory.id}"]`
        );
        const subcategoryCheckedFromDOM = existingSubcategoryCheckbox ? existingSubcategoryCheckbox.checked : null;
        
        // Subcategory is checked if:
        // 1. DOM checkbox exists and is checked (user's current selection takes priority)
        // 2. OR category is checked AND subcategory is not in excludedSubcategories
        // 3. OR subcategory is specifically in filter.subcategories
        const isExcluded = filter && filter.excludedSubcategories && filter.excludedSubcategories.includes(subcategoryKey);
        const subcategoryChecked = subcategoryCheckedFromDOM !== null
            ? subcategoryCheckedFromDOM
            : ((categoryChecked && !isExcluded) || (filter && filter.subcategories && filter.subcategories.includes(subcategoryKey)));
        
        html += `
            <div class="filter-subcategory-tab ${selectedSubcategoryId === subcategory.id ? 'active' : ''}" 
                 onclick="selectFilterSubcategory('${categoryId}', '${subcategory.id}')">
                <input type="checkbox" class="filter-subcategory-checkbox" 
                       data-category-id="${categoryId}"
                       data-subcategory-id="${subcategory.id}"
                       ${subcategoryChecked ? 'checked' : ''}
                       onchange="event.stopPropagation(); handleSubcategoryFilterChange('${categoryId}', '${subcategory.id}', this.checked)"
                       onclick="event.stopPropagation()">
                <span>${escapeHtml(subcategory.name)}</span>
            </div>
        `;
    });
    
    html += `</div>`;
    
    // Render subclasses for selected subcategory
    const selectedSubcategory = category.subcategories.find(sub => sub.id === selectedSubcategoryId);
    if (selectedSubcategory && selectedSubcategory.subclasses && selectedSubcategory.subclasses.length > 0) {
        const subcategoryKey = `${categoryId}:${selectedSubcategoryId}`;
        
        // Check current checkbox state in DOM
        const existingSubcategoryCheckbox = document.querySelector(
            `.filter-subcategory-checkbox[data-category-id="${categoryId}"][data-subcategory-id="${selectedSubcategoryId}"]`
        );
        const subcategoryCheckedFromDOM = existingSubcategoryCheckbox ? existingSubcategoryCheckbox.checked : null;
        
        const isSubcategoryExcluded = filter && filter.excludedSubcategories && filter.excludedSubcategories.includes(subcategoryKey);
        const subcategoryChecked = subcategoryCheckedFromDOM !== null
            ? subcategoryCheckedFromDOM
            : ((categoryChecked && !isSubcategoryExcluded) || (filter && filter.subcategories && filter.subcategories.includes(subcategoryKey)));
        
        html += `<div class="filter-subclasses-container">`;
        
        selectedSubcategory.subclasses.forEach(subclass => {
            const subclassKey = `${categoryId}:${selectedSubcategoryId}:${subclass.id}`;
            
            // Check current checkbox state in DOM (if exists) to preserve user's manual changes
            const existingSubclassCheckbox = document.querySelector(
                `.filter-subclass-checkbox[data-category-id="${categoryId}"][data-subcategory-id="${selectedSubcategoryId}"][data-subclass-id="${subclass.id}"]`
            );
            const subclassCheckedFromDOM = existingSubclassCheckbox ? existingSubclassCheckbox.checked : null;
            
            // Subclass is checked if:
            // 1. DOM checkbox exists and is checked (user's current selection takes priority)
            // 2. OR category is checked AND not excluded
            // 3. OR subcategory is checked AND not excluded
            // 4. OR subclass is specifically in filter.subclasses
            const isExcluded = filter && filter.excludedSubclasses && filter.excludedSubclasses.includes(subclassKey);
            const subclassChecked = subclassCheckedFromDOM !== null
                ? subclassCheckedFromDOM
                : (((categoryChecked || subcategoryChecked) && !isExcluded && !isSubcategoryExcluded) || (filter && filter.subclasses && filter.subclasses.includes(subclassKey)));
            
            html += `
                <div class="filter-subclass-item">
                    <input type="checkbox" class="filter-subclass-checkbox" 
                           data-category-id="${categoryId}"
                           data-subcategory-id="${selectedSubcategoryId}"
                           data-subclass-id="${subclass.id}"
                           ${subclassChecked ? 'checked' : ''}
                           onchange="handleSubclassFilterChange('${categoryId}', '${selectedSubcategoryId}', '${subclass.id}', this.checked)">
                    <span class="filter-subclass-item-name">${escapeHtml(subclass.name)}</span>
                </div>
            `;
        });
        
        html += `</div>`;
    } else if (selectedSubcategory) {
        html += `
            <div class="filter-placeholder">
                <p>此子分类下没有更小的分类</p>
            </div>
        `;
    }
    
    detailsArea.innerHTML = html;
}

// Select filter subcategory (switch tab) - only update active state and subclasses, don't re-render tabs
async function selectFilterSubcategory(categoryId, subcategoryId) {
    const data = await getData();
    if (!data || !data.categories) return;
    
    const category = data.categories.find(cat => cat.id === categoryId);
    if (!category) return;
    
    // Update tab active states without re-rendering the entire tabs section (just update classes)
    const tabs = document.querySelectorAll('.filter-subcategory-tab');
    tabs.forEach(tab => {
        const tabSubcategoryId = tab.querySelector('.filter-subcategory-checkbox')?.getAttribute('data-subcategory-id');
        if (tabSubcategoryId === subcategoryId) {
            tab.classList.add('active');
        } else {
            tab.classList.remove('active');
        }
    });
    
    // Get current checkbox states from DOM to preserve user's manual changes
    const categoryCheckbox = document.querySelector(`.filter-category-checkbox[data-category-id="${categoryId}"]`);
    const categoryChecked = categoryCheckbox ? categoryCheckbox.checked : false;
    
    const selectedSubcategory = category.subcategories.find(sub => sub.id === subcategoryId);
    const subclassesContainer = document.querySelector('.filter-subclasses-container');
    const placeholder = document.querySelector('.filter-placeholder');
    
    if (selectedSubcategory && selectedSubcategory.subclasses && selectedSubcategory.subclasses.length > 0) {
        // Get current subcategory checkbox state
        const subcategoryCheckbox = document.querySelector(
            `.filter-subcategory-checkbox[data-category-id="${categoryId}"][data-subcategory-id="${subcategoryId}"]`
        );
        const subcategoryChecked = subcategoryCheckbox ? subcategoryCheckbox.checked : false;
        
        let html = '';
        selectedSubcategory.subclasses.forEach(subclass => {
            // Get current subclass checkbox state from DOM (if exists) to preserve user's manual changes
            const existingSubclassCheckbox = document.querySelector(
                `.filter-subclass-checkbox[data-category-id="${categoryId}"][data-subcategory-id="${subcategoryId}"][data-subclass-id="${subclass.id}"]`
            );
            
            // Subclass is checked if:
            // 1. DOM checkbox exists and is checked (preserve user's manual changes)
            // 2. OR (category is checked OR subcategory is checked) - inherit from parent
            const subclassChecked = existingSubclassCheckbox 
                ? existingSubclassCheckbox.checked 
                : (categoryChecked || subcategoryChecked);
            
            html += `
                <div class="filter-subclass-item">
                    <input type="checkbox" class="filter-subclass-checkbox" 
                           data-category-id="${categoryId}"
                           data-subcategory-id="${subcategoryId}"
                           data-subclass-id="${subclass.id}"
                           ${subclassChecked ? 'checked' : ''}
                           onchange="handleSubclassFilterChange('${categoryId}', '${subcategoryId}', '${subclass.id}', this.checked)">
                    <span class="filter-subclass-item-name">${escapeHtml(subclass.name)}</span>
                </div>
            `;
        });
        
        // Remove placeholder if exists
        if (placeholder && placeholder.parentNode) {
            placeholder.remove();
        }
        
        // Update or create subclasses container (only update content, don't recreate container to avoid layout shift)
        if (subclassesContainer) {
            subclassesContainer.innerHTML = html;
        } else {
            const detailsArea = document.getElementById('filter-details-area');
            if (detailsArea) {
                const container = document.createElement('div');
                container.className = 'filter-subclasses-container';
                container.innerHTML = html;
                // Insert after tabs
                const tabsContainer = detailsArea.querySelector('.filter-subcategory-tabs');
                if (tabsContainer) {
                    tabsContainer.after(container);
                } else {
                    detailsArea.appendChild(container);
                }
            }
        }
    } else if (selectedSubcategory) {
        // Remove subclasses container if exists
        if (subclassesContainer && subclassesContainer.parentNode) {
            subclassesContainer.remove();
        }
        
        // Show placeholder
        if (!placeholder || !placeholder.parentNode) {
            const detailsArea = document.getElementById('filter-details-area');
            if (detailsArea) {
                const placeholderDiv = document.createElement('div');
                placeholderDiv.className = 'filter-placeholder';
                placeholderDiv.innerHTML = '<p>此子分类下没有更小的分类</p>';
                const tabsContainer = detailsArea.querySelector('.filter-subcategory-tabs');
                if (tabsContainer) {
                    tabsContainer.after(placeholderDiv);
                } else {
                    detailsArea.appendChild(placeholderDiv);
                }
            }
        }
    }
}

// Handle category filter change
function handleCategoryFilterChange(categoryId, checked, event) {
    // Don't prevent default - let the checkbox update normally
    // Just stop propagation to prevent triggering category selection
    if (event) {
        event.stopPropagation();
    }
    
    // Update all subcategories and subclasses under this category
    // When checked, automatically check all subcategories and subclasses (but don't disable them)
    // When unchecked, automatically uncheck all subcategories and subclasses
    const subcategoryCheckboxes = document.querySelectorAll(`.filter-subcategory-checkbox[data-category-id="${categoryId}"]`);
    subcategoryCheckboxes.forEach(checkbox => {
        checkbox.checked = checked;
    });
    
    const subclassCheckboxes = document.querySelectorAll(`.filter-subclass-checkbox[data-category-id="${categoryId}"]`);
    subclassCheckboxes.forEach(checkbox => {
        checkbox.checked = checked;
    });
    
    // Refresh the details area to reflect changes (but preserve the active tab)
    if (selectedFilterCategoryId === categoryId) {
        const data = cachedData;
        if (data) {
            // Get current active subcategory before re-rendering
            const activeTab = document.querySelector('.filter-subcategory-tab.active');
            let activeSubcategoryId = null;
            if (activeTab) {
                activeSubcategoryId = activeTab.querySelector('.filter-subcategory-checkbox')?.getAttribute('data-subcategory-id');
            }
            
            // Determine which filter to use based on current category
            const isFavorites = currentCategoryId === 'favorites';
            
            // Re-render details - this will update all checkbox states based on current DOM state
            renderFilterDetails(data, categoryId, isFavorites);
            
            // Restore active tab if it existed
            if (activeSubcategoryId) {
                // Wait a bit for DOM to update, then restore active state
                setTimeout(() => {
                    selectFilterSubcategory(categoryId, activeSubcategoryId);
                }, 10);
            }
        }
    }
    
    // Don't re-render sidebar here - it would reset the checkbox state
    // The sidebar will be updated when the user clicks on the category item or when the modal is opened
}

// Handle subcategory filter change
function handleSubcategoryFilterChange(categoryId, subcategoryId, checked) {
    // Update all subclasses under this subcategory
    // When checked, automatically check all subclasses
    // When unchecked, automatically uncheck all subclasses
    const subclassCheckboxes = document.querySelectorAll(
        `.filter-subclass-checkbox[data-category-id="${categoryId}"][data-subcategory-id="${subcategoryId}"]`
    );
    subclassCheckboxes.forEach(checkbox => {
        checkbox.checked = checked;
    });
    
    // If this is the currently displayed subcategory, update the visible subclasses
    if (selectedFilterCategoryId === categoryId) {
        const activeTab = document.querySelector('.filter-subcategory-tab.active');
        if (activeTab) {
            const activeSubcategoryId = activeTab.querySelector('.filter-subcategory-checkbox')?.getAttribute('data-subcategory-id');
            if (activeSubcategoryId === subcategoryId) {
                // Update visible subclasses without re-rendering tabs
                const data = cachedData;
                if (data) {
                    selectFilterSubcategory(categoryId, subcategoryId);
                }
            }
        }
    }
}

// Handle subclass filter change
function handleSubclassFilterChange(categoryId, subcategoryId, subclassId, checked) {
    // Note: Don't affect parent category or subcategory, or sibling subclasses
    // User can manually uncheck a subclass even if parent is checked
    // This allows fine-grained control
}

// Select all filters
function selectAllFilters() {
    // Check all category checkboxes
    document.querySelectorAll('.filter-category-checkbox').forEach(checkbox => {
        checkbox.checked = true;
        const categoryId = checkbox.getAttribute('data-category-id');
        // This will automatically check all subcategories and subclasses
        handleCategoryFilterChange(categoryId, true);
    });
    
    // Refresh details if a category is selected
    if (selectedFilterCategoryId) {
        const data = cachedData;
        if (data) {
            const isFavorites = currentCategoryId === 'favorites';
            renderFilterDetails(data, selectedFilterCategoryId, isFavorites);
        }
    }
}

// Deselect all filters
function deselectAllFilters() {
    // Uncheck all category checkboxes
    document.querySelectorAll('.filter-category-checkbox').forEach(checkbox => {
        checkbox.checked = false;
        const categoryId = checkbox.getAttribute('data-category-id');
        // This will automatically uncheck all subcategories and subclasses
        handleCategoryFilterChange(categoryId, false);
    });
    
    // Also uncheck any remaining subcategories and subclasses
    document.querySelectorAll('.filter-subcategory-checkbox, .filter-subclass-checkbox').forEach(checkbox => {
        checkbox.checked = false;
    });
    
    // Refresh details if a category is selected
    if (selectedFilterCategoryId) {
        const data = cachedData;
        if (data) {
            const isFavorites = currentCategoryId === 'favorites';
            renderFilterDetails(data, selectedFilterCategoryId, isFavorites);
        }
    }
}

// Apply filter
async function applyFilter() {
    const categories = [];
    const subcategories = [];
    const subclasses = [];
    const excludedSubcategories = [];
    const excludedSubclasses = [];
    
    // Get all categories for reference
    const data = await getData();
    const allCategories = data.categories.filter(cat => cat.id !== 'daily-random' && cat.id !== 'favorites');
    
    // Collect checked categories
    document.querySelectorAll('.filter-category-checkbox:checked').forEach(checkbox => {
        categories.push(checkbox.getAttribute('data-category-id'));
    });
    
    // For each checked category, find unchecked subcategories (exclusions)
    categories.forEach(categoryId => {
        const category = allCategories.find(cat => cat.id === categoryId);
        if (!category || !category.subcategories) return;
        
        category.subcategories.forEach(subcategory => {
            const subcategoryCheckbox = document.querySelector(
                `.filter-subcategory-checkbox[data-category-id="${categoryId}"][data-subcategory-id="${subcategory.id}"]`
            );
            const subcategoryKey = `${categoryId}:${subcategory.id}`;
            
            if (subcategoryCheckbox && !subcategoryCheckbox.checked) {
                // Category is checked but subcategory is not - this is an exclusion
                excludedSubcategories.push(subcategoryKey);
                
                // Also exclude all subclasses under this subcategory
                if (subcategory.subclasses) {
                    subcategory.subclasses.forEach(subclass => {
                        excludedSubclasses.push(`${categoryId}:${subcategory.id}:${subclass.id}`);
                    });
                }
            } else if (subcategoryCheckbox && subcategoryCheckbox.checked && subcategory.subclasses) {
                // Subcategory is checked, check for unchecked subclasses (exclusions)
                subcategory.subclasses.forEach(subclass => {
                    const subclassCheckbox = document.querySelector(
                        `.filter-subclass-checkbox[data-category-id="${categoryId}"][data-subcategory-id="${subcategory.id}"][data-subclass-id="${subclass.id}"]`
                    );
                    if (subclassCheckbox && !subclassCheckbox.checked) {
                        excludedSubclasses.push(`${categoryId}:${subcategory.id}:${subclass.id}`);
                    }
                });
            }
        });
    });
    
    // Collect checked subcategories (only if their parent category is not checked)
    document.querySelectorAll('.filter-subcategory-checkbox:checked').forEach(checkbox => {
        const categoryId = checkbox.getAttribute('data-category-id');
        const subcategoryId = checkbox.getAttribute('data-subcategory-id');
        const categoryChecked = categories.includes(categoryId);
        
        // Only add if parent category is not checked (to avoid redundancy)
        if (!categoryChecked) {
            subcategories.push(`${categoryId}:${subcategoryId}`);
        }
    });
    
    // Collect checked subclasses (only if their parent subcategory is not checked)
    document.querySelectorAll('.filter-subclass-checkbox:checked').forEach(checkbox => {
        const categoryId = checkbox.getAttribute('data-category-id');
        const subcategoryId = checkbox.getAttribute('data-subcategory-id');
        const subclassId = checkbox.getAttribute('data-subclass-id');
        const categoryChecked = categories.includes(categoryId);
        const subcategoryKey = `${categoryId}:${subcategoryId}`;
        const subcategoryChecked = subcategories.includes(subcategoryKey) || categoryChecked;
        
        // Only add if parent subcategory is not checked (to avoid redundancy)
        if (!subcategoryChecked) {
            subclasses.push(`${categoryId}:${subcategoryId}:${subclassId}`);
        }
    });
    
    const allCategoryIds = allCategories.map(cat => cat.id);
    const allSelected = allCategoryIds.length > 0 && allCategoryIds.every(catId => categories.includes(catId));
    
    // Determine which filter to save based on current category
    const isFavorites = currentCategoryId === 'favorites';
    
    // If all categories are selected and no exclusions, don't save filter (show all)
    if (allSelected && subcategories.length === 0 && subclasses.length === 0 && excludedSubcategories.length === 0 && excludedSubclasses.length === 0) {
        // null means no filter (show all)
        if (isFavorites) {
            saveFavoritesFilter(null);
        } else {
            saveDailyRandomFilter(null);
        }
    } else {
        const filter = {
            categories: categories,
            subcategories: subcategories,
            subclasses: subclasses,
            excludedSubcategories: excludedSubcategories,
            excludedSubclasses: excludedSubclasses
        };
        if (isFavorites) {
            saveFavoritesFilter(filter);
        } else {
            saveDailyRandomFilter(filter);
        }
    }
    
    // Hide modal
    hideFilterModal();
    
    // Refresh current view
    if (currentCategoryId === 'daily-random') {
        selectCategory('daily-random');
    } else if (currentCategoryId === 'favorites') {
        selectCategory('favorites');
    }
}

// Drag and Drop handlers for Filter Categories
let draggedFilterCategoryElement = null;

function handleFilterCategoryDragStart(event, categoryId) {
    // Find the parent category item element
    const categoryItem = event.target.closest('.filter-category-item');
    if (!categoryItem) return;
    
    draggedFilterCategoryElement = categoryItem;
    categoryItem.classList.add('dragging');
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/html', categoryItem.outerHTML);
    event.dataTransfer.setData('category-id', categoryId);
    // Stop propagation to prevent triggering category selection
    event.stopPropagation();
}

function handleFilterCategoryDragOver(event) {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    
    const categoryElement = event.currentTarget.closest('.filter-category-item');
    if (!categoryElement || categoryElement === draggedFilterCategoryElement) return;
    
    // Remove drag-over classes from all items first
    document.querySelectorAll('.filter-category-item').forEach(item => {
        if (item !== categoryElement && item !== draggedFilterCategoryElement) {
            item.classList.remove('drag-over-top', 'drag-over-bottom');
        }
    });
    
    const rect = categoryElement.getBoundingClientRect();
    const next = (event.clientY - rect.top) / (rect.bottom - rect.top) > 0.5;
    
    categoryElement.classList.remove('drag-over-top', 'drag-over-bottom');
    if (next) {
        categoryElement.classList.add('drag-over-bottom');
    } else {
        categoryElement.classList.add('drag-over-top');
    }
}

function handleFilterCategoryDrop(event) {
    event.preventDefault();
    event.stopPropagation();
    
    if (!draggedFilterCategoryElement) return;
    
    const categoryElement = event.currentTarget.closest('.filter-category-item');
    if (!categoryElement || categoryElement === draggedFilterCategoryElement) return;
    
    const rect = categoryElement.getBoundingClientRect();
    const next = (event.clientY - rect.top) / (rect.bottom - rect.top) > 0.5;
    
    if (next) {
        categoryElement.parentNode.insertBefore(draggedFilterCategoryElement, categoryElement.nextSibling);
    } else {
        categoryElement.parentNode.insertBefore(draggedFilterCategoryElement, categoryElement);
    }
    
    saveFilterCategoryOrder();
}

function handleFilterCategoryDragEnd(event) {
    if (draggedFilterCategoryElement) {
        draggedFilterCategoryElement.classList.remove('dragging');
    }
    document.querySelectorAll('.filter-category-item').forEach(item => {
        item.classList.remove('drag-over-top', 'drag-over-bottom');
    });
    draggedFilterCategoryElement = null;
}

function saveFilterCategoryOrder() {
    const categories = document.querySelectorAll('.filter-category-item');
    const order = Array.from(categories).map(cat => cat.getAttribute('data-category-id'));
    localStorage.setItem(FILTER_CATEGORY_ORDER_KEY, JSON.stringify(order));
}

// Export localStorage data
function exportLocalStorage() {
    try {
        // Collect all localStorage data related to this app
        const exportData = {
            version: '1.0',
            exportDate: new Date().toISOString(),
            data: {
                favorites: localStorage.getItem(FAVORITES_KEY),
                pins: localStorage.getItem(PINS_KEY),
                categoryOrder: localStorage.getItem(CATEGORY_ORDER_KEY),
                filterCategoryOrder: localStorage.getItem(FILTER_CATEGORY_ORDER_KEY),
                userAddedItems: localStorage.getItem(USER_ADDED_ITEMS_KEY),
                deletedItems: localStorage.getItem(DELETED_ITEMS_KEY),
                dailyRandomFilter: localStorage.getItem(DAILY_RANDOM_FILTER_KEY),
                favoritesFilter: localStorage.getItem(FAVORITES_FILTER_KEY),
                rawFilmsContent: localStorage.getItem(RAW_FILMS_CONTENT_KEY),
                rawFilmsRatings: localStorage.getItem(RAW_FILMS_RATINGS_KEY),
                rawFilmsSortMode: localStorage.getItem(RAW_FILMS_SORT_MODE_KEY),
                rawFilmsSectionOrder: localStorage.getItem(RAW_FILMS_SECTION_ORDER_KEY),
                sidebarCollapsed: localStorage.getItem('sidebar_collapsed'),
                // Get all subcategory orders
                subcategoryOrders: {}
            }
        };
        
        // Collect all subcategory orders
        const data = cachedData;
        if (data && data.categories) {
            data.categories.forEach(category => {
                if (category.subcategories) {
                    const subcategoryOrder = localStorage.getItem(`${SUBCATEGORY_ORDER_KEY_PREFIX}${category.id}`);
                    if (subcategoryOrder) {
                        exportData.data.subcategoryOrders[category.id] = subcategoryOrder;
                    }
                }
            });
        }
        
        // Create JSON string
        const jsonString = JSON.stringify(exportData, null, 2);
        
        // Create blob and download
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `video_portal_backup_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        alert('✅ 设置已成功导出！');
        } catch (error) {
        console.error('导出失败:', error);
        alert('❌ 导出失败，请查看控制台获取详细信息');
    }
}

// Import localStorage data
function importLocalStorage(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const importData = JSON.parse(e.target.result);
            
            // Validate data structure
            if (!importData.data) {
                throw new Error('无效的备份文件格式');
            }
            
            // Confirm import
            const confirmMessage = `确定要导入设置吗？\n\n这将覆盖当前的：\n- 排序设置\n- 收藏/置顶\n- 用户添加的项目\n- 筛选设置\n- 原片分类内容、评分与分组顺序\n\n导入后页面将自动刷新。`;
            if (!confirm(confirmMessage)) {
                event.target.value = ''; // Reset file input
                return;
            }
            
            // Import data
            if (importData.data.favorites !== null && importData.data.favorites !== undefined) {
                localStorage.setItem(FAVORITES_KEY, importData.data.favorites);
            }
            if (importData.data.pins !== null && importData.data.pins !== undefined) {
                localStorage.setItem(PINS_KEY, importData.data.pins);
            }
            if (importData.data.categoryOrder !== null && importData.data.categoryOrder !== undefined) {
                localStorage.setItem(CATEGORY_ORDER_KEY, importData.data.categoryOrder);
            }
            if (importData.data.filterCategoryOrder !== null && importData.data.filterCategoryOrder !== undefined) {
                localStorage.setItem(FILTER_CATEGORY_ORDER_KEY, importData.data.filterCategoryOrder);
            }
            if (importData.data.userAddedItems !== null && importData.data.userAddedItems !== undefined) {
                localStorage.setItem(USER_ADDED_ITEMS_KEY, importData.data.userAddedItems);
            }
            if (importData.data.deletedItems !== null && importData.data.deletedItems !== undefined) {
                localStorage.setItem(DELETED_ITEMS_KEY, importData.data.deletedItems);
            }
            if (importData.data.dailyRandomFilter !== null && importData.data.dailyRandomFilter !== undefined) {
                localStorage.setItem(DAILY_RANDOM_FILTER_KEY, importData.data.dailyRandomFilter);
            }
            if (importData.data.sidebarCollapsed !== null && importData.data.sidebarCollapsed !== undefined) {
                localStorage.setItem('sidebar_collapsed', importData.data.sidebarCollapsed);
            }
            if (importData.data.rawFilmsContent !== null && importData.data.rawFilmsContent !== undefined) {
                if (importData.data.rawFilmsContent === 'null' || importData.data.rawFilmsContent === null) {
                    localStorage.removeItem(RAW_FILMS_CONTENT_KEY);
                } else {
                    localStorage.setItem(RAW_FILMS_CONTENT_KEY, importData.data.rawFilmsContent);
                }
            }
            if (importData.data.rawFilmsRatings !== null && importData.data.rawFilmsRatings !== undefined) {
                if (importData.data.rawFilmsRatings === 'null' || importData.data.rawFilmsRatings === null) {
                    localStorage.removeItem(RAW_FILMS_RATINGS_KEY);
                } else {
                    localStorage.setItem(RAW_FILMS_RATINGS_KEY, importData.data.rawFilmsRatings);
                }
            }
            if (importData.data.rawFilmsSortMode !== null && importData.data.rawFilmsSortMode !== undefined) {
                if (importData.data.rawFilmsSortMode === 'null' || importData.data.rawFilmsSortMode === null) {
                    localStorage.removeItem(RAW_FILMS_SORT_MODE_KEY);
                } else {
                    localStorage.setItem(RAW_FILMS_SORT_MODE_KEY, importData.data.rawFilmsSortMode);
                }
            }
            if (importData.data.rawFilmsSectionOrder !== null && importData.data.rawFilmsSectionOrder !== undefined) {
                if (importData.data.rawFilmsSectionOrder === 'null' || importData.data.rawFilmsSectionOrder === null) {
                    localStorage.removeItem(RAW_FILMS_SECTION_ORDER_KEY);
                } else {
                    localStorage.setItem(RAW_FILMS_SECTION_ORDER_KEY, importData.data.rawFilmsSectionOrder);
                }
            }
            if (importData.data.favoritesFilter !== null && importData.data.favoritesFilter !== undefined) {
                if (importData.data.favoritesFilter === 'null' || importData.data.favoritesFilter === null) {
                    localStorage.removeItem(FAVORITES_FILTER_KEY);
                } else {
                    localStorage.setItem(FAVORITES_FILTER_KEY, importData.data.favoritesFilter);
                }
            }
            
            // Import subcategory orders
            if (importData.data.subcategoryOrders) {
                Object.keys(importData.data.subcategoryOrders).forEach(categoryId => {
                    localStorage.setItem(
                        `${SUBCATEGORY_ORDER_KEY_PREFIX}${categoryId}`,
                        importData.data.subcategoryOrders[categoryId]
                    );
                });
            }
            
            alert('✅ 设置已成功导入！页面将自动刷新。');
            
            // Reload page to apply changes
            window.location.reload();
        } catch (error) {
            console.error('导入失败:', error);
            alert('❌ 导入失败：' + error.message + '\n\n请检查文件格式是否正确。');
        }
        
        // Reset file input
        event.target.value = '';
    };
    
    reader.onerror = function() {
        alert('❌ 读取文件失败');
        event.target.value = '';
    };
    
    reader.readAsText(file);
}

// Export merged data.json (combines original data.json with user changes)
async function exportMergedDataJson() {
    try {
        // Get original data
        const data = await getData();
        if (!data || !data.categories) {
            alert('❌ 无法加载原始数据');
            return;
        }
        
        // Get user data from localStorage
        const userAddedItems = getUserAddedItems();
        const deletedItems = getDeletedItems();
        
        // Create a deep copy of the data
        const mergedData = JSON.parse(JSON.stringify(data));
        
        // Process each category
        mergedData.categories.forEach(category => {
            // Process category-level items
            if (category.items) {
                // Remove deleted items
                category.items = category.items.filter(item => !deletedItems.includes(item.id));
                
                // Merge user-added items for this category
                const categoryKey = category.id;
                if (userAddedItems[categoryKey]) {
                    userAddedItems[categoryKey].forEach(userItem => {
                        // Check if this is an edit (same ID exists) or new item
                        const existingIndex = category.items.findIndex(item => item.id === userItem.id);
                        if (existingIndex !== -1) {
                            // Update existing item
                            category.items[existingIndex] = {
                                id: userItem.id,
                                name: userItem.name,
                                url: userItem.url,
                                text: userItem.text || ''
                            };
    } else {
                            // Add new item (only if ID is positive, negative IDs are user-added and shouldn't be in data.json)
                            if (userItem.id > 0) {
                                category.items.push({
                                    id: userItem.id,
                                    name: userItem.name,
                                    url: userItem.url,
                                    text: userItem.text || ''
                                });
                            }
                        }
                    });
                }
            }
            
            // Process subcategories
            if (category.subcategories) {
                category.subcategories.forEach(subcategory => {
                    // Process subcategory-level items
                    if (subcategory.items) {
                        // Remove deleted items
                        subcategory.items = subcategory.items.filter(item => !deletedItems.includes(item.id));
                        
                        // Merge user-added items for this subcategory
                        const subcategoryKey = `${category.id}:${subcategory.id}`;
                        if (userAddedItems[subcategoryKey]) {
                            userAddedItems[subcategoryKey].forEach(userItem => {
                                const existingIndex = subcategory.items.findIndex(item => item.id === userItem.id);
                                if (existingIndex !== -1) {
                                    // Update existing item
                                    subcategory.items[existingIndex] = {
                                        id: userItem.id,
                                        name: userItem.name,
                                        url: userItem.url,
                                        text: userItem.text || ''
                                    };
                                } else {
                                    // Add new item (only if ID is positive)
                                    if (userItem.id > 0) {
                                        subcategory.items.push({
                                            id: userItem.id,
                                            name: userItem.name,
                                            url: userItem.url,
                                            text: userItem.text || ''
                                        });
                                    }
                                }
                            });
                        }
                    }
                    
                    // Process subclasses
                    if (subcategory.subclasses) {
                        subcategory.subclasses.forEach(subclass => {
                            if (subclass.items) {
                                // Remove deleted items
                                subclass.items = subclass.items.filter(item => !deletedItems.includes(item.id));
                                
                                // Merge user-added items for this subclass
                                const subclassKey = `${category.id}:${subcategory.id}:${subclass.id}`;
                                if (userAddedItems[subclassKey]) {
                                    userAddedItems[subclassKey].forEach(userItem => {
                                        const existingIndex = subclass.items.findIndex(item => item.id === userItem.id);
                                        if (existingIndex !== -1) {
                                            // Update existing item
                                            subclass.items[existingIndex] = {
                                                id: userItem.id,
                                                name: userItem.name,
                                                url: userItem.url,
                                                text: userItem.text || ''
                                            };
                                        } else {
                                            // Add new item (only if ID is positive)
                                            if (userItem.id > 0) {
                                                subclass.items.push({
                                                    id: userItem.id,
                                                    name: userItem.name,
                                                    url: userItem.url,
                                                    text: userItem.text || ''
                                                });
                                            }
                                        }
                                    });
                                }
                            }
                        });
                    }
                });
            }
        });
        
        // Add user-added items with positive IDs that don't exist in original data
        // (These are new items added by user, but we need to assign them proper IDs)
        let maxId = 0;
        mergedData.categories.forEach(category => {
            if (category.items) {
                category.items.forEach(item => {
                    if (item.id > maxId) maxId = item.id;
                });
            }
            if (category.subcategories) {
                category.subcategories.forEach(sub => {
                    if (sub.items) {
                        sub.items.forEach(item => {
                            if (item.id > maxId) maxId = item.id;
                        });
                    }
                    if (sub.subclasses) {
                        sub.subclasses.forEach(subclass => {
                            if (subclass.items) {
                                subclass.items.forEach(item => {
                                    if (item.id > maxId) maxId = item.id;
                                });
                            }
                        });
                    }
                });
            }
        });
        
        // Add user-added items with negative IDs (assign them new positive IDs)
        Object.keys(userAddedItems).forEach(locationKey => {
            const parts = locationKey.split(':');
            const categoryId = parts[0];
            const subcategoryId = parts.length > 1 ? parts[1] : null;
            const subclassId = parts.length > 2 ? parts[2] : null;
            
            const category = mergedData.categories.find(cat => cat.id === categoryId);
            if (!category) return;
            
            userAddedItems[locationKey].forEach(userItem => {
                // Skip if already processed (positive ID) or deleted
                if (userItem.id > 0 || deletedItems.includes(userItem.id)) return;
                
                // Assign new positive ID
                maxId++;
                const newItem = {
                    id: maxId,
                    name: userItem.name,
                    url: userItem.url,
                    text: userItem.text || ''
                };
                
                if (subclassId) {
                    // Add to subclass
                    const subcategory = category.subcategories?.find(sub => sub.id === subcategoryId);
                    const subclass = subcategory?.subclasses?.find(sub => sub.id === subclassId);
                    if (subclass) {
                        if (!subclass.items) subclass.items = [];
                        subclass.items.push(newItem);
                    }
                } else if (subcategoryId) {
                    // Add to subcategory
                    const subcategory = category.subcategories?.find(sub => sub.id === subcategoryId);
                    if (subcategory) {
                        if (!subcategory.items) subcategory.items = [];
                        subcategory.items.push(newItem);
                    }
                } else {
                    // Add to category
                    if (!category.items) category.items = [];
                    category.items.push(newItem);
                }
            });
        });
        
        // Sort items by ID (optional, for consistency)
        function sortItems(items) {
            if (!items) return;
            items.sort((a, b) => a.id - b.id);
        }
        
        mergedData.categories.forEach(category => {
            sortItems(category.items);
            if (category.subcategories) {
                category.subcategories.forEach(sub => {
                    sortItems(sub.items);
                    if (sub.subclasses) {
                        sub.subclasses.forEach(subclass => {
                            sortItems(subclass.items);
                        });
                    }
                });
            }
        });
        
        // Create JSON string with proper formatting
        const jsonString = JSON.stringify(mergedData, null, 2);
        
        // Create blob and download
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `data_merged_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        alert('✅ 合并后的 data.json 已生成！\n\n请下载文件并替换项目中的 data.json 文件。\n\n注意：\n- 用户添加的项目（负 ID）已被分配新的正 ID\n- 已删除的项目已被移除\n- 编辑的项目已更新\n- 请备份原始 data.json 文件');
    } catch (error) {
        console.error('生成合并文件失败:', error);
        alert('❌ 生成合并文件失败：' + error.message + '\n\n请查看控制台获取详细信息');
    }
}

// ============================================
// RAW FILMS (原片分类) - Text-only Markdown Viewer
// ============================================

// Get raw films content from localStorage
function getRawFilmsContent() {
    try {
        const content = localStorage.getItem(RAW_FILMS_CONTENT_KEY);
        return content || '';
    } catch (e) {
        console.error('Error loading raw films content:', e);
        return '';
    }
}

// Save raw films content to localStorage
function saveRawFilmsContent(content) {
    try {
        localStorage.setItem(RAW_FILMS_CONTENT_KEY, content);
    } catch (e) {
        console.error('Error saving raw films content:', e);
    }
}

// Get raw films ratings from localStorage
function getRawFilmsRatings() {
    try {
        const stored = localStorage.getItem(RAW_FILMS_RATINGS_KEY);
        return stored ? JSON.parse(stored) : {};
    } catch (e) {
        console.error('Error loading raw films ratings:', e);
        return {};
    }
}

// Save raw films ratings to localStorage
function saveRawFilmsRatings(ratings) {
    try {
        if (ratings && Object.keys(ratings).length > 0) {
            localStorage.setItem(RAW_FILMS_RATINGS_KEY, JSON.stringify(ratings));
        } else {
            localStorage.removeItem(RAW_FILMS_RATINGS_KEY);
        }
    } catch (e) {
        console.error('Error saving raw films ratings:', e);
    }
}

// Get raw films sort mode
function getRawFilmsSortMode() {
    try {
        const mode = localStorage.getItem(RAW_FILMS_SORT_MODE_KEY);
        if (mode === 'rating-desc' || mode === 'rating-asc') {
            return mode;
        }
        return 'none';
    } catch (e) {
        console.error('Error loading raw films sort mode:', e);
        return 'none';
    }
}

// Save raw films sort mode
function saveRawFilmsSortMode(mode) {
    try {
        if (mode === 'none') {
            localStorage.removeItem(RAW_FILMS_SORT_MODE_KEY);
        } else {
            localStorage.setItem(RAW_FILMS_SORT_MODE_KEY, mode);
        }
    } catch (e) {
        console.error('Error saving raw films sort mode:', e);
    }
}

function getRawFilmsSectionOrder() {
    try {
        const stored = localStorage.getItem(RAW_FILMS_SECTION_ORDER_KEY);
        return stored ? JSON.parse(stored) : [];
    } catch (e) {
        console.error('Error loading raw films section order:', e);
        return [];
    }
}

function saveRawFilmsSectionOrder(order) {
    try {
        if (order && order.length > 0) {
            localStorage.setItem(RAW_FILMS_SECTION_ORDER_KEY, JSON.stringify(order));
        } else {
            localStorage.removeItem(RAW_FILMS_SECTION_ORDER_KEY);
        }
    } catch (e) {
        console.error('Error saving raw films section order:', e);
    }
}

// Parse raw films markdown into structured data
function parseRawFilmsStructure(content) {
    const root = {
        level: 0,
        title: null,
        films: [],
        children: [],
        path: '',
        order: 0
    };
    
    const stack = [root];
    let order = 0;
    let nodeOrderCounter = 0;
    
    if (!content) {
        return root;
    }
    
    const lines = content.split('\n');
    lines.forEach(line => {
        const trimmed = line.trim();
        
        if (trimmed === '') {
            // Ignore empty lines (spacing handled via CSS)
            return;
        }
        
        const headerMatch = trimmed.match(/^(#{1,6})\s+(.*)$/);
        if (headerMatch) {
            const level = Math.min(headerMatch[1].length, 6);
            const title = headerMatch[2].trim();
            
            // Adjust stack to current level
            while (stack.length > level) {
                stack.pop();
            }
            
            const parent = stack[stack.length - 1] || root;
            const node = {
                level,
                title,
                films: [],
                children: [],
                order: nodeOrderCounter++,
                path: parent.path ? `${parent.path} > ${title}` : title
            };
            parent.children.push(node);
            stack.push(node);
            return;
        }
        
        // Treat as a film entry
        const currentNode = stack[stack.length - 1] || root;
        const currentPath = currentNode.path || 'ROOT';
        const key = `${currentPath}::${trimmed}`;
        
        currentNode.films.push({
            type: 'film',
            text: trimmed,
            key,
            order: order++
        });
    });
    
    return root;
}

// Render structured raw films data into HTML
function renderRawFilmsStructure(structure, ratings, sortMode, orderedTopSections) {
    let html = '';
    
    if (structure.films && structure.films.length > 0) {
        html += renderRawFilmList(structure.films, ratings, sortMode);
    }
    
    const children = orderedTopSections || structure.children || [];
    children.forEach(child => {
        html += renderRawFilmNode(child, ratings, sortMode);
    });
    
    return html;
}

function renderRawFilmNode(node, ratings, sortMode) {
    const headingLevel = Math.min(node.level, 6);
    let html = `<h${headingLevel} class="markdown-h${headingLevel}">${escapeHtml(node.title || '')}</h${headingLevel}>`;
    
    if (node.films && node.films.length > 0) {
        html += renderRawFilmList(node.films, ratings, sortMode);
    }
    
    if (node.children) {
        node.children.forEach(child => {
            html += renderRawFilmNode(child, ratings, sortMode);
        });
    }
    
    return html;
}

function renderRawFilmList(films, ratings, sortMode) {
    if (!films || films.length === 0) return '';
    
    const sortedFilms = sortRawFilmEntries(films, ratings, sortMode);
    let html = '<div class="raw-films-list">';
    
    sortedFilms.forEach(film => {
        const rating = getRawFilmRatingValue(ratings, film.key);
        html += renderRawFilmItem(film, rating);
    });
    
    html += '</div>';
    return html;
}

function sortRawFilmEntries(films, ratings, sortMode) {
    const sorted = films.slice();
    if (sortMode === 'none') {
        sorted.sort((a, b) => a.order - b.order);
        return sorted;
    }
    
    sorted.sort((a, b) => {
        const ratingA = getRawFilmRatingValue(ratings, a.key);
        const ratingB = getRawFilmRatingValue(ratings, b.key);
        
        if (sortMode === 'rating-desc') {
            const normalizedA = ratingA || -0.5; // Unrated goes to the end
            const normalizedB = ratingB || -0.5;
            if (normalizedB !== normalizedA) {
                return normalizedB - normalizedA;
            }
        } else if (sortMode === 'rating-asc') {
            const normalizedA = ratingA || 6; // Unrated goes to the end
            const normalizedB = ratingB || 6;
            if (normalizedA !== normalizedB) {
                return normalizedA - normalizedB;
            }
        }
        
        // Tie-breaker: original order
        return a.order - b.order;
    });
    
    return sorted;
}

function getRawFilmRatingValue(ratings, key) {
    if (!ratings || !key) return 0;
    const value = ratings[key];
    if (value === undefined || value === null) return 0;
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : 0;
}

function getRawFilmsSectionKey(section) {
    if (!section) return '';
    if (section.path && section.path.length > 0) {
        return section.path;
    }
    const title = section.title || '未命名';
    const order = section.order ?? 0;
    return `${title}#${order}`;
}

function orderTopLevelSections(children, orderList) {
    if (!children || children.length === 0) return [];
    const orderMap = new Map();
    if (orderList && Array.isArray(orderList)) {
        orderList.forEach((key, index) => {
            if (typeof key === 'string') {
                orderMap.set(key, index);
            }
        });
    }
    
    return children.slice().sort((a, b) => {
        const aKey = getRawFilmsSectionKey(a);
        const bKey = getRawFilmsSectionKey(b);
        const aOrder = orderMap.has(aKey) ? orderMap.get(aKey) : Number.MAX_SAFE_INTEGER;
        const bOrder = orderMap.has(bKey) ? orderMap.get(bKey) : Number.MAX_SAFE_INTEGER;
        if (aOrder !== bOrder) {
            return aOrder - bOrder;
        }
        return (a.order ?? 0) - (b.order ?? 0);
    });
}

function buildRawFilmsSectionPanelHtml(sections) {
    if (!sections || sections.length === 0) {
        return '<p class="raw-films-section-empty">暂无一级标题</p>';
    }
    
    let html = '<div class="raw-films-section-list">';
    sections.forEach(section => {
        const key = getRawFilmsSectionKey(section);
        const encodedKey = encodeURIComponent(key);
        html += `
            <div class="raw-films-section-item" draggable="true" data-section-key="${encodedKey}">
                <span class="raw-films-section-handle">☰</span>
                <span class="raw-films-section-title">${escapeHtml(section.title || '未命名')}</span>
            </div>
        `;
    });
    html += '</div>';
    return html;
}

function initRawFilmsSectionDragAndDrop() {
    const panel = document.getElementById('raw-films-section-order-panel');
    if (!panel) return;
    
    const list = panel.querySelector('.raw-films-section-list');
    if (!list) return;
    
    if (!panel.dataset.clickBound) {
        panel.addEventListener('click', event => event.stopPropagation());
        panel.dataset.clickBound = 'true';
    }
    
    list.querySelectorAll('.raw-films-section-item').forEach(item => {
        item.addEventListener('dragstart', handleRawFilmsSectionDragStart);
        item.addEventListener('dragover', handleRawFilmsSectionDragOver);
        item.addEventListener('dragleave', handleRawFilmsSectionDragLeave);
        item.addEventListener('drop', handleRawFilmsSectionDrop);
        item.addEventListener('dragend', handleRawFilmsSectionDragEnd);
    });
}

function handleRawFilmsSectionDragStart(event) {
    rawFilmsSectionDraggedItem = event.currentTarget;
    event.currentTarget.classList.add('dragging');
    if (event.dataTransfer) {
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/plain', '');
    }
}

function handleRawFilmsSectionDragOver(event) {
    event.preventDefault();
    const target = event.currentTarget;
    if (!rawFilmsSectionDraggedItem || target === rawFilmsSectionDraggedItem) return;
    
    const list = target.parentNode;
    if (list) {
        list.querySelectorAll('.raw-films-section-item').forEach(item => {
            if (item !== target) {
                item.classList.remove('drag-over-top', 'drag-over-bottom');
            }
        });
    }
    
    const rect = target.getBoundingClientRect();
    const offset = (event.clientY - rect.top) / rect.height;
    target.classList.toggle('drag-over-bottom', offset > 0.5);
    target.classList.toggle('drag-over-top', offset <= 0.5);
}

function handleRawFilmsSectionDragLeave(event) {
    event.currentTarget.classList.remove('drag-over-top', 'drag-over-bottom');
}

function handleRawFilmsSectionDrop(event) {
    event.preventDefault();
    const target = event.currentTarget;
    if (!rawFilmsSectionDraggedItem || target === rawFilmsSectionDraggedItem) return;
    
    const list = target.parentNode;
    const rect = target.getBoundingClientRect();
    const offset = (event.clientY - rect.top) / rect.height;
    
    target.classList.remove('drag-over-top', 'drag-over-bottom');
    if (offset > 0.5) {
        list.insertBefore(rawFilmsSectionDraggedItem, target.nextSibling);
    } else {
        list.insertBefore(rawFilmsSectionDraggedItem, target);
    }
    
    const newOrder = getRawFilmsSectionOrderFromDom(list);
    saveRawFilmsSectionOrder(newOrder);
    if (rawFilmsSectionDraggedItem) {
        rawFilmsSectionDraggedItem.classList.remove('dragging');
    }
    rawFilmsSectionDraggedItem = null;
    rawFilmsSectionPanelShouldOpen = true;
    renderRawFilmsContent();
}

function handleRawFilmsSectionDragEnd(event) {
    event.currentTarget.classList.remove('dragging');
    const items = document.querySelectorAll('.raw-films-section-item');
    items.forEach(item => item.classList.remove('drag-over-top', 'drag-over-bottom'));
    rawFilmsSectionDraggedItem = null;
}

function getRawFilmsSectionOrderFromDom(listElement) {
    if (!listElement) return [];
    const items = listElement.querySelectorAll('.raw-films-section-item');
    const order = [];
    items.forEach(item => {
        const encodedKey = item.getAttribute('data-section-key') || '';
        const key = decodeURIComponent(encodedKey);
        if (key) {
            order.push(key);
        }
    });
    return order;
}

function toggleRawFilmsSectionPanel(event) {
    if (event) {
        event.stopPropagation();
        event.preventDefault();
    }
    const panel = document.getElementById('raw-films-section-order-panel');
    if (!panel) return;
    
    if (panel.classList.contains('open')) {
        closeRawFilmsSectionPanel();
    } else {
        openRawFilmsSectionPanel();
    }
}

function openRawFilmsSectionPanel() {
    const panel = document.getElementById('raw-films-section-order-panel');
    if (!panel) return;
    panel.classList.add('open');
    
    if (!rawFilmsSectionPanelOutsideClickHandler) {
        rawFilmsSectionPanelOutsideClickHandler = function(ev) {
            const panelEl = document.getElementById('raw-films-section-order-panel');
            const buttonEl = document.getElementById('raw-films-section-order-btn');
            if (!panelEl) return;
            if (panelEl.contains(ev.target) || (buttonEl && buttonEl.contains(ev.target))) {
                return;
            }
            closeRawFilmsSectionPanel();
        };
        setTimeout(() => {
            document.addEventListener('click', rawFilmsSectionPanelOutsideClickHandler);
        }, 0);
    }
}

function closeRawFilmsSectionPanel() {
    const panel = document.getElementById('raw-films-section-order-panel');
    if (panel) {
        panel.classList.remove('open');
    }
    if (rawFilmsSectionPanelOutsideClickHandler) {
        document.removeEventListener('click', rawFilmsSectionPanelOutsideClickHandler);
        rawFilmsSectionPanelOutsideClickHandler = null;
    }
    rawFilmsSectionPanelShouldOpen = false;
}
function renderRawFilmItem(film, rating) {
    const encodedKey = encodeURIComponent(film.key);
    let starsHtml = '';
    
    for (let i = 1; i <= 10; i++) {
        const active = rating >= i ? 'active' : '';
        starsHtml += `<button type="button" class="raw-film-star ${active}" onclick="handleRawFilmRating(event, '${encodedKey}', ${i})" title="${i} 星">★</button>`;
    }
    
    const clearClass = rating ? 'raw-film-clear visible' : 'raw-film-clear';
    
    return `
        <div class="raw-film-item">
            <span class="raw-film-name">${escapeHtml(film.text)}</span>
            <div class="raw-film-stars" role="radiogroup" aria-label="评分">
                ${starsHtml}
                <button type="button" class="${clearClass}" onclick="handleRawFilmRating(event, '${encodedKey}', 0)" title="清除评分">×</button>
            </div>
        </div>
    `;
}

// Render raw films content
function renderRawFilmsContent() {
    const contentBody = document.getElementById('content-body');
    const content = getRawFilmsContent();
    const ratings = getRawFilmsRatings();
    const sortMode = getRawFilmsSortMode();
    const structure = parseRawFilmsStructure(content);
    const sectionOrder = getRawFilmsSectionOrder();
    const orderedTopSections = orderTopLevelSections(structure.children || [], sectionOrder);
    const sectionPanelHtml = buildRawFilmsSectionPanelHtml(orderedTopSections);
    const listHtml = content
        ? renderRawFilmsStructure(structure, ratings, sortMode, orderedTopSections)
        : '<p class="empty-state">暂无内容，点击"编辑"开始添加</p>';
    
    // Reset outside click handler when re-rendering
    if (rawFilmsSectionPanelOutsideClickHandler) {
        document.removeEventListener('click', rawFilmsSectionPanelOutsideClickHandler);
        rawFilmsSectionPanelOutsideClickHandler = null;
    }
    
    const html = `
        <div class="raw-films-container">
            <div class="raw-films-toolbar">
                <button class="btn-edit-raw-films" onclick="showRawFilmsEditModal()" title="编辑内容">
                    ✎ 编辑
                </button>
                <button class="btn-export-raw-films" onclick="exportRawFilmsContent()" title="导出内容">
                    📥 导出
                </button>
                <button class="btn-import-raw-films" onclick="document.getElementById('import-raw-films-input').click()" title="导入内容">
                    📤 导入
                </button>
                <input type="file" id="import-raw-films-input" accept=".txt,.md" style="display: none;" onchange="importRawFilmsContent(event)">
                <div class="raw-films-toolbar-spacer"></div>
                <div class="raw-films-section-order-wrapper">
                    <button class="btn-section-order" id="raw-films-section-order-btn" onclick="toggleRawFilmsSectionPanel(event)">
                        分组顺序 ▾
                    </button>
                    <div class="raw-films-section-panel" id="raw-films-section-order-panel">
                        <div class="raw-films-section-panel-header">
                            <span>拖拽调整一级标题顺序</span>
                            <button type="button" class="raw-films-section-close" onclick="closeRawFilmsSectionPanel()">×</button>
                        </div>
                        <div class="raw-films-section-panel-body">
                            ${sectionPanelHtml}
                        </div>
                    </div>
                </div>
                <div class="raw-films-sort-group">
                    <label for="raw-films-sort-select">排序：</label>
                    <select id="raw-films-sort-select" onchange="handleRawFilmsSortChange(event)">
                        <option value="none">按输入顺序</option>
                        <option value="rating-desc">评分高 → 低</option>
                        <option value="rating-asc">评分低 → 高</option>
                    </select>
                </div>
            </div>
            <div class="raw-films-content markdown-content">
                ${listHtml}
            </div>
        </div>
    `;
    
    contentBody.innerHTML = html;
    
    const sortSelect = document.getElementById('raw-films-sort-select');
    if (sortSelect) {
        sortSelect.value = sortMode;
    }
    
    initRawFilmsSectionDragAndDrop();
    
    if (rawFilmsSectionPanelShouldOpen) {
        rawFilmsSectionPanelShouldOpen = false;
        openRawFilmsSectionPanel();
    }
}

// Show edit modal for raw films
function showRawFilmsEditModal() {
    const modal = document.getElementById('raw-films-edit-modal');
    if (modal) {
        modal.style.display = 'flex';
        const textarea = document.getElementById('raw-films-textarea');
        if (textarea) {
            textarea.value = getRawFilmsContent();
            textarea.focus();
        }
    }
}

// Hide edit modal
function hideRawFilmsEditModal() {
    const modal = document.getElementById('raw-films-edit-modal');
    if (modal) {
        modal.style.display = 'none';
    }
}

// Save raw films content
function saveRawFilms() {
    const textarea = document.getElementById('raw-films-textarea');
    if (!textarea) return;
    
    const content = textarea.value;
    saveRawFilmsContent(content);
    hideRawFilmsEditModal();
    renderRawFilmsContent();
}

// Export raw films content
function exportRawFilmsContent() {
    const content = getRawFilmsContent();
    if (!content) {
        alert('暂无内容可导出');
        return;
    }
    
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `原片分类_${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// Import raw films content
function importRawFilmsContent(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        const content = e.target.result;
        if (confirm('确定要导入此文件吗？当前内容将被替换。')) {
            saveRawFilmsContent(content);
            renderRawFilmsContent();
            alert('导入成功！');
        }
    };
    reader.readAsText(file, 'UTF-8');
    
    // Reset input
    event.target.value = '';
}

// Handle rating click
function handleRawFilmRating(event, encodedKey, value) {
    if (event) {
        event.stopPropagation();
        event.preventDefault();
    }
    
    const key = decodeURIComponent(encodedKey);
    const ratings = getRawFilmsRatings();
    const current = getRawFilmRatingValue(ratings, key);
    
    if (value === 0 || current === value) {
        delete ratings[key];
    } else {
        ratings[key] = value;
    }
    
    saveRawFilmsRatings(ratings);
    const panel = document.getElementById('raw-films-section-order-panel');
    if (panel && panel.classList.contains('open')) {
        rawFilmsSectionPanelShouldOpen = true;
    }
    renderRawFilmsContent();
}

// Handle sort change
function handleRawFilmsSortChange(event) {
    const mode = event?.target?.value || 'none';
    saveRawFilmsSortMode(mode);
    const panel = document.getElementById('raw-films-section-order-panel');
    if (panel && panel.classList.contains('open')) {
        rawFilmsSectionPanelShouldOpen = true;
    }
    renderRawFilmsContent();
}
