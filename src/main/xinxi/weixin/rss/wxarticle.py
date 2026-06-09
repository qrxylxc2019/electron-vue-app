# -*- coding: utf-8 -*-
"""
微信公众号文章获取器 - 简化版
不需要登录，直接通过URL获取文章信息
"""
import requests
import re
import base64
from typing import Dict
from bs4 import BeautifulSoup
from datetime import datetime

class WXArticleFetcher:
    """微信公众号文章获取器"""

    def __init__(self):
        self.headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
            'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'none',
            'Sec-Fetch-User': '?1',
            'Cache-Control': 'max-age=0'
        }
        self.session = requests.Session()
        self.session.headers.update(self.headers)

    def extract_id_from_url(self, url: str) -> str:
        """从微信文章URL中提取ID"""
        try:
            match = re.search(r'/s/([A-Za-z0-9_-]+)', url)
            if not match:
                return ""

            id_str = match.group(1)

            # 添加必要的填充
            padding = 4 - len(id_str) % 4
            if padding != 4:
                id_str += '=' * padding

            try:
                id_number = base64.b64decode(id_str).decode("utf-8")
                return id_number
            except:
                return id_str
        except Exception as e:
            print(f"提取文章ID失败: {e}")
            return ""

    def extract_biz_from_url(self, url: str) -> str:
        """从URL中提取biz参数"""
        match = re.search(r'[?&]__biz=([^&]+)', url)
        if match:
            return match.group(1)
        return ""

    def extract_biz_from_html(self, html: str) -> str:
        """从HTML中提取biz参数"""
        # 优先从 window.biz = '' || 'xxx' 格式提取（处理空字符串的情况）
        biz_match = re.search(r"window\.biz\s*=\s*['\"]?\s*['\"]?\s*\|\|\s*['\"]([^'\"]+)['\"]", html)
        if biz_match:
            biz = biz_match.group(1)
            if biz:
                print(f"[INFO] 从 window.biz (|| 格式) 提取到: {biz}")
                return biz

        # 尝试从 window.biz = 'xxx' 格式提取（直接赋值）
        biz_match = re.search(r"window\.biz\s*=\s*['\"]([^'\"]+)['\"]", html)
        if biz_match:
            biz = biz_match.group(1)
            if biz:
                print(f"[INFO] 从 window.biz 提取到: {biz}")
                return biz

        # 尝试从 var biz = "xxx" 提取
        biz_match = re.search(r'var biz\s*=\s*"([^"]+)"', html)
        if biz_match:
            biz = biz_match.group(1)
            if biz:
                print(f"[INFO] 从 var biz 提取到: {biz}")
                return biz

        # 尝试从 __biz 参数提取
        biz_match = re.search(r'__biz=([^&"\']+)', html)
        if biz_match:
            biz = biz_match.group(1)
            print(f"[INFO] 从 __biz 参数提取到: {biz}")
            return biz

        print("[WARN] 未能从 HTML 中提取到 biz")
        return ""

    def convert_publish_time_to_timestamp(self, publish_time_str: str) -> int:
        """将发布时间字符串转换为时间戳"""
        try:
            formats = [
                "%Y-%m-%d %H:%M:%S",
                "%Y年%m月%d日 %H:%M",
                "%Y-%m-%d %H:%M",
                "%Y-%m-%d",
                "%Y年%m月%d日",
                "%m月%d日",
            ]

            for fmt in formats:
                try:
                    if fmt == "%m月%d日":
                        current_date = datetime.now()
                        current_year = current_date.year
                        full_time_str = f"{current_year}年{publish_time_str}"
                        dt = datetime.strptime(full_time_str, "%Y年%m月%d日")

                        if dt > current_date:
                            dt = dt.replace(year=current_year - 1)
                    else:
                        dt = datetime.strptime(publish_time_str, fmt)
                    return int(dt.timestamp())
                except ValueError:
                    continue

            return int(datetime.now().timestamp())
        except Exception as e:
            print(f"时间转换失败: {e}")
            return int(datetime.now().timestamp())

    async def async_get_article_content(self, url: str) -> Dict:
        """异步获取文章内容"""
        import asyncio
        from concurrent.futures import ThreadPoolExecutor

        loop = asyncio.get_running_loop()
        with ThreadPoolExecutor() as pool:
            future = loop.run_in_executor(pool, self.get_article_content, url)
        return await future

    def get_article_content(self, url: str) -> Dict:
        """获取单篇文章详细内容"""
        info = {
            "id": self.extract_id_from_url(url),
            "title": "",
            "publish_time": "",
            "content": "",
            "images": [],
            "author": "",
            "description": "",
            "pic_url": "",
            "mp_info": {
                "mp_name": "",
                "logo": "",
                "biz": "",
                "mp_intro": ""
            }
        }

        try:
            # 优先使用 CORS 代理获取完整 HTML
            html = ""
            try:
                cors_url = f"https://cors.newzone.top:9003/{url}"
                cors_headers = {
                    'Referer': 'https://www.seoipo.com/',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36',
                    'X-Requested-With': 'XMLHttpRequest',
                    'sec-ch-ua': '"Not:A-Brand";v="99", "Google Chrome";v="145", "Chromium";v="145"',
                    'sec-ch-ua-mobile': '?0',
                    'sec-ch-ua-platform': '"Windows"'
                }
                cors_response = requests.get(cors_url, headers=cors_headers, timeout=10)
                if cors_response.status_code == 200:
                    html = cors_response.text
                    print(f"[INFO] CORS 代理获取成功，HTML长度: {len(html)}")
            except Exception as e:
                print(f"[WARN] CORS 代理失败: {e}")

            # 如果 CORS 代理失败或返回内容太短，尝试直连
            if not html or len(html) < 50000:
                print(f"[INFO] CORS 代理返回内容不完整，尝试直连")
                response = self.session.get(url, timeout=10)
                response.raise_for_status()
                html = response.text
                print(f"[INFO] 直连获取文章成功，HTML长度: {len(html)}")

            # 检查是否被重定向或返回验证页面
            if len(html) < 50000:
                print(f"[WARN] HTML 长度异常（{len(html)}），可能被限制访问")

            # 调试：查看关键信息（使用 repr 避免编码问题）
            if 'window.biz' in html:
                biz_pos = html.find('window.biz')
                snippet = html[max(0, biz_pos-50):min(len(html), biz_pos+200)]
                print(f"[DEBUG] window.biz 附近内容: {repr(snippet)}")
            else:
                print("[DEBUG] HTML 中不包含 'window.biz'")

            if 'nick_name' in html:
                nick_name_pos = html.find('nick_name')
                snippet = html[max(0, nick_name_pos-100):min(len(html), nick_name_pos+200)]
                print(f"[DEBUG] nick_name 附近内容: {repr(snippet[:300])}")
            else:
                print("[DEBUG] HTML 中不包含 'nick_name'")

            soup = BeautifulSoup(html, 'html.parser')

            # 检查是否有异常
            body_text = soup.get_text()
            if "当前环境异常" in body_text:
                raise Exception("当前环境异常，完成验证后即可继续访问")
            if "该内容已被发布者删除" in body_text or "The content has been deleted" in body_text:
                info["content"] = "DELETED"
                raise Exception("该内容已被发布者删除")
            if "内容审核中" in body_text:
                info["content"] = "DELETED"
                raise Exception("内容审核中")

            # 提取标题
            title_meta = soup.find('meta', property='og:title')
            if title_meta:
                info["title"] = title_meta.get('content', '')
            else:
                title_tag = soup.find('h1', class_='rich_media_title')
                if title_tag:
                    info["title"] = title_tag.get_text(strip=True)

            # 提取作者
            author_meta = soup.find('meta', property='og:article:author')
            if author_meta:
                info["author"] = author_meta.get('content', '')

            # 提取描述
            desc_meta = soup.find('meta', property='og:description')
            if desc_meta:
                info["description"] = desc_meta.get('content', '')

            # 提取题图
            image_meta = soup.find('meta', property='twitter:image')
            if image_meta:
                info["pic_url"] = image_meta.get('content', '')

            # 提取正文内容
            content_element = soup.find('div', id='js_content')
            if content_element:
                info["content"] = str(content_element)

                # 提取图片
                images = []
                for img in content_element.find_all('img'):
                    img_src = img.get('data-src') or img.get('src')
                    if img_src:
                        images.append(img_src)
                info["images"] = images

                if images and not info["pic_url"]:
                    info["pic_url"] = images[0]

            # 提取发布时间
            try:
                publish_time_element = soup.find('em', id='publish_time')
                if publish_time_element:
                    publish_time_str = publish_time_element.get_text(strip=True)
                    info["publish_time"] = self.convert_publish_time_to_timestamp(publish_time_str)
            except Exception as e:
                print(f"获取发布时间失败: {e}")

            # 提取公众号信息
            try:
                # 公众号名称 - 优先从 nick_name: JsDecode('xxx') 提取（最准确）
                mp_name = ""
                nick_name_match = re.search(r"nick_name:\s*JsDecode\(['\"]([^'\"]+)['\"]\)", html)
                if nick_name_match:
                    mp_name = nick_name_match.group(1)
                    print(f"[INFO] 从 nick_name 获取公众号名称: {mp_name}")
                else:
                    print("[DEBUG] 未找到 nick_name")

                # 如果 nick_name 为空，尝试 class="wx_follow_nickname"
                if not mp_name:
                    wx_follow_nickname = soup.find('div', class_='wx_follow_nickname')
                    if wx_follow_nickname:
                        mp_name = wx_follow_nickname.get_text(strip=True)
                        print(f"[INFO] 从 wx_follow_nickname 获取公众号名称: {mp_name}")
                    else:
                        print("[DEBUG] 未找到 wx_follow_nickname")

                # 如果 wx_follow_nickname 为空，尝试 id="js_name"
                if not mp_name:
                    js_name_element = soup.find('a', id='js_name')
                    if js_name_element:
                        mp_name = js_name_element.get_text(strip=True)
                        print(f"[INFO] 从 js_name 获取公众号名称: {mp_name}")
                    else:
                        print("[DEBUG] 未找到 js_name")

                # 如果还是为空，使用备用方案
                if not mp_name:
                    profile_nickname = soup.find('strong', class_='profile_nickname')
                    if profile_nickname:
                        mp_name = profile_nickname.get_text(strip=True)
                        print(f"[INFO] 从 profile_nickname 获取公众号名称: {mp_name}")
                    elif author_meta:
                        mp_name = author_meta.get('content', '')
                        print(f"[INFO] 从 author_meta 获取公众号名称: {mp_name}")
                    else:
                        print("[DEBUG] 所有公众号名称提取方式都失败")

                info["mp_info"]["mp_name"] = mp_name

                # 公众号头像
                profile_avatar = soup.find('img', class_='profile_avatar')
                if profile_avatar:
                    info["mp_info"]["logo"] = profile_avatar.get('src', '')

                # 公众号简介
                profile_desc = soup.find('p', class_='profile_desc')
                if profile_desc:
                    info["mp_info"]["mp_intro"] = profile_desc.get_text(strip=True)

                # 提取 user_name (gh_xxx) 作为 mp_id
                mp_id = ""
                user_name_match = re.search(r"user_name:\s*JsDecode\(['\"]([^'\"]+)['\"]\)", html)
                if user_name_match:
                    mp_id = user_name_match.group(1)
                    print(f"[INFO] 从 user_name 提取 mp_id: {mp_id}")
                else:
                    print("[DEBUG] 未找到 user_name")
                    # 尝试其他格式
                    user_name_match2 = re.search(r"user_name:\s*xml\s*\?\s*getXmlValue\(['\"]user_name\.DATA['\"]\)\s*:\s*['\"]([^'\"]+)['\"]", html)
                    if user_name_match2:
                        mp_id = user_name_match2.group(1)
                        print(f"[INFO] 从 user_name (备用格式) 提取 mp_id: {mp_id}")

                # 提取biz（用于其他用途）
                biz = self.extract_biz_from_url(url)
                if not biz:
                    biz = self.extract_biz_from_html(html)
                    if biz:
                        print(f"[INFO] 从 HTML 提取 biz: {biz}")
                    else:
                        print("[DEBUG] 未找到 biz")

                info["mp_info"]["biz"] = biz

                # 如果没有从 user_name 获取到 mp_id，尝试从 biz 解码
                if not mp_id and biz:
                    try:
                        decoded_biz = base64.b64decode(biz).decode("utf-8")
                        mp_id = decoded_biz
                        print(f"[INFO] 从 biz 解码得到 mp_id: {mp_id}")
                    except Exception as e:
                        print(f"[WARN] biz 解码失败: {e}")
                        mp_id = biz

                # 设置 mp_id
                if mp_id:
                    info["mp_info"]["mp_id"] = mp_id
                    print(f"[INFO] 最终 mp_id: {mp_id}")
                else:
                    print("[WARN] 未能提取到 mp_id")

            except Exception as e:
                print(f"获取公众号信息失败: {e}")

        except Exception as e:
            # 使用 repr 避免编码问题
            try:
                error_msg = str(e)
                print(f"文章内容获取失败: {error_msg}")
            except UnicodeEncodeError:
                error_msg = repr(e)
                print(f"文章内容获取失败: {error_msg}")

        return info


# 创建全局实例
Web = WXArticleFetcher()
