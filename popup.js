class StorageAccessor {
    constructor() {
        this.initializeElements();
        this.bindEvents();
        this.loadStorageData();
    }

    initializeElements() {
        this.container = document.getElementById('storageContainer');
        this.refreshBtn = document.getElementById('refreshBtn');
        this.exportBtn = document.getElementById('exportBtn');
    }

    bindEvents() {
        this.refreshBtn.addEventListener('click', () => this.loadStorageData());
        this.exportBtn.addEventListener('click', () => this.exportData());
    }

    async loadStorageData() {
        try {
            this.container.innerHTML = '<div class="loading">加载中...</div>';

            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (!tab) {
                throw new Error('无法获取当前标签页信息');
            }

            const url = new URL(tab.url);
            console.log('Current tab URL:', url.toString());

            const data = await chrome.runtime.sendMessage({
                action: 'getStorageData',
                origin: url.origin
            });

            this.renderStorageData(data);
        } catch (error) {
            console.error('加载存储数据失败:', error);
            this.showError('加载失败: ' + error.message);
        }
    }

    renderStorageData(data) {
        this.container.innerHTML = '';
        
        // 只处理缓存数据
        if (!data.caches || data.caches.length === 0) {
            this.container.innerHTML = '<div class="empty">没有找到缓存数据</div>';
            return;
        }

        // 创建缓存数据视图
        const section = document.createElement('div');
        section.className = 'storage-section';
        
        // 计算总计
        const totalEntries = data.caches.reduce((sum, cache) => sum + cache.entries.length, 0);
        const totalSize = data.caches.reduce((sum, cache) => 
            sum + cache.entries.reduce((s, entry) => s + entry.size, 0), 0);

        section.innerHTML = `
            <h2>Cache Storage (${this.formatSize(totalSize)}, ${totalEntries} items)</h2>
            <div class="storage-content">
                ${this.formatCacheContent(data.caches)}
            </div>
        `;
        
        this.container.appendChild(section);
    }

    formatCacheContent(caches) {
        return caches.map(cache => `
            <div class="storage-item">
                <div class="item-header">
                    ${cache.name} (${cache.entries.length} entries)
                </div>
                <div class="cache-entries">
                    ${cache.entries.map(entry => `
                        <div class="cache-entry">
                            <div class="entry-url">${entry.url}</div>
                            <div class="entry-details">
                                <span>Type: ${entry.type}</span>
                                <span>Size: ${this.formatSize(entry.size)}</span>
                                <span>Status: ${entry.status} ${entry.statusText}</span>
                                ${entry.lastModified ? `<span>Modified: ${entry.lastModified}</span>` : ''}
                                ${entry.expires ? `<span>Expires: ${entry.expires}</span>` : ''}
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `).join('');
    }

    formatSize(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    async exportData() {
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            const url = new URL(tab.url);
            const data = await chrome.runtime.sendMessage({
                action: 'getStorageData',
                origin: url.origin
            });

            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const downloadUrl = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = downloadUrl;
            a.download = `storage-${new Date().toISOString()}.json`;
            a.click();
            
            URL.revokeObjectURL(downloadUrl);
        } catch (error) {
            console.error('导出失败:', error);
            this.showError('导出失败: ' + error.message);
        }
    }

    showError(message) {
        this.container.innerHTML = `<div class="error">${message}</div>`;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    try {
        new StorageAccessor();
    } catch (error) {
        console.error('初始化失败:', error);
        document.body.innerHTML = `<div class="error">初始化失败: ${error.message}</div>`;
    }
}); 