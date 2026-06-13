/**
 * 知识库 Agent 搜索服务
 * 基于 LangGraph 的 Agent 流程：
 * 1. 分析用户意图 → 2. 检索知识库 → 3. 分析检索结果 → 4. 生成回答
 * 
 * 使用本地文件系统作为知识库，无需购买向量数据库服务。
 * 采用 TF-IDF + 关键词匹配实现轻量级检索。
 */

import fs from 'fs';
import path from 'path';
import { ipcMain, app } from 'electron';
import { execSync } from 'child_process';
import { callLLM } from './index';

// 知识库根目录
const KB_DIR = 'D:\\python脚本\\knowledge';

// 确保目录存在
if (!fs.existsSync(KB_DIR)) {
  fs.mkdirSync(KB_DIR, { recursive: true });
}

// ========== 文档索引与检索 ==========

interface DocumentChunk {
  file: string;
  content: string;
  startLine: number;
  endLine: number;
}

interface SearchResult {
  file: string;
  content: string;
  score: number;
}

// 简单的分词函数
function tokenize(text: string): string[] {
  // 保留中文单字和英文单词
  const tokens: string[] = [];
  const cleaned = text.toLowerCase().replace(/[^\u4e00-\u9fa5a-z0-9]/g, ' ');
  const words = cleaned.split(/\s+/).filter(w => w.length > 0);
  
  for (const word of words) {
    if (/^[\u4e00-\u9fa5]+$/.test(word)) {
      // 中文：保留单字和词组
      if (word.length === 1) {
        tokens.push(word);
      } else {
        tokens.push(word);
        // 也拆分成单字，增加匹配概率
        for (const char of word) {
          tokens.push(char);
        }
      }
    } else if (word.length > 1) {
      // 英文/数字：保留长度>1的
      tokens.push(word);
    }
  }
  
  return tokens;
}

// 计算 TF-IDF 分数
function calculateScore(query: string, content: string): number {
  const queryTokens = tokenize(query);
  const contentTokens = tokenize(content);
  
  if (queryTokens.length === 0 || contentTokens.length === 0) return 0;
  
  const contentTokenSet = new Set(contentTokens);
  let score = 0;
  
  for (const token of queryTokens) {
    // 精确匹配加分
    if (contentTokenSet.has(token)) {
      score += 1;
      // 标题或开头出现加分
      if (content.toLowerCase().indexOf(token) < 200) {
        score += 0.5;
      }
    }
    // 部分匹配
    for (const ct of contentTokenSet) {
      if (ct.includes(token) || token.includes(ct)) {
        score += 0.3;
      }
    }
  }
  
  // 归一化
  return score / queryTokens.length;
}

// PDF 文本提取（使用 Python PyPDF2）
function extractPdfText(filePath: string): string {
  try {
    // 使用 app.getAppPath() 定位脚本，确保开发和生产环境都能工作
    let scriptPath: string;
    try {
      const appPath = app.getAppPath();
      scriptPath = path.join(appPath, 'src', 'main', 'llm', 'pdf_extractor.py');
      if (!fs.existsSync(scriptPath)) {
        // 如果不在 appPath 下，尝试使用 __dirname（开发环境）
        scriptPath = path.join(__dirname, 'pdf_extractor.py');
      }
    } catch {
      scriptPath = path.join(__dirname, 'pdf_extractor.py');
    }
    
    console.log(`[KB] PDF 脚本路径: ${scriptPath}`);
    console.log(`[KB] 脚本存在: ${fs.existsSync(scriptPath)}`);
    
    const result = execSync(`python "${scriptPath}" "${filePath}"`, {
      encoding: 'utf-8',
      timeout: 30000,
      maxBuffer: 10 * 1024 * 1024, // 10MB
      env: {
        ...process.env,
        PYTHONIOENCODING: 'utf-8',
      },
    });
    return result;
  } catch (e: any) {
    console.error(`[KB] PDF 解析失败 ${filePath}:`, e.message);
    return '';
  }
}

