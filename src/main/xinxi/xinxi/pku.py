import requests
from bs4 import BeautifulSoup
import pandas as pd
from datetime import datetime
import asyncio
import aiohttp

def get_pku_news1(limit=15):
    # 基础URL
    url = "https://news.pku.edu.cn/xwzh/index.htm"
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    }
    
    news_list = []
    
    try:
        # 获取页面内容
        response = requests.get(url, headers=headers)
        response.encoding = 'utf-8'  # 设置编码
        
        if response.status_code == 200:
            soup = BeautifulSoup(response.text, 'html.parser')
            
            # 查找所有新闻项
            news_items = soup.find_all('li', class_='imgHover', limit=limit)
            
            for item in news_items:
                # 提取标题和链接
                title_div = item.find('h3')
                if title_div:
                    link = title_div.find('a')
                    if link:
                        title = link.text.strip()
                        href = f"https://news.pku.edu.cn/xwzh/{link.get('href')}"
                        
                        # 提取日期
                        date_div = item.find('span', class_='item-date')
                        date = date_div.text.strip() if date_div else None
                        
                        news_list.append({
                            'title': title,
                            'link': href,
                            'date': date,
                            'source': 'pku'
                        })
            
        return news_list[:limit]  # 确保返回指定数量的新闻
            
    except Exception as e:
        print(f"发生错误 (pku): {e}")
        return []

async def async_get_pku_news1(limit=15):
    # 基础URL
    url = "https://news.pku.edu.cn/xwzh/index.htm"
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    }
    
    news_list = []
    
    try:
        # 异步获取页面内容
        async with aiohttp.ClientSession() as session:
            async with session.get(url, headers=headers) as response:
                if response.status == 200:
                    html = await response.text()
                    soup = BeautifulSoup(html, 'html.parser')
                    
                    # 查找所有新闻项
                    news_items = soup.find_all('li', class_='imgHover', limit=limit)
                    print('北大新闻1',len(news_items))
                    for item in news_items:
                        # 提取标题和链接
                        title_div = item.find('h3')
                        if title_div:
                            link = title_div.find('a')
                            if link:
                                title = link.text.strip()
                                href = f"https://news.pku.edu.cn/xwzh/{link.get('href')}"
                                
                                # 提取日期
                                date_div = item.find('span', class_='item-date')
                                date = date_div.text.strip() if date_div else None
                                
    
                                # 立即返回一条新闻
                                yield {
                                    'title': title,
                                    'link': href,
                                    'date': date,
                                    'source': 'pku'
                                }
                    
    except Exception as e:
        print(f"发生错误 (async_pku): {e}")
        yield {
            'error': str(e),
            'source': 'pku'
        }

def get_pku_news2(limit=15):
    # 基础URL
    url = "https://news.pku.edu.cn/jxky/index.htm"
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    }
    
    news_list = []
    
    try:
        # 获取页面内容
        response = requests.get(url, headers=headers)
        response.encoding = 'utf-8'  # 设置编码
        
        if response.status_code == 200:
            soup = BeautifulSoup(response.text, 'html.parser')
            
            # 查找所有新闻项
            news_items = soup.find_all('li', class_='imgHover', limit=limit)
            
            for item in news_items:
                # 提取标题和链接
                title_div = item.find('h3')
                if title_div:
                    link = title_div.find('a')
                    if link:
                        title = link.text.strip()
                        href = f"https://news.pku.edu.cn/jxky/{link.get('href')}"
                        
                        # 提取日期
                        date_div = item.find('span', class_='item-date')
                        date = date_div.text.strip() if date_div else None
                        
                        
                        news_list.append({
                            'title': title,
                            'link': href,
                            'date': date,
                            'source': 'jxky'
                        })
            
        return news_list[:limit]  # 确保返回指定数量的新闻
            
    except Exception as e:
        print(f"发生错误 (jxky): {e}")
        return []

async def async_get_pku_news2(limit=15):
    # 基础URL
    url = "https://news.pku.edu.cn/jxky/index.htm"
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    }
    
    try:
        # 异步获取页面内容
        async with aiohttp.ClientSession() as session:
            async with session.get(url, headers=headers) as response:
                if response.status == 200:
                    html = await response.text()
                    soup = BeautifulSoup(html, 'html.parser')
                    
                    # 查找所有新闻项
                    news_items = soup.find_all('li', class_='imgHover', limit=limit)
                    
                    for item in news_items:
                        # 提取标题和链接
                        title_div = item.find('h3')
                        if title_div:
                            link = title_div.find('a')
                            if link:
                                title = link.text.strip()
                                href = f"https://news.pku.edu.cn/jxky/{link.get('href')}"
                                
                                # 提取日期
                                date_div = item.find('span', class_='item-date')
                                date = date_div.text.strip() if date_div else None
                                
                                # 立即返回一条新闻
                                yield {
                                    'title': title,
                                    'link': href,
                                    'date': date,
                                    'source': 'jxky'
                                }
                    
    except Exception as e:
        print(f"发生错误 (async_jxky): {e}")
        yield {
            'error': str(e),
            'source': 'jxky'
        }

if __name__ == "__main__":
    # 获取新闻
    news1 = get_pku_news1(20)
    news2 = get_pku_news2(20)
    
    print(f"共获取到 {len(news1)} 条新闻")
    
    # 打印新闻
    for i, item in enumerate(news1, 1):
        print(f"\n{i}. {item['title']}")
        print(f"   链接: {item['link']}")
        print(f"   日期: {item['date']}")

    print(f"共获取到 {len(news2)} 条新闻")
    for i, item in enumerate(news2, 1):
        print(f"\n{i}. {item['title']}")
        print(f"   链接: {item['link']}")
        print(f"   日期: {item['date']}")

    # 测试异步函数
    async def test_async_crawlers():
        print("\n测试异步爬虫:")
        
        print("\n爬取北大新闻1:")
        count = 0
        async for item in async_get_pku_news1(5):
            count += 1
            print(f"{count}. {item['title']}")
            
        print("\n爬取北大新闻2:")
        count = 0
        async for item in async_get_pku_news2(5):
            count += 1
            print(f"{count}. {item['title']}")
            
    # 如果要测试异步函数，取消下面一行的注释
    # asyncio.run(test_async_crawlers())
