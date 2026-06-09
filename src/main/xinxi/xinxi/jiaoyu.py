import json
from typing import Dict, AsyncGenerator
from fastapi import HTTPException
import requests
from bs4 import BeautifulSoup
from datetime import datetime
import asyncio
import time
import urllib3

# 禁用SSL警告
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

class JiaoyuScraper:
    def __init__(self):
        self.base_url = "https://jyj.gz.gov.cn/yw/zcjd"
        self.index_url = f"{self.base_url}/index.html"
        self.headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
            "Accept-Language": "zh-CN,zh;q=0.9",
            "Connection": "keep-alive",
            "sec-ch-ua": "\"Google Chrome\";v=\"135\", \"Not-A.Brand\";v=\"8\", \"Chromium\";v=\"135\"",
            "sec-ch-ua-mobile": "?0",
            "sec-ch-ua-platform": "\"Windows\"",
            "sec-fetch-dest": "document",
            "sec-fetch-mode": "navigate",
            "sec-fetch-site": "same-origin",
            "sec-fetch-user": "?1",
            "upgrade-insecure-requests": "1"
        }

    async def fetch_page(self, page_url: str) -> str:
        """获取页面内容"""
        try:
            print(f"开始请求页面: {page_url}")
            response = requests.get(
                page_url, 
                headers=self.headers, 
                verify=False,
                timeout=30
            )
            
            if response.status_code != 200:
                print(f"请求失败，状态码: {response.status_code}")
                raise HTTPException(status_code=response.status_code, detail="页面请求失败")
            
            print(f"成功获取页面内容, 响应长度: {len(response.text)}")
            return response.text
            
        except Exception as e:
            print(f"Error fetching page: {str(e)}")
            raise HTTPException(status_code=500, detail=f"获取页面失败: {str(e)}")

    async def parse_page(self, html_content: str) -> list:
        """解析页面内容，提取教育政策信息"""
        result = []
        try:
            print("开始解析页面内容...")
            soup = BeautifulSoup(html_content, 'html.parser')
            news_list = soup.select_one('div.news_list')
            
            if not news_list:
                print("未找到新闻列表 div.news_list")
                return result
                
            list_items = news_list.select('ul li')
            print(f"找到 {len(list_items)} 个列表项")
            
            for item in list_items:
                article = {}
                
                # 提取标题和链接
                link_tag = item.select_one('a')
                if link_tag:
                    article['title'] = link_tag.get_text(strip=True)
                    article['link'] = link_tag.get('href', '')
                    if article['link'] and not article['link'].startswith('http'):
                        article['link'] = f"https://jyj.gz.gov.cn{article['link']}"
                
                # 提取日期
                date_tag = item.select_one('span')
                if date_tag:
                    date_str = date_tag.get_text(strip=True).strip('[]')
                    article['date'] = date_str
                
                # 添加元数据
                article["source_name"] = "广州市教育局"
                article["type"] = "source"
                
                if article.get('title') and article.get('link'):
                    result.append(article)
                    print(f"提取文章: {article['title']}")
            
            print(f"成功解析 {len(result)} 篇文章")
            return result
            
        except Exception as e:
            print(f"Error parsing page: {str(e)}")
            return result

    async def get_total_pages(self, html_content: str) -> int:
        """获取总页数"""
        try:
            print("开始获取总页数...")
            soup = BeautifulSoup(html_content, 'html.parser')
            page_div = soup.select_one('div.pagediv')
            
            if not page_div:
                print("未找到页码 div.pagediv")
                return 1
                
            # 查找最后一页链接
            last_page = page_div.select_one('a.last')
            if last_page:
                last_url = last_page.get('href', '')
                if last_url:
                    # 从URL中提取页码
                    page_num = last_url.split('_')[-1].split('.')[0]
                    if page_num.isdigit():
                        print(f"找到总页数: {page_num}")
                        return int(page_num)
            
            print("未找到最后页链接，返回默认值 1")
            return 1
            
        except Exception as e:
            print(f"Error getting total pages: {str(e)}")
            return 1

    async def stream_search_results(self, limit: int = 10, max_pages: int = 3) -> AsyncGenerator[Dict, None]:
        """流式输出搜索结果"""
        try:
            print(f"开始获取搜索结果，限制 {limit} 条，最大页数 {max_pages}")
            
            # 获取第一页内容
            first_page = await self.fetch_page(self.index_url)
            
            # 获取总页数
            total_pages = await self.get_total_pages(first_page)
            total_pages = min(total_pages, max_pages)  # 限制爬取页数
            print(f"将爬取 {total_pages} 页")
            
            count = 0
            processed_urls = set()  # 用于去重
            
            # 解析第一页
            articles = await self.parse_page(first_page)
            
            for article in articles:
                if count >= limit:
                    print(f"已达到限制 {limit} 条，停止处理")
                    break
                
                if article['link'] not in processed_urls:
                    processed_urls.add(article['link'])
                    
                    # 流式输出每篇文章
                    print(f"输出文章 ({count+1}/{limit}): {article['title']}")
                    yield article
                    count += 1
                    
                    # 短暂延迟
                    await asyncio.sleep(0.2)
            
            # 处理后续页面
            for page_num in range(2, total_pages + 1):
                if count >= limit:
                    print(f"已达到限制 {limit} 条，停止处理后续页面")
                    break
                
                print(f"开始处理第 {page_num} 页")
                page_url = f"{self.base_url}/index_{page_num}.html"
                page_content = await self.fetch_page(page_url)
                page_articles = await self.parse_page(page_content)
                
                for article in page_articles:
                    if count >= limit:
                        print(f"已达到限制 {limit} 条，停止处理")
                        break
                    
                    if article['link'] not in processed_urls:
                        processed_urls.add(article['link'])
                        
                        # 流式输出每篇文章
                        print(f"输出文章 ({count+1}/{limit}): {article['title']}")
                        yield article
                        count += 1
                        
                        # 短暂延迟
                        await asyncio.sleep(0.2)
                
            print(f"搜索结果获取完成，共 {count} 条")
                
        except Exception as e:
            print(f"获取搜索结果出错: {str(e)}")
            error_data = {
                "type": "error",
                "message": f"获取数据出错: {str(e)}",
                "source": "jiaoyu"
            }
            yield error_data
        
