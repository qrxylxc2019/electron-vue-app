﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿// 类型声明
export interface Directory {
  id: number;
  name: string;
  template: string | null;
  parent_id: number | null;
  sort_order: number;
  created_at: string;
}

export type QuestionType = 'single' | 'multiple' | 'judge' | 'write';

export interface Question {
  id: number;
  directory_id: number;
  pid: number | null;
  knowledge_id: number | null;
  question_type: QuestionType;
  title: string;
  option_a: string | null;
  option_b: string | null;
  option_c: string | null;
  option_d: string | null;
  option_e: string | null;
  correct_answer: string;
  explanation: string | null;
  ai_explanation: string | null;
  sort_order: number;
  created_at: string;
}

// 文章题类型
export interface Article {
  id: number;
  directory_id: number;
  title: string;
  content: string;
  correct_answer: string;
  explanation: string | null;
  sort_order: number;
  created_at: string;
}

// 案例材料类型
export interface CaseMaterial {
  id: number;
  directory_id: number;
  title: string;
  content: string;
  sort_order: number;
  created_at: string;
}

// 案例小题类型
export interface CaseQuestion {
  id: number;
  material_id: number;
  pid: number | null;
  question_number: number;
  title: string;
  answer: string | null;
  ai_explanation: string | null;
  sort_order: number;
  created_at: string;
}

// 带条目线状态的选项
export interface OptionWithState {
  key: string;
  text: string | null;
  deleted: boolean;
}

// AI 讲解数据
export interface AIQuestionData {
  title: string;
  options?: string;
  correctAnswer: string;
  explanation?: string;
  questionId?: number;
  isFollowUp?: boolean;
  userMessage?: string;
  providerOrder?: string[];
}

// AI 对话消息
export interface AIChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

// 计划
export interface Plan {
  id: number;
  plan: string | null;
  date: string | null;
  status: string | null;
  plantype: string | null;
  type: string | null;
  subjectid: number | null;
  subjecttreeid: number | null;
  preplanid: number | null;
  planfinishtime: string | null;
  finishtime: string | null;
  top: number;
  todayPlan: number;
  created_at: string;
  updated_at: string;
}

// 跑马灯
export interface Marquee {
  id: number;
  text: string;
  sort_order: number;
  is_enabled: number;
  create_time: string;
  update_time: string;
}

// 知识点
export interface KnowledgePoint {
  id: number;
  directory_id: number;
  parent_id: number | null;
  name: string;
  sort_order: number;
  created_at: string;
}

