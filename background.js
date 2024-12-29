chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'getStorageData') {
        handleGetStorageData(request.origin).then(sendResponse);
        return true;
    }
});

async function handleGetStorageData(origin) {
    try {
        const storageData = {
            caches: []
        };

        // 注入内容脚本来获取Cache Storage数据
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        const results = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: async (targetOrigin) => {
                const data = {
                    caches: []
                };

                try {
                    // 获取所有的cache名称
                    const cacheNames = await caches.keys();
                    
                    // 遍历每个cache
                    for (const cacheName of cacheNames) {
                        const cache = await caches.open(cacheName);
                        const requests = await cache.keys();
                        const cacheData = {
                            name: cacheName,
                            entries: []
                        };

                        // 遍历cache中的每个请求
                        for (const request of requests) {
                            // 检查是否属于目标域名
                            if (request.url.includes(targetOrigin)) {
                                const response = await cache.match(request);
                                if (response) {
                                    try {
                                        const clone = response.clone();
                                        const blob = await clone.blob();
                                        
                                        // 获取响应的详细信息
                                        cacheData.entries.push({
                                            url: request.url,
                                            type: response.headers.get('content-type') || 'unknown',
                                            size: blob.size,
                                            status: response.status,
                                            statusText: response.statusText,
                                            headers: Object.fromEntries(response.headers.entries()),
                                            lastModified: response.headers.get('last-modified'),
                                            expires: response.headers.get('expires'),
                                            cacheControl: response.headers.get('cache-control')
                                        });
                                    } catch (error) {
                                        console.error('Error processing cache entry:', error);
                                    }
                                }
                            }
                        }

                        if (cacheData.entries.length > 0) {
                            data.caches.push(cacheData);
                        }
                    }
                } catch (error) {
                    console.error('Error accessing caches:', error);
                }

                return data;
            },
            args: [origin]
        });

        if (results && results[0]?.result) {
            storageData.caches = results[0].result.caches;
        }

        console.log('Cache data collected:', storageData);
        return storageData;
    } catch (error) {
        console.error('获取缓存数据失败:', error);
        throw error;
    }
} 