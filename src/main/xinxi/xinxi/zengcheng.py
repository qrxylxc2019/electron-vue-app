import json
from typing import Dict, AsyncGenerator
from fastapi import HTTPException
import requests
from datetime import datetime
import asyncio
import time
import urllib3

# 禁用SSL警告
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

class ZengchengScraper:
    def __init__(self):
        self.api_url = "https://www.zc.gov.cn/postmeta/i/1059.json"
        self.base_url = "https://www.zc.gov.cn"
        self.headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36",
            "Accept": "application/json, text/javascript, */*; q=0.01",
            "Accept-Language": "zh-CN,zh;q=0.9",
            "Connection": "keep-alive",
            "sec-ch-ua": "\"Google Chrome\";v=\"135\", \"Not-A.Brand\";v=\"8\", \"Chromium\";v=\"135\"",
            "sec-ch-ua-mobile": "?0",
            "sec-ch-ua-platform": "\"Windows\"",
            "x-requested-with": "XMLHttpRequest",
            "Referer": "https://www.zc.gov.cn/gk/rsgz/dwzp/index.html"
        }

    async def fetch_data(self) -> Dict:
        """获取数据"""
        try:
            # 使用requests库发送GET请求，禁用SSL验证
            response = requests.get(
                self.api_url, 
                headers=self.headers, 
                verify=False,
                timeout=30
            )
            
            if response.status_code != 200:
                raise HTTPException(status_code=response.status_code, detail="API请求失败")
            
            # 解析响应数据
            data = response.json()
            print("增城区招聘响应内容:", data)
            
            return data
            
        except Exception as e:
            print(f"Error fetching data: {str(e)}")
            raise HTTPException(status_code=500, detail=f"获取数据失败: {str(e)}")

    async def stream_search_results(self, limit: int = 10) -> AsyncGenerator[Dict, None]:
        """流式输出搜索结果"""
        try:
            # 获取数据
            data = await self.fetch_data()

            print("增城区招聘数据:", data)  
            
            # 处理文章信息
            articles = data.get("articles", [])
            
            count = 0
            for article in articles:
                if count >= limit:
                    break
                    
                job_info = {}
                # 标题
                job_info['title'] = article.get('title', '')
                
                # 日期
                job_info['date'] = article.get('date', '')
                
                # 链接 - 构建完整链接
                article_id = article.get('id', '')
                job_info['link'] = f"{self.base_url}/gk/rsgz/dwzp/content/post_{article_id}.html"
                
                # 来源信息
                job_info['source'] = article.get('source', '广州市增城区人力资源和社会保障局')
                
                # ID信息
                job_info['id'] = article_id
                
                # 添加元数据
                job_info["source_name"] = "广州市增城区人社局"
                job_info["type"] = "source"

                print("数据job_info:", job_info)
                
                # 流式输出每个职位
                yield job_info
                count += 1
                
                # 短暂延迟，避免请求过快
                await asyncio.sleep(0.2)
                
        except Exception as e:
            error_data = {
                "type": "error",
                "message": f"获取数据出错: {str(e)}",
                "source": "zengcheng"
            }
            yield error_data
        
async def get_zhaopin_data(limit: int = 10):
    """获取招聘数据的主函数"""
    scraper = ZengchengScraper()
    
    count = 0
    async for data in scraper.stream_search_results(limit):
        if data.get("type") == "source" and count < limit:
            count += 1
            yield data

# 为了与其他爬虫保持一致
async def get_data(limit: int = 10):
    async for item in get_zhaopin_data(limit=limit):
        yield item

if __name__ == "__main__":
    import asyncio
    
    async def test_scraper():
        scraper = ZengchengScraper()
        async for item in scraper.stream_search_results(limit=10):
            print("获取到数据:", item)
    
    # 运行测试函数
    asyncio.run(test_scraper())