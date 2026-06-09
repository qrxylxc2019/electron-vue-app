# -*- coding: utf-8 -*-
"""
微信公众号RSS API路由
"""
from fastapi import APIRouter, HTTPException, Body, Query
from typing import Dict, Any, List

# 尝试导入RssService和AuthManager
try:
    from .rss.rss_service import RssService
    from .rss.auth_manager import auth_manager
    rss_service = RssService()
    SERVICE_AVAILABLE = True
except Exception as e:
    print(f"Warning: Failed to import RssService: {e}")
    import traceback
    traceback.print_exc()
    rss_service = None
    auth_manager = None
    SERVICE_AVAILABLE = False

router = APIRouter(
    prefix="/rss",
    tags=["weixin-rss"],
    responses={404: {"description": "Not found"}},
)

def check_service():
    """检查服务是否可用"""
    if not SERVICE_AVAILABLE or rss_service is None:
        raise HTTPException(
            status_code=503,
            detail="RSS服务暂时不可用，请检查后端日志"
        )

# ==================== 授权相关API ====================

@router.get("/auth/status")
async def get_auth_status() -> Dict[str, Any]:
    """
    获取授权状态

    Returns:
        Dict: 授权状态信息
    """
    check_service()
    try:
        result = auth_manager.get_auth_status()
        return {
            "code": 200,
            "message": "获取成功",
            "success": True,
            "result": result
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/auth/save")
async def save_auth(
    cookie: str = Body(..., description="Cookie字符串"),
    token: str = Body(..., description="Token字符串"),
    user_agent: str = Body("", description="User-Agent")
) -> Dict[str, Any]:
    """
    保存授权信息

    Args:
        cookie: Cookie字符串
        token: Token字符串
        user_agent: User-Agent

    Returns:
        Dict: 保存结果
    """
    check_service()
    try:
        result = auth_manager.save_auth(cookie, token, user_agent)

        # 更新RssService的凭证
        if result.get('success'):
            rss_service.set_wx_credentials(cookie, token, user_agent)

        return {
            "code": 200,
            "message": "保存成功",
            "success": True,
            "result": result
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/auth/clear")
async def clear_auth() -> Dict[str, Any]:
    """
    清除授权信息

    Returns:
        Dict: 清除结果
    """
    check_service()
    try:
        result = auth_manager.clear_auth()
        return {
            "code": 200,
            "message": "清除成功",
            "success": True,
            "result": result
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/auth/qrcode")
async def get_qrcode() -> Dict[str, Any]:
    """
    获取二维码URL

    Returns:
        Dict: 二维码信息
    """
    check_service()
    try:
        qrcode_url = auth_manager.get_qrcode_url()
        has_qrcode = auth_manager.has_qrcode()

        return {
            "code": 200,
            "message": "获取成功",
            "success": True,
            "result": {
                "qrcode_url": qrcode_url,
                "has_qrcode": has_qrcode
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/parse-article-url")
async def parse_article_url(
    url: str = Body(..., embed=True, description="微信文章URL")
) -> Dict[str, Any]:
    """
    通过文章URL解析公众号信息

    Args:
        url: 微信公众号文章链接

    Returns:
        Dict: 公众号信息
    """
    check_service()
    try:
        result = await rss_service.parse_article_url(url)
        return {
            "code": 200,
            "message": "解析成功",
            "success": True,
            "result": result
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/subscriptions")
async def get_subscriptions(
    limit: int = Query(10, ge=1, le=9999),
    offset: int = Query(0, ge=0),
    keyword: str = Query("", description="搜索关键词")
) -> Dict[str, Any]:
    """
    获取订阅列表

    Args:
        limit: 每页数量
        offset: 偏移量
        keyword: 搜索关键词

    Returns:
        Dict: 订阅列表
    """
    check_service()
    try:
        result = rss_service.get_subscriptions(limit, offset)
        return {
            "code": 200,
            "message": "获取成功",
            "success": True,
            "result": result
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/subscriptions")
async def add_subscription(
    mp_name: str = Body(..., description="公众号名称"),
    mp_id: str = Body(..., description="公众号ID"),
    mp_cover: str = Body("", description="公众号头像"),
    mp_intro: str = Body("", description="公众号简介")
) -> Dict[str, Any]:
    """
    添加订阅

    Args:
        mp_name: 公众号名称
        mp_id: 公众号ID
        mp_cover: 公众号头像
        mp_intro: 公众号简介

    Returns:
        Dict: 添加结果
    """
    check_service()
    try:
        mp_data = {
            "mp_name": mp_name,
            "mp_id": mp_id,
            "mp_cover": mp_cover,
            "mp_intro": mp_intro
        }
        result = rss_service.add_subscription(mp_data)
        return {
            "code": 200,
            "message": "添加成功",
            "success": True,
            "result": result
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/subscriptions/{mp_id}")
async def delete_subscription(mp_id: str) -> Dict[str, Any]:
    """
    删除订阅

    Args:
        mp_id: 公众号ID

    Returns:
        Dict: 删除结果
    """
    check_service()
    try:
        result = rss_service.delete_subscription(mp_id)
        return {
            "code": 200,
            "message": "删除成功",
            "success": True,
            "result": {"deleted": result}
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/subscriptions/{sub_id}")
async def update_subscription(
    sub_id: int,
    mp_name: str = Body(..., description="公众号名称"),
    mp_id: str = Body(..., description="公众号ID"),
    mp_cover: str = Body("", description="公众号头像"),
    mp_intro: str = Body("", description="公众号简介")
) -> Dict[str, Any]:
    """编辑订阅号"""
    check_service()
    try:
        mp_data = {
            "mp_name": mp_name,
            "mp_id": mp_id,
            "mp_cover": mp_cover,
            "mp_intro": mp_intro
        }
        result = rss_service.update_subscription(sub_id, mp_data)
        return {
            "code": 200,
            "message": "编辑成功",
            "success": True,
            "result": result
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/articles")
async def get_articles(
    mp_id: str = Query(None, description="公众号ID"),
    limit: int = Query(10, ge=1, le=100),
    offset: int = Query(0, ge=0)
) -> Dict[str, Any]:
    """
    获取文章列表

    Args:
        mp_id: 公众号ID，为空则获取所有
        limit: 每页数量
        offset: 偏移量

    Returns:
        Dict: 文章列表
    """
    check_service()
    try:
        result = rss_service.get_articles(mp_id, limit, offset)
        return {
            "code": 200,
            "message": "获取成功",
            "success": True,
            "result": result
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/articles")
async def get_articles(
    mp_id: str = Query(None, description="公众号ID"),
    limit: int = Query(10, ge=1, le=100),
    offset: int = Query(0, ge=0)
) -> Dict[str, Any]:
    """
    获取文章列表

    Args:
        mp_id: 公众号ID，为空则获取所有
        limit: 每页数量
        offset: 偏移量

    Returns:
        Dict: 文章列表
    """
    check_service()
    try:
        result = rss_service.get_articles(mp_id, limit, offset)
        return {
            "code": 200,
            "message": "获取成功",
            "success": True,
            "result": result
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/articles/clear")
async def clear_articles() -> Dict[str, Any]:
    """清空 wxarticle 表所有数据"""
    check_service()
    try:
        total = rss_service.clear_articles()
        return {
            "code": 200,
            "message": f"已清空{total}篇文章",
            "success": True,
            "result": {"deleted": total}
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/crawl/{mp_id}")
async def crawl_articles(
    mp_id: str,
    page: int = Body(1, embed=True, description="爬取页数"),
    cookie: str = Body("", embed=True, description="微信Cookie"),
    token: str = Body("", embed=True, description="微信Token"),
    max_articles: int = Body(0, embed=True, description="最大爬取文章数，0表示不限制")
) -> Dict[str, Any]:
    """
    爬取公众号文章

    Args:
        mp_id: 公众号ID
        page: 爬取页数
        cookie: 微信Cookie
        token: 微信Token
        max_articles: 最大爬取文章数，0表示不限制

    Returns:
        Dict: 爬取结果
    """
    check_service()
    try:
        # 如果传递了 cookie 和 token，则设置凭证
        if cookie and token:
            rss_service.set_wx_credentials(cookie, token)

        result = rss_service.crawl_articles(mp_id, page, max_articles)
        return {
            "code": 200,
            "message": "爬取成功",
            "success": True,
            "result": {
                "articles": result,
                "count": len(result)
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/search")
async def search_mp(
    keyword: str = Query(..., description="搜索关键词"),
    cookie: str = Query("", description="微信Cookie"),
    token: str = Query("", description="微信Token")
) -> Dict[str, Any]:
    """
    搜索公众号

    Args:
        keyword: 搜索关键词
        cookie: 微信Cookie
        token: 微信Token

    Returns:
        Dict: 搜索结果
    """
    check_service()
    try:
        # 如果传递了 cookie 和 token，则设置凭证
        if cookie and token:
            rss_service.set_wx_credentials(cookie, token)

        result = rss_service.search_mp(keyword)
        return {
            "code": 200,
            "message": "搜索成功",
            "success": True,
            "result": {
                "list": result,
                "total": len(result)
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
