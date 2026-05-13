/**
 * DeepSeek 逆向 API 模块入口
 * 提供 IPC 处理函数和渲染进程 API 封装
 */

import { ipcMain, BrowserWindow } from 'electron';
import { DeepSeekClient } from './client';
import type { DeepSeekMessage, DeepSeekStreamChunk } from './types';

// 全局 DeepSeek 客户端实例
let deepSeekClient: DeepSeekClient | null = null;

// 多轮对话上下文存储（按 sessionKey 存储）
const chatContexts = new Map<string, DeepSeekMessage[]>();

/**
 * 初始化 DeepSeek 客户端
 */
export function initDeepSeekClient(token: string): DeepSeekClient {
  deepSeekClient = new DeepSeekClient({ token });
  return deepSeekClient;
}

/**
 * 获取当前客户端实例
 */
export function getDeepSeekClient(): DeepSeekClient | null {
  return deepSeekClient;
}

/**
 * 设置 DeepSeek IPC 处理程序
 */
export function setupDeepSeekIpc(mainWindowGetter: () => BrowserWindow | null) {
  // 初始化/更新 token
  ipcMain.handle('ds:initToken', (_event, token: string) => {
    try {
      initDeepSeekClient(token);
      return { success: true };
    } catch (e: any) {
      console.error('[DeepSeek] 初始化失败:', e.message);
      return { success: false, error: e.message };
    }
  });

  // 检查 token 状态
  ipcMain.handle('ds:checkToken', async (_event, token: string) => {
    try {
      const client = new DeepSeekClient({ token });
      const valid = await client.checkTokenStatus();
      return { success: true, valid };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });

  // 流式对话（支持多轮）
  ipcMain.handle('ds:chatStream', async (_event, params: {
    sessionKey: string;
    messages: DeepSeekMessage[];
    model?: string;
    token?: string;
  }) => {
    const { sessionKey, messages, model = 'deepseek-chat', token } = params;

    // 如果传入了 token，重新初始化客户端
    let client = deepSeekClient;
    if (token) {
      client = initDeepSeekClient(token);
    }

    if (!client) {
      return { success: false, error: 'DeepSeek 客户端未初始化，请先调用 ds:initToken' };
    }

    // 获取或初始化对话上下文
    let contextMessages: DeepSeekMessage[] = [];
    if (chatContexts.has(sessionKey)) {
      contextMessages = [...chatContexts.get(sessionKey)!];
    }

    // 追加新消息
    contextMessages.push(...messages);

    const mainWindow = mainWindowGetter();
    let assistantContent = '';
    let assistantThinking = '';

    try {
      for await (const chunk of client.chatStream(contextMessages, model)) {
        if (chunk.type === 'text' || chunk.type === 'thinking') {
          const content = chunk.content || '';
          if (chunk.type === 'text') {
            assistantContent += content;
          } else {
            assistantThinking += content;
          }
          // 发送流式 chunk 到渲染进程
          if (mainWindow) {
            mainWindow.webContents.send('ds:streamChunk', {
              sessionKey,
              type: chunk.type,
              content,
            });
          }
        } else if (chunk.type === 'error') {
          if (mainWindow) {
            mainWindow.webContents.send('ds:streamError', {
              sessionKey,
              error: chunk.content || '未知错误',
            });
          }
          return { success: false, error: chunk.content };
        } else if (chunk.type === 'done') {
          // 保存对话上下文
          contextMessages.push({
            role: 'assistant',
            content: assistantContent,
          });
          chatContexts.set(sessionKey, contextMessages);

          if (mainWindow) {
            mainWindow.webContents.send('ds:streamDone', { sessionKey });
          }
          return { success: true, content: assistantContent, thinking: assistantThinking };
        }
      }

      // 流结束但没有 done 标记
      contextMessages.push({
        role: 'assistant',
        content: assistantContent,
      });
      chatContexts.set(sessionKey, contextMessages);

      if (mainWindow) {
        mainWindow.webContents.send('ds:streamDone', { sessionKey });
      }
      return { success: true, content: assistantContent, thinking: assistantThinking };
    } catch (e: any) {
      console.error('[DeepSeek] 流式对话异常:', e.message);
      if (mainWindow) {
        mainWindow.webContents.send('ds:streamError', {
          sessionKey,
          error: e.message,
        });
      }
      return { success: false, error: e.message };
    }
  });

  // 非流式对话（支持多轮）
  ipcMain.handle('ds:chat', async (_event, params: {
    sessionKey: string;
    messages: DeepSeekMessage[];
    model?: string;
    token?: string;
  }) => {
    const { sessionKey, messages, model = 'deepseek-chat', token } = params;

    let client = deepSeekClient;
    if (token) {
      client = initDeepSeekClient(token);
    }

    if (!client) {
      return { success: false, error: 'DeepSeek 客户端未初始化' };
    }

    // 获取或初始化对话上下文
    let contextMessages: DeepSeekMessage[] = [];
    if (chatContexts.has(sessionKey)) {
      contextMessages = [...chatContexts.get(sessionKey)!];
    }
    contextMessages.push(...messages);

    const result = await client.chat(contextMessages, model);
    if (result) {
      // 保存对话上下文
      contextMessages.push({ role: 'assistant', content: result.content });
      chatContexts.set(sessionKey, contextMessages);

      return { success: true, content: result.content, thinking: result.thinking };
    } else {
      return { success: false, error: '对话失败' };
    }
  });

  // 清空对话上下文
  ipcMain.handle('ds:clearContext', (_event, sessionKey: string) => {
    chatContexts.delete(sessionKey);
    return { success: true };
  });

  // 获取对话上下文
  ipcMain.handle('ds:getContext', (_event, sessionKey: string) => {
    const context = chatContexts.get(sessionKey) || [];
    return { success: true, messages: context };
  });
}
