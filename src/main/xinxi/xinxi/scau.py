import requests
from bs4 import BeautifulSoup
import pandas as pd
from datetime import datetime
import aiohttp
import asyncio

def get_scau_news1(limit=5):
    # 基础URL
    url = "https://www.scau.edu.cn/xxyw/list.htm"
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
            news_items = soup.find_all('li', class_='news', limit=limit)  # 限制获取的新闻数量
            
            for item in news_items:
                # 提取标题和链接
                title_div = item.find('div', class_='news_title')
                if title_div:
                    link = title_div.find('a')
                    if link:
                        title = link.get('title')
                        href = f"https://www.scau.edu.cn{link.get('href')}"
                        
                        # 提取日期
                        date_div = item.find('div', class_='news_meta')
                        date = date_div.text.strip() if date_div else None
                        
                        # 提取新闻简介
                        text_div = item.find('div', class_='news_text')
                        summary = text_div.find('a').get('title') if text_div else None
                        
                        news_list.append({
                            'title': title,
                            'link': href,
                            'date': date,
                            'summary': summary,
                            'source': 'xxyw'
                        })
            
        return news_list[:limit]  # 确保返回指定数量的新闻
            
    except Exception as e:
        print(f"发生错误 (xxyw): {e}")
        return []

def get_scau_news2(limit=15):
    # 基础URL
    url = "https://scau.edu.cn/17648/list.htm"
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
            news_items = soup.find_all('li', class_='news', limit=limit)  # 限制获取的新闻数量
            
            for item in news_items:
                # 提取标题和链接
                title_div = item.find('div', class_='news_title')
                if title_div:
                    link = title_div.find('a')
                    if link:
                        title = link.get('title')
                        href = f"https://scau.edu.cn{link.get('href')}"
                        
                        # 提取日期
                        date_div = item.find('div', class_='news_meta')
                        date = date_div.text.strip() if date_div else None
                        
                        # 提取新闻简介
                        text_div = item.find('div', class_='news_text')
                        summary = text_div.find('a').get('title') if text_div else None
                        
                        news_list.append({
                            'title': title,
                            'link': href,
                            'date': date,
                            'summary': summary,
                            'source': '17648'
                        })
            
        return news_list[:limit]  # 确保返回指定数量的新闻
            
    except Exception as e:
        print(f"发生错误 (17648): {e}")
        return []

async def async_get_scau_news1(limit=5):
    # 基础URL
    url = "https://www.scau.edu.cn/xxyw/list.htm"
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
                    news_items = soup.find_all('li', class_='news', limit=limit)
                    print('华农新闻1获取到:', len(news_items), '条')
                    
                    for item in news_items:
                        # 提取标题和链接
                        title_div = item.find('div', class_='news_title')
                        if title_div:
                            link = title_div.find('a')
                            if link:
                                title = link.get('title')
                                href = f"https://www.scau.edu.cn{link.get('href')}"
                                
                                # 提取日期
                                date_div = item.find('div', class_='news_meta')
                                date = date_div.text.strip() if date_div else None
                                
                                # 提取新闻简介
                                text_div = item.find('div', class_='news_text')
                                summary = text_div.find('a').get('title') if text_div else None
                                
                                # 立即返回一条新闻
                                yield {
                                    'title': title,
                                    'link': href,
                                    'date': date,
                                    'summary': summary,
                                    'source': 'scau_xxyw'
                                }
                                
                                # 短暂延迟，避免过快抓取
                                await asyncio.sleep(0.05)
    except Exception as e:
        print(f"发生错误 (async_scau_xxyw): {e}")
        yield {
            'error': str(e),
            'source': 'scau_xxyw'
        }

async def async_get_scau_news2(limit=15):
    # 基础URL
    url = "https://scau.edu.cn/17648/list.htm"
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
                    news_items = soup.find_all('li', class_='news', limit=limit)
                    print('华农新闻2获取到:', len(news_items), '条')
                    
                    for item in news_items:
                        # 提取标题和链接
                        title_div = item.find('div', class_='news_title')
                        if title_div:
                            link = title_div.find('a')
                            if link:
                                title = link.get('title')
                                href = f"https://scau.edu.cn{link.get('href')}"
                                
                                # 提取日期
                                date_div = item.find('div', class_='news_meta')
                                date = date_div.text.strip() if date_div else None
                                
                                # 提取新闻简介
                                text_div = item.find('div', class_='news_text')
                                summary = text_div.find('a').get('title') if text_div else None
                                
                                # 立即返回一条新闻
                                yield {
                                    'title': title,
                                    'link': href,
                                    'date': date,
                                    'summary': summary,
                                    'source': 'scau_17648'
                                }
                                
                                # 短暂延迟，避免过快抓取
                                await asyncio.sleep(0.05)
    except Exception as e:
        print(f"发生错误 (async_scau_17648): {e}")
        yield {
            'error': str(e),
            'source': 'scau_17648'
        }

if __name__ == "__main__":
    news1 = get_scau_news1(5)
    news2 = get_scau_news2(5)
    
    # 合并新闻列表
    all_news = news1 + news2
    
    # 按日期排序
    all_news.sort(key=lambda x: x['date'], reverse=True)
    
    print(f"共获取到 {len(all_news)} 条新闻")
    print(f"第一频道: {len(news1)} 条")
    print(f"第二频道: {len(news2)} 条")
    
    # 打印前30条新闻
    for i, item in enumerate(all_news[:40], 1):
        print(f"\n{i}. [{item['source']}] {item['title']}")
        print(f"   链接: {item['link']}")
        print(f"   日期: {item['date']}")

    # 测试异步函数
    async def test_async_crawlers():
        print("\n测试异步爬虫:")
        
        print("\n爬取华农新闻1:")
        count = 0
        async for item in async_get_scau_news1(5):
            count += 1
            print(f"{count}. {item['title']}")
            
        print("\n爬取华农新闻2:")
        count = 0
        async for item in async_get_scau_news2(5):
            count += 1
            print(f"{count}. {item['title']}")
            
    # 如果要测试异步函数，取消下面一行的注释
    # asyncio.run(test_async_crawlers())
