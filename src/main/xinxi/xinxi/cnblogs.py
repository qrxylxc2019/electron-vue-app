import asyncio
import aiohttp
from bs4 import BeautifulSoup
from datetime import datetime

async def async_get_cnblogs_news(limit=20):
    """
    爬取博客园首页文章列表

    Args:
        limit: 限制返回的数据条数

    Yields:
        dict: 包含标题、链接、日期、摘要、作者等信息的字典
    """
    try:
        url = "https://www.cnblogs.com"
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }

        async with aiohttp.ClientSession() as session:
            async with session.get(url, headers=headers, timeout=aiohttp.ClientTimeout(total=30)) as response:
                if response.status != 200:
                    print(f"博客园爬虫请求失败，状态码: {response.status}")
                    yield {
                        'error': f'请求失败，状态码: {response.status}',
                        'source': 'cnblogs'
                    }
                    return

                html = await response.text()
                soup = BeautifulSoup(html, 'html.parser')

                # 查找文章列表容器
                post_list = soup.find('div', {'id': 'post_list'})
                if not post_list:
                    print("博客园爬虫未找到文章列表")
                    yield {
                        'error': '未找到文章列表',
                        'source': 'cnblogs'
                    }
                    return

                # 查找所有文章
                articles = post_list.find_all('article', {'class': 'post-item'}, limit=limit)
                print(f"博客园获取到: {len(articles)} 条文章")

                count = 0
                for article in articles:
                    if count >= limit:
                        break

                    try:
                        # 提取标题和链接
                        title_elem = article.find('a', {'class': 'post-item-title'})
                        if not title_elem:
                            continue

                        title = title_elem.get_text(strip=True)
                        link = title_elem.get('href', '')

                        # 提取摘要
                        summary_elem = article.find('p', {'class': 'post-item-summary'})
                        summary = summary_elem.get_text(strip=True) if summary_elem else ''

                        # 提取作者
                        author_elem = article.find('a', {'class': 'post-item-author'})
                        author = author_elem.get_text(strip=True) if author_elem else '未知作者'

                        # 提取发布时间
                        publish_time = ''
                        time_elem = article.find('span', {'class': 'post-meta-item'})
                        if time_elem:
                            time_span = time_elem.find('span')
                            publish_time = time_span.get_text(strip=True) if time_span else ''

                        if not publish_time:
                            continue  # 跳过没有时间的文章

                        # 提取阅读数、评论数、推荐数
                        views = '0'
                        comments = '0'
                        diggs = '0'

                        footer = article.find('footer', {'class': 'post-item-foot'})
                        if footer:
                            # 阅读数
                            views_elem = footer.find('a', title=lambda x: x and '阅读' in x)
                            if views_elem:
                                views_span = views_elem.find('span')
                                views = views_span.get_text(strip=True) if views_span else '0'

                            # 评论数
                            comments_elem = footer.find('a', title=lambda x: x and '评论' in x)
                            if comments_elem:
                                comments_span = comments_elem.find('span')
                                comments = comments_span.get_text(strip=True) if comments_span else '0'

                            # 推荐数
                            diggs_elem = footer.find('span', id=lambda x: x and 'digg_count_' in str(x))
                            if diggs_elem:
                                diggs = diggs_elem.get_text(strip=True)

                        # 构建返回数据
                        yield {
                            'title': title,
                            'link': link,
                            'date': publish_time,
                            'summary': summary,
                            'author': author,
                            'views': views,
                            'comments': comments,
                            'diggs': diggs,
                            'source': 'cnblogs'
                        }

                        count += 1

                        # 短暂延迟，避免过快抓取
                        await asyncio.sleep(0.05)

                    except Exception as e:
                        print(f"处理博客园文章时出错: {str(e)}")
                        continue

    except Exception as e:
        print(f"博客园爬虫出错: {str(e)}")
        yield {
            'error': str(e),
            'source': 'cnblogs'
        }

# 测试代码
if __name__ == "__main__":
    async def test_cnblogs_crawler():
        print("\n测试博客园爬虫:")
        count = 0
        async for item in async_get_cnblogs_news(10):
            if 'error' in item:
                print(f"错误: {item['error']}")
                break
            count += 1
            print(f"{count}. {item['title']}")
            print(f"   作者: {item['author']}")
            print(f"   链接: {item['link']}")
            print(f"   日期: {item['date']}")
            print(f"   阅读: {item['views']} | 评论: {item['comments']} | 推荐: {item['diggs']}")
            print(f"   摘要: {item['summary'][:100]}...")
            print()

    # 运行测试
    asyncio.run(test_cnblogs_crawler())
