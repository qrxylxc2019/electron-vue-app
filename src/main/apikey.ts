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
    defaultModel: 'deepseek-v4-flash',
    apiKey: 'sk-793f0d8a79b547b996d39f2f1f8af852',
  },
  deepseekLocal: {
    name: 'DeepSeek本地版',
    baseURL: 'http://localhost:8000/v1',
    defaultModel: 'deepseek-chat',
    apiKey: '',
  },
};

// DeepSeek 本地版 Token 存储（由业务层传入，不直接访问 localStorage）
let deepSeekLocalTokenCache: string = '';

// 获取 DeepSeek 本地版 Token
export function getDeepSeekLocalToken(): string {
  return deepSeekLocalTokenCache;
}

// 设置 DeepSeek 本地版 Token
export function setDeepSeekLocalToken(token: string): void {
  deepSeekLocalTokenCache = token;
}

// 导出 DeepSeek 本地版配置
export const DEEPSEEK_LOCAL_CONFIG = {
  name: 'DeepSeek本地版',
  baseURL: 'https://chat.deepseek.com',
  defaultModel: 'deepseek-chat',
};

export const PROMPTS = {
explainQuestion: (questionTitle: string, correctAnswer: string, explanation: string, options?: string) => ({
system: `你是一位资深的信息系统项目管理师考试辅导专家，擅长用通俗易懂的方式讲解题目。我是0基础。
你的讲解风格：
1. 先给出明确的答案
2. 详细解释为什么这个答案是正确的
3. 分析其他选项为什么是错误的（如果有选项）
4. 使用简洁清晰的语言，避免过于学术化的表达
5. 500字左右`,
user: `请详细讲解以下这道题目：

【题目】${questionTitle}${options ? '\n\n【选项】\n' + options : ''}

【正确答案】${correctAnswer}

【解析】${explanation || '暂无解析'}

请按照以下结构进行讲解：
1. 直接给出答案
2. 详细解析（为什么选这个答案）`,
}),

  // 生成同类题（20道）
  generateSimilar: (questionData: any) => ({
    system: `你是一位资深软考高项命题专家，擅长根据已有题目生成高质量的高项同类练习题。生成要求：
1. 保持与原题相同的知识点和考查方向，必须是高项的
2. 题干表述要有所变化，不能照搬原题
3. 选项内容要重新设计，但考查点一致
4. 难度与原题相当
5. 必须输出标准JSON格式，包含5道题目
6. 每道题包含：title(题干)、option_a/b/c/d(选项)、correct_answer(正确答案A/B/C/D)、explanation(解析)
7. 题目类型与原题一致
8. 确保JSON格式完整有效，不要截断`,
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

  // 根据主题生成同类题（技能模式）
  generateSimilarByTopic: (topic: string) => ({
    system: `你是一位资深软考高项命题专家，擅长根据用户指定的主题生成高质量的高项同类练习题。生成要求：
1. 题目必须紧扣用户指定的主题，考查高项核心知识点
2. 题干表述清晰、专业，符合软考高项考试风格
3. 选项设计要有干扰性，考查对知识点的深入理解
4. 难度适中，符合高项考试水平
5. 必须输出标准JSON格式，包含5道题目
6. 每道题包含：title(题干)、option_a/b/c/d(选项)、correct_answer(正确答案A/B/C/D)、explanation(解析)
7. 确保JSON格式完整有效，不要截断
8. 解析要详细说明为什么正确选项是对的，其他选项错在哪里`,
    user: `请根据以下主题，生成5道高项同类练习题：

【主题】${topic}

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

  // 案例题小题解析（材料+小题）
  explainCaseQuestion: (materialTitle: string, materialContent: string, questionNumber: number, questionTitle: string, answer: string) => ({
    system: `你是一位资深的信息系统项目管理师案例题辅导专家，擅长分析案例材料。`,
    user: `请回答以下这道案例题：

【案例材料标题】${materialTitle}

【案例材料内容】
${materialContent}

【第 ${questionNumber} 小题】
${questionTitle}

【参考答案】
${answer || '暂无参考答案'}

请按照以下结构进行讲解，像考试答案列出回答的点。比如 
1没有制定质量管理计划、质量测量指标
2小林在编制测试用例时未完全覆盖所有功能，导致在测试时出现遗漏`,
  }),

  // 英语阅读小题解析
  explainEnglishQuestion: (materialTitle: string, materialContent: string, questionNumber: number, questionTitle: string, options: string, answer: string) => ({
    system: `你是一位资深的考研英语阅读理解辅导专家，擅长分析阅读材料并给出清晰的解题思路。`,
    user: `请详细讲解以下这道英语阅读理解题：

【阅读材料标题】${materialTitle}

【阅读材料内容】
${materialContent}

【第 ${questionNumber} 小题】
${questionTitle}

【选项】
${options || '暂无选项'}

【参考答案】
${answer || '暂无参考答案'}

请按照以下结构进行讲解：
1. 题目定位（在材料中的位置）
2. 选项分析（逐一分析每个选项）
3. 正确答案解析
4. 解题技巧`,
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

  // 提取段落关键词（用于记忆）
  extractKeywords: (paragraph: string) => ({
    system: `你是一位资深的信息系统项目管理师考试辅导专家，擅长从复杂文本中提取核心关键词，帮助考生快速记忆段落内容。

提取要求：
1. 提取关键词或关键短语，数量根据段落内容长度决定
2. 关键词必须能概括段落的核心概念、关键流程、重要工具或核心观点
3. 优先选择专业术语、核心概念、关键人物、重要数字、核心流程步骤
4. 关键词之间要有逻辑关联，能串联成记忆线索，我能根据这些关键词，剩下的自己写也能补充跟原文差不多的意思。
5. 不要提取过于泛泛的词（如"管理"、"项目"），要有具体指向性
6. 输出格式：仅返回关键词，用顿号"、"分隔，不要有任何其他说明文字
比如 管理项目知识是运用现有资源生成新知识，以实现项目目标并帮助项目组织学习的过程。在项目的整个过程中，我都特别重视项目的知识管理和信息管理，
那么关键词可以为 管理项目知识 生成新知识 过程 项目的知识管理和信息管理
`,
    user: `请从以下段落中提取核心关键词，用于快速记忆该段内容：

【段落内容】
${paragraph}

请仅返回关键词，用顿号分隔。`,
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
    timeout: 30000,
    maxRetries: 0,
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
      console.log(`[AI Fallback] 尝试调用: ${provider}`);
      if (onProviderSwitch) {
        onProviderSwitch(provider);
      }
      const data = await callFn(provider);
      console.log(`[AI Fallback]  ${provider} 调用成功`);
      return { success: true, data, provider };
    } catch (err: any) {
      const msg = err.message || String(err);
      errors.push(`${getProviderName(provider)}: ${msg}`);
      console.warn(`[AI Fallback] ${provider} 调用失败:`, msg);
    }
  }

  return {
    success: false,
    error: `所有 API 厂商均调用失败:\n${errors.join('\n')}`,
  };
}
