# -*- coding: utf-8 -*-
"""
微信公众号授权管理
简化版 - 基于Cookie和Token的授权，使用内存缓存
"""
import os
import time
from typing import Dict, Any

class AuthManager:
    """授权管理器 - 使用内存缓存"""

    def __init__(self):
        self.qrcode_file = "static/wx_qrcode.png"
        # 使用内存存储授权信息
        self._auth_cache = {
            "cookie": "",
            "token": "",
            "user_agent": "",
            "timestamp": 0
        }
        self.ensure_dirs()

    def ensure_dirs(self):
        """确保目录存在"""
        os.makedirs("static", exist_ok=True)

    def get_auth_status(self) -> Dict[str, Any]:
        """
        获取授权状态

        Returns:
            Dict: 授权状态信息
        """
        try:
            # 从内存缓存读取
            if self._auth_cache.get('cookie') and self._auth_cache.get('token'):
                # 检查是否过期（24小时）
                timestamp = self._auth_cache.get('timestamp', 0)
                if time.time() - timestamp < 86400:
                    return {
                        "authorized": True,
                        "cookie": self._auth_cache.get('cookie', ''),
                        "token": self._auth_cache.get('token', ''),
                        "user_agent": self._auth_cache.get('user_agent', ''),
                        "timestamp": timestamp,
                        "expires_in": 86400 - (time.time() - timestamp)
                    }

            return {
                "authorized": False,
                "message": "未授权或授权已过期"
            }
        except Exception as e:
            return {
                "authorized": False,
                "message": f"获取授权状态失败: {str(e)}"
            }

    def save_auth(self, cookie: str, token: str, user_agent: str = "") -> Dict[str, Any]:
        """
        保存授权信息到内存

        Args:
            cookie: Cookie字符串
            token: Token字符串
            user_agent: User-Agent

        Returns:
            Dict: 保存结果
        """
        try:
            # 保存到内存缓存
            self._auth_cache = {
                "cookie": cookie,
                "token": token,
                "user_agent": user_agent or "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                "timestamp": time.time()
            }

            print(f"[OK] 授权信息已保存到内存缓存")
            print(f"   Token: {token[:20]}...")
            print(f"   Cookie长度: {len(cookie)}")

            return {
                "success": True,
                "message": "授权信息保存成功"
            }
        except Exception as e:
            print(f"[ERROR] 保存授权信息失败: {e}")
            return {
                "success": False,
                "message": f"保存授权信息失败: {str(e)}"
            }

    def clear_auth(self) -> Dict[str, Any]:
        """
        清除授权信息

        Returns:
            Dict: 清除结果
        """
        try:
            # 清除内存缓存
            self._auth_cache = {
                "cookie": "",
                "token": "",
                "user_agent": "",
                "timestamp": 0
            }

            # 清除二维码文件
            if os.path.exists(self.qrcode_file):
                os.remove(self.qrcode_file)

            print("[OK] 授权信息已清除")

            return {
                "success": True,
                "message": "授权信息已清除"
            }
        except Exception as e:
            print(f"[ERROR] 清除授权信息失败: {e}")
            return {
                "success": False,
                "message": f"清除授权信息失败: {str(e)}"
            }

    def get_credentials(self) -> Dict[str, str]:
        """
        获取凭证信息

        Returns:
            Dict: 包含cookie、token、user_agent的字典
        """
        return {
            "cookie": self._auth_cache.get("cookie", ""),
            "token": self._auth_cache.get("token", ""),
            "user_agent": self._auth_cache.get("user_agent", "")
        }

    def get_qrcode_url(self) -> str:
        """
        获取二维码URL

        Returns:
            str: 二维码URL
        """
        if os.path.exists(self.qrcode_file):
            return f"/static/wx_qrcode.png?t={int(time.time())}"
        return ""

    def has_qrcode(self) -> bool:
        """
        检查是否有二维码

        Returns:
            bool: 是否存在二维码
        """
        return os.path.exists(self.qrcode_file)


# 创建全局实例
auth_manager = AuthManager()
