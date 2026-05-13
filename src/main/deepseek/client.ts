/**
 * DeepSeek 逆向 API 客户端
 * 参考 ds.py 项目逻辑，实现流式对话（包含 PoW 验证）
 *
 * 使用 Python 脚本计算 PoW，避免 WASM 内存操作问题
 */

import path from 'path';
import fs from 'fs';
import { app } from 'electron';
import fetch from 'node-fetch';
import { spawn } from 'child_process';
import type {
  DeepSeekConfig,
  DeepSeekMessage,
  DeepSeekStreamChunk,
  PoWChallenge,
} from './types';

export class DeepSeekClient {
  private token: string;
  private baseUrl: string;
  private wasmPath: string;
  private sessionId: string | null = null;
  private pythonScriptPath: string;

  // 伪装 headers (和 ds.py 完全一致)
  private static FAKE_HEADERS: Record<string, string> = {
    Accept: '*/*',
    'Accept-Encoding': 'gzip, deflate, br, zstd',
    'Accept-Language': 'zh-CN,zh;q=0.9',
    'Content-Type': 'application/json',
    Origin: 'https://chat.deepseek.com',
    Referer: 'https://chat.deepseek.com/',
    'Sec-Ch-Ua': '"Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
    'Sec-Ch-Ua-Mobile': '?0',
    'Sec-Ch-Ua-Platform': '"Windows"',
    'Sec-Fetch-Dest': 'empty',
    'Sec-Fetch-Mode': 'cors',
    'Sec-Fetch-Site': 'same-origin',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    'X-Client-Locale': 'zh_CN',
    'X-Client-Platform': 'web',
    'X-Client-Version': '1.0.0',
  };

  constructor(config: DeepSeekConfig) {
    if (!config.token) {
      throw new Error('DeepSeek token 不能为空');
    }
    this.token = config.token;
    this.baseUrl = config.baseUrl || 'https://chat.deepseek.com';

    // 自动定位 wasm 文件路径
    let wasmPath = config.wasmPath || '';
    if (!wasmPath) {
      const isDev = !app.isPackaged;
      if (isDev) {
        // 开发环境：尝试多个可能的路径
        const possiblePaths = [
          // tsc 编译后的 dist 目录
          path.join(__dirname, 'deepseek', 'sha3_wasm_bg.7b9ca65ddd.wasm'),
          // 源码目录
          path.join(__dirname, '..', '..', 'src', 'main', 'deepseek', 'sha3_wasm_bg.7b9ca65ddd.wasm'),
          // 项目根目录
          path.join(__dirname, '..', '..', '..', 'src', 'main', 'deepseek', 'sha3_wasm_bg.7b9ca65ddd.wasm'),
        ];
        for (const p of possiblePaths) {
          if (fs.existsSync(p)) {
            wasmPath = p;
            break;
          }
        }
        if (!wasmPath) {
          wasmPath = possiblePaths[0];
        }
      } else {
        // 打包后使用 resourcesPath
        wasmPath = path.join(process.resourcesPath, 'deepseek', 'sha3_wasm_bg.7b9ca65ddd.wasm');
      }
    }
    this.wasmPath = wasmPath;

    // 定位 pow_solver.py 脚本路径（在 ds 目录下）
    let pythonScriptPath = '';
    const isDev = !app.isPackaged;
    if (isDev) {
      const possibleScriptPaths = [
        // ds 目录（开发环境，从项目根目录）
        path.join(__dirname, '..', '..', '..', 'ds', 'pow_solver.py'),
        path.join(__dirname, '..', '..', 'ds', 'pow_solver.py'),
        // 源码目录（备用）
        path.join(__dirname, 'pow_solver.py'),
      ];
      for (const p of possibleScriptPaths) {
        if (fs.existsSync(p)) {
          pythonScriptPath = p;
          break;
        }
      }
    } else {
      // 打包后
      pythonScriptPath = path.join(process.resourcesPath, 'ds', 'pow_solver.py');
    }
    this.pythonScriptPath = pythonScriptPath;

    console.log('[DeepSeek] wasmPath:', this.wasmPath);
    console.log('[DeepSeek] wasm exists:', fs.existsSync(this.wasmPath));
    console.log('[DeepSeek] pythonScriptPath:', this.pythonScriptPath);
    console.log('[DeepSeek] python script exists:', fs.existsSync(this.pythonScriptPath));
  }