// 扩展 Window 接口
declare global {
  interface Window {
    electronAPI: {
      getDirectories: () => Promise<Directory[]>;
      addDirectory: (name: string, template?: string, parentId?: number | null) => Promise<Directory | null>;
      deleteDirectory: (id: number) => Promise<boolean>;
      getQuestions: (directoryId: number) => Promise<Question[]>;
      getQuestionsByKnowledge: (knowledgeId: number) => Promise<Question[]>;
      searchQuestions: (directoryId: number, keyword: string) => Promise<Question[]>;
      getArticles: (directoryId: number) => Promise<Article[]>;
      getQuestion: (id: number) => Promise<Question | null>;
      addQuestion: (question: Partial<Question>) => Promise<Question | null>;
      deleteQuestion: (id: number) => Promise<boolean>;
      deleteArticle: (id: number) => Promise<boolean>;
      addArticle: (article: { directory_id: number; title: string; content: string }) => Promise<{ id: number; directory_id: number; title: string; content: string } | null>;
      updateQuestion: (id: number, data: any) => Promise<boolean>;
      // 案例相关
      getCaseMaterials: (directoryId: number) => Promise<CaseMaterial[]>;
      getCaseQuestions: (materialId: number) => Promise<CaseQuestion[]>;
      searchCaseMaterials: (directoryId: number, keyword: string) => Promise<CaseMaterial[]>;
      addCaseMaterial: (material: Partial<CaseMaterial>) => Promise<CaseMaterial | null>;
      addCaseQuestion: (question: Partial<CaseQuestion>) => Promise<CaseQuestion | null>;
      addCaseMaterialWithQuestions: (data: { directory_id: number; title: string; content: string }) => Promise<{ success: boolean; materialId?: number; error?: string }>;
      deleteCaseMaterial: (id: number) => Promise<boolean>;
      deleteCaseQuestion: (id: number) => Promise<boolean>;
      updateCaseQuestion: (id: number, title: string, answer?: string) => Promise<boolean>;
      updateArticle: (id: number, content: string, title?: string) => Promise<boolean>;
      // AI 讲解
      explainQuestion: (questionData: AIQuestionData) => Promise<{ success: boolean; error?: string }>;
      onAIStreamChunk: (callback: (content: string) => void) => () => void;
      onAIStreamDone: (callback: () => void) => () => void;
      onAIStreamError: (callback: (error: string) => void) => () => void;
      onAIProviderSwitch: (callback: (provider: string) => void) => () => void;
      updateAIExplanation: (id: number, aiExplanation: string) => Promise<boolean>;
      // AI 提取关键词
      extractKeywords: (data: { paragraph: string; providerOrder?: string[] }) => Promise<{ success: boolean; keywords?: string; error?: string }>;
      // 同类题
      getSimilarQuestions: (pid: number) => Promise<Question[]>;
      addSimilarQuestions: (questions: any[]) => Promise<Question[]>;
      generateSimilarQuestions: (questionData: AIQuestionData) => Promise<{ success: boolean; questions?: any[]; error?: string }>;
      // API 设置（已改为前端本地存储，保留兼容）
      getApiSettings: () => Promise<Record<string, string>>;
      saveApiSettings: (settings: any) => Promise<boolean>;
      // DeepSeek 逆向 API
      dsInitToken: (token: string) => Promise<{ success: boolean; error?: string }>;
      dsCheckToken: (token: string) => Promise<{ success: boolean; valid?: boolean; error?: string }>;
      dsChatStream: (params: {
        sessionKey: string;
        messages: Array<{ role: string; content: string }>;
        model?: string;
        token?: string;
      }) => Promise<{ success: boolean; content?: string; thinking?: string; error?: string }>;
      dsChat: (params: {
        sessionKey: string;
        messages: Array<{ role: string; content: string }>;
        model?: string;
        token?: string;
      }) => Promise<{ success: boolean; content?: string; thinking?: string; error?: string }>;
      dsClearContext: (sessionKey: string) => Promise<{ success: boolean }>;
      dsGetContext: (sessionKey: string) => Promise<{ success: boolean; messages?: Array<{ role: string; content: string }> }>;
      onDSStreamChunk: (callback: (data: { sessionKey: string; type: string; content: string }) => void) => () => void;
      onDSStreamDone: (callback: (data: { sessionKey: string }) => void) => () => void;
      onDSStreamError: (callback: (data: { sessionKey: string; error: string }) => void) => () => void;
      // DeepSeek 本地版
      testDeepseekLocalToken: (token: string) => Promise<{ success: boolean; error?: string }>;
      // 英语阅读
      getEnglishReadings: (dirId: number) => Promise<{ success: boolean; materials?: any[]; error?: string }>;
      addEnglishReading: (data: any) => Promise<{ success: boolean; materialId?: number; error?: string }>;
      updateEnglishReading: (id: number, data: any) => Promise<{ success: boolean; error?: string }>;
      deleteEnglishReading: (id: number) => Promise<{ success: boolean; error?: string }>;
      updateEnglishQuestion: (id: number, data: any) => Promise<{ success: boolean; error?: string }>;
      deleteEnglishQuestion: (id: number) => Promise<{ success: boolean; error?: string }>;
      explainEnglishQuestion: (data: any) => Promise<{ success: boolean; error?: string }>;

      // 考研英语单词
      getWordImages: () => Promise<{ success: boolean; images?: string[]; error?: string }>;

      // 完型填空
      getClozeMaterials: (dirId: number) => Promise<{ success: boolean; materials?: any[]; error?: string }>;
      addClozeMaterial: (data: any) => Promise<{ success: boolean; materialId?: number; error?: string }>;
      updateClozeMaterial: (id: number, data: any) => Promise<{ success: boolean; error?: string }>;
      deleteClozeMaterial: (id: number) => Promise<{ success: boolean; error?: string }>;
      updateClozeQuestion: (id: number, data: any) => Promise<{ success: boolean; error?: string }>;
      deleteClozeQuestion: (id: number) => Promise<{ success: boolean; error?: string }>;
      // 计划
      getPlans: () => Promise<Plan[]>;
      getPlanById: (id: number) => Promise<Plan | null>;
      addPlan: (data: Partial<Plan>) => Promise<Plan | null>;
      updatePlan: (id: number, data: Partial<Plan>) => Promise<boolean>;
      deletePlan: (id: number) => Promise<boolean>;
      // 跑马灯
      getMarquees: () => Promise<Marquee[]>;
      addMarquee: (data: Partial<Marquee>) => Promise<Marquee | null>;
      updateMarquee: (id: number, data: Partial<Marquee>) => Promise<boolean>;
      deleteMarquee: (id: number) => Promise<boolean>;
      // 副业项目
      getCommerceList: (params: any) => Promise<{ success: boolean; list?: any[]; total?: number; error?: string }>;
      getCommerceDetail: (id: number) => Promise<{ success: boolean; data?: any; error?: string }>;
      addCommerce: (data: any) => Promise<{ success: boolean; id?: number; error?: string }>;
      updateCommerce: (data: any) => Promise<{ success: boolean; error?: string }>;
      deleteCommerce: (id: number) => Promise<{ success: boolean; error?: string }>;

      // 知识点
      getKnowledgePoints: (directoryId: number) => Promise<KnowledgePoint[]>;
      getKnowledgePointById: (id: number) => Promise<KnowledgePoint | null>;
      addKnowledgePoint: (data: { directory_id: number; parent_id?: number | null; name: string; sort_order?: number }) => Promise<KnowledgePoint | null>;
      deleteKnowledgePoint: (id: number) => Promise<boolean>;

      // AI根据知识点出题
      generateQuestionsByKnowledge: (data: {
        knowledgeName: string;
        directoryId: number;
        count?: number;
        providerOrder?: string[];
      }) => Promise<{ success: boolean; questions?: any[]; error?: string }>;
      // AI分类题目到知识点
      classifyQuestion: (data: {
        questionTitle: string;
        knowledgePoints: Array<{ id: number; name: string }>;
        providerOrder?: string[];
      }) => Promise<{ success: boolean; result?: { knowledge_id: number; knowledge_name: string; confidence: number; reason: string }; error?: string }>;
    };
  }
}