async def get_jiaoyu_data(limit: int = 10):
    """获取教育政策数据的主函数"""
    print(f"开始获取教育政策数据，限制 {limit} 条")
    scraper = JiaoyuScraper()
    
    count = 0
    async for data in scraper.stream_search_results(limit):
        if data.get("type") == "source" and count < limit:
            count += 1
            print(f"主函数输出数据 ({count}/{limit})")
            yield data

# 为了与其他爬虫保持一致
async def get_data(limit: int = 10):
    """兼容函数，使用默认参数获取数据"""
    print(f"兼容函数调用，限制 {limit} 条")
    async for item in get_jiaoyu_data(limit=limit):
        yield item

# 明确定义测试函数
async def test_scraper():
    """测试爬虫功能的函数"""
    print("=== 开始测试教育政策爬虫 ===")
    scraper = JiaoyuScraper()
    count = 0
    try:
        async for item in scraper.stream_search_results(limit=5):
            count += 1
            print(f"测试获取到第 {count} 条数据:")
            print(f"  标题: {item.get('title', '无标题')}")
            print(f"  链接: {item.get('link', '无链接')}")
            print(f"  日期: {item.get('date', '无日期')}")
            print("-------------------------")
    except Exception as e:
        print(f"测试过程中发生错误: {str(e)}")
    print(f"=== 测试完成，共获取 {count} 条数据 ===")

