/**
 * LLM 服务 - 自媒体内容生成
 * 支持多模型调用：OpenAI / DeepSeek / Claude
 */
import { OpenAI } from 'openai';
import { getOpenAIClient, callAIWithFallback, getCurrentModel } from '../apikey';

// 提示词模板
export const PROMPTS = {
  // 选题生成 (参考 graph_xiaohongshu TOPIC_SYSTEM_PROMPT)
  generateTopics: (category: string, count: number = 5) => `
你是一位小红书10万+爆款标题专家，深谙小红书平台的流量密码和爆款逻辑。

请根据以下方向生成 ${count} 个爆款选题标题：
方向：${category}

爆款标题公式（灵活选用）：
1. 数字法："3个/5步/10种 + 具体利益"
2. 反差法："从XX到XX，只因做对了这一件事"
3. 悬念法："99%的人不知道的XX秘密"
4. 情绪法："后悔没早点知道的XX"
5. 对比法："XX vs XX，差距竟然这么大"

严格要求：
1. 标题控制在15字以内，简短有力
2. 必须包含1-2个emoji，增强视觉吸引力
3. 直击痛点或好奇心，让人忍不住点进去
4. 适合移动端浏览和快速扫读
5. 结合当前最新热点趋势

请直接返回JSON数组格式：
[
  {
    "title": "选题标题",
    "sellingPoint": "核心卖点",
    "targetAudience": "目标受众",
    "trendScore": 85,
    "keywords": ["关键词1", "关键词2"]
  }
]
`,

  // 文案生成 (参考 graph_xiaohongshu ARTICLE_SYSTEM_PROMPT)
  writeArticle: (topic: string, platform: string, wordCount: number = 1000) => `
你是一位小红书爆款内容创作专家，擅长写出引发共鸣、超高互动率的技术类文案。

请为"${topic}"撰写一篇${platform}平台的${wordCount}字文案。

平台风格：
${platform === '小红书' || platform === 'xiaohongshu' ? `
【小红书风格】
- 标题用emoji开头，20字以内，有数字+情绪词
- 正文800-1200字，分4-6个段落
- 每段2-3句话，短句为主，适合手机阅读
- emoji点缀标题和重点内容（🎯💡✅⭐🔥）
- 语气亲切像朋友聊天，不要说教感
- 结尾设置互动话题："你遇到过吗？评论区聊聊～"
- 附带3-5个话题标签：#AI编程 #技术干货 等
- 标记重点用 ✅ ❌ 💡 等符号
` : `
【公众号风格】
- 标题正式专业，体现深度和价值
- 文章1500-2500字，结构完整
- 使用Markdown格式（## 小标题分段）
- 逻辑清晰：引言→核心观点→案例分析→总结
- 语言专业但易读，避免过于学术化
- 适当引用数据和案例增加说服力
- 结尾呼吁行动：关注、转发、收藏
`}

格式要求：
- 使用Markdown格式输出
- 重要文字用 **加粗** 标记
- 列表使用 - 或 1. 2. 3. 格式
- 直接返回文案内容，不要包含格式说明
`,

  // 文案重写/优化 (参考 graph_xiaohongshu 修订机制)
  rewriteArticle: (article: string, feedback: string) => `
请根据以下修改意见重写文案：

修改意见：${feedback}

原文案：
${article}

重写原则：
1. 优先处理修改意见中提到的问题
2. 保持原文案的核心信息和风格不变
3. 优化表达方式，提升文案质量
4. 如果修改意见不够具体，适当扩展和完善内容
5. 保持适合平台的风格

请直接返回修改后的完整文案内容。
`,

  // 图片生成提示词
  generateImagePrompt: (articleSummary: string, imageType: string) => `
你是一位AI绘画提示词工程师。请根据以下文案摘要，生成一个适合${imageType}的AI绘画提示词。

文案摘要：${articleSummary}

要求：
1. 提示词要中文描述，适合国内AI绘画工具
2. 包含画面风格、主体、配色、构图等要素
3. 适合技术类内容配图，专业且有设计感
4. 直接返回提示词文本，不要其他说明
`,

  // 提取文案要点（用于生成图片）(参考 graph_xiaohongshu VISUAL_SYSTEM_PROMPT)
  extractKeyPoints: (article: string) => `
请从以下文案中提取3个核心视觉要点，用于生成配图：

文案：
${article}

提取要求：
1. 每个要点是一个具体的视觉场景描述
2. 适合扁平化/插画风格的配图
3. 不要包含文字内容，只描述画面元素
4. 要点之间要有差异，覆盖不同维度
5. 每个要点不超过20字
6. 适合技术类内容的配图风格

示例格式：
- "程序员深夜敲代码的侧影"
- "代码编辑器上跳动的字符"
- "AI机器人帮助程序员工作"

直接返回JSON数组格式：["要点1", "要点2", "要点3"]
`,

  // 平台适配优化
  optimizeForPlatform: (article: string, platform: string) => `
请将以下文案优化为适合${platform}平台的版本：

原文案：
${article}

优化要求：
${platform === '小红书' ? `
- 标题更吸引眼球，使用emoji
- 段落简短，适合手机阅读
- 添加3-5个相关话题标签
- 增加互动引导语
- 总字数控制在800-1500字
` : `
- 标题更正式专业
- 段落可以适当加长
- 增加深度分析内容
- 适合公众号长文阅读
- 总字数控制在1500-3000字
`}

直接返回优化后的文案。
`,
};

