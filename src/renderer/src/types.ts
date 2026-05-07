// 类型声明
export interface Directory {
  id: number;
  name: string;
  parent_id: number | null;
  sort_order: number;
  created_at: string;
}

export type QuestionType = 'choice' | 'judge';

export interface Question {
  id: number;
  directory_id: number;
  question_type: QuestionType;
  title: string;
  option_a: string | null;
  option_b: string | null;
  option_c: string | null;
  option_d: string | null;
  option_e: string | null;
  correct_answer: string;
  explanation: string | null;
  sort_order: number;
  created_at: string;
}

// 带条目线状态的选项
export interface OptionWithState {
  key: string;
  text: string | null;
  deleted: boolean;
}

// 扩展 Window 接口
declare global {
  interface Window {
    electronAPI: {
      getDirectories: () => Promise<Directory[]>;
      addDirectory: (name: string, parentId?: number | null) => Promise<Directory | null>;
      getQuestions: (directoryId: number) => Promise<Question[]>;
      getQuestion: (id: number) => Promise<Question | null>;
      addQuestion: (question: Partial<Question>) => Promise<Question | null>;
    };
  }
}
