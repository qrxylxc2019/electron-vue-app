from fastapi import APIRouter
from typing import Dict, Any, Optional, List, Callable, AsyncGenerator, Tuple
from pydantic import BaseModel
from app.service.common.index import (
    getData,
    addData,
    deleteData,
    updateData
)
from fastapi.responses import StreamingResponse, JSONResponse
import asyncio
import json
from datetime import datetime
from .pku import async_get_pku_news1, async_get_pku_news2
from .scau import async_get_scau_news1, async_get_scau_news2
from .xmu import async_get_xmu_news1, async_get_xmu_news2
from .tieba import async_get_tieba_news1
from .zhaopin import get_zhaopin_data
from .zengcheng import get_data as get_zengcheng_data
from .job import get_data as get_job_data
from .jiaoyu import get_data as get_jiaoyu_data, get_zsks_data, get_jyfw_data
from .rss import get_rss_data, RSSFeedParser
from .cnblogs import async_get_cnblogs_news

# 爬虫任务状态
crawler_status = {
    "running": False,
    "progress": 0,
    "message": "",
    "total_count": 0
}

#============================Xuexi=============================
# 定义请求模型
class XuexiQueryModel(BaseModel):
    page: Optional[int] = 1
    pageNum: Optional[int] = 10000
    conditions: Optional[Dict[str, Any]] = {}
    orderBy: Optional[Dict[str, Any]] = {"publish_time": "desc"}
    data: Optional[Dict[str, Any]] = None  # 添加data字段,用于addData和updateData

class XuexiAddDataModel(BaseModel):
    Xuexi: str
    content: str

class XuexiDeleteDataModel(BaseModel):
    id: Optional[int] = None

class XuexiUpdateDataModel(BaseModel):
    where: Optional[Dict[str, Any]] = None
    data: Optional[Dict[str, Any]] = None


router = APIRouter()

# 定义爬虫信息结构，便于统一管理
class CrawlerInfo:
    def __init__(self, name: str, func: Callable, source_id: str, progress_start: int, progress_end: int, limit: int = 5):
        self.name = name  # 爬虫名称
        self.func = func  # 爬虫函数
        self.source_id = source_id  # 数据源标识
        self.progress_start = progress_start  # 进度起始值
        self.progress_end = progress_end  # 进度结束值
        self.limit = limit  # 数据限制条数

# 封装执行单个爬虫的函数
async def execute_crawler(crawler: CrawlerInfo, limit: int) -> AsyncGenerator[Tuple[str, dict], None]:
    """
    执行单个爬虫任务并生成SSE格式的结果流
    
    Args:
        crawler: 爬虫信息对象
        limit: 限制返回的数据条数
        
    Yields:
        (event_type, data): 事件类型和数据，用于构建SSE响应
    """
    print(f"开始执行爬虫 - {crawler.name}...")
    count = 0
    
    source_name_map = {
        "pku_news1": "北京大学新闻网",
        "pku_news2": "北京大学教学科研",
        "scau_news1": "华南农业大学新闻",
        "scau_news2": "华南农业大学学术动态",
        "xmu_news1": "厦门大学焦点要闻",
        "xmu_news2": "厦门大学校园动态",
        "xmu_jdyw": "厦门大学焦点要闻",
        "xmu_xydt": "厦门大学校园动态",
        "tieba_scau": "百度贴吧-新广东大学",
        "cnblogs": "博客园",
        "qgsydw": "广东事业单位网招聘",
        "zengcheng": "广州市增城区人社局",
        "job": "国聘网-国企招聘",
        "jiaoyu": "广州市教育局",
        "zsks": "广州市教育局-招生考试",
        "jyfw": "广州市教育局-教育服务",
        "rss": "RSS订阅",
        "cnblogs": "博客园"
    }
    
    # 发送爬虫开始的进度更新
    start_progress = {
        "type": "progress", 
        "value": crawler.progress_start, 
        "message": f"开始爬取{crawler.name}..."
    }
    yield "progress", start_progress
    
    # 执行爬虫函数
    try:
        async for item in crawler.func(limit):
            count += 1
            print(f"获取到{crawler.name} ({count}/{limit}): {item.get('title', '无标题')}")
            
            # 向爬虫数据添加中文来源名称
            if 'source' in item:
                item['source_name'] = source_name_map.get(item['source'], crawler.name)
            
            # 将数据转换为SSE格式
            data = {
                "source": crawler.source_id,
                "source_name": source_name_map.get(crawler.source_id, crawler.name),
                "data": item
            }
            
            # 如果内部数据包含urlName，将其传递到外部数据结构
            if 'urlName' in item:
                data['urlName'] = item['urlName']
                
            yield "data", data
            
            # 每获取3条数据发送一次进度更新
            if count % 3 == 0:
                # 计算当前进度百分比
                progress_range = crawler.progress_end - crawler.progress_start
                current_progress = crawler.progress_start + min(progress_range * count / limit, progress_range * 0.9)
                
                progress_data = {
                    "type": "progress", 
                    "value": current_progress, 
                    "message": f"正在爬取{crawler.name}，已获取 {count} 条数据..."
                }
                yield "progress", progress_data
                
                # 短暂延迟，让前端有时间处理
                await asyncio.sleep(0.1)
                
    except Exception as e:
        print(f"爬取{crawler.name}出错: {str(e)}")
        error_data = {
            "source": "error",
            "data": {"message": f"爬取{crawler.name}错误: {str(e)}"}
        }
        yield "data", error_data
    
    # 发送爬虫完成的进度更新
    end_progress = {
        "type": "progress", 
        "value": crawler.progress_end, 
        "message": f"{crawler.name}爬取完成，共获取 {count} 条数据"
    }
    yield "progress", end_progress

