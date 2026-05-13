import { OpenAI } from 'openai';

// API 提供商配置
export interface ApiProviderConfig {
  name: string;
  baseURL: string;
  defaultModel: string;
  apiKey: string;
}

// 默认 API 配置（内置 API Key，硬编码）
export const DEFAULT_API_CONFIGS: Record<string, ApiProviderConfig> = {
  modelspace: {
    name: 'ModelSpace',
    baseURL: 'https://api-inference.modelscope.cn/v1',
    defaultModel: 'deepseek-ai/DeepSeek-R1-0528',
    apiKey: 'ms-9dadd6e0-9d06-4e91-b639-5a7af28da529',
  },
  deepseek: {
    name: 'DeepSeek',
    baseURL: 'https://api.deepseek.com',
    defaultModel: 'deepseek-v4-pro',
    apiKey: 'sk-793f0d8a79b547b996d39f2f1f8af852',
  },
};

// 提示词配置
export const PROMPTS = {
  // AI 解释题目
  explainQuestion: (questionTitle: string, correctAnswer: string, explanation: string) => ({
    system: `你是一位资深的信息系统项目管理师考试辅导专家，擅长用通俗易懂的方式讲解题目。
你的讲解风格：
1. 先给出明确的答案
2. 详细解释为什么这个答案是正确的
3. 分析其他选项为什么是错误的（如果有选项）
4. 延伸讲解相关的知识点，帮助用户举一反三
5. 使用简洁清晰的语言，避免过于学术化的表达
6. 字数1000字左右`,
    user: `请详细讲解以下这道题目：

【题目】${questionTitle}

【正确答案】${correctAnswer}

【解析】${explanation || '暂无解析'}

请按照以下结构进行讲解：
1. 直接给出答案
2. 详细解析（为什么选这个答案）
3. 相关知识点延伸
4. 记忆技巧或答题技巧（如有）`,
  }),

  // 生成同类题
  generateSimilar: (questionData: any) => ({
    system: `你是一位资深软考命题专家，擅长根据已有题目生成高质量的同类练习题。生成要求：
1. 保持与原题相同的知识点和考查方向
2. 题干表述要有所变化，不能照搬原题
3. 选项内容要重新设计，但考查点一致
4. 难度与原题相当
5. 必须输出标准JSON格式，包含5道题目
6. 每道题包含：title(题干)、option_a/b/c/d(选项)、correct_answer(正确答案A/B/C/D)、explanation(解析)
7. 题目类型与原题一致`,
    user: `请根据以下原题，生成20道同类练习题（考查相同知识点，但题干和选项重新设计）：

【原题】${questionData.title}

【选项】
${questionData.options || '（判断题/简答题，无选项）'}

【正确答案】${questionData.correctAnswer}

【解析】${questionData.explanation || '暂无解析'}

请直接返回JSON数组格式，不要包含任何其他文字说明。格式如下：
[
  {
    "title": "题干内容",
    "option_a": "选项A",
    "option_b": "选项B",
    "option_c": "选项C",
    "option_d": "选项D",
    "correct_answer": "A",
    "explanation": "解析内容"
  }
]`,
  }),

  // 案例题解析
  explainCase: (material: string, question: string, answer: string) => ({
    system: `你是一位资深的信息系统项目管理师案例题辅导专家，擅长分析案例并给出清晰的解题思路。
你的讲解风格：
1. 先分析案例背景和关键信息
2. 针对问题给出结构化的答案
3. 结合项目管理知识体系进行讲解
4. 提供答题技巧和注意事项`,
    user: `请详细讲解以下这道案例题：

【案例材料】
${material}

【问题】
${question}

【参考答案】
${answer || '暂无参考答案'}

请按照以下结构进行讲解：
1. 案例背景分析
2. 问题拆解
3. 详细解答
4. 相关知识点
5. 答题技巧`,
  }),
};

// 获取指定厂商的 OpenAI 客户端
export function getOpenAIClient(provider: string): OpenAI {
  const config = DEFAULT_API_CONFIGS[provider];
  if (!config) {
    throw new Error(`未知的 API 提供商: ${provider}`);
  }

  if (!config.apiKey) {
    throw new Error(`${config.name} 的 API Key 未配置`);
  }

  return new OpenAI({
    apiKey: config.apiKey,
    baseURL: config.baseURL,
  });
}

// 获取指定厂商使用的模型
export function getCurrentModel(provider: string): string {
  const config = DEFAULT_API_CONFIGS[provider];
  if (!config) {
    throw new Error(`未知的 API 提供商: ${provider}`);
  }
  return config.defaultModel;
}

export function getProviderName(provider: string): string {
  return DEFAULT_API_CONFIGS[provider]?.name || provider;
}

export async function callAIWithFallback<T>(
  providerOrder: string[],
  callFn: (provider: string) => Promise<T>,
  onProviderSwitch?: (provider: string) => void
): Promise<{ success: true; data: T; provider: string } | { success: false; error: string }> {
  const errors: string[] = [];

  for (const provider of providerOrder) {
    try {
      if (onProviderSwitch) {
        onProviderSwitch(provider);
      }
      const data = await callFn(provider);
      return { success: true, data, provider };
    } catch (err: any) {
      const msg = err.message || String(err);
      errors.push(`${getProviderName(provider)}: ${msg}`);
      console.warn(`[AI Fallback] ${provider} 调用失败:`, msg);
      // 继续尝试下一个厂商
    }
  }

  return {
    success: false,
    error: `所有 API 厂商均调用失败:\n${errors.join('\n')}`,
  };
}
