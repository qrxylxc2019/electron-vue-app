import { contextBridge, ipcRenderer } from 'electron';

const electronAPI = {
  // 目录相关
  getDirectories: () => ipcRenderer.invoke('db:getDirectories'),
  addDirectory: (name: string, parentId?: number | null) => ipcRenderer.invoke('db:addDirectory', name, parentId),

  // 题目相关
  getQuestions: (directoryId: number) => ipcRenderer.invoke('db:getQuestions', directoryId),
  getArticles: (directoryId: number) => ipcRenderer.invoke('db:getArticles', directoryId),
  getQuestion: (id: number) => ipcRenderer.invoke('db:getQuestion', id),
  addQuestion: (question: any) => ipcRenderer.invoke('db:addQuestion', question),
  deleteQuestion: (id: number) => ipcRenderer.invoke('db:deleteQuestion', id),
  deleteArticle: (id: number) => ipcRenderer.invoke('db:deleteArticle', id),

  // 案例相关
  getCaseMaterials: (directoryId: number) => ipcRenderer.invoke('db:getCaseMaterials', directoryId),
  getCaseQuestions: (materialId: number) => ipcRenderer.invoke('db:getCaseQuestions', materialId),
  addCaseMaterial: (material: any) => ipcRenderer.invoke('db:addCaseMaterial', material),
  addCaseQuestion: (question: any) => ipcRenderer.invoke('db:addCaseQuestion', question),
  deleteCaseMaterial: (id: number) => ipcRenderer.invoke('db:deleteCaseMaterial', id),
  updateCaseMaterial: (id: number, content: string) => ipcRenderer.invoke('db:updateCaseMaterial', id, content),
  updateArticle: (id: number, content: string, title?: string) => ipcRenderer.invoke('db:updateArticle', id, content, title),

  // 窗口相关
  toggleFullscreen: () => ipcRenderer.invoke('window:toggleFullscreen'),
  isFullScreen: () => ipcRenderer.invoke('window:isFullScreen'),

  // AI 讲解（支持多轮对话）
  explainQuestion: (questionData: any) => ipcRenderer.invoke('ai:explainQuestion', questionData),
  onAIStreamChunk: (callback: (content: string) => void) => {
    const handler = (_event: any, content: string) => callback(content);
    ipcRenderer.on('ai:streamChunk', handler);
    return () => ipcRenderer.removeListener('ai:streamChunk', handler);
  },
  onAIStreamDone: (callback: () => void) => {
    const handler = () => callback();
    ipcRenderer.on('ai:streamDone', handler);
    return () => ipcRenderer.removeListener('ai:streamDone', handler);
  },
  onAIStreamError: (callback: (error: string) => void) => {
    const handler = (_event: any, error: string) => callback(error);
    ipcRenderer.on('ai:streamError', handler);
    return () => ipcRenderer.removeListener('ai:streamError', handler);
  },
  onAIProviderSwitch: (callback: (provider: string) => void) => {
    const handler = (_event: any, provider: string) => callback(provider);
    ipcRenderer.on('ai:providerSwitch', handler);
    return () => ipcRenderer.removeListener('ai:providerSwitch', handler);
  },
  updateAIExplanation: (id: number, aiExplanation: string) => ipcRenderer.invoke('db:updateAIExplanation', id, aiExplanation),

  // 同类题
  getSimilarQuestions: (pid: number) => ipcRenderer.invoke('db:getSimilarQuestions', pid),
  addSimilarQuestions: (questions: any[]) => ipcRenderer.invoke('db:addSimilarQuestions', questions),
  generateSimilarQuestions: (questionData: any) => ipcRenderer.invoke('ai:generateSimilarQuestions', questionData),
  generateSimilarQuestionsByTopic: (data: any) => ipcRenderer.invoke('ai:generateSimilarQuestionsByTopic', data),

  // 案例题 AI 讲解
  explainCaseQuestion: (data: any) => ipcRenderer.invoke('ai:explainCaseQuestion', data),

  // API 设置
  getApiSettings: () => ipcRenderer.invoke('db:getApiSettings'),
  saveApiSettings: (settings: any) => ipcRenderer.invoke('db:saveApiSettings', settings),

  // DeepSeek 逆向 API
  dsInitToken: (token: string) => ipcRenderer.invoke('ds:initToken', token),
  dsCheckToken: (token: string) => ipcRenderer.invoke('ds:checkToken', token),
  dsChatStream: (params: any) => ipcRenderer.invoke('ds:chatStream', params),
  dsChat: (params: any) => ipcRenderer.invoke('ds:chat', params),
  dsClearContext: (sessionKey: string) => ipcRenderer.invoke('ds:clearContext', sessionKey),
  dsGetContext: (sessionKey: string) => ipcRenderer.invoke('ds:getContext', sessionKey),
  onDSStreamChunk: (callback: (data: any) => void) => {
    const handler = (_event: any, data: any) => callback(data);
    ipcRenderer.on('ds:streamChunk', handler);
    return () => ipcRenderer.removeListener('ds:streamChunk', handler);
  },
  onDSStreamDone: (callback: (data: any) => void) => {
    const handler = (_event: any, data: any) => callback(data);
    ipcRenderer.on('ds:streamDone', handler);
    return () => ipcRenderer.removeListener('ds:streamDone', handler);
  },
  onDSStreamError: (callback: (data: any) => void) => {
    const handler = (_event: any, data: any) => callback(data);
    ipcRenderer.on('ds:streamError', handler);
    return () => ipcRenderer.removeListener('ds:streamError', handler);
  },

  // DeepSeek 本地版
  testDeepseekLocalToken: (token: string) => ipcRenderer.invoke('deepseekLocal:testToken', token),
};

// 暴露给渲染进程的 API
contextBridge.exposeInMainWorld('electronAPI', electronAPI);

export type ElectronAPI = typeof electronAPI;
