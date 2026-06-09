import requests
from bs4 import BeautifulSoup
import pandas as pd
from datetime import datetime
import aiohttp
import asyncio

def get_xmu_news():
    # 基础URL
    base_url = "https://news.xmu.edu.cn/jdyw"
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    }
    
    news_list = []
    
    try:
        # 获取页面内容
        response = requests.get(f"{base_url}.htm", headers=headers)
        response.encoding = 'utf-8'  # 设置编码
        
        if response.status_code == 200:
            soup = BeautifulSoup(response.text, 'html.parser')
            
            # 查找所有新闻行
            news_rows = soup.find_all('div', class_='row')
            
            for row in news_rows:
                # 提取标题和链接
                title_div = row.find('div', class_='listcolumn-title')
                if title_div:
                    link = title_div.find('a')
                    if link:
                        title = link.get('title')
                        href = f"https://news.xmu.edu.cn/{link.get('href')}"
                        
                        # 提取日期
                        date_div = row.find('div', class_='listcolumn-date')
                        date = date_div.text.strip() if date_div else None
                        
                        news_list.append({
                            'title': title,
                            'link': href,
                            'date': date
                        })
        
        # 将结果保存为CSV文件
        if news_list:
            df = pd.DataFrame(news_list)
            filename = f'xmu_news_{datetime.now().strftime("%Y%m%d")}.csv'
            df.to_csv(filename, index=False, encoding='utf-8-sig')
            print(f"新闻数据已保存到 {filename}")
            
        return news_list
            
    except Exception as e:
        print(f"发生错误: {e}")
        return []

def get_xmu_news1(limit=5):
    # 基础URL - 焦点要闻
    base_url = "https://news.xmu.edu.cn/jdyw"
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    }
    
    news_list = []
    
    try:
        # 获取页面内容
        response = requests.get(f"{base_url}.htm", headers=headers)
        response.encoding = 'utf-8'  # 设置编码
        
        if response.status_code == 200:
            soup = BeautifulSoup(response.text, 'html.parser')
            
            # 查找所有新闻行
            news_rows = soup.find_all('div', class_='row', limit=limit)
            
            for row in news_rows:
                # 提取标题和链接
                title_div = row.find('div', class_='listcolumn-title')
                if title_div:
                    link = title_div.find('a')
                    if link:
                        title = link.get('title')
                        href = f"https://news.xmu.edu.cn/{link.get('href')}"
                        
                        # 提取日期
                        date_div = row.find('div', class_='listcolumn-date')
                        date = date_div.text.strip() if date_div else None

                        # 提取简介（如果有的话）
                        summary_div = row.find('div', class_='listcolumn-summary')
                        summary = summary_div.text.strip() if summary_div else "无简介"
                        
                        news_list.append({
                            'title': title,
                            'link': href,
                            'date': date,
                            'summary': summary,
                            'source': 'xmu_jdyw'
                        })
        
        return news_list[:limit]  # 确保返回指定数量的新闻
            
    except Exception as e:
        print(f"发生错误 (xmu_jdyw): {e}")
        return []

def get_xmu_news2(limit=5):
    # 基础URL - 校园动态
    base_url = "https://news.xmu.edu.cn/xydt"
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    }
    
    news_list = []
    
    try:
        # 获取页面内容
        response = requests.get(f"{base_url}.htm", headers=headers)
        response.encoding = 'utf-8'  # 设置编码
        
        if response.status_code == 200:
            soup = BeautifulSoup(response.text, 'html.parser')
            
            # 查找所有新闻行
            news_rows = soup.find_all('div', class_='row', limit=limit)
            
            for row in news_rows:
                # 提取标题和链接
                title_div = row.find('div', class_='listcolumn-title')
                if title_div:
                    link = title_div.find('a')
                    if link:
                        title = link.get('title')
                        href = f"https://news.xmu.edu.cn/{link.get('href')}"
                        
                        # 提取日期
                        date_div = row.find('div', class_='listcolumn-date')
                        date = date_div.text.strip() if date_div else None

                        # 提取简介（如果有的话）
                        summary_div = row.find('div', class_='listcolumn-summary')
                        summary = summary_div.text.strip() if summary_div else "无简介"
                        
                        news_list.append({
                            'title': title,
                            'link': href,
                            'date': date,
                            'summary': summary,
                            'source': 'xmu_xydt'
                        })
        
        return news_list[:limit]  # 确保返回指定数量的新闻
            
    except Exception as e:
        print(f"发生错误 (xmu_xydt): {e}")
        return []