#============================Xuexi=============================

# 后台爬虫任务
async def background_crawler_task():
    """后台异步执行爬虫任务并存储数据到数据库"""
    global crawler_status
    
    crawler_status["running"] = True
    crawler_status["progress"] = 0
    crawler_status["message"] = "开始爬取数据..."
    crawler_status["total_count"] = 0
    
    source_name_map = {
        "pku_news1": "北京大学新闻网",
        "pku_news2": "北京大学教学科研",
        "scau_news1": "华南农业大学新闻",
        "scau_news2": "华南农业大学学术动态",
        "xmu_news1": "厦门大学焦点要闻",
        "xmu_news2": "厦门大学校园动态",
        "tieba_scau": "百度贴吧-新广东大学",
        "qgsydw": "广东事业单位网招聘",
        "zengcheng": "广州市增城区人社局",
        "job": "国聘网-国企招聘",
        "jiaoyu": "广州市教育局",
        "zsks": "广州市教育局-招生考试",
        "jyfw": "广州市教育局-教育服务",
        "rss": "RSS订阅",
        "cnblogs": "博客园"
    }

    try:
        # 定义所有爬虫
        crawlers = [
            CrawlerInfo("北大新闻1", async_get_pku_news1, "pku_news1", 0, 12),
            CrawlerInfo("北大新闻2", async_get_pku_news2, "pku_news2", 12, 24),
            CrawlerInfo("华农新闻", async_get_scau_news1, "scau_news1", 24, 36),
            CrawlerInfo("华农学术动态", async_get_scau_news2, "scau_news2", 36, 48),
            CrawlerInfo("厦大焦点", async_get_xmu_news1, "xmu_news1", 48, 60),
            CrawlerInfo("厦大动态", async_get_xmu_news2, "xmu_news2", 60, 72),
            CrawlerInfo("百度贴吧-新广东", async_get_tieba_news1, "tieba_scau", 72, 84),
            CrawlerInfo("广东事业单位网", get_zhaopin_data, "qgsydw", 84, 90, limit=20),
            CrawlerInfo("增城区人社局", get_zengcheng_data, "zengcheng", 90, 96, limit=10),
            CrawlerInfo("国聘网-国企招聘", get_job_data, "job", 96, 102, limit=200),
            CrawlerInfo("广州市教育局", get_jiaoyu_data, "jiaoyu", 102, 108, limit=10),
            CrawlerInfo("广州市招生考试", get_zsks_data, "zsks", 108, 114, limit=10),
            CrawlerInfo("广州教育服务", get_jyfw_data, "jyfw", 114, 120, limit=10),
        ]

        # 添加RSS源
        rss_parser = RSSFeedParser()
        progress_step = 4
        progress_start_val = 120
        
        for idx, (feed_id, feed_url) in enumerate(rss_parser.popular_feeds.items()):
            feed_progress_start = progress_start_val + (idx * progress_step)
            feed_progress_end = feed_progress_start + progress_step
            
            def create_rss_crawler(feed):
                return lambda limit: get_rss_data(feed, limit)
            
            crawlers.append(
                CrawlerInfo(
                    f"RSS-{feed_id}",
                    create_rss_crawler(feed_id),
                    "rss",
                    feed_progress_start,
                    feed_progress_end,
                    limit=20
                )
            )

        # 添加博客园爬虫（在RSS之后）
        cnblogs_progress_start = progress_start_val + (len(rss_parser.popular_feeds) * progress_step)
        cnblogs_progress_end = cnblogs_progress_start + 6
        crawlers.append(
            CrawlerInfo("博客园", async_get_cnblogs_news, "cnblogs", cnblogs_progress_start, cnblogs_progress_end, limit=20)
        )

        total_crawlers = len(crawlers)
        completed_crawlers = 0
        total_count = 0
        
        # 分批执行爬虫
        batch_size = 5
        for i in range(0, len(crawlers), batch_size):
            batch = crawlers[i:i + batch_size]
            
            for crawler in batch:
                crawler_status["message"] = f"正在爬取 {crawler.name}..."
                
                try:
                    crawler_limit = crawler.limit
                    async for event_type, data in execute_crawler(crawler, crawler_limit):
                        if event_type == "data" and data.get("data") and not data["data"].get("error"):
                            # 存储到数据库
                            item = data["data"]

                            # 提取时间字段（各爬虫可能用 date、published、publish_time 等）
                            time_str = item.get("date") or item.get("published") or item.get("publish_time")

                            # 统一转换为时间戳
                            publish_timestamp = None
                            if time_str:
                                try:
                                    # 尝试多种日期格式解析
                                    if isinstance(time_str, (int, float)):
                                        # 已经是时间戳
                                        publish_timestamp = int(time_str)
                                    else:
                                        # 字符串格式，尝试解析
                                        time_formats = [
                                            '%Y-%m-%d %H:%M:%S',
                                            '%Y-%m-%d %H:%M',
                                            '%Y-%m-%d',
                                            '%Y/%m/%d %H:%M:%S',
                                            '%Y/%m/%d %H:%M',
                                            '%Y/%m/%d',
                                            '%Y年%m月%d日',
                                        ]
                                        parsed_time = None
                                        for fmt in time_formats:
                                            try:
                                                parsed_time = datetime.strptime(time_str.strip(), fmt)
                                                break
                                            except:
                                                continue

                                        if parsed_time:
                                            publish_timestamp = int(parsed_time.timestamp())
                                        else:
                                            # 无法解析，使用当前时间
                                            publish_timestamp = int(datetime.now().timestamp())
                                except Exception as e:
                                    print(f"时间转换错误: {time_str}, {str(e)}")
                                    publish_timestamp = int(datetime.now().timestamp())
                            else:
                                # 没有时间，使用当前时间
                                publish_timestamp = int(datetime.now().timestamp())

                            news_data = {
                                "title": item.get("title", ""),
                                "publish_time": publish_timestamp,
                                "mp_name": source_name_map.get(data.get("source", ""), crawler.name),
                                "url": item.get("link", ""),
                                "article_id": None,  # 学习信息没有 article_id
                                "mp_id": None,  # 学习信息没有 mp_id
                                "pic_url": None,
                                "description": None
                            }

                            try:
                                await addData("xuexi", news_data)
                                total_count += 1
                                crawler_status["total_count"] = total_count
                            except Exception as e:
                                print(f"存储数据失败: {str(e)}")
                                
                except Exception as e:
                    print(f"爬取 {crawler.name} 出错: {str(e)}")
                
                completed_crawlers += 1
                crawler_status["progress"] = int((completed_crawlers / total_crawlers) * 100)
            
            await asyncio.sleep(0.1)
        
        crawler_status["progress"] = 100
        crawler_status["message"] = f"爬取完成，共获取 {total_count} 条数据"
        
    except Exception as e:
        crawler_status["message"] = f"爬取出错: {str(e)}"
        print(f"后台爬虫任务出错: {str(e)}")
    finally:
        crawler_status["running"] = False


