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
};

// 暴露给渲染进程的 API
contextBridge.exposeInMainWorld('electronAPI', electronAPI);

export type ElectronAPI = typeof electronAPI;
