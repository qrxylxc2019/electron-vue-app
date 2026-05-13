/**
 * DeepSeek 逆向 API 类型定义
 */

// 聊天消息
export interface DeepSeekMessage {
  role: 'user' | 'assistant';
  content: string;
}

// 聊天请求参数
export interface DeepSeekChatRequest {
  messages: DeepSeekMessage[];
  model?: string;
  stream?: boolean;
  thinking_enabled?: boolean;
  search_enabled?: boolean;
}

// 流式响应 chunk
export interface DeepSeekStreamChunk {
  type: 'text' | 'thinking' | 'error' | 'done';
  content?: string;
}

// PoW 挑战数据
export interface PoWChallenge {
  algorithm: string;
  challenge: string;
  salt: string;
  difficulty: number;
  expire_at: number;
  signature: string;
  target_path: string;
}

// 会话信息
export interface ChatSession {
  sessionId: string;
  messages: DeepSeekMessage[];
  createdAt: number;
}

// DeepSeek 客户端配置
export interface DeepSeekConfig {
  token: string;
  baseUrl?: string;
  wasmPath?: string;
}