@router.post("/api/xuexi/get")
async def api_getData(query: XuexiQueryModel):
    """启动后台爬虫任务"""
    global crawler_status
    
    if crawler_status["running"]:
        return JSONResponse({
            "code": 200,
            "message": "爬虫任务正在运行中",
            "result": {
                "running": True,
                "progress": crawler_status["progress"],
                "status_message": crawler_status["message"]
            }
        })
    
    # 使用 asyncio.create_task 启动后台任务
    asyncio.create_task(background_crawler_task())
    
    return JSONResponse({
        "code": 200,
        "message": "爬虫任务已启动",
        "result": {
            "running": True,
            "progress": 0,
            "status_message": "开始爬取数据..."
        }
    })


@router.get("/api/xuexi/status")
async def api_getStatus():
    """获取爬虫任务状态"""
    global crawler_status
    return JSONResponse({
        "code": 200,
        "message": "获取状态成功",
        "result": {
            "running": crawler_status["running"],
            "progress": crawler_status["progress"],
            "status_message": crawler_status["message"],
            "total_count": crawler_status["total_count"]
        }
    })


@router.post("/api/xuexi/list")
async def api_getList(query: XuexiQueryModel):
    """分页查询xuexi表数据"""
    fuzzy_fields = ["title", "mp_name"]
    return await getData("xuexi", query, fuzzy_fields=fuzzy_fields)

