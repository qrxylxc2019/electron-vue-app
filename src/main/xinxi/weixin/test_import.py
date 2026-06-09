# -*- coding: utf-8 -*-
"""
测试RSS模块导入
"""
import sys
import os

# 添加路径
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

try:
    print("开始测试导入...")

    # 测试导入wxarticle
    print("1. 导入 wxarticle...")
    from rss.wxarticle import WXArticleFetcher
    print("   ✓ wxarticle 导入成功")

    # 测试导入wx_service
    print("2. 导入 wx_service...")
    from rss.wx_service import WxService
    print("   ✓ wx_service 导入成功")

    # 测试导入rss_service
    print("3. 导入 rss_service...")
    from rss.rss_service import RssService
    print("   ✓ rss_service 导入成功")

    # 测试创建实例
    print("4. 创建 RssService 实例...")
    service = RssService()
    print("   ✓ RssService 实例创建成功")

    print("\n✅ 所有导入测试通过！")

except Exception as e:
    print(f"\n❌ 导入失败: {e}")
    import traceback
    traceback.print_exc()