// 读取并分块文档
function readDocumentChunks(filePath: string): DocumentChunk[] {
  const ext = path.extname(filePath).toLowerCase();
  let content: string;

  if (ext === '.pdf') {
    content = extractPdfText(filePath);
    if (!content) {
      return [];
    }
  } else {
    content = fs.readFileSync(filePath, 'utf-8');
  }

  const lines = content.split('\n');
  const chunks: DocumentChunk[] = [];
  
  // 按段落或固定大小分块
  const chunkSize = 50; // 每块50行
  for (let i = 0; i < lines.length; i += chunkSize) {
    const chunkLines = lines.slice(i, i + chunkSize);
    chunks.push({
      file: path.basename(filePath),
      content: chunkLines.join('\n'),
      startLine: i + 1,
      endLine: Math.min(i + chunkSize, lines.length),
    });
  }
  
  return chunks;
}

// 检索知识库
async function searchKnowledgeBase(query: string, files?: string[]): Promise<SearchResult[]> {
  // 获取所有知识库文件
  let kbFiles: string[] = [];
  
  if (files && files.length > 0) {
    // 使用指定文件
    kbFiles = files
      .map(f => path.join(KB_DIR, f))
      .filter(f => fs.existsSync(f));
  } else {
    // 读取目录下所有文件（包括 PDF）
  try {
    const entries = fs.readdirSync(KB_DIR, { withFileTypes: true });
    kbFiles = entries
      .filter(e => e.isFile() && !e.name.startsWith('.') && (e.name.endsWith('.txt') || e.name.endsWith('.md') || e.name.endsWith('.pdf') || e.name.endsWith('.json')))
      .map(e => path.join(KB_DIR, e.name));
  } catch (e) {
    console.error('读取知识库目录失败:', e);
  }
  }
  
  if (kbFiles.length === 0) {
    return [];
  }
  
  // 对所有文档分块并评分
  const allResults: SearchResult[] = [];
  
  for (const filePath of kbFiles) {
    try {
      const chunks = readDocumentChunks(filePath);
      for (const chunk of chunks) {
        const score = calculateScore(query, chunk.content);
        console.log(`[KB] ${chunk.file} L${chunk.startLine}-${chunk.endLine} score=${score.toFixed(3)}`);
        if (score > 0.01) { // 阈值过滤
          allResults.push({
            file: chunk.file,
            content: chunk.content,
            score,
          });
        }
      }
    } catch (e) {
      console.error(`读取文件失败 ${filePath}:`, e);
    }
  }
  
  // 按分数排序，取前5个
  allResults.sort((a, b) => b.score - a.score);
  return allResults.slice(0, 5);
}

// ========== Agent 流程 ==========

interface AgentState {
  query: string;
  files?: string[];
  thought: string;
  retrievalResults: SearchResult[];
  answer: string;
  duration: number;
}

// Agent 步骤1：分析用户意图
async function analyzeIntent(query: string): Promise<string> {
  const prompt = `你是知识库 Agent 的意图分析模块。

用户问题：${query}

请分析：
1. 用户的核心问题是什么？
2. 需要从知识库中检索哪些关键信息？
3. 检索关键词有哪些？

请用简洁的中文回答。`;

  try {
    return await callLLM(prompt, { temperature: 0.3, maxTokens: 500 });
  } catch (e) {
    return '意图分析：用户希望从知识库中检索相关信息。';
  }
}

// Agent 步骤2：执行检索
async function executeRetrieval(query: string, files?: string[]): Promise<{ results: SearchResult[]; query: string }> {
  const results = await searchKnowledgeBase(query, files);
  return { results, query };
}

// Agent 步骤3：分析检索结果
async function analyzeResults(query: string, results: SearchResult[]): Promise<string> {
  if (results.length === 0) {
    return '未找到相关知识库内容。';
  }

  const context = results
    .map((r, i) => `[来源${i + 1}] ${r.file} (相关度: ${(r.score * 100).toFixed(1)}%)\n${r.content.substring(0, 800)}`)
    .join('\n\n---\n\n');

  const prompt = `你是知识库 Agent 的结果分析模块。

用户问题：${query}

检索到的知识库内容：
${context}

请分析：
1. 哪些内容最相关？
2. 这些内容如何回答用户的问题？
3. 是否有信息缺失或矛盾？

请用简洁的中文回答。`;

  try {
    return await callLLM(prompt, { temperature: 0.3, maxTokens: 800 });
  } catch (e) {
    return `检索到 ${results.length} 条相关内容，正在整合回答...`;
  }
}

