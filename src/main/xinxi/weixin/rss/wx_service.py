# -*- coding: utf-8 -*-
"""
微信公众号搜索和文章获取 - 简化版
"""
import requests
import json
import re
from typing import Dict, List, Any
from bs4 import BeautifulSoup

class WxService:
    """微信公众号服务类"""

    def __init__(self, cookie: str = "", token: str = "", user_agent: str = ""):
        """
        初始化

        Args:
            cookie: 微信公众号平台Cookie
            token: 微信公众号平台Token
            user_agent: User-Agent
        """
        self.cookie = cookie
        self.token = token
        self.user_agent = user_agent or "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"

    def search_biz(self, keyword: str = "", limit: int = 5, offset: int = 0) -> Dict:
        """
        通过公众号平台接口搜索公众号

        Args:
            keyword: 搜索关键词
            limit: 返回数量
            offset: 偏移量

        Returns:
            搜索结果字典
        """
        if not self.cookie or not self.token:
            return {"list": [], "total": 0}

        url = "https://mp.weixin.qq.com/cgi-bin/searchbiz"
        params = {
            "action": "search_biz",
            "begin": offset,
            "count": limit,
            "query": keyword,
            "token": self.token,
            "lang": "zh_CN",
            "f": "json",
            "ajax": "1"
        }
        headers = {
            "Cookie": self.cookie,
            "User-Agent": self.user_agent
        }

        try:
            response = requests.get(url, params=params, headers=headers, timeout=10)
            response.raise_for_status()

            data = response.json()

            # 解析publish_page
            if 'publish_page' in data and isinstance(data['publish_page'], str):
                data['publish_page'] = json.loads(data['publish_page'])

            return data
        except Exception as e:
            print(f"搜索公众号失败: {e}")
            return {"list": [], "total": 0}

    def get_articles(self, fakeid: str, begin: int = 0, count: int = 10) -> Dict:
        """
        通过公众号接口获取公众号文章列表

        Args:
            fakeid: 公众号 fakeid (可以是 base64 编码的 biz，也可以是数字 fakeid)
            begin: 起始位置
            count: 获取数量

        Returns:
            文章列表字典
        """
        if not self.cookie or not self.token:
            return {"publish_page": {"publish_list": []}}

        # 使用 appmsgpublish 接口（参考 we-mp-rss 的实现）
        url = "https://mp.weixin.qq.com/cgi-bin/appmsgpublish"
        params = {
            "sub": "list",
            "sub_action": "list_ex",
            "begin": begin,
            "count": count,
            "fakeid": fakeid,
            "token": self.token,
            "lang": "zh_CN",
            "f": "json",
            "ajax": 1
        }

        headers = {
            "Cookie": self.cookie,
            "User-Agent": self.user_agent,
            "Referer": f"https://mp.weixin.qq.com/cgi-bin/appmsg?t=media/appmsg_edit_v2&action=edit&isNew=1&type=10&token={self.token}&lang=zh_CN",
            "X-Requested-With": "XMLHttpRequest",
            "Accept": "application/json, text/javascript, */*; q=0.01",
            "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
            "Accept-Encoding": "gzip, deflate, br"
        }

        try:
            print(f"[DEBUG] 请求 URL: {url}")
            print(f"[DEBUG] 请求参数: {params}")

            # 添加延迟，避免频控
            import time
            time.sleep(2)

            response = requests.get(url, params=params, headers=headers, timeout=10)
            response.raise_for_status()

            data = response.json()

            # 检查是否有错误
            if 'base_resp' in data:
                base_resp = data['base_resp']
                ret = base_resp.get('ret', 0)
                err_msg = base_resp.get('err_msg', '')

                print(f"[DEBUG] 响应状态: base_resp={base_resp}")

                if ret != 0:
                    if ret == 200013:
                        raise Exception(f"频率限制: {err_msg}，请稍后再试（建议等待5-10分钟）")
                    elif ret == -1:
                        raise Exception(f"系统错误: {err_msg}")
                    else:
                        raise Exception(f"接口错误 (ret={ret}): {err_msg}")

            print(f"[DEBUG] 响应数据键: {list(data.keys())}")

            # 解析嵌套的JSON字符串
            if 'publish_page' in data and isinstance(data['publish_page'], str):
                data['publish_page'] = json.loads(data['publish_page'])

            if 'publish_info' in data and isinstance(data['publish_info'], str):
                data['publish_info'] = json.loads(data['publish_info'])

            # 检查返回的数据格式
            if 'publish_page' in data:
                publish_list = data.get('publish_page', {}).get('publish_list', [])
                print(f"[INFO] 获取到 {len(publish_list)} 条发布记录")
            else:
                print(f"[WARN] 未知的响应格式: {data}")

            return data
        except Exception as e:
            print(f"获取文章列表失败: {e}")
            import traceback
            traceback.print_exc()
            return {"publish_page": {"publish_list": []}}

    def extract_article_content(self, url: str) -> str:
        """
        提取文章内容

        Args:
            url: 文章URL

        Returns:
            文章HTML内容
        """
        headers = {
            "Cookie": self.cookie,
            "User-Agent": self.user_agent
        }

        try:
            response = requests.get(url, headers=headers, timeout=10)
            response.raise_for_status()

            soup = BeautifulSoup(response.text, 'html.parser')

            # 找到内容
            js_content_div = soup.find('div', {'id': 'js_content'})
            if not js_content_div:
                return ""

            # 移除style属性
            js_content_div.attrs.pop('style', None)

            # 处理图片
            img_tags = js_content_div.find_all('img')
            for img_tag in img_tags:
                if 'data-src' in img_tag.attrs:
                    img_tag['src'] = img_tag['data-src']
                    del img_tag['data-src']

                if 'style' in img_tag.attrs:
                    style = img_tag['style']
                    style = re.sub(r'width\s*:\s*\d+\s*px', 'width: 1080px', style)
                    img_tag['style'] = style

            return js_content_div.prettify()
        except Exception as e:
            print(f"提取文章内容失败: {e}")
            return ""


# 创建全局实例（可选配置）
wx_service = WxService()


def search_Biz(keyword: str = "", limit: int = 5, offset: int = 0) -> Dict:
    """搜索公众号的便捷函数"""
    return wx_service.search_biz(keyword, limit, offset)


def get_Articles(fakeid: str, begin: int = 0, count: int = 10) -> Dict:
    """获取文章列表的便捷函数"""
    return wx_service.get_articles(fakeid, begin, count)


def content_extract(url: str) -> str:
    """提取文章内容的便捷函数"""
    return wx_service.extract_article_content(url)
