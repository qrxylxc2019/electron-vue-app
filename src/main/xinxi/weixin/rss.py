# -*- coding: utf-8 -*-
"""
微信公众号RSS API路由
"""
from fastapi import APIRouter, HTTPException, Body, Query
from typing import Dict, Any, List

# 尝试导入RssService
try:
    from .rss.rss_service import RssService
    rss_service = RssService()
    SERVICE_AVAILABLE = True
except Exception as e:
    print(f"Warning: Failed to import RssService: {e}")
    import traceback
    traceback.print_exc()
    rss_service = None
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
    limit: int = Query(10, ge=1, le=100),
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

@router.post("/crawl/{mp_id}")
async def crawl_articles(
    mp_id: str,
    page: int = Body(1, description="爬取页数")
) -> Dict[str, Any]:
    """
    爬取公众号文章

    Args:
        mp_id: 公众号ID
        page: 爬取页数

    Returns:
        Dict: 爬取结果
    """
    check_service()
    try:
        result = rss_service.crawl_articles(mp_id, page)
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
    keyword: str = Query(..., description="搜索关键词")
) -> Dict[str, Any]:
    """
    搜索公众号

    Args:
        keyword: 搜索关键词

    Returns:
        Dict: 搜索结果
    """
    check_service()
    try:
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
