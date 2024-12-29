from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from pathlib import Path
import json
import time
import os

class StorageDataFetcher:
    def __init__(self, extension_path):
        self.options = Options()
        self.extension_path = os.path.abspath(extension_path)
        self.options.add_argument(f'--load-extension={self.extension_path}')
        # 添加额外的Chrome选项
        self.options.add_argument('--no-sandbox')
        self.options.add_argument('--disable-dev-shm-usage')
        self.options.add_argument('--remote-debugging-port=9222')
        self.driver = None

    def setup(self):
        self.driver = webdriver.Chrome(options=self.options)
        # 启用必要的CDP域
        self.driver.execute_cdp_cmd('Network.enable', {})
        time.sleep(2)

    def fetch_storage_data(self, url):
        try:
            print(f"Fetching data from: {url}")
            self.driver.get(url)
            time.sleep(5)  # 等待页面加载

            # 获取所有存储类型
            storage_types = self.driver.execute_cdp_cmd('Storage.getStorageKeyForFrame', {})
            result = {
                'caches': []
            }

            # 获取Cache Storage数据
            caches = self.driver.execute_cdp_cmd('CacheStorage.requestCacheNames', {
                'securityOrigin': url
            })

            for cache in caches.get('caches', []):
                cache_data = {
                    'name': cache.get('cacheName', ''),
                    'entries': []
                }

                # 获取缓存条目
                cache_entries = self.driver.execute_cdp_cmd('CacheStorage.requestEntries', {
                    'cacheId': cache.get('cacheId', ''),
                    'skipCount': 0,
                    'pageSize': 100  # 限制条目数量
                })

                for entry in cache_entries.get('cacheDataEntries', []):
                    cache_data['entries'].append({
                        'url': entry.get('requestURL', ''),
                        'type': entry.get('responseType', 'unknown'),
                        'size': entry.get('responseSize', 0),
                        'headers': entry.get('responseHeaders', {})
                    })

                if cache_data['entries']:
                    result['caches'].append(cache_data)

            print(f"Found {len(result['caches'])} caches")
            return result

        except Exception as e:
            print(f"Error fetching storage data: {e}")
            # 打印详细的错误信息
            import traceback
            traceback.print_exc()
            return None

    def save_to_file(self, data, filename):
        with open(filename, 'w') as f:
            json.dump(data, indent=2, fp=f)
        print(f"Data saved to: {filename}")

    def cleanup(self):
        if self.driver:
            self.driver.quit()

def main():
    current_dir = Path(__file__).parent
    extension_path = str(current_dir)
    
    url = 'https://ui.perfetto.dev'
    fetcher = StorageDataFetcher(extension_path)
    
    try:
        print("Setting up...")
        fetcher.setup()
        print("Fetching data...")
        data = fetcher.fetch_storage_data(url)
        if data:
            output_file = 'storage_data.json'
            fetcher.save_to_file(data, output_file)
            print(f"Data saved successfully to {output_file}!")
        else:
            print("Failed to fetch data")
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        print("Cleaning up...")
        fetcher.cleanup()

if __name__ == '__main__':
    main() 