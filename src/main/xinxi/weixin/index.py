# -*- coding: utf-8 -*-
"""
微信公众号API服务
"""
import json
import http.client
import urllib.parse
from typing import Dict, Any, Optional

# 微信公众号配置
WECHAT_CONFIG = {
    "appid": "wxd4d0ba25308b05d2",
    "appsecret": "ec651b05ddaed40a4893e743872a6bcf"
}

class WeixinService:
    """微信公众号服务类"""
    
    @staticmethod
    def get_access_token() -> Dict[str, Any]:
        """
        获取微信公众号接口调用凭证
        
        Returns:
            Dict[str, Any]: 包含access_token和expires_in的字典
        """
        conn = http.client.HTTPSConnection("api.weixin.qq.com")
        
        headers = {
            'Accept': "*/*",
            'Accept-Encoding': "gzip, deflate, br",
            'User-Agent': "PostmanRuntime-ApipostRuntime/1.1.0",
            'Connection': "keep-alive"
        }
        
        url_path = f"/cgi-bin/token?grant_type=client_credential&appid={WECHAT_CONFIG['appid']}&secret={WECHAT_CONFIG['appsecret']}"
        
        conn.request("GET", url_path, "", headers)
        
        res = conn.getresponse()
        data = res.read()
        
        conn.close()
        
        # 解析响应数据
        response_data = json.loads(data.decode("utf-8"))
        
        # 检查是否有错误
        if "errcode" in response_data and response_data["errcode"] != 0:
            return {
                "code": response_data.get("errcode", -1),
                "message": response_data.get("errmsg", "获取access_token失败"),
                "success": False
            }
        
        return {
            "code": 200,
            "message": "获取access_token成功",
            "success": True,
            "result": {
                "access_token": response_data.get("access_token", ""),
                "expires_in": response_data.get("expires_in", 7200)
            }
        }
    
    @staticmethod
    def add_draft(access_token: str, articles: list) -> Dict[str, Any]:
        """
        添加草稿
        
        Args:
            access_token (str): 接口调用凭证
            articles (list): 图文素材集合
            
        Returns:
            Dict[str, Any]: 包含media_id的字典
        """
        conn = http.client.HTTPSConnection("api.weixin.qq.com")
        
        headers = {
            'Content-Type': 'application/json',
            'Accept': "*/*",
            'User-Agent': "PostmanRuntime-ApipostRuntime/1.1.0",
            'Connection': "keep-alive"
        }
        
        url_path = f"/cgi-bin/draft/add?access_token={access_token}"
        
        # 构建请求体
        payload = json.dumps({"articles": articles})
        
        conn.request("POST", url_path, payload, headers)
        
        res = conn.getresponse()
        data = res.read()
        
        conn.close()
        
        # 解析响应数据
        response_data = json.loads(data.decode("utf-8"))
        
        # 检查是否有错误
        if "errcode" in response_data and response_data["errcode"] != 0:
            return {
                "code": response_data.get("errcode", -1),
                "message": response_data.get("errmsg", "添加草稿失败"),
                "success": False
            }
        
        return {
            "code": 200,
            "message": "添加草稿成功",
            "success": True,
            "result": {
                "media_id": response_data.get("media_id", "")
            }
        }
    
    @staticmethod
    def get_published_articles(access_token: str, offset: int = 0, count: int = 10, no_content: int = 0) -> Dict[str, Any]:
        """
        获取已发布的消息列表
        
        Args:
            access_token (str): 接口调用凭证
            offset (int): 从全部素材的该偏移位置开始返回，0表示从第一个素材返回
            count (int): 返回素材的数量，取值在1到20之间
            no_content (int): 1表示不返回content字段，0表示正常返回，默认为0
            
        Returns:
            Dict[str, Any]: 包含已发布文章列表的字典
        """
        conn = http.client.HTTPSConnection("api.weixin.qq.com")
        
        headers = {
            'Content-Type': 'application/json',
            'Accept': "*/*",
            'User-Agent': "PostmanRuntime-ApipostRuntime/1.1.0",
            'Connection': "keep-alive"
        }
        
        url_path = f"/cgi-bin/freepublish/batchget?access_token={access_token}"
        
        # 构建请求体
        payload = json.dumps({
            "offset": offset,
            "count": count,
            "no_content": no_content
        })
        
        conn.request("POST", url_path, payload, headers)
        
        res = conn.getresponse()
        data = res.read()
        
        conn.close()
        
        # 解析响应数据
        response_data = json.loads(data.decode("utf-8"))
        print('返回数据========',response_data)
        # 检查是否有错误
        if "errcode" in response_data and response_data["errcode"] != 0:
            return {
                "code": response_data.get("errcode", -1),
                "message": response_data.get("errmsg", "获取已发布文章列表失败"),
                "success": False
            }
        
        return {
            "code": 200,
            "message": "获取已发布文章列表成功",
            "success": True,
            "result": {
                "total_count": response_data.get("total_count", 0),
                "item_count": response_data.get("item_count", 0),
                "items": response_data.get("item", [])
            }
        }

# 对外暴露的API函数
def get_token() -> Dict[str, Any]:
    """
    获取微信公众号接口调用凭证
    
    Returns:
        Dict[str, Any]: 包含access_token和expires_in的字典
    """
    return WeixinService.get_access_token()

def add_draft(access_token: str, articles: list) -> Dict[str, Any]:
    """
    添加草稿
    
    Args:
        access_token (str): 接口调用凭证
        articles (list): 图文素材集合
        
    Returns:
        Dict[str, Any]: 包含media_id的字典
    """
    return WeixinService.add_draft(access_token, articles) 

def get_published_articles(access_token: str, offset: int = 0, count: int = 10, no_content: int = 0) -> Dict[str, Any]:
    """
    获取已发布的消息列表
    
    Args:
        access_token (str): 接口调用凭证
        offset (int): 从全部素材的该偏移位置开始返回，0表示从第一个素材返回
        count (int): 返回素材的数量，取值在1到20之间
        no_content (int): 1表示不返回content字段，0表示正常返回，默认为0
        
    Returns:
        Dict[str, Any]: 包含已发布文章列表的字典
    """
    return WeixinService.get_published_articles(access_token, offset, count, no_content) 