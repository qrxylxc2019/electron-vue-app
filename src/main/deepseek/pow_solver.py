"""
PoW 计算辅助脚本
通过 stdin 接收参数，计算后输出结果到 stdout

放在 src/main/deepseek 目录下，被 TS client.ts 调用
"""
import sys
import json
import os

# 打印调试信息到 stderr
print(f"[PoW Solver] 工作目录: {os.getcwd()}", file=sys.stderr)
print(f"[PoW Solver] 脚本路径: {os.path.dirname(os.path.abspath(__file__))}", file=sys.stderr)

# 添加当前目录到路径（确保可以导入 ds.py）
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

try:
    from ds import DeepSeekChat
    print("[PoW Solver] 成功导入 ds.py", file=sys.stderr)
except ImportError as e:
    print(json.dumps({"error": f"无法导入 ds.py: {str(e)}"}), file=sys.stderr)
    sys.exit(1)


def main():
    try:
        # 从 stdin 读取输入
        input_data = sys.stdin.read()
        print(f"[PoW Solver] 接收到输入: {len(input_data)} 字节", file=sys.stderr)

        # 打印前 200 个字符用于调试
        print(f"[PoW Solver] 输入前 200 字符: {input_data[:200]}", file=sys.stderr)

        params = json.loads(input_data)

        algorithm = params.get('algorithm')
        challenge = params.get('challenge')
        salt = params.get('salt')
        difficulty = params.get('difficulty', 144000)
        expire_at = params.get('expire_at', 1680000000)

        # 从环境变量获取 wasm_path（避免中文路径通过 stdin JSON 传递时编码损坏）
        wasm_path = os.environ.get('DSPOW_WASM_PATH')
        if not wasm_path:
            # 降级到从 stdin 读取
            wasm_path = params.get('wasm_path')

        print(f"[PoW Solver] 参数: algorithm={algorithm}, challenge={challenge[:20] if challenge else None}..., salt={salt}, difficulty={difficulty}", file=sys.stderr)
        print(f"[PoW Solver] wasm_path (环境变量): {wasm_path}", file=sys.stderr)

        if not all([algorithm, challenge, salt]):
            print(json.dumps({"error": "缺少必需参数"}), file=sys.stderr)
            sys.exit(1)

        # 检查 WASM 文件是否存在
        if wasm_path and not os.path.exists(wasm_path):
            print(f"[PoW Solver] 警告: WASM 文件不存在: {wasm_path}", file=sys.stderr)

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
        print(f"[PoW Solver] 计算完成，答案: {answer}", file=sys.stderr)
        sys.exit(0)

    except json.JSONDecodeError as e:
        print(f"[PoW Solver] JSON 解析错误: {e}", file=sys.stderr)
        print(f"[PoW Solver] 完整输入: {input_data}", file=sys.stderr)
        print(json.dumps({"error": f"JSON 解析失败: {str(e)}"}), file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(f"[PoW Solver] 异常: {e}", file=sys.stderr)
        import traceback
        traceback.print_exc(file=sys.stderr)
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