# 招生考试爬虫
class ZhaoShengScraper:
    def __init__(self):
        self.base_url = "https://jyj.gz.gov.cn/yw/zsks"
        self.index_url = f"{self.base_url}/index.html"
        self.headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
            "Accept-Language": "zh-CN,zh;q=0.9",
            "Connection": "keep-alive",
            "sec-ch-ua": "\"Google Chrome\";v=\"135\", \"Not-A.Brand\";v=\"8\", \"Chromium\";v=\"135\"",
            "sec-ch-ua-mobile": "?0",
            "sec-ch-ua-platform": "\"Windows\"",
            "sec-fetch-dest": "document",
            "sec-fetch-mode": "navigate",
            "sec-fetch-site": "same-origin",
            "sec-fetch-user": "?1",
            "upgrade-insecure-requests": "1"
        }

    async def fetch_page(self, page_url: str) -> str:
        """获取页面内容"""
        try:
            print(f"开始请求招生考试页面: {page_url}")
            response = requests.get(
                page_url, 
                headers=self.headers, 
                verify=False,
                timeout=30
            )
            
            if response.status_code != 200:
                print(f"请求失败，状态码: {response.status_code}")
                raise HTTPException(status_code=response.status_code, detail="页面请求失败")
            
            print(f"成功获取招生考试页面内容, 响应长度: {len(response.text)}")
            return response.text
            
        except Exception as e:
            print(f"Error fetching page: {str(e)}")
            raise HTTPException(status_code=500, detail=f"获取页面失败: {str(e)}")

    async def parse_page(self, html_content: str) -> list:
        """解析页面内容，提取招生考试信息"""
        result = []
        try:
            print("开始解析招生考试页面内容...")
            soup = BeautifulSoup(html_content, 'html.parser')
            news_list = soup.select_one('div.news_list')
            
            if not news_list:
                print("未找到新闻列表 div.news_list")
                return result
                
            list_items = news_list.select('ul li')
            print(f"找到 {len(list_items)} 个列表项")
            
            for item in list_items:
                article = {}
                
                # 提取标题和链接
                link_tag = item.select_one('a')
                if link_tag:
                    article['title'] = link_tag.get_text(strip=True)
                    article['link'] = link_tag.get('href', '')
                    if article['link'] and not article['link'].startswith('http'):
                        # 如果不是完整URL，则添加域名前缀
                        if article['link'].startswith('/'):
                            article['link'] = f"https://jyj.gz.gov.cn{article['link']}"
                        else:
                            article['link'] = f"https://jyj.gz.gov.cn/{article['link']}"
                
                # 提取日期
                date_tag = item.select_one('span')
                if date_tag:
                    date_str = date_tag.get_text(strip=True).strip('[]')
                    article['date'] = date_str
                
                # 添加元数据
                article["source_name"] = "广州市教育局-招生考试"
                article["type"] = "source"
                
                if article.get('title') and article.get('link'):
                    result.append(article)
                    print(f"提取招生考试文章: {article['title']}")
            
            print(f"成功解析 {len(result)} 篇招生考试文章")
            return result
            
        except Exception as e:
            print(f"Error parsing page: {str(e)}")
            return result

    async def get_total_pages(self, html_content: str) -> int:
        """获取总页数"""
        try:
            print("开始获取招生考试总页数...")
            soup = BeautifulSoup(html_content, 'html.parser')
            page_div = soup.select_one('div.pagediv')
            
            if not page_div:
                print("未找到页码 div.pagediv")
                return 1
                
            # 查找最后一页链接
            last_page = page_div.select_one('a.last')
            if last_page:
                last_url = last_page.get('href', '')
                if last_url:
                    # 从URL中提取页码
                    page_num = last_url.split('_')[-1].split('.')[0]
                    if page_num.isdigit():
                        print(f"找到招生考试总页数: {page_num}")
                        return int(page_num)
            
            print("未找到最后页链接，返回默认值 1")
            return 1
            
        except Exception as e:
            print(f"Error getting total pages: {str(e)}")
            return 1

    async def stream_search_results(self, limit: int = 10, max_pages: int = 3) -> AsyncGenerator[Dict, None]:
        """流式输出搜索结果"""
        try:
            print(f"开始获取招生考试搜索结果，限制 {limit} 条，最大页数 {max_pages}")
            
            # 获取第一页内容
            first_page = await self.fetch_page(self.index_url)
            
            # 获取总页数
            total_pages = await self.get_total_pages(first_page)
            total_pages = min(total_pages, max_pages)  # 限制爬取页数
            print(f"将爬取 {total_pages} 页招生考试信息")
            
            count = 0
            processed_urls = set()  # 用于去重
            
            # 解析第一页
            articles = await self.parse_page(first_page)
            
            for article in articles:
                if count >= limit:
                    print(f"已达到限制 {limit} 条，停止处理")
                    break
                
                if article['link'] not in processed_urls:
                    processed_urls.add(article['link'])
                    
                    # 流式输出每篇文章
                    print(f"输出招生考试文章 ({count+1}/{limit}): {article['title']}")
                    yield article
                    count += 1
                    
                    # 短暂延迟
                    await asyncio.sleep(0.2)
            
            # 处理后续页面
            for page_num in range(2, total_pages + 1):
                if count >= limit:
                    print(f"已达到限制 {limit} 条，停止处理后续页面")
                    break
                
                print(f"开始处理招生考试第 {page_num} 页")
                page_url = f"{self.base_url}/index_{page_num}.html"
                page_content = await self.fetch_page(page_url)
                page_articles = await self.parse_page(page_content)
                
                for article in page_articles:
                    if count >= limit:
                        print(f"已达到限制 {limit} 条，停止处理")
                        break
                    
                    if article['link'] not in processed_urls:
                        processed_urls.add(article['link'])
                        
                        # 流式输出每篇文章
                        print(f"输出招生考试文章 ({count+1}/{limit}): {article['title']}")
                        yield article
                        count += 1
                        
                        # 短暂延迟
                        await asyncio.sleep(0.2)
                
            print(f"招生考试搜索结果获取完成，共 {count} 条")
                
        except Exception as e:
            print(f"获取招生考试搜索结果出错: {str(e)}")
            error_data = {
                "type": "error",
                "message": f"获取数据出错: {str(e)}",
                "source": "zsks"
            }
            yield error_data

