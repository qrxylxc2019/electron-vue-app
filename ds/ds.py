"""
DeepSeek API 客户端 - Python 实现
参考 deepseek2api 项目逻辑，实现流式对话（包含 PoW 验证）
"""

import requests
import json
import time
import base64
import ctypes
import struct
import os
import logging
from typing import Optional, Generator

# 配置日志
logger = logging.getLogger(__name__)

# WASM 运行时
try:
    from wasmtime import Linker, Module, Store
    WASM_AVAILABLE = True
except ImportError:
    WASM_AVAILABLE = False
    logger.warning("警告: wasmtime 未安装，请运行: pip install wasmtime")


class DeepSeekChat:
    """
    DeepSeek 聊天客户端

    使用 token (从前端传入) 进行认证
    """

    BASE_URL = "https://chat.deepseek.com"

    # WASM 文件路径 - 使用项目中的备份
    WASM_PATH = os.path.join(os.path.dirname(__file__),
                             "..", "src", "main", "deepseek",
                             "sha3_wasm_bg.7b9ca65ddd.wasm")
    
    # 伪装 headers
    FAKE_HEADERS = {
        "Accept": "*/*",
        "Accept-Encoding": "gzip, deflate, br, zstd",
        "Accept-Language": "zh-CN,zh;q=0.9",
        "Content-Type": "application/json",
        "Origin": "https://chat.deepseek.com",
        "Referer": "https://chat.deepseek.com/",
        "Sec-Ch-Ua": '"Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
        "Sec-Ch-Ua-Mobile": "?0",
        "Sec-Ch-Ua-Platform": '"Windows"',
        "Sec-Fetch-Dest": "empty",
        "Sec-Fetch-Mode": "cors",
        "Sec-Fetch-Site": "same-origin",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        "X-Client-Locale": "zh_CN",
        "X-Client-Platform": "web",
        "X-Client-Version": "1.0.0",
    }
    
    def __init__(self, token: str, wasm_path: str = None):
        """
        初始化客户端

        Args:
            token: 从前端传入的 Bearer token
            wasm_path: WASM 文件路径
        """
        self.session = requests.Session()
        self.session.headers.update(self.FAKE_HEADERS)

        if not token:
            raise ValueError("DeepSeek token 不能为空")

        self.token = token

        self.wasm_path = wasm_path or self.WASM_PATH
        self.session_id = None

        logger.info(f"DeepSeek 客户端初始化，Token: {self.token[:10]}...")
    
    def get_auth_headers(self) -> dict:
        """获取带认证的请求头"""
        return {
            **self.FAKE_HEADERS,
            "Authorization": f"Bearer {self.token}",
        }
    
    def compute_pow_answer(self, algorithm: str, challenge_str: str, salt: str,
                           difficulty: int, expire_at: int) -> Optional[int]:
        """
        使用 WASM 模块计算 PoW 答案
        """
        if not WASM_AVAILABLE:
            raise RuntimeError("wasmtime 未安装")
        
        if algorithm != "DeepSeekHashV1":
            raise ValueError(f"不支持的算法: {algorithm}")
        
        prefix = f"{salt}_{expire_at}_"
        
        # 加载 WASM 模块
        store = Store()
        linker = Linker(store.engine)
        
        try:
            with open(self.wasm_path, "rb") as f:
                wasm_bytes = f.read()
        except Exception as e:
            raise RuntimeError(f"加载 WASM 文件失败: {self.wasm_path}, 错误: {e}")
        
        module = Module(store.engine, wasm_bytes)
        instance = linker.instantiate(store, module)
        exports = instance.exports(store)
        
        memory = exports["memory"]
        add_to_stack = exports["__wbindgen_add_to_stack_pointer"]
        alloc = exports["__wbindgen_export_0"]
        wasm_solve = exports["wasm_solve"]
        
        def write_memory(offset: int, data: bytes):
            base_addr = ctypes.cast(memory.data_ptr(store), ctypes.c_void_p).value
            ctypes.memmove(base_addr + offset, data, len(data))
        
        def read_memory(offset: int, size: int) -> bytes:
            base_addr = ctypes.cast(memory.data_ptr(store), ctypes.c_void_p).value
            return ctypes.string_at(base_addr + offset, size)
        
        def encode_string(text: str):
            data = text.encode("utf-8")
            length = len(data)
            ptr_val = alloc(store, length, 1)
            ptr = int(ptr_val.value) if hasattr(ptr_val, "value") else int(ptr_val)
            write_memory(ptr, data)
            return ptr, length
        
        # 申请栈空间
        retptr = add_to_stack(store, -16)
        
        # 编码字符串
        ptr_challenge, len_challenge = encode_string(challenge_str)
        ptr_prefix, len_prefix = encode_string(prefix)
        
        # 调用 WASM 求解
        wasm_solve(store, retptr, ptr_challenge, len_challenge, 
                   ptr_prefix, len_prefix, float(difficulty))
        
        # 读取结果
        status_bytes = read_memory(retptr, 4)
        status = struct.unpack("<i", status_bytes)[0]
        
        value_bytes = read_memory(retptr + 8, 8)
        value = struct.unpack("<d", value_bytes)[0]
        
        # 恢复栈指针
        add_to_stack(store, 16)
        
        if status == 0:
            return None
        return int(value)
    
    def get_pow_response(self) -> Optional[str]:
        """
        获取 PoW 响应
        """
        try:
            resp = self.session.post(
                f"{self.BASE_URL}/api/v0/chat/create_pow_challenge",
                headers=self.get_auth_headers(),
                json={"target_path": "/api/v0/chat/completion"},
                timeout=30
            )
            
            # 打印响应状态码和内容用于调试
            print(f"PoW 请求状态码: {resp.status_code}")
            
            data = resp.json()
            print(f"PoW 响应数据: {data}")
            
            if resp.status_code == 200 and data.get("code") == 0:
                challenge = data["data"]["biz_data"]["challenge"]
                
                # 计算答案
                answer = self.compute_pow_answer(
                    challenge["algorithm"],
                    challenge["challenge"],
                    challenge["salt"],
                    challenge.get("difficulty", 144000),
                    challenge.get("expire_at", 1680000000)
                )
                
                if answer is None:
                    print("PoW 答案计算失败")
                    return None
                
                # 构建响应
                pow_dict = {
                    "algorithm": challenge["algorithm"],
                    "challenge": challenge["challenge"],
                    "salt": challenge["salt"],
                    "answer": answer,
                    "signature": challenge["signature"],
                    "target_path": challenge["target_path"],
                }
                
                pow_str = json.dumps(pow_dict, separators=(",", ":"), ensure_ascii=False)
                encoded = base64.b64encode(pow_str.encode("utf-8")).decode("utf-8")
                return encoded
            else:
                error_msg = data.get('msg', '未知错误')
                print(f"获取 PoW 失败: {error_msg}")
                print(f"完整响应: {data}")
                return None
                
        except Exception as e:
            print(f"获取 PoW 异常: {e}")
            import traceback
            traceback.print_exc()
            return None
    
    def create_session(self) -> Optional[str]:
        """创建会话"""
        try:
            response = self.session.post(
                f"{self.BASE_URL}/api/v0/chat_session/create",
                headers=self.get_auth_headers(),
                json={"agent": "chat"},
                timeout=15
            )
            
            data = response.json()
            
            if response.status_code == 200 and data.get("code") == 0:
                session_id = data["data"]["biz_data"]["id"]
                self.session_id = session_id
                return session_id
            else:
                print(f"创建会话失败: {data.get('msg', '未知错误')}")
                return None
                
        except Exception as e:
            print(f"创建会话异常: {e}")
            return None
    
    def chat_stream(self, question: str, thinking_enabled: bool = False, 
                    search_enabled: bool = False, max_retries: int = 3) -> Generator[dict, None, None]:
        """
        流式对话
        """
        for retry in range(max_retries):
            try:
                # 创建会话
                session_id = self.create_session()
                if not session_id:
                    raise Exception("创建会话失败")
                
                # 获取 PoW
                pow_resp = self.get_pow_response()
                if not pow_resp:
                    raise Exception("获取 PoW 失败")
                
                # 构建请求
                headers = {
                    **self.get_auth_headers(),
                    "x-ds-pow-response": pow_resp,
                }
                
                payload = {
                    "chat_session_id": session_id,
                    "parent_message_id": None,
                    "prompt": question,
                    "ref_file_ids": [],
                    "thinking_enabled": thinking_enabled,
                    "search_enabled": search_enabled,
                }
                
                response = self.session.post(
                    f"{self.BASE_URL}/api/v0/chat/completion",
                    headers=headers,
                    json=payload,
                    stream=True,
                    timeout=300
                )
                
                if response.status_code != 200:
                    raise Exception(f"请求失败: {response.status_code}")
                
                current_type = "text"
                
                for line in response.iter_lines():
                    if not line:
                        continue
                    
                    line_text = line.decode('utf-8')
                    
                    if not line_text.startswith("data:"):
                        continue
                    
                    data_str = line_text[5:].strip()
                    
                    if data_str == "[DONE]":
                        return
                    
                    try:
                        data = json.loads(data_str)
                        
                        if "v" in data:
                            v_value = data["v"]
                            
                            if data.get("p") == "response/search_status":
                                continue
                            
                            if data.get("p") == "response/thinking_content":
                                current_type = "thinking"
                            elif data.get("p") == "response/content":
                                current_type = "text"
                            
                            if isinstance(v_value, str):
                                yield {"type": current_type, "content": v_value}
                            
                            elif isinstance(v_value, list):
                                for item in v_value:
                                    if item.get("p") == "status" and item.get("v") == "FINISHED":
                                        return
                                        
                    except json.JSONDecodeError:
                        continue
                
                return
                
            except Exception as e:
                print(f"\n请求失败 (尝试 {retry + 1}/{max_retries}): {e}")
                if retry < max_retries - 1:
                    time.sleep(3)
                else:
                    raise

    def chat(self, question: str, model: str = "deepseek-chat", 
             stream: bool = True, max_retries: int = 3) -> Optional[str]:
        """
        发送聊天请求
        
        Args:
            question: 问题内容
            model: 模型名称
            stream: 是否流式输出
            max_retries: 最大重试次数
        """
        model_lower = model.lower()
        if model_lower in ["deepseek-v3", "deepseek-chat"]:
            thinking_enabled = False
            search_enabled = False
        elif model_lower in ["deepseek-r1", "deepseek-reasoner"]:
            thinking_enabled = True
            search_enabled = False
        elif model_lower in ["deepseek-v3-search", "deepseek-chat-search"]:
            thinking_enabled = False
            search_enabled = True
        elif model_lower in ["deepseek-r1-search", "deepseek-reasoner-search"]:
            thinking_enabled = True
            search_enabled = True
        else:
            thinking_enabled = False
            search_enabled = False
        
        full_content = ""
        full_thinking = ""
        
        try:
            for chunk in self.chat_stream(question, thinking_enabled, search_enabled, max_retries):
                content = chunk.get("content", "")
                chunk_type = chunk.get("type", "text")
                
                if chunk_type == "thinking":
                    full_thinking += content
                    if stream and thinking_enabled:
                        print(f"\033[90m{content}\033[0m", end='', flush=True)
                else:
                    full_content += content
                    if stream:
                        print(content, end='', flush=True)
            
            if stream:
                print()
            
            return full_content
            
        except Exception as e:
            print(f"\n聊天失败: {e}")
            return None
    
    def check_token_status(self) -> bool:
        """检查 token 是否有效"""
        try:
            response = self.session.get(
                f"{self.BASE_URL}/api/v0/users/current",
                headers=self.get_auth_headers(),
                timeout=15
            )
            data = response.json()
            return data.get("code") == 0 and bool(data.get("data", {}).get("biz_data"))
        except Exception:
            return False
    
    @staticmethod
    def get_token_instructions():
        """获取 token 的说明"""
        instructions = """
╔══════════════════════════════════════════════════════════════╗
║                    如何获取 Token                             ║
╠══════════════════════════════════════════════════════════════╣
║                                                              ║
║  1. 打开浏览器，访问 https://chat.deepseek.com               ║
║  2. 登录你的账号                                              ║
║  3. 按 F12 打开开发者工具                                     ║
║  4. 切换到 "Network" (网络) 标签                              ║
║  5. 刷新页面或发送一条消息                                    ║
║  6. 找到任意 API 请求，查看请求头中的 Authorization           ║
║  7. 复制 "Bearer " 后面的内容                                 ║
║                                                              ║
║  可用模型:                                                    ║
║  - deepseek-chat: 普通对话                                   ║
║  - deepseek-reasoner: 深度思考 (R1)                          ║
║  - deepseek-chat-search: 联网搜索                            ║
║  - deepseek-reasoner-search: 深度思考 + 联网搜索             ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
        """
        print(instructions)


def main():
    """主函数"""
    print("=" * 60)
    print("DeepSeek API 客户端")
    print("=" * 60)
    
    chat = DeepSeekChat()
    
    print("检查 token 状态...")
    if chat.check_token_status():
        print("✓ Token 有效")
    else:
        print("⚠ Token 可能无效")
        DeepSeekChat.get_token_instructions()
        return
    
    print("\n可用模型: deepseek-chat, deepseek-reasoner")
    model = input("选择模型 (默认 deepseek-chat): ").strip() or "deepseek-chat"
    
    print("\n开始对话 (输入 'quit' 退出)")
    print("=" * 60)
    
    while True:
        question = input("\n你: ").strip()
        
        if not question:
            continue
        
        if question.lower() in ['quit', 'exit', 'q']:
            print("再见!")
            break
        
        print("\nDeepSeek: ", end='')
        chat.chat(question, model=model)


if __name__ == "__main__":
    main()
