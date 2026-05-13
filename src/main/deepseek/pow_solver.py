"""
PoW 计算辅助脚本
通过 stdin 接收参数，计算后输出结果到 stdout
"""
import sys
import json
import os

# 添加 ds.py 所在目录到路径
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

try:
    from ds import DeepSeekChat
except ImportError:
    # 如果从 deepseek 目录运行，需要调整路径
    parent_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', '..', 'ds')
    sys.path.insert(0, os.path.abspath(parent_dir))
    from ds import DeepSeekChat


def main():
    try:
        # 从 stdin 读取输入
        input_data = sys.stdin.read()
        params = json.loads(input_data)

        algorithm = params.get('algorithm')
        challenge = params.get('challenge')
        salt = params.get('salt')
        difficulty = params.get('difficulty', 144000)
        expire_at = params.get('expire_at', 1680000000)
        wasm_path = params.get('wasm_path')

        if not all([algorithm, challenge, salt]):
            print(json.dumps({"error": "缺少必需参数"}), file=sys.stderr)
            sys.exit(1)

        # 创建临时客户端（只用于 PoW 计算）
        chat = DeepSeekChat(token="dummy", wasm_path=wasm_path)

        # 计算答案
        answer = chat.compute_pow_answer(algorithm, challenge, salt, difficulty, expire_at)

        if answer is None:
            print(json.dumps({"error": "PoW 计算失败"}), file=sys.stderr)
            sys.exit(1)

        # 输出结果
        result = {"answer": answer}
        print(json.dumps(result))
        sys.exit(0)

    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