async def get_zsks_data(limit: int = 10):
    """获取招生考试数据的主函数"""
    print(f"开始获取招生考试数据，限制 {limit} 条")
    scraper = ZhaoShengScraper()
    
    count = 0
    async for data in scraper.stream_search_results(limit):
        if data.get("type") == "source" and count < limit:
            count += 1
            print(f"主函数输出招生考试数据 ({count}/{limit})")
            yield data

# 测试招生考试爬虫
async def test_zsks_scraper():
    """测试招生考试爬虫功能的函数"""
    print("=== 开始测试招生考试爬虫 ===")
    scraper = ZhaoShengScraper()
    count = 0
    try:
        async for item in scraper.stream_search_results(limit=5):
            count += 1
            print(f"测试获取到第 {count} 条招生考试数据:")
            print(f"  标题: {item.get('title', '无标题')}")
            print(f"  链接: {item.get('link', '无链接')}")
            print(f"  日期: {item.get('date', '无日期')}")
            print("-------------------------")
    except Exception as e:
        print(f"测试过程中发生错误: {str(e)}")
    print(f"=== 测试完成，共获取 {count} 条招生考试数据 ===")

# 教育服务爬虫
class JiaoyuFuwuScraper:
    def __init__(self):
        self.base_url = "https://jyj.gz.gov.cn/yw2/jyfw"
        self.index_url = f"{self.base_url}/index.html"
        self.headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
            "Accept-Language": "zh-CN,zh;q=0.9",
            "Connection": "keep-alive",
            "sec-ch-ua": "\"Google Chrome\";v=\"135\", \"Not-A.Brand\";v=\"8\", \"Chromium\";v=\"135\"",
            "sec-ch-ua-mobile": "?0",
            "sec-ch-ua-platform": "\"Windows\"",
            "sec-fetch-dest": "document",
            "sec-fetch-mode": "navigate",
            "sec-fetch-site": "same-origin",
            "sec-fetch-user": "?1",
            "upgrade-insecure-requests": "1"
        }

    async def fetch_page(self, page_url: str) -> str:
        """获取页面内容"""
        try:
            print(f"开始请求教育服务页面: {page_url}")
            response = requests.get(
                page_url, 
                headers=self.headers, 
                verify=False,
                timeout=30
            )
            
            if response.status_code != 200:
                print(f"请求失败，状态码: {response.status_code}")
                raise HTTPException(status_code=response.status_code, detail="页面请求失败")
            
            print(f"成功获取教育服务页面内容, 响应长度: {len(response.text)}")
            return response.text
            
        except Exception as e:
            print(f"Error fetching page: {str(e)}")
            raise HTTPException(status_code=500, detail=f"获取页面失败: {str(e)}")

    async def parse_page(self, html_content: str) -> list:
        """解析页面内容，提取教育服务信息"""
        result = []
        try:
            print("开始解析教育服务页面内容...")
            soup = BeautifulSoup(html_content, 'html.parser')
            news_list = soup.select_one('div.news_list')
            
            if not news_list:
                print("未找到新闻列表 div.news_list")
                return result
                
            list_items = news_list.select('ul li')
            print(f"找到 {len(list_items)} 个列表项")
            
            for item in list_items:
                article = {}
                
                # 提取标题和链接
                link_tag = item.select_one('a')
                if link_tag:
                    article['title'] = link_tag.get_text(strip=True)
                    article['link'] = link_tag.get('href', '')
                    if article['link'] and not article['link'].startswith('http'):
                        # 如果不是完整URL，则添加域名前缀
                        if article['link'].startswith('/'):
                            article['link'] = f"https://jyj.gz.gov.cn{article['link']}"
                        else:
                            article['link'] = f"https://jyj.gz.gov.cn/{article['link']}"
                
                # 提取日期
                date_tag = item.select_one('span')
                if date_tag:
                    date_str = date_tag.get_text(strip=True).strip('[]')
                    article['date'] = date_str
                
                # 添加元数据
                article["source_name"] = "广州市教育局-教育服务"
                article["type"] = "source"
                
                if article.get('title') and article.get('link'):
                    result.append(article)
                    print(f"提取教育服务文章: {article['title']}")
            
            print(f"成功解析 {len(result)} 篇教育服务文章")
            return result
            
        except Exception as e:
            print(f"Error parsing page: {str(e)}")
            return result

    async def get_total_pages(self, html_content: str) -> int:
        """获取总页数"""
        try:
            print("开始获取教育服务总页数...")
            soup = BeautifulSoup(html_content, 'html.parser')
            page_div = soup.select_one('div.pagediv')
            
            if not page_div:
                print("未找到页码 div.pagediv")
                return 1
                
            # 查找最后一页链接
            last_page = page_div.select_one('a.last')
            if last_page:
                last_url = last_page.get('href', '')
                if last_url:
                    # 从URL中提取页码
                    page_num = last_url.split('_')[-1].split('.')[0]
                    if page_num.isdigit():
                        print(f"找到教育服务总页数: {page_num}")
                        return int(page_num)
            
            print("未找到最后页链接，返回默认值 1")
            return 1
            
        except Exception as e:
            print(f"Error getting total pages: {str(e)}")
            return 1

    async def stream_search_results(self, limit: int = 10, max_pages: int = 3) -> AsyncGenerator[Dict, None]:
        """流式输出搜索结果"""
        try:
            print(f"开始获取教育服务搜索结果，限制 {limit} 条，最大页数 {max_pages}")
            
            # 获取第一页内容
            first_page = await self.fetch_page(self.index_url)
            
            # 获取总页数
            total_pages = await self.get_total_pages(first_page)
            total_pages = min(total_pages, max_pages)  # 限制爬取页数
            print(f"将爬取 {total_pages} 页教育服务信息")
            
            count = 0
            processed_urls = set()  # 用于去重
            
            # 解析第一页
            articles = await self.parse_page(first_page)
            
            for article in articles:
                if count >= limit:
                    print(f"已达到限制 {limit} 条，停止处理")
                    break
                
                if article['link'] not in processed_urls:
                    processed_urls.add(article['link'])
                    
                    # 流式输出每篇文章
                    print(f"输出教育服务文章 ({count+1}/{limit}): {article['title']}")
                    yield article
                    count += 1
                    
                    # 短暂延迟
                    await asyncio.sleep(0.2)
            
            # 处理后续页面
            for page_num in range(2, total_pages + 1):
                if count >= limit:
                    print(f"已达到限制 {limit} 条，停止处理后续页面")
                    break
                
                print(f"开始处理教育服务第 {page_num} 页")
                page_url = f"{self.base_url}/index_{page_num}.html"
                page_content = await self.fetch_page(page_url)
                page_articles = await self.parse_page(page_content)
                
                for article in page_articles:
                    if count >= limit:
                        print(f"已达到限制 {limit} 条，停止处理")
                        break
                    
                    if article['link'] not in processed_urls:
                        processed_urls.add(article['link'])
                        
                        # 流式输出每篇文章
                        print(f"输出教育服务文章 ({count+1}/{limit}): {article['title']}")
                        yield article
                        count += 1
                        
                        # 短暂延迟
                        await asyncio.sleep(0.2)
                
            print(f"教育服务搜索结果获取完成，共 {count} 条")
                
        except Exception as e:
            print(f"获取教育服务搜索结果出错: {str(e)}")
            error_data = {
                "type": "error",
                "message": f"获取数据出错: {str(e)}",
                "source": "jyfw"
            }
            yield error_data