// 获取 provider 顺序
function getProviderOrder(): string[] {
  // 可以从配置读取，这里使用默认顺序
  return ['deepseek', 'modelspace', 'deepseekLocal'];
}

// 调用 LLM 生成内容
export async function callLLM(prompt: string, options: {
  model?: string;
  temperature?: number;
  maxTokens?: number;
} = {}): Promise<string> {
  const providerOrder = getProviderOrder();
  
  const result = await callAIWithFallback(
    providerOrder,
    async (provider) => {
      console.log(`[LLM] 使用厂商: ${provider}`);
      
      // 支持 DeepSeek 本地版
      if (provider === 'deepseekLocal') {
        const { getDeepSeekClient } = await import('../deepseek');
        const dsClient = getDeepSeekClient();
        if (!dsClient) throw new Error('DeepSeek本地版未初始化');
        
        const response = await dsClient.chat(
          [
            { role: 'user', content: '你是一位专业的AI技术内容运营专家。\n\n' + prompt },
          ],
          'deepseek-chat',
          3
        );
        if (!response) throw new Error('DeepSeek返回为空');
        return response.content;
      }
      
      // 标准 OpenAI 兼容 API
      const client = getOpenAIClient(provider);
      const model = getCurrentModel(provider);
      
      const response = await client.chat.completions.create({
        model,
        messages: [
          { role: 'system', content: '你是一位专业的AI技术内容运营专家。' },
          { role: 'user', content: prompt },
        ],
        temperature: options.temperature ?? 0.7,
        max_tokens: options.maxTokens ?? 4000,
      });
      
      return response.choices[0]?.message?.content || '';
    }
  );
  
  if (!result.success) {
    throw new Error(result.error);
  }
  
  return result.data;
}

// 生成选题
export async function generateTopics(category: string, count: number = 5): Promise<any[]> {
  const prompt = PROMPTS.generateTopics(category, count);
  const response = await callLLM(prompt, { temperature: 0.8 });
  
  try {
    // 提取 JSON 部分
    const jsonMatch = response.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    return [];
  } catch (e) {
    console.error('解析选题失败:', e);
    return [];
  }
}

// 生成文案
export async function writeArticle(topic: string, platform: string, wordCount: number = 1000): Promise<string> {
  const prompt = PROMPTS.writeArticle(topic, platform, wordCount);
  return await callLLM(prompt, { temperature: 0.7, maxTokens: 4000 });
}

// 重写文案
export async function rewriteArticle(article: string, feedback: string): Promise<string> {
  const prompt = PROMPTS.rewriteArticle(article, feedback);
  return await callLLM(prompt, { temperature: 0.7 });
}

// 生成图片提示词
export async function generateImagePrompt(articleSummary: string, imageType: string): Promise<string> {
  const prompt = PROMPTS.generateImagePrompt(articleSummary, imageType);
  return await callLLM(prompt, { temperature: 0.8 });
}

// 提取关键要点
export async function extractKeyPoints(article: string): Promise<string[]> {
  const prompt = PROMPTS.extractKeyPoints(article);
  const response = await callLLM(prompt, { temperature: 0.5 });
  
  try {
    const jsonMatch = response.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    return [];
  } catch (e) {
    console.error('解析要点失败:', e);
    return [];
  }
}

// 平台适配优化
export async function optimizeForPlatform(article: string, platform: string): Promise<string> {
  const prompt = PROMPTS.optimizeForPlatform(article, platform);
  return await callLLM(prompt, { temperature: 0.6 });
}