async def async_get_xmu_news1(limit=5):
    # 基础URL - 焦点要闻
    base_url = "https://news.xmu.edu.cn/jdyw"
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    }
    
    try:
        # 异步获取页面内容
        async with aiohttp.ClientSession() as session:
            async with session.get(f"{base_url}.htm", headers=headers) as response:
                if response.status == 200:
                    html = await response.text()
                    soup = BeautifulSoup(html, 'html.parser')
                    
                    # 查找所有新闻行
                    news_rows = soup.find_all('div', class_='row', limit=limit)
                    print('厦大焦点要闻获取到:', len(news_rows), '条')
                    
                    for row in news_rows:
                        # 提取标题和链接
                        title_div = row.find('div', class_='listcolumn-title')
                        if title_div:
                            link = title_div.find('a')
                            if link:
                                title = link.get('title') or link.text.strip()
                                href = f"https://news.xmu.edu.cn/{link.get('href')}"
                                
                                # 提取日期
                                date_div = row.find('div', class_='listcolumn-date')
                                date = date_div.text.strip() if date_div else None
                                
                                # 提取简介（如果有的话）
                                summary_div = row.find('div', class_='listcolumn-summary')
                                summary = summary_div.text.strip() if summary_div else "无简介"
                                
                                # 立即返回一条新闻
                                yield {
                                    'title': title,
                                    'link': href,
                                    'date': date,
                                    'summary': summary,
                                    'source': 'xmu_jdyw'
                                }
                                
                                # 短暂延迟，避免过快抓取
                                await asyncio.sleep(0.05)
    except Exception as e:
        print(f"发生错误 (async_xmu_jdyw): {e}")
        yield {
            'error': str(e),
            'source': 'xmu_jdyw'
        }

async def async_get_xmu_news2(limit=5):
    # 基础URL - 校园动态
    base_url = "https://news.xmu.edu.cn/xydt"
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    }
    
    try:
        # 异步获取页面内容
        async with aiohttp.ClientSession() as session:
            async with session.get(f"{base_url}.htm", headers=headers) as response:
                if response.status == 200:
                    html = await response.text()
                    soup = BeautifulSoup(html, 'html.parser')
                    
                    # 查找所有新闻行
                    news_rows = soup.find_all('div', class_='row', limit=limit)
                    print('厦大校园动态获取到:', len(news_rows), '条')
                    
                    for row in news_rows:
                        # 提取标题和链接
                        title_div = row.find('div', class_='listcolumn-title')
                        if title_div:
                            link = title_div.find('a')
                            if link:
                                title = link.get('title') or link.text.strip()
                                href = f"https://news.xmu.edu.cn/{link.get('href')}"
                                
                                # 提取日期
                                date_div = row.find('div', class_='listcolumn-date')
                                date = date_div.text.strip() if date_div else None
                                
                                # 提取简介（如果有的话）
                                summary_div = row.find('div', class_='listcolumn-summary')
                                summary = summary_div.text.strip() if summary_div else "无简介"
                                
                                # 立即返回一条新闻
                                yield {
                                    'title': title,
                                    'link': href,
                                    'date': date,
                                    'summary': summary,
                                    'source': 'xmu_xydt'
                                }
                                
                                # 短暂延迟，避免过快抓取
                                await asyncio.sleep(0.05)
    except Exception as e:
        print(f"发生错误 (async_xmu_xydt): {e}")
        yield {
            'error': str(e),
            'source': 'xmu_xydt'
        }

if __name__ == "__main__":
    news1 = get_xmu_news1(5)
    news2 = get_xmu_news2(5)
    
    # 合并新闻列表
    all_news = news1 + news2
    
    # 按日期排序
    all_news.sort(key=lambda x: x['date'], reverse=True)
    
    print(f"共获取到 {len(all_news)} 条新闻")
    print(f"焦点要闻: {len(news1)} 条")
    print(f"校园动态: {len(news2)} 条")
    
    # 打印前10条新闻
    for i, item in enumerate(all_news[:10], 1):
        print(f"\n{i}. [{item['source']}] {item['title']}")
        print(f"   链接: {item['link']}")
        print(f"   日期: {item['date']}")
        print(f"   简介: {item['summary']}")
    
    # 测试异步函数
    async def test_async_crawlers():
        print("\n测试异步爬虫:")
        
        print("\n爬取厦大焦点要闻:")
        count = 0
        async for item in async_get_xmu_news1(5):
            count += 1
            print(f"{count}. {item['title']}")
            
        print("\n爬取厦大校园动态:")
        count = 0
        async for item in async_get_xmu_news2(5):
            count += 1
            print(f"{count}. {item['title']}")
            
    # 如果要测试异步函数，取消下面一行的注释
    # asyncio.run(test_async_crawlers())
