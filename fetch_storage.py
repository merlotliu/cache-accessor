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
        # 启用CDP
        self.driver.execute_cdp_cmd('Network.enable', {})
        self.driver.execute_cdp_cmd('Storage.enable', {})
        time.sleep(2)

    def fetch_storage_data(self, url):
        try:
            print(f"Fetching data from: {url}")
            self.driver.get(url)
            time.sleep(5)  # 等待页面加载

            # 使用CDP获取缓存数据
            cache_storage = self.driver.execute_cdp_cmd('Storage.getCacheStorageList', {})
            result = {
                'caches': []
            }

            for cache in cache_storage.get('storages', []):
                cache_data = {
                    'name': cache['cacheName'],
                    'entries': []
                }

                # 获取缓存条目
                entries = self.driver.execute_cdp_cmd(
                    'Storage.getCacheStorageEntries',
                    {'cacheId': cache['id']}
                )

                for entry in entries.get('cacheEntries', []):
                    response = self.driver.execute_cdp_cmd(
                        'Storage.getCacheStorageEntry',
                        {
                            'cacheId': cache['id'],
                            'requestURL': entry['requestURL']
                        }
                    )

                    cache_data['entries'].append({
                        'url': entry['requestURL'],
                        'type': response.get('responseType', 'unknown'),
                        'size': response.get('responseSize', 0),
                        'headers': response.get('responseHeaders', {})
                    })

                if cache_data['entries']:
                    result['caches'].append(cache_data)

            print(f"Found {len(result['caches'])} caches")
            return result

        except Exception as e:
            print(f"Error fetching storage data: {e}")
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
    finally:
        print("Cleaning up...")
        fetcher.cleanup()

if __name__ == '__main__':
    main() 