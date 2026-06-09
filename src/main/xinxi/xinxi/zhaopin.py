import json
from typing import Dict, AsyncGenerator
from fastapi import HTTPException
import requests
from datetime import datetime
import asyncio
import time

class QgsydwScraper:
    def __init__(self):
        self.api_url = "https://www.qgsydw.com/dwsp/Search/GetPagerData"
        self.base_url = "https://www.qgsydw.com"
        # 设置请求头 - 更新为用户提供的准确headers
        self.headers = {
            "Accept": "application/json, text/javascript, */*; q=0.01",
            "Accept-Language": "zh-CN,zh;q=0.9",
            "Connection": "keep-alive",
            "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
            "Origin": "https://www.qgsydw.com",
            "Referer": "https://www.qgsydw.com/qgsydw/area.html",
            "Sec-Fetch-Dest": "empty",
            "Sec-Fetch-Mode": "cors",
            "Sec-Fetch-Site": "same-origin",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36",
            "X-Requested-With": "XMLHttpRequest",
            "sec-ch-ua": "\"Google Chrome\";v=\"135\", \"Not-A.Brand\";v=\"8\", \"Chromium\";v=\"135\"",
            "sec-ch-ua-mobile": "?0",
            "sec-ch-ua-platform": "\"Windows\"",
            "Accept-Encoding": "gzip, deflate, br",
        }

    async def fetch_page_data(self, region: str = "广东", page: int = 1, keyword: str = "广州") -> Dict:
        """获取单页数据"""
        try:
            # 构建API请求参数 - 使用正确的URL编码格式
            payload = f"dq={requests.utils.quote(region)}&pageIndex={page}&channelIds%5B%5D=50%2C51&timeSolt=&keyword={requests.utils.quote(keyword) if keyword else ''}"
            
            print("请求数据:", payload)
                
            # 使用requests库发送POST请求
            response = requests.request("POST", self.api_url, data=payload, headers=self.headers)
            
            if response.status_code != 200:
                raise HTTPException(status_code=response.status_code, detail="API请求失败")
            
            # 解析响应数据
            data = response.json()
            print("响应内容:", data)  # 打印前200个字符作为调试
            
            # 处理返回的数据
            job_items = []
            
            # 根据API返回格式提取数据
            if (data and 'success' in data and data['success'] and 
                'data' in data and 'pager' in data['data'] and 
                'data' in data['data']['pager']):
                
                # 提取职位列表
                items = data['data']['pager']['data']
                
                # 处理每个职位信息
                for item in items:
                    # 只处理广东地区的数据
                    if item.get('groupNameCollection') == region:
                        job_info = {}
                        # 标题
                        job_info['title'] = item.get('title', '无标题')
                        
                        # 日期 - 格式化日期
                        raw_date = item.get('addDate', '')
                        if raw_date:
                            # 尝试转换日期格式 (例如 "2025/04/19 20:54:13" -> "2025-04-19")
                            try:
                                date_obj = datetime.strptime(raw_date, '%Y/%m/%d %H:%M:%S')
                                job_info['date'] = date_obj.strftime('%Y-%m-%d')
                            except:
                                job_info['date'] = raw_date
                        
                        # 链接 - 构建完整链接
                        link = item.get('linkUrl', '')
                        if link.startswith('http'):
                            job_info['link'] = link
                        else:
                            job_info['link'] = f"{self.base_url}{link}"
                        
                        # 是否置顶
                        job_info['is_top'] = item.get('isTop', 'False') == 'True'
                        
                        # 额外信息
                        job_info['source'] = item.get('source', '全国事业单位招聘网')
                        job_info['id'] = item.get('id', '')
                        job_info['channel'] = item.get('channelName', '')
                        
                        job_items.append(job_info)
            
            # 构造返回数据
            return {
                "success": True,
                "data": job_items,
                "total": data.get('data', {}).get('pager', {}).get('recordCount', 0)
            }
            
        except Exception as e:
            print(f"Error fetching data: {str(e)}")
            raise HTTPException(status_code=500, detail=f"获取数据失败: {str(e)}")

    async def stream_search_results(self, region: str = "广东", max_pages: int = 1, keyword: str = "广州") -> AsyncGenerator[Dict, None]:
        """流式输出搜索结果"""
        try:
            # 获取页面数据
            page_data = await self.fetch_page_data(region, 1, keyword)
            
            # 处理每个职位信息
            for job_info in page_data["data"]:
                # 添加元数据
                job_info["source_name"] = "广东事业单位网"
                job_info["type"] = "source"

                print("数据job_info:", job_info)
                
                # 流式输出每个职位
                yield job_info
                
                # 短暂延迟，避免请求过快
                await asyncio.sleep(0.2)
                
        except Exception as e:
            error_data = {
                "type": "error",
                "message": f"获取数据出错: {str(e)}",
                "source": "qgsydw"
            }
            yield error_data
        
async def get_zhaopin_data(limit: int = 20, region: str = "广东", keyword: str = "", max_pages: int = 1):
    """获取招聘数据的主函数"""
    scraper = QgsydwScraper()
    
    count = 0
    async for data in scraper.stream_search_results(region, max_pages, keyword):
        if data.get("type") == "source" and count < limit:
            count += 1
            yield data

# 为了与其他爬虫保持一致
async def get_data():
    """兼容函数，使用默认参数获取数据"""
    async for item in get_zhaopin_data(limit=20):
        yield item


if __name__ == "__main__":
    async def test_scraper():
        print("开始测试爬虫...")
        scraper = QgsydwScraper()
        
        # 测试单页数据获取
        print("\n测试单页数据获取:")
        page_data = await scraper.fetch_page_data(region="广东", page=1, keyword="广州")
        print(f"获取到 {len(page_data['data'])} 条职位信息")
        
        # 测试流式数据
        print("\n测试流式数据获取:")
        count = 0
        async for item in get_zhaopin_data(limit=5, keyword="教师"):
            count += 1
            print(f"职位 {count}: {item['title']} ({item['date']})")
            
        print("\n测试完成!")
    
    # 运行测试
    asyncio.run(test_scraper())
    