  private getAuthHeaders(): Record<string, string> {
    return {
      ...DeepSeekClient.FAKE_HEADERS,
      Authorization: `Bearer ${this.token}`,
    };
  }

  /**
   * 使用 Python 脚本计算 PoW 答案
   * 调用 pow_solver.py 脚本，传递参数并获取结果
   */
  private computePowAnswer(
    algorithm: string,
    challengeStr: string,
    salt: string,
    difficulty: number,
    expireAt: number
  ): Promise<number | null> {
    return new Promise((resolve, reject) => {
      if (algorithm !== 'DeepSeekHashV1') {
        reject(new Error(`不支持的算法: ${algorithm}`));
        return;
      }

      // 检查 Python 脚本是否存在
      if (!fs.existsSync(this.pythonScriptPath)) {
        reject(new Error(`Python 脚本不存在: ${this.pythonScriptPath}`));
        return;
      }

      // 检查 ds.py 所在目录
      let dsPyDir = path.dirname(this.pythonScriptPath);
      let dsPyPath = path.join(dsPyDir, 'ds.py');
      if (!fs.existsSync(dsPyPath)) {
        // 尝试其他可能的位置
        const alternativePaths = [
          path.join(__dirname, '..', '..', '..', 'ds', 'ds.py'),
          path.join(__dirname, '..', '..', 'ds', 'ds.py'),
          path.join(__dirname, 'ds.py'),
        ];
        for (const altPath of alternativePaths) {
          if (fs.existsSync(altPath)) {
            dsPyDir = path.dirname(altPath);
            break;
          }
        }
      }

      // 获取 WASM 文件路径
      const wasmPath = this.wasmPath;

      // 构建输入参数（不包含 wasm_path，通过环境变量传递）
      const inputObj = {
        algorithm,
        challenge: challengeStr,
        salt,
        difficulty,
        expire_at: expireAt,
      };

      const input = JSON.stringify(inputObj);

      console.log('[DeepSeek] PoW 计算参数:', JSON.stringify({
        algorithm,
        challenge: challengeStr,
        salt,
        difficulty,
        expire_at: expireAt,
        wasm_path: wasmPath.substring(0, 50) + '...',
      }));
      console.log('[DeepSeek] Python 输入:', input);

      // 调用 Python 脚本
      // 设置工作目录为 ds.py 所在目录
      // 使用环境变量传递 wasm_path（避免中文路径通过 stdin JSON 传递时编码损坏）
      console.log('[DeepSeek] 启动 Python 脚本:', this.pythonScriptPath);
      console.log('[DeepSeek] Python 工作目录:', dsPyDir);
      const pythonProcess = spawn('python', ['-u', this.pythonScriptPath], {
        cwd: dsPyDir,
        stdio: ['pipe', 'pipe', 'pipe'],
        env: {
          ...process.env,
          DSPOW_WASM_PATH: wasmPath,
        },
      });

      let output = '';
      let errorOutput = '';

      pythonProcess.stdout.on('data', (data) => {
        output += data.toString();
      });

      pythonProcess.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });

      pythonProcess.on('close', (code) => {
        if (code !== 0) {
          console.error('[DeepSeek] Python 脚本错误:', errorOutput);
          resolve(null);
          return;
        }

        try {
          const result = JSON.parse(output.trim());
          if (result.error) {
            console.error('[DeepSeek] PoW 计算错误:', result.error);
            resolve(null);
          } else {
            resolve(result.answer);
          }
        } catch (e: any) {
          console.error('[DeepSeek] 解析结果失败:', e.message, '原始输出:', output);
          resolve(null);
        }
      });

      pythonProcess.on('error', (err) => {
        console.error('[DeepSeek] 启动 Python 进程失败:', err.message);
        resolve(null);
      });

      // 发送输入数据
      pythonProcess.stdin?.write(input);
      pythonProcess.stdin?.end();

      // 超时处理（通常 PoW 计算需要几秒到几十秒）
      setTimeout(() => {
        pythonProcess.kill();
        console.error('[DeepSeek] Python 脚本超时');
        resolve(null);
      }, 60000); // 60 秒超时
    });
  }

  /**
   * 获取 PoW 响应
   */
  private async getPowResponse(): Promise<string | null> {
    try {
      const resp = await fetch(`${this.baseUrl}/api/v0/chat/create_pow_challenge`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({ target_path: '/api/v0/chat/completion' }),
      });

      const data = (await resp.json()) as any;

      if (resp.status === 200 && data.code === 0) {
        const challenge: PoWChallenge = data.data.biz_data.challenge;

        const answer = await this.computePowAnswer(
          challenge.algorithm,
          challenge.challenge,
          challenge.salt,
          challenge.difficulty || 144000,
          challenge.expire_at || 1680000000
        );

        if (answer === null) {
          console.error('[DeepSeek] PoW 答案计算失败');
          return null;
        }

        const powDict = {
          algorithm: challenge.algorithm,
          challenge: challenge.challenge,
          salt: challenge.salt,
          answer: answer,
          signature: challenge.signature,
          target_path: challenge.target_path,
        };

        // 和 ds.py 完全一致: json.dumps(pow_dict, separators=(",", ":"), ensure_ascii=False)
        // 保持原始 key 顺序: algorithm, challenge, salt, answer, signature, target_path
        const powEntries = [
          ['algorithm', powDict.algorithm],
          ['challenge', powDict.challenge],
          ['salt', powDict.salt],
          ['answer', powDict.answer],
          ['signature', powDict.signature],
          ['target_path', powDict.target_path],
        ];
        const powStr = '{' + powEntries.map(([k, v]) => {
          const val = typeof v === 'string' ? `"${v}"` : v;
          return `"${k}":${val}`;
        }).join(',') + '}';
        const encoded = Buffer.from(powStr, 'utf-8').toString('base64');
        return encoded;
      } else {
        console.error('[DeepSeek] 获取 PoW 失败:', data.msg || '未知错误');
        return null;
      }
    } catch (e: any) {
      console.error('[DeepSeek] 获取 PoW 异常:', e.message);
      return null;
    }
  }

  /**
   * 创建会话
   */
  private async createSession(): Promise<string | null> {
    try {
      const resp = await fetch(`${this.baseUrl}/api/v0/chat_session/create`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({ agent: 'chat' }),
      });

      const data = (await resp.json()) as any;

      if (resp.status === 200 && data.code === 0) {
        const sessionId = data.data.biz_data.id as string;
        this.sessionId = sessionId;
        return sessionId;
      } else {
        console.error('[DeepSeek] 创建会话失败:', data.msg || '未知错误');
        return null;
      }
    } catch (e: any) {
      console.error('[DeepSeek] 创建会话异常:', e.message);
      return null;
    }
  }

  /**
   * 检查 token 是否有效
   */
  async checkTokenStatus(): Promise<boolean> {
    try {
      const resp = await fetch(`${this.baseUrl}/api/v0/users/current`, {
        method: 'GET',
        headers: this.getAuthHeaders(),
      });
      const data = (await resp.json()) as any;
      return data.code === 0 && !!data.data?.biz_data;
    } catch {
      return false;
    }
  }

  /**
   * 流式对话
   */
  async *chatStream(
    messages: DeepSeekMessage[],
    model: string = 'deepseek-chat',
    maxRetries: number = 3
  ): AsyncGenerator<DeepSeekStreamChunk> {
    // 确定模型特性
    const modelLower = model.toLowerCase();
    let thinkingEnabled = false;
    let searchEnabled = false;

    if (modelLower.includes('r1') || modelLower.includes('reasoner')) {
      thinkingEnabled = true;
    }
    if (modelLower.includes('search')) {
      searchEnabled = true;
    }

    // 构造 prompt（多轮对话合并）
    const prompt = this.messagesPrepare(messages);

    for (let retry = 0; retry < maxRetries; retry++) {
      try {
        // 创建会话
        const sessionId = await this.createSession();
        if (!sessionId) {
          throw new Error('创建会话失败');
        }

        // 获取 PoW
        const powResp = await this.getPowResponse();
        if (!powResp) {
          throw new Error('获取 PoW 失败');
        }

        // 构建请求
        const headers = {
          ...this.getAuthHeaders(),
          'x-ds-pow-response': powResp,
        };

        const payload = {
          chat_session_id: sessionId,
          parent_message_id: null,
          prompt,
          ref_file_ids: [],
          thinking_enabled: thinkingEnabled,
          search_enabled: searchEnabled,
        };

        const response = await fetch(`${this.baseUrl}/api/v0/chat/completion`, {
          method: 'POST',
          headers,
          body: JSON.stringify(payload),
        });

        if (response.status !== 200) {
          throw new Error(`请求失败: ${response.status}`);
        }

        const reader = response.body;
        if (!reader) {
          throw new Error('响应体为空');
        }

        let currentType: 'text' | 'thinking' = 'text';
        let buffer = '';

        for await (const chunk of reader) {
          buffer += chunk.toString('utf-8');
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            const lineText = line.trim();
            if (!lineText.startsWith('data:')) continue;

            const dataStr = lineText.slice(5).trim();
            if (dataStr === '[DONE]') {
              yield { type: 'done' };
              return;
            }

            try {
              const data = JSON.parse(dataStr);
              if ('v' in data) {
                const vValue = data.v;

                if (data.p === 'response/search_status') continue;

                if (data.p === 'response/thinking_content') {
                  currentType = 'thinking';
                } else if (data.p === 'response/content') {
                  currentType = 'text';
                }

                if (typeof vValue === 'string') {
                  yield { type: currentType, content: vValue };
                } else if (Array.isArray(vValue)) {
                  for (const item of vValue) {
                    if (item.p === 'status' && item.v === 'FINISHED') {
                      yield { type: 'done' };
                      return;
                    }
                  }
                }
              }
            } catch {
              // JSON 解析失败，忽略
            }
          }
        }

        return;
      } catch (e: any) {
        console.error(`[DeepSeek] 请求失败 (尝试 ${retry + 1}/${maxRetries}):`, e.message);
        if (retry < maxRetries - 1) {
          await new Promise((r) => setTimeout(r, 3000));
        } else {
          yield { type: 'error', content: e.message };
          return;
        }
      }
    }
  }

  /**
   * 非流式对话
   */
  async chat(
    messages: DeepSeekMessage[],
    model: string = 'deepseek-chat',
    maxRetries: number = 3
  ): Promise<{ content: string; thinking: string } | null> {
    let fullContent = '';
    let fullThinking = '';

    try {
      for await (const chunk of this.chatStream(messages, model, maxRetries)) {
        if (chunk.type === 'text' && chunk.content) {
          fullContent += chunk.content;
        } else if (chunk.type === 'thinking' && chunk.content) {
          fullThinking += chunk.content;
        } else if (chunk.type === 'error') {
          throw new Error(chunk.content || '聊天失败');
        }
      }
      return { content: fullContent, thinking: fullThinking };
    } catch (e: any) {
      console.error('[DeepSeek] 聊天失败:', e.message);
      return null;
    }
  }

  /**
   * 消息预处理：将多轮对话合并成最终 prompt
   * 和 ds.py 的 messages_prepare 逻辑一致
   */
  private messagesPrepare(messages: DeepSeekMessage[]): string {
    const processed = messages.map((m) => ({
      role: m.role,
      text: m.content,
    }));

    if (processed.length === 0) return '';

    // 合并连续同一角色的消息
    const merged = [processed[0]];
    for (const msg of processed.slice(1)) {
      if (msg.role === merged[merged.length - 1].role) {
        merged[merged.length - 1].text += '\n\n' + msg.text;
      } else {
        merged.push(msg);
      }
    }

    // 添加标签
    const parts: string[] = [];
    for (let idx = 0; idx < merged.length; idx++) {
      const block = merged[idx];
      const role = block.role;
      const text = block.text;
      if (role === 'assistant') {
        parts.push(`<｜Assistant｜>${text}<｜end▁of▁sentence｜>`);
      } else if (role === 'user' || role === 'system') {
        if (idx > 0) {
          parts.push(`<｜User｜>${text}`);
        } else {
          parts.push(text);
        }
      } else {
        parts.push(text);
      }
    }

    let finalPrompt = parts.join('');
    // 移除 markdown 图片格式
    finalPrompt = finalPrompt.replace(/!\[(.*?)\]\((.*?)\)/g, '[$1]($2)');
    return finalPrompt;
  }
}
