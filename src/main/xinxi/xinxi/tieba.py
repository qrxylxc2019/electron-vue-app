import asyncio
import aiotieba
from datetime import datetime

async def async_get_tieba_news1(limit=5):
    """
    爬取"新广东大学"贴吧的内容
    
    Args:
        limit: 限制返回的数据条数
        
    Yields:
        dict: 包含标题、链接、日期、摘要等信息的字典
    """
    try:
        async with aiotieba.Client() as client:
            # 获取"新广东大学"贴吧的帖子
            threads = await client.get_threads("新广东大学")
            print(f"贴吧-新广东大学获取到: {len(threads)} 条")
            
            count = 0
            for thread in threads:
                if count >= limit:
                    break
                
                # 获取帖子详情
                try:
                    # 构建帖子链接
                    thread_link = f"https://tieba.baidu.com/p/{thread.tid}"
                    
                    # 获取当前日期时间作为抓取时间
                    current_date = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                    
                    # 尝试获取帖子内容作为摘要，如果没有则使用标题
                    summary = thread.abstract if hasattr(thread, 'abstract') and thread.abstract else thread.title
                    
                    # 构建返回数据
                    yield {
                        'title': thread.title,
                        'link': thread_link,
                        'date': current_date,
                        'summary': summary,
                        'source': 'tieba_scau'
                    }
                    
                    count += 1
                    
                    # 短暂延迟，避免过快抓取
                    await asyncio.sleep(0.05)
                
                except Exception as e:
                    print(f"处理贴吧帖子时出错: {str(e)}")
    
    except Exception as e:
        print(f"贴吧爬虫出错 (async_tieba_scau): {str(e)}")
        yield {
            'error': str(e),
            'source': 'tieba_scau'
        }

# 测试代码
if __name__ == "__main__":
    async def test_tieba_crawlers():
        print("\n测试贴吧爬虫:")
        
        print("\n爬取新广东大学贴吧:")
        count = 0
        async for item in async_get_tieba_news1(5):
            count += 1
            print(f"{count}. {item['title']}")
            print(f"   链接: {item['link']}")
            print(f"   日期: {item['date']}")
            print(f"   摘要: {item['summary'][:100]}...")
    
    # 运行测试
    asyncio.run(test_tieba_crawlers())