@router.post("/api/xuexi/add")
async def api_addData(query: XuexiAddDataModel):
    data_dict = query.dict()
    return await addData("xuexi", data_dict)

@router.post("/api/xuexi/delete")
async def api_deleteData(query: XuexiDeleteDataModel):
    data_dict = query.dict()
    return await deleteData("xuexi", data_dict)

@router.post("/api/xuexi/update")
async def api_updateData(query: XuexiUpdateDataModel):
    data_dict = query.data if query.data else query.dict()
    return await updateData("xuexi", data_dict)

@router.post("/api/xuexi/clear")
async def api_clearData():
    """清空xuexi表所有数据"""
    try:
        from app.service.common.index import clearTable
        result = await clearTable("xuexi")
        return JSONResponse({
            "code": 200,
            "message": "数据表已清空",
            "result": result
        })
    except Exception as e:
        return JSONResponse({
            "code": 500,
            "message": f"清空数据表失败: {str(e)}",
            "result": None
        })

@router.get("/api/xuexi/zhaopin")
async def get_zhaopin_route(region: str = "广东", keyword: str = "", max_pages: int = 3, limit: int = 20):
    """广东事业单位网招聘信息爬虫"""
    
    # 设置响应头
    headers = {
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
        "X-Accel-Buffering": "no"  # 禁用Nginx缓冲
    }
    
    async def stream_zhaopin_data():
        """转换zhaopin数据为SSE格式"""
        async for data in get_zhaopin_data(limit=limit, region=region, keyword=keyword, max_pages=max_pages):
            # 将字典转换为JSON字符串并格式化为SSE
            data_json = json.dumps(data, ensure_ascii=False)
            yield f"data: {data_json}\n\n"
            
            # 添加心跳保持连接
            if data.get("type") == "source":
                yield ": heartbeat\n\n"
    
    return StreamingResponse(
        stream_zhaopin_data(),
        media_type="text/event-stream",
        headers=headers
    )

