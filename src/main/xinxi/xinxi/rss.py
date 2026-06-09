import feedparser
import asyncio
from typing import AsyncGenerator, Dict, Any, List, Optional
from fastapi import HTTPException
from datetime import datetime
import time

class RSSFeedParser:
    def __init__(self):
        # 初始化一些流行的RSS订阅源
        self.popular_feeds = {
            "爱范儿": "https://www.ifanr.com/feed",
            "极客公园": "http://www.geekpark.net/rss",
            "小众软件": "https://feed.appinn.com/",
        }

    async def parse_rss_feed(self, url: str, limit: int = 10) -> List[Dict[str, Any]]:
        """解析RSS订阅源并返回条目列表"""
        try:
            # 使用feedparser解析RSS
            feed = feedparser.parse(url)
            
            # 检查是否成功解析
            if feed.bozo and not len(feed.entries):
                raise HTTPException(status_code=400, detail=f"RSS解析错误: {str(feed.bozo_exception)}")
            
            # 提取订阅源信息
            feed_title = feed.feed.get('title', 'Unknown Feed')
            feed_link = feed.feed.get('link', url)
            feed_description = feed.feed.get('description', feed.feed.get('subtitle', ''))
            
            # 处理并格式化条目
            entries = []
            for entry in feed.entries[:limit]:
                # 提取和格式化时间
                published_time = entry.get('published', entry.get('updated', ''))
                try:
                    # 尝试不同的时间格式
                    date_formats = [
                        '%a, %d %b %Y %H:%M:%S %z',
                        '%a, %d %b %Y %H:%M:%S %Z', 
                        '%Y-%m-%dT%H:%M:%S%z',
                        '%Y-%m-%dT%H:%M:%SZ',
                        '%Y-%m-%d %H:%M:%S',
                    ]
                    
                    parsed_time = None
                    for fmt in date_formats:
                        try:
                            parsed_time = datetime.strptime(published_time, fmt)
                            break
                        except (ValueError, TypeError):
                            continue
                    
                    if parsed_time:
                        formatted_time = parsed_time.strftime('%Y-%m-%d %H:%M:%S')
                    else:
                        formatted_time = published_time
                except:
                    formatted_time = published_time
                
                # 提取内容摘要
                summary = entry.get('summary', entry.get('description', ''))
                
                # 构建条目数据
                entry_data = {
                    'title': entry.get('title', 'No Title'),
                    'link': entry.get('link', ''),
                    'published': formatted_time,
                    'summary': summary,
                    'author': entry.get('author', ''),
                    'id': entry.get('id', ''),
                    'feed_title': feed_title
                }
                
                entries.append(entry_data)
            
            return entries
            
        except Exception as e:
            print(f"RSS解析错误: {str(e)}")
            raise HTTPException(status_code=500, detail=f"RSS解析错误: {str(e)}")

    async def stream_rss_feed(self, url: str, limit: int = 10) -> AsyncGenerator[Dict[str, Any], None]:
        """流式输出RSS内容"""
        try:
            # 尝试解析预定义的源
            actual_url = self.popular_feeds.get(url.lower(), url)
            
            # 解析订阅源
            entries = await self.parse_rss_feed(actual_url, limit)
            
            # 确定urlName (即预定义源的key)
            url_name = None
            for key, feed_url in self.popular_feeds.items():
                if feed_url == actual_url:
                    url_name = key
                    break
            
            # 流式输出每个条目
            for entry in entries:
                # 添加元数据
                entry["source"] = "rss"
                entry["source_name"] = entry.get('feed_title', 'RSS Feed')
                entry["type"] = "source"
                entry["urlName"] = url_name  # 添加urlName
                
                print(f"RSS数据: {entry['title']}")
                
                # 流式输出
                yield entry
                
                # 短暂延迟，避免前端过载
                await asyncio.sleep(0.2)
                
        except Exception as e:
            error_data = {
                "type": "error",
                "message": f"获取RSS数据出错: {str(e)}",
                "source": "rss"
            }
            yield error_data

async def get_rss_data(url: str, limit: int = 10):
    """获取RSS数据的主函数"""
    parser = RSSFeedParser()
    
    if not url:
        # 如果未提供URL，默认使用Hacker News
        url = "hackernews"
    
    # 如果提供的是别名，使用对应的URL
    if url in parser.popular_feeds:
        print(f"使用预定义RSS源: {url} -> {parser.popular_feeds[url]}")
    
    count = 0
    async for data in parser.stream_rss_feed(url, limit):
        if data.get("type") != "error" and count < limit:
            count += 1
            yield data
        elif data.get("type") == "error":
            yield data
            break

# 兼容函数，使用默认参数获取数据
async def get_data():
    """兼容函数，使用默认参数获取数据"""
    async for item in get_rss_data("hackernews", 10):
        yield item
