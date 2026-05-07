import { contextBridge, ipcRenderer } from 'electron';

const electronAPI = {
  // 目录相关
  getDirectories: () => ipcRenderer.invoke('db:getDirectories'),
  addDirectory: (name: string, parentId?: number | null) => ipcRenderer.invoke('db:addDirectory', name, parentId),

  // 题目相关
  getQuestions: (directoryId: number) => ipcRenderer.invoke('db:getQuestions', directoryId),
  getQuestion: (id: number) => ipcRenderer.invoke('db:getQuestion', id),
  addQuestion: (question: any) => ipcRenderer.invoke('db:addQuestion', question),
};

// 暴露给渲染进程的 API
contextBridge.exposeInMainWorld('electronAPI', electronAPI);

export type ElectronAPI = typeof electronAPI;
