# -*- coding: utf-8 -*-
"""
微信公众号RSS爬虫模块
"""
try:
    from .rss_service import RssService
    __all__ = ['RssService']
except Exception as e:
    print(f"Warning: Failed to import RssService: {e}")
    RssService = None
    __all__ = []
