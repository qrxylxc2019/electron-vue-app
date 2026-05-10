"""
ModelScope (ModalSpace) API 调用示例
使用 OpenAI 兼容接口调用 ModelScope 推理服务

文档参考: https://modelscope.cn/docs/intro/quickstart
"""

import os
from openai import OpenAI

# ==========================================
# 配置区域 - 请根据你的实际情况修改
# ==========================================

# API Key (ModelScope Token)
# 你有两个可用的 key，任选一个：
# API_KEY = "ms-db794444-d485-4217-8293-b9e97f1b072a"
API_KEY = "ms-9dadd6e0-9d06-4e91-b639-5a7af28da529"

# ModelScope Inference API 的 base_url
# 魔搭社区免费模型推理API地址
BASE_URL = "https://api-inference.modelscope.cn/v1"

# 模型 ID（ModelScope 上的模型名称）
# 示例模型，你可以替换为其他模型
# 可用模型列表可通过 list_models() 获取
# DeepSeek 可用模型: deepseek-ai/DeepSeek-V4-Flash, deepseek-ai/DeepSeek-V3.2, deepseek-ai/DeepSeek-R1-0528 等
MODEL = "deepseek-ai/DeepSeek-R1-0528"

# ==========================================
# 创建 OpenAI 客户端
# ==========================================

client = OpenAI(
    api_key=API_KEY,
    base_url=BASE_URL,
)


def chat_completion(
    messages,
    model=None,
    stream=False,
    temperature=0.7,
    max_tokens=2048,
):
    """
    调用 ModelScope API 进行对话补全

    Args:
        messages: 消息列表，格式为 [{"role": "user", "content": "..."}, ...]
        model: 模型名称，默认使用全局配置的 MODEL
        stream: 是否使用流式输出
        temperature: 采样温度
        max_tokens: 最大生成 token 数

    Returns:
        API 响应结果
    """
    model = model or MODEL

    try:
        response = client.chat.completions.create(
            model=model,
            messages=messages,
            stream=stream,
            temperature=temperature,
            max_tokens=max_tokens,
        )
        return response
    except Exception as e:
        print(f"[错误] API 调用失败: {e}")
        raise


def chat_single(prompt, system_prompt="You are a helpful assistant.", **kwargs):
    """
    单次对话快捷调用（使用流式模式获取完整内容）

    Args:
        prompt: 用户输入的问题
        system_prompt: 系统提示词
        **kwargs: 其他参数传递给 chat_completion

    Returns:
        生成的文本内容
    """
    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": prompt},
    ]
    # ModelScope API 流式输出更稳定，使用流式获取完整内容
    response = chat_completion(messages, stream=True, **kwargs)
    result = []
    for chunk in response:
        if chunk.choices and chunk.choices[0].delta.content:
            result.append(chunk.choices[0].delta.content)
    return "".join(result)


def chat_stream(prompt, system_prompt="You are a helpful assistant.", **kwargs):
    """
    流式对话调用，实时输出结果

    Args:
        prompt: 用户输入的问题
        system_prompt: 系统提示词
        **kwargs: 其他参数传递给 chat_completion

    Yields:
        每个 chunk 的文本内容
    """
    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": prompt},
    ]
    response = chat_completion(messages, stream=True, **kwargs)
    for chunk in response:
        content = chunk.choices[0].delta.content
        if content:
            yield content


def list_models():
    """
    列出当前可用的模型列表
    """
    try:
        models = client.models.list()
        for model in models.data:
            print(f"- {model.id}")
        return models
    except Exception as e:
        print(f"[错误] 获取模型列表失败: {e}")
        raise


# ==========================================
# 主程序入口
# ==========================================

if __name__ == "__main__":
    print("=" * 50)
    print("ModelScope (ModalSpace) API 调用示例")
    print("=" * 50)

    # 示例 1: 单次对话
    print("\n【示例 1】单次对话调用")
    print("-" * 50)
    try:
        result = chat_single("请访问以下链接，获取网页标题。返回格式要求：直接返回一个JSON对象，包含url和title两个字段。链接:  https://github.com/abhigyanpatwari/GitNexus", temperature=0.7)
        print(f"回复: {result}")
    except Exception as e:
        print(f"调用失败: {e}")

    # 示例 2: 流式对话
    print("\n【示例 2】流式对话调用")
    print("-" * 50)
    try:
        print("回复: ", end="", flush=True)
        for text in chat_stream("请用一句话描述人工智能的未来。"):
            print(text, end="", flush=True)
        print()
    except Exception as e:
        print(f"调用失败: {e}")

    print("\n【示例 3】对话调用")
    print("-" * 50)
    try:
        messages = [
            {"role": "system", "content": "你是一个专业的 Python 编程助手。"},
            {"role": "user", "content": "Python 中列表和元组有什么区别？"},
        ]
        print(f"用户: Python 中列表和元组有什么区别？")
        print("助手: ", end="", flush=True)
        response = chat_completion(messages, stream=True)
        for chunk in response:
            if chunk.choices and chunk.choices[0].delta.content:
                print(chunk.choices[0].delta.content, end="", flush=True)
        print()
    except Exception as e:
        print(f"调用失败: {e}")

    # 示例 4: 列出可用模型（如果 API 支持）
    print("\n【示例 4】列出可用模型")
    print("-" * 50)
    try:
        list_models()
    except Exception as e:
        print(f"获取模型列表失败: {e}")

    print("\n" + "=" * 50)
    print("示例运行完毕")
    print("=" * 50)
