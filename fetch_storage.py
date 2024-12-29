from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from pathlib import Path
import json
import time
import os

class StorageDataFetcher:
    def __init__(self, extension_path):
        self.options = Options()
        self.extension_path = os.path.abspath(extension_path)
        self.options.add_argument(f'--load-extension={self.extension_path}')
        self.driver = None

    def setup(self):
        self.driver = webdriver.Chrome(options=self.options)
        time.sleep(2)  # 等待扩展加载

    def fetch_storage_data(self, url):
        try:
            print(f"Fetching data from: {url}")
            self.driver.get(url)
            time.sleep(5)  # 等待页面和缓存加载

            # 直接调用扩展的API获取数据
            script = """
                return new Promise((resolve) => {
                    // 获取当前标签页的origin
                    const origin = window.location.origin;
                    
                    // 获取所有已加载的扩展
                    chrome.management.getAll((extensions) => {
                        // 找到我们的扩展
                        const ourExtension = extensions.find(ext => ext.name === 'Cache Accessor');
                        if (!ourExtension) {
                            resolve({ success: false, error: 'Extension not found' });
                            return;
                        }
                        
                        // 调用扩展的消息接口
                        chrome.runtime.sendMessage(
                            ourExtension.id,
                            { 
                                action: 'getStorageData',
                                origin: origin
                            },
                            (response) => {
                                console.log('Extension response:', response);
                                resolve(response);
                            }
                        );
                    });
                });
            """

            print("Executing script to fetch data...")
            result = self.driver.execute_script(script)
            print(f"Received data from extension: {result}")

            if result and result.get('success'):
                return result['data']
            else:
                print(f"Failed to get data: {result.get('error', 'Unknown error')}")
                return None

        except Exception as e:
            print(f"Error fetching storage data: {e}")
            import traceback
            traceback.print_exc()
            return None

    def save_to_file(self, data, filename):
        with open(filename, 'w', encoding='utf-8') as f:
            json.dump(data, indent=2, fp=f, ensure_ascii=False)
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
        print("Setting up Chrome with extension...")
        fetcher.setup()
        print("Fetching data from website...")
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