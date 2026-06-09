#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
独立爬虫脚本，被 Electron 主进程通过 spawn 调用。
直接复用 xinxi/ 目录下的各个爬虫模块，将数据写入 SQLite 数据库的 xinxi 表。
"""

import sys
import os
import json
import sqlite3
import asyncio
from datetime import datetime

# 将当前目录加入路径，以便导入同级模块
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, SCRIPT_DIR)
# 同时加入 xinxi 子目录（因为各个爬虫模块实际在 xinxi/ 下）
sys.path.insert(0, os.path.join(SCRIPT_DIR, 'xinxi'))

# 导入各个爬虫模块
from pku import async_get_pku_news1, async_get_pku_news2
from scau import async_get_scau_news1, async_get_scau_news2
from xmu import async_get_xmu_news1, async_get_xmu_news2
from tieba import async_get_tieba_news1
from zhaopin import get_zhaopin_data
from zengcheng import get_data as get_zengcheng_data
from job import get_data as get_job_data
from jiaoyu import get_data as get_jiaoyu_data, get_zsks_data, get_jyfw_data
from rss import get_rss_data, RSSFeedParser
from cnblogs import async_get_cnblogs_news

# 数据库路径：与主进程保持一致（开发环境 out/data/qingrui.db）
DB_PATH = os.path.join(SCRIPT_DIR, '..', '..', '..', '..', 'out', 'data', 'qingrui.db')

# 如果上面的路径不存在，尝试从环境变量读取
if os.environ.get('ELECTRON_DB_PATH'):
    DB_PATH = os.environ.get('ELECTRON_DB_PATH')


def log(msg):
    """输出日志到 stderr，主进程可以捕获"""
    print(msg, file=sys.stderr, flush=True)


def ensure_table(conn):
    """确保 xinxi 表存在"""
    conn.execute('''
        CREATE TABLE IF NOT EXISTS xinxi (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT,
            publish_time INTEGER,
            mp_name TEXT,
            url TEXT,
            article_id TEXT,
            mp_id TEXT,
            pic_url TEXT,
            description TEXT,
            create_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    conn.commit()


def clear_xinxi(conn):
    """清空 xinxi 表"""
    conn.execute('DELETE FROM xinxi')
    try:
        conn.execute("DELETE FROM sqlite_sequence WHERE name='xinxi'")
    except Exception:
        pass
    conn.commit()


def insert_xinxi(conn, data):
    """插入单条数据到 xinxi 表"""
    cursor = conn.execute('''
        INSERT INTO xinxi (title, publish_time, mp_name, url, article_id, mp_id, pic_url, description)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ''', (
        data.get('title', ''),
        data.get('publish_time'),
        data.get('mp_name', ''),
        data.get('url', ''),
        data.get('article_id'),
        data.get('mp_id'),
        data.get('pic_url'),
        data.get('description')
    ))
    conn.commit()
    return cursor.lastrowid


def print_progress(progress, message):
    """向主进程输出进度信息（主进程通过正则解析）"""
    print(f"进度:{progress}", flush=True)
    print(f"消息:{message}", flush=True)


def print_count(total):
    """输出当前获取总数"""
    print(f"共获取 {total} 条", flush=True)


class CrawlerInfo:
    def __init__(self, name, func, source_id, progress_start, progress_end, limit=5):
        self.name = name
        self.func = func
        self.source_id = source_id
        self.progress_start = progress_start
        self.progress_end = progress_end
        self.limit = limit


async def execute_crawler(crawler: CrawlerInfo, limit: int, conn, source_name_map, total_count_ref):
    """执行单个爬虫并写入数据库"""
    log(f"开始执行爬虫 - {crawler.name}...")
    count = 0

    try:
        async for item in crawler.func(limit):
            if isinstance(item, dict) and item.get('error'):
                log(f"爬虫 {crawler.name} 返回错误: {item.get('error')}")
                continue

            count += 1

            # 提取时间字段
            time_str = item.get('date') or item.get('published') or item.get('publish_time')
            publish_timestamp = None
            if time_str:
                try:
                    if isinstance(time_str, (int, float)):
                        publish_timestamp = int(time_str)
                    else:
                        time_formats = [
                            '%Y-%m-%d %H:%M:%S',
                            '%Y-%m-%d %H:%M',
                            '%Y-%m-%d',
                            '%Y/%m/%d %H:%M:%S',
                            '%Y/%m/%d %H:%M',
                            '%Y/%m/%d',
                            '%Y年%m月%d日',
                        ]
                        parsed_time = None
                        for fmt in time_formats:
                            try:
                                parsed_time = datetime.strptime(str(time_str).strip(), fmt)
                                break
                            except Exception:
                                continue
                        if parsed_time:
                            publish_timestamp = int(parsed_time.timestamp())
                        else:
                            publish_timestamp = int(datetime.now().timestamp())
                except Exception as e:
                    log(f"时间转换错误: {time_str}, {str(e)}")
                    publish_timestamp = int(datetime.now().timestamp())
            else:
                publish_timestamp = int(datetime.now().timestamp())

            news_data = {
                'title': item.get('title', ''),
                'publish_time': publish_timestamp,
                'mp_name': source_name_map.get(crawler.source_id, crawler.name),
                'url': item.get('link', ''),
                'article_id': None,
                'mp_id': None,
                'pic_url': None,
                'description': None
            }

            try:
                insert_xinxi(conn, news_data)
                total_count_ref[0] += 1
                if total_count_ref[0] % 5 == 0:
                    print_count(total_count_ref[0])
            except Exception as e:
                log(f"存储数据失败: {str(e)}")

            # 每3条输出一次进度
            if count % 3 == 0:
                progress_range = crawler.progress_end - crawler.progress_start
                current_progress = crawler.progress_start + min(
                    progress_range * count / limit, progress_range * 0.9
                )
                print_progress(int(current_progress), f"正在爬取{crawler.name}，已获取 {count} 条数据...")

    except Exception as e:
        log(f"爬取 {crawler.name} 出错: {str(e)}")

    log(f"{crawler.name} 爬取完成，共获取 {count} 条数据")
    print_progress(crawler.progress_end, f"{crawler.name}爬取完成，共获取 {count} 条数据")
    return count


async def main():
    log("=" * 50)
    log("爬虫脚本启动")
    log(f"数据库路径: {DB_PATH}")

    # 确保数据库目录存在
    db_dir = os.path.dirname(DB_PATH)
    if not os.path.exists(db_dir):
        os.makedirs(db_dir, exist_ok=True)

    # 连接数据库
    conn = sqlite3.connect(DB_PATH)
    ensure_table(conn)
    clear_xinxi(conn)
    log("已清空旧数据")

    # 来源名称映射
    source_name_map = {
        "pku_news1": "北京大学新闻网",
        "pku_news2": "北京大学教学科研",
        "scau_news1": "华南农业大学新闻",
        "scau_news2": "华南农业大学学术动态",
        "xmu_news1": "厦门大学焦点要闻",
        "xmu_news2": "厦门大学校园动态",
        "tieba_scau": "百度贴吧-新广东大学",
        "qgsydw": "广东事业单位网招聘",
        "zengcheng": "广州市增城区人社局",
        "job": "国聘网-国企招聘",
        "jiaoyu": "广州市教育局",
        "zsks": "广州市教育局-招生考试",
        "jyfw": "广州市教育局-教育服务",
        "rss": "RSS订阅",
        "cnblogs": "博客园"
    }

    # 定义所有爬虫
    crawlers = [
        CrawlerInfo("北大新闻1", async_get_pku_news1, "pku_news1", 0, 12),
        CrawlerInfo("北大新闻2", async_get_pku_news2, "pku_news2", 12, 24),
        CrawlerInfo("华农新闻", async_get_scau_news1, "scau_news1", 24, 36),
        CrawlerInfo("华农学术动态", async_get_scau_news2, "scau_news2", 36, 48),
        CrawlerInfo("厦大焦点", async_get_xmu_news1, "xmu_news1", 48, 60),
        CrawlerInfo("厦大动态", async_get_xmu_news2, "xmu_news2", 60, 72),
        CrawlerInfo("百度贴吧-新广东", async_get_tieba_news1, "tieba_scau", 72, 84),
        CrawlerInfo("广东事业单位网", get_zhaopin_data, "qgsydw", 84, 90, limit=20),
        CrawlerInfo("增城区人社局", get_zengcheng_data, "zengcheng", 90, 96, limit=10),
        CrawlerInfo("国聘网-国企招聘", get_job_data, "job", 96, 102, limit=200),
        CrawlerInfo("广州市教育局", get_jiaoyu_data, "jiaoyu", 102, 108, limit=10),
        CrawlerInfo("广州市招生考试", get_zsks_data, "zsks", 108, 114, limit=10),
        CrawlerInfo("广州教育服务", get_jyfw_data, "jyfw", 114, 120, limit=10),
    ]

    # 添加 RSS 源
    rss_parser = RSSFeedParser()
    progress_step = 4
    progress_start_val = 120

    for idx, (feed_id, feed_url) in enumerate(rss_parser.popular_feeds.items()):
        feed_progress_start = progress_start_val + (idx * progress_step)
        feed_progress_end = feed_progress_start + progress_step

        def create_rss_crawler(feed):
            return lambda limit: get_rss_data(feed, limit)

        crawlers.append(
            CrawlerInfo(
                f"RSS-{feed_id}",
                create_rss_crawler(feed_id),
                "rss",
                feed_progress_start,
                feed_progress_end,
                limit=20
            )
        )

    # 添加博客园爬虫
    cnblogs_progress_start = progress_start_val + (len(rss_parser.popular_feeds) * progress_step)
    cnblogs_progress_end = cnblogs_progress_start + 6
    crawlers.append(
        CrawlerInfo("博客园", async_get_cnblogs_news, "cnblogs", cnblogs_progress_start, cnblogs_progress_end, limit=20)
    )

    total_crawlers = len(crawlers)
    completed_crawlers = 0
    total_count_ref = [0]

    log(f"总共 {total_crawlers} 个爬虫任务")
    print_progress(0, "开始爬取数据...")

    # 分批执行爬虫
    batch_size = 5
    for i in range(0, len(crawlers), batch_size):
        batch = crawlers[i:i + batch_size]
        log(f"执行第 {i // batch_size + 1} 批爬虫，共 {len(batch)} 个")

        for crawler in batch:
            print_progress(
                int((completed_crawlers / total_crawlers) * 100),
                f"正在爬取 {crawler.name}..."
            )
            await execute_crawler(crawler, crawler.limit, conn, source_name_map, total_count_ref)
            completed_crawlers += 1

        await asyncio.sleep(0.1)

    # 完成
    print_progress(100, f"爬取完成，共获取 {total_count_ref[0]} 条数据")
    print_count(total_count_ref[0])
    log("爬虫脚本执行完毕")

    conn.close()


if __name__ == '__main__':
    asyncio.run(main())
