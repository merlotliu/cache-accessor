chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'getCaches') {
        handleGetCaches(request.origin).then(sendResponse);
        return true; // 保持消息通道开放
    }
    
    if (request.action === 'exportCaches') {
        handleExportCaches(request.origin).then(sendResponse);
        return true;
    }
});

async function handleGetCaches(origin) {
    try {
        const cacheNames = await caches.keys();
        const cacheItems = [];

        for (const cacheName of cacheNames) {
            const cache = await caches.open(cacheName);
            const requests = await cache.keys();
            
            for (const request of requests) {
                if (request.url.includes(origin)) {
                    const response = await cache.match(request);
                    if (response) {
                        const blob = await response.blob();
                        cacheItems.push({
                            url: request.url,
                            type: response.headers.get('content-type') || 'unknown',
                            size: blob.size,
                            lastModified: response.headers.get('last-modified'),
                            expires: response.headers.get('expires'),
                            cacheName: cacheName
                        });
                    }
                }
            }
        }

        return cacheItems;
    } catch (error) {
        console.error('获取缓存失败:', error);
        throw error;
    }
}

async function handleExportCaches(origin) {
    try {
        const cacheItems = await handleGetCaches(origin);
        return cacheItems;
    } catch (error) {
        console.error('导出缓存失败:', error);
        throw error;
    }
} 