// Agent 步骤4：生成最终回答
async function generateAnswer(query: string, results: SearchResult[]): Promise<string> {
  if (results.length === 0) {
    return '抱歉，在知识库中没有找到与您的提问相关的内容。请尝试：\n1. 使用不同的关键词提问\n2. 添加更多知识库文件\n3. 检查文件是否已正确索引';
  }

  const context = results
    .map((r, i) => `[来源${i + 1}] ${r.file}\n${r.content.substring(0, 1000)}`)
    .join('\n\n---\n\n');

  const prompt = `你是知识库问答助手。请基于以下知识库内容回答用户问题。

## 用户问题
${query}

## 知识库内容
${context}

## 回答要求
1. 基于知识库内容回答，不要编造信息
2. 如果知识库内容不足以回答，请明确说明
3. 引用来源时使用 [来源1]、[来源2] 格式标注
4. 使用 Markdown 格式输出
5. 语言简洁清晰，重点突出

请直接输出回答内容。`;

  try {
    return await callLLM(prompt, { temperature: 0.5, maxTokens: 2000 });
  } catch (e) {
    return '生成回答时出错，请稍后重试。';
  }
}

// 完整 Agent 流程
async function runAgent(query: string, files?: string[]): Promise<AgentState> {
  const startTime = Date.now();
  
  const state: AgentState = {
    query,
    files,
    thought: '',
    retrievalResults: [],
    answer: '',
    duration: 0,
  };

  // 步骤1：分析意图
  state.thought = await analyzeIntent(query);
  
  // 步骤2：检索知识库
  const retrieval = await executeRetrieval(query, files);
  state.retrievalResults = retrieval.results;
  
  // 步骤3：分析结果（如果检索到内容）
  if (state.retrievalResults.length > 0) {
    state.thought += '\n\n' + await analyzeResults(query, state.retrievalResults);
  }
  
  // 步骤4：生成回答
  state.answer = await generateAnswer(query, state.retrievalResults);
  
  state.duration = (Date.now() - startTime) / 1000;
  
  return state;
}

// ========== IPC 处理 ==========

export function setupKnowledgeBaseIPC() {
  // 获取知识库文件列表
  ipcMain.handle('kb:getFiles', async () => {
    try {
      if (!fs.existsSync(KB_DIR)) {
        return { success: true, data: [] };
      }
      
      const entries = fs.readdirSync(KB_DIR, { withFileTypes: true });
      const files = entries
        .filter(e => e.isFile() && !e.name.startsWith('.'))
        .map(e => {
          const stat = fs.statSync(path.join(KB_DIR, e.name));
          return {
            name: e.name,
            path: e.name,
            size: stat.size,
            mtime: stat.mtime.toISOString(),
          };
        });
      
      return { success: true, data: files };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });

  // 添加知识库文件
  ipcMain.handle('kb:addFile', async (_event, data: { path?: string; content?: string }) => {
    try {
      if (data.path) {
        // 从路径复制文件
        const sourcePath = data.path;
        if (!fs.existsSync(sourcePath)) {
          return { success: false, error: '源文件不存在' };
        }
        const destPath = path.join(KB_DIR, path.basename(sourcePath));
        fs.copyFileSync(sourcePath, destPath);
        return { success: true, data: { name: path.basename(sourcePath) } };
      } else if (data.content) {
        // 直接保存内容
        const timestamp = Date.now();
        const fileName = `pasted_${timestamp}.txt`;
        const filePath = path.join(KB_DIR, fileName);
        fs.writeFileSync(filePath, data.content, 'utf-8');
        return { success: true, data: { name: fileName } };
      }
      return { success: false, error: '未提供文件路径或内容' };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });

  // Agent 知识库搜索
  ipcMain.handle('kb:agentSearch', async (_event, params: { query: string; files?: string[] }) => {
    try {
      const result = await runAgent(params.query, params.files);
      
      return {
        success: true,
        data: {
          thought: result.thought,
          duration: result.duration,
          retrieval: {
            query: params.query,
            results: result.retrievalResults,
          },
          answer: result.answer,
        },
      };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });
}

export default setupKnowledgeBaseIPC;
