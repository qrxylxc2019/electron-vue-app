from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional, Dict, Any
from app.service.ds.ds import DeepSeekChat
import json
import re
import logging
import requests

# 配置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter()


def get_ds_client(token: str):
    """根据前端传入 token 获取 DeepSeek 客户端"""
    if not token:
        return None

    try:
        client = DeepSeekChat(token=token)
        if not client.check_token_status():
            logger.warning("DeepSeek Token 无效，请更新 token")
            return None
        return client
    except Exception as e:
        logger.error(f"创建 DeepSeek 客户端失败: {str(e)}")
        return None


def get_fallback_aiapi() -> Optional[Dict[str, Any]]:
    """获取兜底的 AI API 配置（优先使用 deepseek 厂商）"""
    try:
        from app.core.db import get_db_connection
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # 优先查找 deepseek 厂商的可用配置
        cursor.execute(
            "SELECT provider, apikey, url, model FROM aiapi WHERE provider = 'deepseek' AND status = 1 ORDER BY id DESC LIMIT 1"
        )
        row = cursor.fetchone()
        
        # 如果没有 deepseek，查找其他可用配置
        if not row:
            cursor.execute(
                "SELECT provider, apikey, url, model FROM aiapi WHERE status = 1 ORDER BY id DESC LIMIT 1"
            )
            row = cursor.fetchone()
        
        cursor.close()
        conn.close()
        
        if row:
            return {
                "provider": row[0],
                "apikey": row[1],
                "url": row[2] or "https://api.deepseek.com",
                "model": row[3] or "deepseek-chat"
            }
        return None
    except Exception as e:
        logger.error(f"获取兜底 AI API 失败: {str(e)}")
        return None


def fallback_chat(prompt: str, api_config: Dict[str, Any]) -> str:
    """使用兜底 API 进行对话"""
    try:
        headers = {
            "Authorization": f"Bearer {api_config['apikey']}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "model": api_config["model"],
            "messages": [
                {"role": "system", "content": "You are a helpful assistant"},
                {"role": "user", "content": prompt}
            ],
            "stream": False
        }
        
        response = requests.post(
            f"{api_config['url']}/chat/completions",
            headers=headers,
            json=payload,
            timeout=60
        )
        
        if response.status_code == 200:
            data = response.json()
            return data["choices"][0]["message"]["content"]
        else:
            logger.error(f"兜底 API 请求失败: {response.status_code} - {response.text}")
            return None
    except Exception as e:
        logger.error(f"兜底 API 调用失败: {str(e)}")
        return None


def fallback_chat_stream(prompt: str, api_config: Dict[str, Any]):
    """使用兜底 API 进行流式对话"""
    try:
        headers = {
            "Authorization": f"Bearer {api_config['apikey']}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "model": api_config["model"],
            "messages": [
                {"role": "system", "content": "You are a helpful assistant"},
                {"role": "user", "content": prompt}
            ],
            "stream": True
        }
        
        response = requests.post(
            f"{api_config['url']}/chat/completions",
            headers=headers,
            json=payload,
            stream=True,
            timeout=60
        )
        
        if response.status_code == 200:
            for line in response.iter_lines():
                if not line:
                    continue
                line_text = line.decode('utf-8')
                if line_text.startswith("data: "):
                    data_str = line_text[6:]
                    if data_str == "[DONE]":
                        break
                    try:
                        data = json.loads(data_str)
                        delta = data["choices"][0]["delta"]
                        if "content" in delta:
                            yield {"content": delta["content"]}
                    except:
                        continue
        else:
            logger.error(f"兜底 API 流式请求失败: {response.status_code}")
    except Exception as e:
        logger.error(f"兜底 API 流式调用失败: {str(e)}")


class AiChatRequest(BaseModel):
    url: str
    token: str


class AiChatPromptRequest(BaseModel):
    prompt: str
    token: str


class AiAskRequest(BaseModel):
    prompt: str
    token: str


class UpdateTokenRequest(BaseModel):
    token: str


@router.post("/api/ds/updateToken")
async def update_deepseek_token(request: UpdateTokenRequest):
    """
    更新 DeepSeek Token 到数据库
    """
    try:
        from app.service.db.database import get_connection
        conn = get_connection()
        cursor = conn.cursor()
        
        # 检查是否已存在
        cursor.execute("SELECT id FROM token WHERE url = 'chat.deepseek.com' LIMIT 1")
        row = cursor.fetchone()
        
        if row:
            # 更新
            cursor.execute(
                "UPDATE token SET token = %s WHERE url = 'chat.deepseek.com'",
                (request.token,)
            )
        else:
            # 新增
            cursor.execute(
                "INSERT INTO token (url, token) VALUES ('chat.deepseek.com', %s)",
                (request.token,)
            )
        
        conn.commit()
        conn.close()
        
        # 刷新客户端
        
        return {"code": 200, "message": "Token 更新成功", "data": None}
    except Exception as e:
        logger.error(f"更新 Token 失败: {str(e)}")
        return {"code": 500, "message": f"更新失败: {str(e)}", "data": None}


@router.get("/api/ds/checkToken")
async def check_deepseek_token(token: str):
    """
    检查 DeepSeek Token 状态
    """
    try:
        chat = get_ds_client(request.token)
        if chat is None:
            return {"code": 500, "message": "Token 无效或未配置", "data": {"valid": False}}
        
        is_valid = chat.check_token_status()
        return {"code": 200, "message": "Token 有效" if is_valid else "Token 无效", "data": {"valid": is_valid}}
    except Exception as e:
        logger.error(f"检查 Token 失败: {str(e)}")
        return {"code": 500, "message": f"检查失败: {str(e)}", "data": {"valid": False}}


