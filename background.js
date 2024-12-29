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
        // 获取当前标签页的所有缓存
        const allCaches = await window.caches.keys();
        const cacheItems = [];

        // 遍历每个缓存存储
        for (const cacheName of allCaches) {
            console.log('Processing cache:', cacheName);
            const cache = await window.caches.open(cacheName);
            const requests = await cache.keys();
            
            // 遍历缓存中的每个请求
            for (const request of requests) {
                // 检查URL是否属于目标域名
                if (request.url.includes(origin)) {
                    const response = await cache.match(request);
                    if (response) {
                        try {
                            const blob = await response.clone().blob();
                            cacheItems.push({
                                url: request.url,
                                type: response.headers.get('content-type') || 'unknown',
                                size: blob.size,
                                lastModified: response.headers.get('last-modified'),
                                expires: response.headers.get('expires'),
                                cacheName: cacheName,
                                status: response.status,
                                statusText: response.statusText
                            });
                        } catch (error) {
                            console.error('Error processing cache item:', error);
                        }
                    }
                }
            }
        }

        console.log('Found cache items:', cacheItems.length);
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