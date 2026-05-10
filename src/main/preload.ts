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

  // 窗口相关
  toggleFullscreen: () => ipcRenderer.invoke('window:toggleFullscreen'),
  isFullScreen: () => ipcRenderer.invoke('window:isFullScreen'),

  // AI 讲解
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
  updateAIExplanation: (id: number, aiExplanation: string) => ipcRenderer.invoke('db:updateAIExplanation', id, aiExplanation),
};

// 暴露给渲染进程的 API
contextBridge.exposeInMainWorld('electronAPI', electronAPI);

export type ElectronAPI = typeof electronAPI;