@router.get("/api/xuexi/rss")
async def get_rss_route(url: str = "", limit: int = 20):
    """获取RSS订阅源的数据，并以流式方式返回"""
    print(f"请求RSS数据: url={url}, limit={limit}")
    
    async def stream_rss_data():
        """生成流式响应数据"""
        # 发送初始化消息
        yield "event: message\ndata: {\"type\":\"init\",\"message\":\"RSS订阅连接已建立\"}\n\n"
        
        # 发送初始进度更新
        progress_start = {"type": "progress", "value": 0, "message": "开始获取RSS数据..."}
        yield f"data: {json.dumps(progress_start, ensure_ascii=False)}\n\n"
        
        count = 0
        try:
            async for data in get_rss_data(url, limit):
                # 处理错误情况
                if data.get("type") == "error":
                    error_data = {"type": "error", "message": data.get("message", "获取RSS数据出错")}
                    yield f"data: {json.dumps(error_data, ensure_ascii=False)}\n\n"
                    break
                
                # 处理正常数据
                count += 1
                data_json = json.dumps({
                    "source": "rss",
                    "source_name": "RSS订阅",
                    "data": data
                }, ensure_ascii=False)
                
                # 发送数据
                yield f"data: {data_json}\n\n"
                
                # 更新进度
                progress_value = min(10 + (count * 80 / limit), 90)
                progress_data = {
                    "type": "progress", 
                    "value": progress_value, 
                    "message": f"正在获取RSS数据，已获取 {count} 条..."
                }
                yield f"data: {json.dumps(progress_data, ensure_ascii=False)}\n\n"
                
                # 心跳保持连接
                if count % 3 == 0:
                    yield ": heartbeat\n\n"
        
        except Exception as e:
            error_message = f"处理RSS数据时出错: {str(e)}"
            print(error_message)
            error_data = {"type": "error", "message": error_message}
            yield f"data: {json.dumps(error_data, ensure_ascii=False)}\n\n"
        
        # 发送完成进度
        final_progress = {
            "type": "progress", 
            "value": 100, 
            "message": f"RSS数据获取完成，共获取 {count} 条数据"
        }
        yield f"data: {json.dumps(final_progress, ensure_ascii=False)}\n\n"
    
    # 返回流式响应
    return StreamingResponse(
        stream_rss_data(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )

@router.get("/api/xuexi/zsks")
async def get_zsks_route(limit: int = 20):
    """获取广州市教育局招生考试信息的数据，并以流式方式返回"""
    print(f"请求招生考试数据: limit={limit}")
    
    async def stream_zsks_data():
        """生成流式响应数据"""
        # 发送初始化消息
        yield "event: message\ndata: {\"type\":\"init\",\"message\":\"招生考试数据连接已建立\"}\n\n"
        
        # 发送初始进度更新
        progress_start = {"type": "progress", "value": 0, "message": "开始获取招生考试数据..."}
        yield f"data: {json.dumps(progress_start, ensure_ascii=False)}\n\n"
        
        count = 0
        try:
            async for data in get_zsks_data(limit):
                # 处理错误情况
                if data.get("type") == "error":
                    error_data = {"type": "error", "message": data.get("message", "获取招生考试数据出错")}
                    yield f"data: {json.dumps(error_data, ensure_ascii=False)}\n\n"
                    break
                
                # 处理正常数据
                count += 1
                data_json = json.dumps({
                    "source": "zsks",
                    "source_name": "广州市教育局-招生考试",
                    "data": data
                }, ensure_ascii=False)
                
                # 发送数据
                yield f"data: {data_json}\n\n"
                
                # 更新进度
                progress_value = min(10 + (count * 80 / limit), 90)
                progress_data = {
                    "type": "progress", 
                    "value": progress_value, 
                    "message": f"正在获取招生考试数据，已获取 {count} 条..."
                }
                yield f"data: {json.dumps(progress_data, ensure_ascii=False)}\n\n"
                
                # 心跳保持连接
                if count % 3 == 0:
                    yield ": heartbeat\n\n"
        
        except Exception as e:
            error_message = f"处理招生考试数据时出错: {str(e)}"
            print(error_message)
            error_data = {"type": "error", "message": error_message}
            yield f"data: {json.dumps(error_data, ensure_ascii=False)}\n\n"
        
        # 发送完成进度
        final_progress = {
            "type": "progress", 
            "value": 100, 
            "message": f"招生考试数据获取完成，共获取 {count} 条数据"
        }
        yield f"data: {json.dumps(final_progress, ensure_ascii=False)}\n\n"
    
    # 返回流式响应
    return StreamingResponse(
        stream_zsks_data(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )

@router.get("/api/xuexi/jyfw")
async def get_jyfw_route(limit: int = 20):
    """获取广州市教育局教育服务信息的数据，并以流式方式返回"""
    print(f"请求教育服务数据: limit={limit}")
    
    async def stream_jyfw_data():
        """生成流式响应数据"""
        # 发送初始化消息
        yield "event: message\ndata: {\"type\":\"init\",\"message\":\"教育服务数据连接已建立\"}\n\n"
        
        # 发送初始进度更新
        progress_start = {"type": "progress", "value": 0, "message": "开始获取教育服务数据..."}
        yield f"data: {json.dumps(progress_start, ensure_ascii=False)}\n\n"
        
        count = 0
        try:
            async for data in get_jyfw_data(limit):
                # 处理错误情况
                if data.get("type") == "error":
                    error_data = {"type": "error", "message": data.get("message", "获取教育服务数据出错")}
                    yield f"data: {json.dumps(error_data, ensure_ascii=False)}\n\n"
                    break
                
                # 处理正常数据
                count += 1
                data_json = json.dumps({
                    "source": "jyfw",
                    "source_name": "广州市教育局-教育服务",
                    "data": data
                }, ensure_ascii=False)
                
                # 发送数据
                yield f"data: {data_json}\n\n"
                
                # 更新进度
                progress_value = min(10 + (count * 80 / limit), 90)
                progress_data = {
                    "type": "progress", 
                    "value": progress_value, 
                    "message": f"正在获取教育服务数据，已获取 {count} 条..."
                }
                yield f"data: {json.dumps(progress_data, ensure_ascii=False)}\n\n"
                
                # 心跳保持连接
                if count % 3 == 0:
                    yield ": heartbeat\n\n"
        
        except Exception as e:
            error_message = f"处理教育服务数据时出错: {str(e)}"
            print(error_message)
            error_data = {"type": "error", "message": error_message}
            yield f"data: {json.dumps(error_data, ensure_ascii=False)}\n\n"
        
        # 发送完成进度
        final_progress = {
            "type": "progress", 
            "value": 100, 
            "message": f"教育服务数据获取完成，共获取 {count} 条数据"
        }
        yield f"data: {json.dumps(final_progress, ensure_ascii=False)}\n\n"
    
    # 返回流式响应
    return StreamingResponse(
        stream_jyfw_data(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )

@router.get("/api/xuexi/cnblogs")
async def get_cnblogs_route(limit: int = 20):
    """获取博客园文章列表，并以流式方式返回"""
    print(f"请求博客园数据: limit={limit}")

    async def stream_cnblogs_data():
        """生成流式响应数据"""
        # 发送初始化消息
        yield "event: message\ndata: {\"type\":\"init\",\"message\":\"博客园连接已建立\"}\n\n"

        # 发送初始进度更新
        progress_start = {"type": "progress", "value": 0, "message": "开始获取博客园数据..."}
        yield f"data: {json.dumps(progress_start, ensure_ascii=False)}\n\n"

        count = 0
        try:
            async for data in async_get_cnblogs_news(limit):
                # 处理错误情况
                if data.get("type") == "error" or data.get("error"):
                    error_data = {"type": "error", "message": data.get("message") or data.get("error", "获取博客园数据出错")}
                    yield f"data: {json.dumps(error_data, ensure_ascii=False)}\n\n"
                    break

                # 处理正常数据
                count += 1
                data_json = json.dumps({
                    "source": "cnblogs",
                    "source_name": "博客园",
                    "data": data
                }, ensure_ascii=False)

                # 发送数据
                yield f"data: {data_json}\n\n"

                # 更新进度
                progress_value = min(10 + (count * 80 / limit), 90)
                progress_data = {
                    "type": "progress",
                    "value": progress_value,
                    "message": f"正在获取博客园数据，已获取 {count} 条..."
                }
                yield f"data: {json.dumps(progress_data, ensure_ascii=False)}\n\n"

                # 心跳保持连接
                if count % 3 == 0:
                    yield ": heartbeat\n\n"

        except Exception as e:
            error_message = f"处理博客园数据时出错: {str(e)}"
            print(error_message)
            error_data = {"type": "error", "message": error_message}
            yield f"data: {json.dumps(error_data, ensure_ascii=False)}\n\n"

        # 发送完成进度
        final_progress = {
            "type": "progress",
            "value": 100,
            "message": f"博客园数据获取完成，共获取 {count} 条数据"
        }
        yield f"data: {json.dumps(final_progress, ensure_ascii=False)}\n\n"

    # 返回流式响应
    return StreamingResponse(
        stream_cnblogs_data(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )

