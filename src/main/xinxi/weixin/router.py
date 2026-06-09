# -*- coding: utf-8 -*-
"""
微信公众号API路由
"""
from fastapi import APIRouter, HTTPException, Body
from typing import Dict, Any, List
from . import index as weixin_service

router = APIRouter(
    prefix="/api/weixin",
    tags=["weixin"],
    responses={404: {"description": "Not found"}},
)

# 尝试包含RSS路由
try:
    from .rss_api import router as rss_router
    # 不使用prefix，因为rss_api.py中已经定义了prefix="/rss"
    router.include_router(rss_router)
    print("RSS router loaded successfully")
except Exception as e:
    print(f"Warning: Failed to load RSS router: {e}")
    import traceback
    traceback.print_exc()

@router.get("/token")
async def get_token() -> Dict[str, Any]:
    """
    获取微信公众号接口调用凭证   /api/weixin/token
    
    Returns:
        Dict[str, Any]: 包含access_token和expires_in的字典
    """
    result = weixin_service.get_token()
    if not result.get("success", False):
        raise HTTPException(status_code=400, detail=result.get("message", "获取access_token失败"))
    return result

@router.post("/draft/add")
async def add_draft(
    access_token: str = Body(..., embed=True),
    articles: List[Dict[str, Any]] = Body(..., embed=True)
) -> Dict[str, Any]:
    """
    添加草稿
    
    Args:
        access_token (str): 接口调用凭证
        articles (List[Dict[str, Any]]): 图文素材集合
        
    Returns:
        Dict[str, Any]: 包含media_id的字典
    """
    result = weixin_service.add_draft(access_token, articles)
    if not result.get("success", False):
        raise HTTPException(status_code=400, detail=result.get("message", "添加草稿失败"))
    return result 

@router.post("/freepublish/batchget")
async def get_published_articles(
    access_token: str = Body(..., embed=True),
    offset: int = Body(0, embed=True),
    count: int = Body(10, embed=True),
    no_content: int = Body(0, embed=True)
) -> Dict[str, Any]:
    """
    获取已发布的消息列表   /api/weixin/freepublish/batchget
    
    Args:
        access_token (str): 接口调用凭证
        offset (int): 从全部素材的该偏移位置开始返回，0表示从第一个素材返回
        count (int): 返回素材的数量，取值在1到20之间
        no_content (int): 1表示不返回content字段，0表示正常返回，默认为0
        
    Returns:
        Dict[str, Any]: 包含已发布文章列表的字典
    """
    result = weixin_service.get_published_articles(access_token, offset, count, no_content)
    if not result.get("success", False):
        raise HTTPException(status_code=400, detail=result.get("message", "获取已发布文章列表失败"))
    return result 