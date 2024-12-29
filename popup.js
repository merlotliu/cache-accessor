class CacheAccessor {
    constructor() {
        this.initializeElements();
        this.bindEvents();
        this.loadCaches();
    }

    initializeElements() {
        this.searchInput = document.getElementById('searchInput');
        this.cacheList = document.getElementById('cacheList');
        this.totalItems = document.getElementById('totalItems');
        this.totalSize = document.getElementById('totalSize');
        this.refreshBtn = document.getElementById('refreshBtn');
        this.exportBtn = document.getElementById('exportBtn');
    }

    bindEvents() {
        this.refreshBtn.addEventListener('click', () => this.loadCaches());
        this.exportBtn.addEventListener('click', () => this.exportCaches());
        this.searchInput.addEventListener('input', (e) => this.filterCaches(e.target.value));
    }

    async loadCaches() {
        try {
            // 清空现有列表
            this.cacheList.innerHTML = '<div class="loading">加载中...</div>';

            // 获取当前标签页信息
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (!tab) {
                throw new Error('无法获取当前标签页信息');
            }

            const url = new URL(tab.url);
            console.log('Current tab URL:', url.toString());
            
            // 发送消息给background script获取缓存数据
            console.log('Requesting caches for origin:', url.origin);
            const caches = await chrome.runtime.sendMessage({
                action: 'getCaches',
                origin: url.origin
            });

            console.log('Received caches:', caches);
            this.renderCaches(caches || []);
        } catch (error) {
            console.error('加载缓存失败:', error);
            this.showError('加载缓存失败: ' + error.message);
        }
    }

    renderCaches(caches) {
        if (!Array.isArray(caches) || caches.length === 0) {
            this.cacheList.innerHTML = '<div class="empty">没有找到缓存数据</div>';
            this.updateStatus(0, 0);
            return;
        }

        this.cacheList.innerHTML = '';
        let totalSize = 0;

        caches.forEach(cache => {
            totalSize += cache.size || 0;
            const cacheItem = this.createCacheItem(cache);
            this.cacheList.appendChild(cacheItem);
        });

        this.updateStatus(caches.length, totalSize);
    }

    createCacheItem(cache) {
        const item = document.createElement('div');
        item.className = 'cache-item';
        
        item.innerHTML = `
            <div class="cache-item-header">
                <span class="cache-item-url">${this.truncateUrl(cache.url)}</span>
                <span class="cache-item-size">${this.formatSize(cache.size)}</span>
            </div>
            <div class="cache-item-type">${cache.type}</div>
        `;

        item.addEventListener('click', () => this.showCacheDetails(cache));
        return item;
    }

    truncateUrl(url) {
        const maxLength = 40;
        return url.length > maxLength ? url.substring(0, maxLength) + '...' : url;
    }

    formatSize(bytes) {
        const units = ['B', 'KB', 'MB', 'GB'];
        let size = bytes;
        let unitIndex = 0;

        while (size >= 1024 && unitIndex < units.length - 1) {
            size /= 1024;
            unitIndex++;
        }

        return `${size.toFixed(1)} ${units[unitIndex]}`;
    }

    updateStatus(itemCount, totalSize) {
        this.totalItems.textContent = `总项目: ${itemCount}`;
        this.totalSize.textContent = `总大小: ${this.formatSize(totalSize)}`;
    }

    filterCaches(searchTerm) {
        const items = this.cacheList.getElementsByClassName('cache-item');
        searchTerm = searchTerm.toLowerCase();

        Array.from(items).forEach(item => {
            const url = item.querySelector('.cache-item-url').textContent.toLowerCase();
            item.style.display = url.includes(searchTerm) ? 'block' : 'none';
        });
    }

    async exportCaches() {
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            const caches = await chrome.runtime.sendMessage({
                action: 'exportCaches',
                origin: new URL(tab.url).origin
            });

            const blob = new Blob([JSON.stringify(caches, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = `cache-${new Date().toISOString()}.json`;
            a.click();
            
            URL.revokeObjectURL(url);
        } catch (error) {
            this.showError('导出失败: ' + error.message);
        }
    }

    showError(message) {
        this.cacheList.innerHTML = `<div class="error">${message}</div>`;
    }

    async showCacheDetails(cache) {
        // 实现缓存详情查看功能
        console.log('显示缓存详情:', cache);
    }
}

// 初始化应用并添加错误处理
document.addEventListener('DOMContentLoaded', () => {
    try {
        new CacheAccessor();
    } catch (error) {
        console.error('初始化失败:', error);
        document.body.innerHTML = `<div class="error">初始化失败: ${error.message}</div>`;
    }
}); 