async def get_jyfw_data(limit: int = 10):
    """获取教育服务数据的主函数"""
    print(f"开始获取教育服务数据，限制 {limit} 条")
    scraper = JiaoyuFuwuScraper()
    
    count = 0
    async for data in scraper.stream_search_results(limit):
        if data.get("type") == "source" and count < limit:
            count += 1
            print(f"主函数输出教育服务数据 ({count}/{limit})")
            yield data

# 测试教育服务爬虫
async def test_jyfw_scraper():
    """测试教育服务爬虫功能的函数"""
    print("=== 开始测试教育服务爬虫 ===")
    scraper = JiaoyuFuwuScraper()
    count = 0
    try:
        async for item in scraper.stream_search_results(limit=5):
            count += 1
            print(f"测试获取到第 {count} 条教育服务数据:")
            print(f"  标题: {item.get('title', '无标题')}")
            print(f"  链接: {item.get('link', '无链接')}")
            print(f"  日期: {item.get('date', '无日期')}")
            print("-------------------------")
    except Exception as e:
        print(f"测试过程中发生错误: {str(e)}")
    print(f"=== 测试完成，共获取 {count} 条教育服务数据 ===")

if __name__ == "__main__":
    print("直接运行教育政策爬虫模块")
    # 运行测试函数
    asyncio.run(test_scraper())
    # 运行招生考试爬虫测试
    asyncio.run(test_zsks_scraper())
    # 运行教育服务爬虫测试
    asyncio.run(test_jyfw_scraper()) 