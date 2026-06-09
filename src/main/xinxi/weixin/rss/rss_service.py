# -*- coding: utf-8 -*-
"""
微信公众号RSS爬虫服务
完整版 - 复用 we-mp-rss 的核心功能
"""
import json
import base64
import sqlite3
from typing import Dict, Any, List, Optional
from datetime import datetime
from .wxarticle import WXArticleFetcher
from .wx_service import WxService
from app.core.db_config import get_db_path, get_xuexi_db_path

class RssService:
    """微信公众号RSS爬虫服务类"""

    def __init__(self):
        """初始化服务"""
        self.article_fetcher = WXArticleFetcher()
        self.wx_service = WxService()
        self.db_path = get_db_path()
        self.xuexi_db_path = get_xuexi_db_path()
        self._ensure_table_exists()

    def _ensure_table_exists(self):
        """确保 wxaccount 和 xuexi 表存在"""
        # 创建 wxaccount 表（在主数据库）
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        # 创建 wxaccount 表
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS wxaccount (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            mp_name TEXT NOT NULL,
            mp_id TEXT NOT NULL UNIQUE,
            mp_cover TEXT,
            mp_intro TEXT,
            faker_id TEXT,
            status INTEGER DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        ''')

        conn.commit()
        conn.close()

        # 确保 xuexi 表存在（在独立数据库）
        conn_xuexi = sqlite3.connect(self.xuexi_db_path)
        cursor_xuexi = conn_xuexi.cursor()

        cursor_xuexi.execute('''
        CREATE TABLE IF NOT EXISTS xuexi (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            article_id TEXT,
            title TEXT NOT NULL,
            mp_id INTEGER,
            mp_name TEXT,
            publish_time INTEGER,
            pic_url TEXT,
            url TEXT,
            description TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        ''')

        # 创建索引
        cursor_xuexi.execute('CREATE INDEX IF NOT EXISTS idx_xuexi_mp_id ON xuexi(mp_id)')
        cursor_xuexi.execute('CREATE INDEX IF NOT EXISTS idx_xuexi_publish_time ON xuexi(publish_time)')

        conn_xuexi.commit()
        conn_xuexi.close()

    def _get_db_connection(self):
        """获取数据库连接"""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn

    def _get_xuexi_db_connection(self):
        """获取学习数据库连接"""
        conn = sqlite3.connect(self.xuexi_db_path)
        conn.row_factory = sqlite3.Row
        return conn

    def set_wx_credentials(self, cookie: str, token: str, user_agent: str = ""):
        """
        设置微信公众号平台凭证

        Args:
            cookie: 微信公众号平台Cookie
            token: 微信公众号平台Token
            user_agent: User-Agent
        """
        self.wx_service = WxService(cookie, token, user_agent)

    async def parse_article_url(self, url: str) -> Dict[str, Any]:
        """
        通过文章URL解析公众号信息

        Args:
            url: 微信公众号文章链接

        Returns:
            Dict: 公众号信息
        """
        try:
            # 使用 WXArticleFetcher 获取文章信息
            article_info = await self.article_fetcher.async_get_article_content(url)
            try:
                print('article_info = ', article_info)
            except UnicodeEncodeError:
                print('article_info = [包含特殊字符，无法显示]')

            if not article_info or not article_info.get('mp_info'):
                raise Exception("无法从URL中提取公众号信息")

            mp_info = article_info['mp_info']

            # 获取公众号名称和 biz
            mp_name = mp_info.get('mp_name', '').strip()
            biz = mp_info.get('biz', '')

            # 直接使用 biz 作为 mp_id
            mp_id = biz

            if not mp_name and mp_id:
                # 如果没有公众号名称，使用 mp_id 的前8位作为临时名称
                mp_name = f"公众号_{mp_id[:8]}"

            result = {
                'mp_name': mp_name,
                'mp_id': mp_id,  # 直接使用 biz (如 MzU5MTc4NDg5NQ==)
                'mp_cover': mp_info.get('logo', ''),
                'mp_intro': mp_info.get('mp_intro', ''),
                'article_title': article_info.get('title', ''),
                'article_author': article_info.get('author', ''),
            }

            if not result['mp_id']:
                raise Exception("无法从URL中提取公众号ID，请确认链接是否正确")

            return result

        except Exception as e:
            # 安全地处理异常信息，避免编码问题
            try:
                error_msg = str(e)
            except UnicodeEncodeError:
                error_msg = "编码错误，无法显示详细信息"
            raise Exception(f"解析文章URL失败: {error_msg}")

    def search_mp(self, keyword: str, limit: int = 10, offset: int = 0) -> List[Dict[str, Any]]:
        """
        搜索公众号

        Args:
            keyword: 搜索关键词
            limit: 返回数量
            offset: 偏移量

        Returns:
            List[Dict]: 公众号列表
        """
        try:
            result = self.wx_service.search_biz(keyword, limit, offset)

            if result and 'list' in result:
                return result['list']

            return []
        except Exception as e:
            print(f"搜索公众号错误: {str(e)}")
            return []

    def add_subscription(self, mp_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        添加订阅号

        Args:
            mp_data: 公众号数据

        Returns:
            Dict: 添加结果
        """
        try:
            mp_name = mp_data.get("mp_name", "")
            mp_id = mp_data.get("mp_id", "")  # 现在 mp_id 就是 biz (如 MzU5MTc4NDg5NQ==)
            mp_cover = mp_data.get("mp_cover", "")
            mp_intro = mp_data.get("mp_intro", "")

            # 直接使用 mp_id 作为 faker_id（mp_id 现在就是 biz）
            faker_id = mp_id
            print(f"[INFO] 使用 mp_id 作为 faker_id: {faker_id}")

            # 如果没有 mp_id，尝试通过搜索接口获取 fakeid
            if not faker_id and mp_name:
                print(f"[INFO] 通过公众号名称搜索获取 fakeid: {mp_name}")
                search_result = self.wx_service.search_biz(mp_name, limit=5)

                if search_result and 'list' in search_result:
                    biz_list = search_result['list']
                    print(f"[DEBUG] 搜索到 {len(biz_list)} 个结果")

                    # 查找匹配的公众号
                    for biz_item in biz_list:
                        biz_nickname = biz_item.get('nickname', '')
                        biz_fakeid = biz_item.get('fakeid', '')
                        print(f"[DEBUG] 搜索结果: nickname={biz_nickname}, fakeid={biz_fakeid}")

                        if biz_nickname == mp_name:
                            faker_id = str(biz_fakeid)
                            print(f"[INFO] 找到匹配的公众号，fakeid: {faker_id}")
                            break

                    # 如果没有完全匹配，使用第一个结果
                    if not faker_id and biz_list:
                        faker_id = str(biz_list[0].get('fakeid', ''))
                        print(f"[WARN] 未找到完全匹配，使用第一个结果 fakeid: {faker_id}")

            if not faker_id:
                raise Exception("无法获取 fakeid")

            conn = self._get_db_connection()
            cursor = conn.cursor()

            # 检查是否已存在
            cursor.execute("SELECT * FROM wxaccount WHERE mp_id = ?", (mp_id,))
            existing = cursor.fetchone()

            now = datetime.now().isoformat()

            if existing:
                # 更新现有记录
                cursor.execute("""
                    UPDATE wxaccount
                    SET mp_name = ?, mp_cover = ?, mp_intro = ?, faker_id = ?, updated_at = ?
                    WHERE mp_id = ?
                """, (mp_name, mp_cover, mp_intro, faker_id, now, mp_id))
                conn.commit()
                feed_id = existing['id']
            else:
                # 创建新记录
                cursor.execute("""
                    INSERT INTO wxaccount (mp_name, mp_id, mp_cover, mp_intro, faker_id, status, created_at, updated_at)
                    VALUES (?, ?, ?, ?, ?, 1, ?, ?)
                """, (mp_name, mp_id, mp_cover, mp_intro, faker_id, now, now))
                conn.commit()
                feed_id = cursor.lastrowid

            # 获取完整记录
            cursor.execute("SELECT * FROM wxaccount WHERE id = ?", (feed_id,))
            feed = dict(cursor.fetchone())
            conn.close()

            return {
                "id": feed['id'],
                "mp_name": feed['mp_name'],
                "mp_cover": feed['mp_cover'],
                "mp_intro": feed['mp_intro'],
                "status": feed['status'],
                "faker_id": feed['faker_id'],
                "created_at": feed['created_at']
            }
        except Exception as e:
            raise Exception(f"添加订阅失败: {str(e)}")

    def get_subscriptions(self, limit: int = 10, offset: int = 0, keyword: str = "") -> Dict[str, Any]:
        """
        获取订阅列表

        Args:
            limit: 每页数量
            offset: 偏移量
            keyword: 搜索关键词

        Returns:
            Dict: 订阅列表数据
        """
        try:
            conn = self._get_db_connection()
            cursor = conn.cursor()

            # 构建查询
            if keyword:
                count_query = "SELECT COUNT(*) as total FROM wxaccount WHERE mp_name LIKE ?"
                query = "SELECT * FROM wxaccount WHERE mp_name LIKE ? ORDER BY created_at DESC LIMIT ? OFFSET ?"
                params_count = (f"%{keyword}%",)
                params = (f"%{keyword}%", limit, offset)
            else:
                count_query = "SELECT COUNT(*) as total FROM wxaccount"
                query = "SELECT * FROM wxaccount ORDER BY created_at DESC LIMIT ? OFFSET ?"
                params_count = ()
                params = (limit, offset)

            # 获取总数
            cursor.execute(count_query, params_count)
            total = cursor.fetchone()['total']

            # 获取列表
            cursor.execute(query, params)
            items = [dict(row) for row in cursor.fetchall()]

            conn.close()

            return {
                "list": items,
                "total": total,
                "page": {
                    "limit": limit,
                    "offset": offset
                }
            }
        except Exception as e:
            print(f"获取订阅列表错误: {str(e)}")
            return {"list": [], "total": 0, "page": {"limit": limit, "offset": offset}}

    def delete_subscription(self, mp_id: str) -> bool:
        """
        删除订阅

        Args:
            mp_id: 公众号ID

        Returns:
            bool: 是否删除成功
        """
        try:
            conn = self._get_db_connection()
            cursor = conn.cursor()
            cursor.execute("DELETE FROM wxaccount WHERE id = ?", (mp_id,))
            conn.commit()
            conn.close()
            return True
        except Exception as e:
            raise Exception(f"删除订阅失败: {str(e)}")

    def update_subscription(self, sub_id: int, mp_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        编辑订阅号

        Args:
            sub_id: 订阅号数据库ID
            mp_data: 更新数据

        Returns:
            Dict: 更新后的记录
        """
        try:
            conn = self._get_db_connection()
            cursor = conn.cursor()
            now = datetime.now().isoformat()
            cursor.execute("""
                UPDATE wxaccount
                SET mp_name = ?, mp_id = ?, mp_cover = ?, mp_intro = ?, updated_at = ?
                WHERE id = ?
            """, (mp_data.get('mp_name', ''), mp_data.get('mp_id', ''),
                  mp_data.get('mp_cover', ''), mp_data.get('mp_intro', ''), now, sub_id))
            conn.commit()
            cursor.execute("SELECT * FROM wxaccount WHERE id = ?", (sub_id,))
            row = cursor.fetchone()
            conn.close()
            if not row:
                raise Exception("订阅号不存在")
            return dict(row)
        except Exception as e:
            raise Exception(f"编辑订阅失败: {str(e)}")

    def crawl_articles(self, mp_id: str, page: int = 1, max_articles: int = 0) -> List[Dict[str, Any]]:
        """
        爬取公众号文章

        Args:
            mp_id: 公众号数据库ID
            page: 页码
            max_articles: 最大爬取文章数，0表示不限制

        Returns:
            List[Dict]: 文章列表
        """
        try:
            # 从数据库查找订阅
            conn = self._get_db_connection()
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM wxaccount WHERE id = ?", (mp_id,))
            subscription = cursor.fetchone()
            conn.close()

            if not subscription:
                raise Exception(f"订阅号不存在，查找ID: {mp_id}")

            subscription = dict(subscription)

            # 使用 faker_id（已经是 base64 编码后的）
            faker_id = subscription.get('faker_id')

            if not faker_id:
                raise Exception(f"订阅号缺少 faker_id")

            print(f"[INFO] 使用 faker_id 爬取: {faker_id}")

            # 如果有限制，使用限制数量作为count（微信接口最大10）
            fetch_count = min(max_articles, 10) if max_articles > 0 else 10
            begin = (page - 1) * fetch_count
            result = self.wx_service.get_articles(faker_id, begin=begin, count=fetch_count)

            articles = []
            if result and 'publish_page' in result:
                publish_list = result['publish_page'].get('publish_list', [])

                for item in publish_list:
                    # 达到限制则停止
                    if max_articles > 0 and len(articles) >= max_articles:
                        break

                    try:
                        publish_info = item.get('publish_info', {})
                        if isinstance(publish_info, str):
                            publish_info = json.loads(publish_info)

                        appmsgex = publish_info.get('appmsgex', [])
                        if not appmsgex:
                            continue

                        for article_data in appmsgex:
                            # 达到限制则停止
                            if max_articles > 0 and len(articles) >= max_articles:
                                break

                            article_id = f"{mp_id}-{article_data.get('aid', '')}"
                            article = {
                                "article_id": article_id,
                                "title": article_data.get('title', ''),
                                "mp_id": mp_id,
                                "mp_name": subscription['mp_name'],
                                "publish_time": article_data.get('update_time', 0),
                                "pic_url": article_data.get('cover', ''),
                                "url": article_data.get('link', ''),
                                "description": article_data.get('digest', ''),
                            }

                            # 保存到数据库
                            try:
                                conn_article = self._get_xuexi_db_connection()
                                cursor_article = conn_article.cursor()

                                # 检查是否已存在
                                cursor_article.execute("SELECT id FROM xuexi WHERE article_id = ?", (article_id,))
                                existing = cursor_article.fetchone()

                                if not existing:
                                    cursor_article.execute("""
                                        INSERT INTO xuexi (article_id, title, mp_id, mp_name, publish_time, pic_url, url, description)
                                        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                                    """, (article_id, article['title'], article['mp_id'], article['mp_name'],
                                          article['publish_time'], article['pic_url'], article['url'], article['description']))
                                    conn_article.commit()
                                    print(f"[OK] 文章已保存到数据库: {article['title']}")
                                else:
                                    print(f"[SKIP] 文章已存在，跳过: {article['title']}")

                                conn_article.close()
                            except Exception as e:
                                print(f"[ERROR] 保存文章到数据库失败: {e}")
                                import traceback
                                traceback.print_exc()

                            articles.append(article)

                    except Exception as e:
                        print(f"解析文章失败: {e}")
                        continue

            return articles

        except Exception as e:
            raise Exception(f"爬取文章失败: {str(e)}")


    def get_articles(self, mp_id: str = None, limit: int = 10, offset: int = 0) -> Dict[str, Any]:
        """
        从数据库获取文章列表

        Args:
            mp_id: 公众号ID，为空则获取所有
            limit: 每页数量
            offset: 偏移量

        Returns:
            Dict: 文章列表数据
        """
        try:
            conn = self._get_xuexi_db_connection()
            cursor = conn.cursor()

            # 构建查询
            if mp_id:
                count_query = "SELECT COUNT(*) as total FROM xuexi WHERE mp_id = ?"
                query = "SELECT * FROM xuexi WHERE mp_id = ? ORDER BY publish_time DESC LIMIT ? OFFSET ?"
                params_count = (mp_id,)
                params = (mp_id, limit, offset)
            else:
                count_query = "SELECT COUNT(*) as total FROM xuexi"
                query = "SELECT * FROM xuexi ORDER BY publish_time DESC LIMIT ? OFFSET ?"
                params_count = ()
                params = (limit, offset)

            # 获取总数
            cursor.execute(count_query, params_count)
            total = cursor.fetchone()['total']

            # 获取列表
            cursor.execute(query, params)
            items = [dict(row) for row in cursor.fetchall()]

            conn.close()

            return {
                "list": items,
                "total": total,
                "page": {
                    "limit": limit,
                    "offset": offset
                }
            }
        except Exception as e:
            print(f"获取文章列表错误: {str(e)}")
            return {"list": [], "total": 0, "page": {"limit": limit, "offset": offset}}
    def clear_articles(self) -> int:
        """清空 xuexi 表所有数据"""
        try:
            conn = self._get_xuexi_db_connection()
            cursor = conn.cursor()
            cursor.execute("SELECT COUNT(*) as total FROM xuexi")
            total = cursor.fetchone()['total']
            cursor.execute("DELETE FROM xuexi")
            conn.commit()
            conn.close()
            return total
        except Exception as e:
            raise Exception(f"清空文章失败: {str(e)}")