@router.post("/api/ds/solicitAichat")
async def ai_chat(request: AiChatRequest):

    """
    通过 DeepSeek 解析征稿链接，提取标题和截止时间
    返回格式: {content: "", time: "", url: ""}
    """
    try:
        chat = get_ds_client(request.token)
        if chat is None:
            return {"code": 500, "message": "DeepSeek Token 无效，请更新", "data": None}

        prompt = (
            f"请访问以下征稿链接，解析征稿的标题和截止时间。\n"
            f"链接: {request.url}\n\n"
            f"请严格按照以下JSON格式返回，不要返回其他内容：\n"
            f'{{"content":"征稿标题","time":"YYYY-MM-DD","url":"{request.url}"}}\n\n'
            f"注意：\n"
            f"1. content 填写征稿的标题/主题\n"
            f"2. time 填写截止日期，格式为 YYYY-MM-DD\n"
            f"3. url 填写原始链接\n"
            f"4. 只返回JSON，不要有其他文字"
        )

        result = chat.chat(prompt, model="deepseek-chat-search", stream=False)

        if not result:
            return {"code": 500, "message": "AI 解析失败，未获取到结果", "data": None}

        # 尝试从返回内容中提取 JSON
        json_match = re.search(r'\{[^}]+\}', result)
        logger.info(f'解析结果: {json_match}')
        if json_match:
            data = json.loads(json_match.group())
            # 确保包含必要字段
            parsed = {
                "content": data.get("content", ""),
                "time": data.get("time", ""),
                "url": request.url,
            }
            return {"code": 200, "message": "解析成功", "data": parsed}
        else:
            return {"code": 500, "message": "AI 返回格式异常", "data": {"raw": result}}

    except Exception as e:
        logger.error(f"solicitAichat 错误: {str(e)}")
        return {"code": 500, "message": f"解析失败: {str(e)}", "data": None}


@router.post("/api/ds/aiAsk")
async def ai_ask(request: AiAskRequest):
    try:
        chat = get_ds_client(request.token)
        if chat is None:
            return {"code": 500, "message": "DeepSeek Token 无效，请更新", "data": None}
            
        result = chat.chat(request.prompt, model="deepseek-chat-search", stream=False)

        if not result:
            return {"code": 500, "message": "AI 请求失败，未获取到结果", "data": None}

        result = result.replace("FINISHED", "").strip()

        json_match = re.search(r'\{[\s\S]*\}', result)
        if json_match:
            try:
                parsed = json.loads(json_match.group())
                return {"code": 200, "message": "成功", "data": parsed}
            except json.JSONDecodeError:
                return {"code": 200, "message": "成功", "data": result}
        else:
            return {"code": 200, "message": "成功", "data": result}

    except Exception as e:
        logger.error(f"aiAsk 错误: {str(e)}")
        return {"code": 500, "message": f"请求失败: {str(e)}", "data": None}


@router.post("/api/ds/aichat")
async def ai_chat_stream(request: AiChatPromptRequest):
    """
    流式对话接口，传入 prompt，返回流式文本
    如果 DeepSeek Token 无效，自动使用 aiapi 表中的配置兜底
    """
    chat = get_ds_client(request.token)
    
    # Token 无效时尝试使用兜底 API
    if chat is None:
        fallback_config = get_fallback_aiapi()
        if fallback_config:
            logger.info(f"DeepSeek Token 无效，使用兜底 API: {fallback_config['provider']}")
            
            def fallback_generator():
                try:
                    for chunk in fallback_chat_stream(request.prompt, fallback_config):
                        content = chunk.get("content", "")
                        if not content:
                            continue
                        data = json.dumps({"content": content}, ensure_ascii=False)
                        yield f"data: {data}\n\n"
                    yield "data: [DONE]\n\n"
                except Exception as e:
                    logger.error(f"兜底 API 流式错误: {str(e)}")
                    error_data = json.dumps({"error": str(e)}, ensure_ascii=False)
                    yield f"data: {error_data}\n\n"
            
            headers = {
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "X-Accel-Buffering": "no"
            }
            return StreamingResponse(fallback_generator(), media_type="text/event-stream", headers=headers)
        else:
            # 没有兜底配置，返回错误
            def error_generator():
                yield f"data: {json.dumps({'error': 'DeepSeek Token 无效，且未配置兜底 API'}, ensure_ascii=False)}\n\n"
            return StreamingResponse(error_generator(), media_type="text/event-stream")

    def event_generator():
        try:
            for chunk in chat.chat_stream(request.prompt, thinking_enabled=False, search_enabled=False):
                content = chunk.get("content", "")
                if not content:
                    continue
                data = json.dumps({"content": content}, ensure_ascii=False)
                yield f"data: {data}\n\n"
            yield "data: [DONE]\n\n"
        except Exception as e:
            logger.error(f"aichat 流式错误: {str(e)}")
            error_data = json.dumps({"error": str(e)}, ensure_ascii=False)
            yield f"data: {error_data}\n\n"

    headers = {
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
        "X-Accel-Buffering": "no"
    }

    return StreamingResponse(event_generator(), media_type="text/event-stream", headers=headers)

