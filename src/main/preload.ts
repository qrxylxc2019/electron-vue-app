import { contextBridge, ipcRenderer } from 'electron';

const electronAPI = {
  // 目录相关
  getDirectories: () => ipcRenderer.invoke('db:getDirectories'),
  addDirectory: (name: string, parentId?: number | null) => ipcRenderer.invoke('db:addDirectory', name, parentId),
  deleteDirectory: (id: number) => ipcRenderer.invoke('db:deleteDirectory', id),

  // 题目相关
  getQuestions: (directoryId: number) => ipcRenderer.invoke('db:getQuestions', directoryId),
  searchQuestions: (directoryId: number, keyword: string) => ipcRenderer.invoke('db:searchQuestions', directoryId, keyword),
  getArticles: (directoryId: number) => ipcRenderer.invoke('db:getArticles', directoryId),
  getQuestion: (id: number) => ipcRenderer.invoke('db:getQuestion', id),
  addQuestion: (question: any) => ipcRenderer.invoke('db:addQuestion', question),
  deleteQuestion: (id: number) => ipcRenderer.invoke('db:deleteQuestion', id),
  deleteArticle: (id: number) => ipcRenderer.invoke('db:deleteArticle', id),
  addArticle: (article: any) => ipcRenderer.invoke('db:addArticle', article),
  updateQuestion: (id: number, data: any) => ipcRenderer.invoke('db:updateQuestion', id, data),

  // 案例相关
  getCaseMaterials: (directoryId: number) => ipcRenderer.invoke('db:getCaseMaterials', directoryId),
  getCaseQuestions: (materialId: number) => ipcRenderer.invoke('db:getCaseQuestions', materialId),
  searchCaseMaterials: (directoryId: number, keyword: string) => ipcRenderer.invoke('db:searchCaseMaterials', directoryId, keyword),
  addCaseMaterial: (material: any) => ipcRenderer.invoke('db:addCaseMaterial', material),
  addCaseQuestion: (question: any) => ipcRenderer.invoke('db:addCaseQuestion', question),
  addCaseMaterialWithQuestions: (data: any) => ipcRenderer.invoke('db:addCaseMaterialWithQuestions', data),
  deleteCaseMaterial: (id: number) => ipcRenderer.invoke('db:deleteCaseMaterial', id),
  deleteCaseQuestion: (id: number) => ipcRenderer.invoke('db:deleteCaseQuestion', id),
  updateCaseMaterial: (id: number, content: string) => ipcRenderer.invoke('db:updateCaseMaterial', id, content),
  updateCaseQuestion: (id: number, title: string, answer?: string) => ipcRenderer.invoke('db:updateCaseQuestion', id, title, answer),
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

  // AI 提取关键词
  extractKeywords: (data: any) => ipcRenderer.invoke('ai:extractKeywords', data),

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

  // 英语阅读
  getEnglishReadings: (dirId: number) => ipcRenderer.invoke('english:getReadings', dirId),
  addEnglishReading: (data: any) => ipcRenderer.invoke('english:addReading', data),
  updateEnglishReading: (id: number, data: any) => ipcRenderer.invoke('english:updateReading', id, data),
  deleteEnglishReading: (id: number) => ipcRenderer.invoke('english:deleteReading', id),
  updateEnglishQuestion: (id: number, data: any) => ipcRenderer.invoke('english:updateQuestion', id, data),
  deleteEnglishQuestion: (id: number) => ipcRenderer.invoke('english:deleteQuestion', id),
  explainEnglishQuestion: (data: any) => ipcRenderer.invoke('english:explainQuestion', data),

  // 考研英语单词
  getWordImages: () => ipcRenderer.invoke('word:getImages'),

  // 英语翻译
  getTranslateList: (dirId: number) => ipcRenderer.invoke('translate:getList', dirId),
  addTranslate: (data: any) => ipcRenderer.invoke('translate:add', data),
  updateTranslate: (id: number, data: any) => ipcRenderer.invoke('translate:update', id, data),
  deleteTranslate: (id: number) => ipcRenderer.invoke('translate:delete', id),

  // 完型填空
  getClozeMaterials: (dirId: number) => ipcRenderer.invoke('cloze:getMaterials', dirId),
  addClozeMaterial: (data: any) => ipcRenderer.invoke('cloze:addMaterial', data),
  updateClozeMaterial: (id: number, data: any) => ipcRenderer.invoke('cloze:updateMaterial', id, data),
  deleteClozeMaterial: (id: number) => ipcRenderer.invoke('cloze:deleteMaterial', id),
  updateClozeQuestion: (id: number, data: any) => ipcRenderer.invoke('cloze:updateQuestion', id, data),
  deleteClozeQuestion: (id: number) => ipcRenderer.invoke('cloze:deleteQuestion', id),

  // 计划
  getPlans: () => ipcRenderer.invoke('plan:getAll'),
  getPlanById: (id: number) => ipcRenderer.invoke('plan:getById', id),
  addPlan: (data: any) => ipcRenderer.invoke('plan:add', data),
  updatePlan: (id: number, data: any) => ipcRenderer.invoke('plan:update', id, data),
  deletePlan: (id: number) => ipcRenderer.invoke('plan:delete', id),

  // 跑马灯
  getMarquees: () => ipcRenderer.invoke('marquee:getAll'),
  addMarquee: (data: any) => ipcRenderer.invoke('marquee:add', data),
  updateMarquee: (id: number, data: any) => ipcRenderer.invoke('marquee:update', id, data),
  deleteMarquee: (id: number) => ipcRenderer.invoke('marquee:delete', id),

  // 项目
  getProjectList: (params: any) => ipcRenderer.invoke('project:get', params),
  addProject: (data: any) => ipcRenderer.invoke('project:add', data),
  updateProject: (id: number, data: any) => ipcRenderer.invoke('project:update', id, data),
  deleteProject: (id: number) => ipcRenderer.invoke('project:delete', id),

  // 征稿
  getSolicitList: (params: any) => ipcRenderer.invoke('solicit:get', params),
  addSolicit: (data: any) => ipcRenderer.invoke('solicit:add', data),
  updateSolicit: (id: number, data: any) => ipcRenderer.invoke('solicit:update', id, data),
  deleteSolicit: (id: number) => ipcRenderer.invoke('solicit:delete', id),
  solicitAiParse: (url: string) => ipcRenderer.invoke('solicit:aiParse', url),

  // 年度月计划
  getMonthPlansByYear: (year: number) => ipcRenderer.invoke('monthplan:getByYear', year),
  addMonthPlan: (data: any) => ipcRenderer.invoke('monthplan:add', data),
  updateMonthPlan: (id: number, data: any) => ipcRenderer.invoke('monthplan:update', id, data),
  deleteMonthPlan: (id: number) => ipcRenderer.invoke('monthplan:delete', id),

  // 收藏
  getCollectList: (params: any) => ipcRenderer.invoke('collect:get', params),
  addCollect: (data: any) => ipcRenderer.invoke('collect:add', data),
  deleteCollect: (id: number) => ipcRenderer.invoke('collect:delete', id),
  fetchCollectUrlTitle: (url: string) => ipcRenderer.invoke('collect:fetchUrlTitle', url),

  // 笔记
  getNoteList: (params: any) => ipcRenderer.invoke('note:get', params),
  getNoteById: (id: number) => ipcRenderer.invoke('note:getById', id),
  addNote: (data: any) => ipcRenderer.invoke('note:add', data),
  updateNote: (id: number, data: any) => ipcRenderer.invoke('note:update', id, data),
  deleteNote: (id: number) => ipcRenderer.invoke('note:delete', id),

  // Claude
  getClaudeList: (params: any) => ipcRenderer.invoke('claude:get', params),
  addClaude: (data: any) => ipcRenderer.invoke('claude:add', data),
  updateClaude: (id: number, data: any) => ipcRenderer.invoke('claude:update', id, data),
  deleteClaude: (id: number) => ipcRenderer.invoke('claude:delete', id),
  switchClaude: (data: any) => ipcRenderer.invoke('claude:switch', data),

  // Token
  getTokenList: (params: any) => ipcRenderer.invoke('token:get', params),
  addToken: (data: any) => ipcRenderer.invoke('token:add', data),
  updateToken: (id: number, data: any) => ipcRenderer.invoke('token:update', id, data),
  deleteToken: (id: number) => ipcRenderer.invoke('token:delete', id),

  // 书法图片
  getHandwritingList: (params: any) => ipcRenderer.invoke('handwriting:get', params),
  deleteHandwriting: (name: string) => ipcRenderer.invoke('handwriting:delete', name),

  // 学习信息
  startXinxiCrawler: () => ipcRenderer.invoke('xinxi:startCrawler'),
  getXinxiStatus: () => ipcRenderer.invoke('xinxi:getStatus'),
  getXinxiList: (params: any) => ipcRenderer.invoke('xinxi:getList', params),
  clearXinxi: () => ipcRenderer.invoke('xinxi:clear'),
  addXinxi: (data: any) => ipcRenderer.invoke('xinxi:add', data),
  deleteXinxi: (id: number) => ipcRenderer.invoke('xinxi:delete', id),

  // 微信公众号订阅
  getWxaccountList: (params: any) => ipcRenderer.invoke('wxaccount:get', params),
  addWxaccount: (data: any) => ipcRenderer.invoke('wxaccount:add', data),
  updateWxaccount: (id: number, data: any) => ipcRenderer.invoke('wxaccount:update', id, data),
  deleteWxaccount: (id: number) => ipcRenderer.invoke('wxaccount:delete', id),
};

// 暴露给渲染进程的 API
contextBridge.exposeInMainWorld('electronAPI', electronAPI);

export type ElectronAPI = typeof electronAPI;
