﻿﻿﻿﻿﻿﻿﻿// 类型声明
export interface Directory {
  id: number;
  name: string;
  parent_id: number | null;
  sort_order: number;
  created_at: string;
}

export type QuestionType = 'single' | 'multiple' | 'judge' | 'write';

export interface Question {
  id: number;
  directory_id: number;
  pid: number | null;
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
}

// AI 对话消息
export interface AIChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

// 扩展 Window 接口
declare global {
  interface Window {
    electronAPI: {
      getDirectories: () => Promise<Directory[]>;
      addDirectory: (name: string, parentId?: number | null) => Promise<Directory | null>;
      getQuestions: (directoryId: number) => Promise<Question[]>;
      getArticles: (directoryId: number) => Promise<Article[]>;
      getQuestion: (id: number) => Promise<Question | null>;
      addQuestion: (question: Partial<Question>) => Promise<Question | null>;
      deleteQuestion: (id: number) => Promise<boolean>;
      deleteArticle: (id: number) => Promise<boolean>;
      // 案例相关
      getCaseMaterials: (directoryId: number) => Promise<CaseMaterial[]>;
      getCaseQuestions: (materialId: number) => Promise<CaseQuestion[]>;
      addCaseMaterial: (material: Partial<CaseMaterial>) => Promise<CaseMaterial | null>;
      addCaseQuestion: (question: Partial<CaseQuestion>) => Promise<CaseQuestion | null>;
      deleteCaseMaterial: (id: number) => Promise<boolean>;
      // AI 讲解
      explainQuestion: (questionData: AIQuestionData) => Promise<{ success: boolean; error?: string }>;
      onAIStreamChunk: (callback: (content: string) => void) => () => void;
      onAIStreamDone: (callback: () => void) => () => void;
      onAIStreamError: (callback: (error: string) => void) => () => void;
      updateAIExplanation: (id: number, aiExplanation: string) => Promise<boolean>;
      // 同类题
      getSimilarQuestions: (pid: number) => Promise<Question[]>;
      addSimilarQuestions: (questions: any[]) => Promise<Question[]>;
      generateSimilarQuestions: (questionData: AIQuestionData) => Promise<{ success: boolean; questions?: any[]; error?: string }>;
    };
  }
}
