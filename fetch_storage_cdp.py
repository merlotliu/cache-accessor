from selenium import webdriver
from selenium.webdriver.chrome.options import Options
import json
import time

class CacheStorageFetcher:
    def __init__(self):
        self.options = Options()
        self.driver = None

    def setup(self):
        self.driver = webdriver.Chrome(options=self.options)
        # 启用必要的CDP域
        self.driver.execute_cdp_cmd('Network.enable', {})
        self.driver.execute_cdp_cmd('Cache.enable', {})

    def fetch_cache_storage(self, url):
        try:
            # 访问目标网页
            self.driver.get(url)
            time.sleep(2)  # 等待页面加载

            # 获取缓存存储数据
            cache_storage = self.driver.execute_cdp_cmd('Cache.requestCacheNames', {})
            
            result = {
                'caches': []
            }

            # 遍历每个缓存空间
            for cache in cache_storage['caches']:
                cache_data = {
                    'name': cache['cacheName'],
                    'entries': []
                }

                # 获取缓存条目
                entries = self.driver.execute_cdp_cmd(
                    'Cache.requestEntries',
                    {'cacheName': cache['cacheName']}
                )

                for entry in entries['cacheEntries']:
                    cache_data['entries'].append({
                        'url': entry['requestURL'],
                        'type': entry['responseType'],
                        'size': entry['responseSize'],
                        'headers': entry['responseHeaders']
                    })

                result['caches'].append(cache_data)

            return result

        except Exception as e:
            print(f"Error fetching cache storage: {e}")
            return None

    def save_to_file(self, data, filename):
        with open(filename, 'w') as f:
            json.dump(data, indent=2, fp=f)

    def cleanup(self):
        if self.driver:
            self.driver.quit()

def main():
    url = 'https://ui.perfetto.dev'
    fetcher = CacheStorageFetcher()
    
    try:
        fetcher.setup()
        data = fetcher.fetch_cache_storage(url)
        if data:
            fetcher.save_to_file(data, 'cache_storage.json')
            print("Data saved successfully!")
        else:
            print("Failed to fetch data")
    finally:
        fetcher.cleanup()

if __name__ == '__main__':
    main() 