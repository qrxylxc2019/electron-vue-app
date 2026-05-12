/**
 * 案例题导入脚本（支持图片）
 * 
 * 使用说明：
 * 1. 将题目 markdown 文件和图片放在同一个文件夹中
 * 2. 运行: node scripts/insert_case_with_images.js <题目文件夹路径>
 * 
 * 图片命名规范：
 * - 图片会被复制到 src/renderer/public/case_images/
 * - 数据库中存储的路径格式: /case_images/xxx.png
 * - 命名格式: case_{materialId}_q{questionNumber}_{seq}.png
 * 
 * Markdown 格式规范：
 * - # 考点X：xxx  -> 考点标题（忽略）
 * - ## 试题 N     -> 新案例开始
 * - 试题 N 的内容 -> 案例材料（到第一个 **【问题】** 之前）
 * - **【问题 X】（Y 分）** -> 小题标题
 * - 小题内容（到下一个问题或文件结束）
 * - <img src="./xxx.png"> -> 图片引用，会被替换为项目内路径
 */

const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

// 配置
const DB_PATH = path.join(__dirname, '..', 'out', 'win-unpacked', 'resources', 'data', 'qingrui.db');
const TARGET_IMAGE_DIR = path.join(__dirname, '..', 'src', 'renderer', 'public', 'case_images');
const SUBJECT_NAME = '高项案例';

// 获取命令行参数
const sourceDir = process.argv[2] || path.join(__dirname, '图片');
const mdFile = path.join(sourceDir, '题目整理.md');

if (!fs.existsSync(mdFile)) {
  console.error('错误: 找不到题目整理.md 文件:', mdFile);
  process.exit(1);
}

// 确保目标图片目录存在
if (!fs.existsSync(TARGET_IMAGE_DIR)) {
  fs.mkdirSync(TARGET_IMAGE_DIR, { recursive: true });
}

// 连接数据库
const db = new Database(DB_PATH);

// 获取或创建科目目录
let dirRow = db.prepare('SELECT id FROM directories WHERE name = ?').get(SUBJECT_NAME);
let dirId;
if (!dirRow) {
  const result = db.prepare('INSERT INTO directories (name, sort_order) VALUES (?, ?)').run(SUBJECT_NAME, 0);
  dirId = Number(result.lastInsertRowid);
  console.log('创建科目:', SUBJECT_NAME, 'id:', dirId);
} else {
  dirId = dirRow.id;
  console.log('找到科目:', SUBJECT_NAME, 'id:', dirId);
}

// 读取 markdown 内容
const mdContent = fs.readFileSync(mdFile, 'utf-8');

// 解析 markdown，提取案例
function parseCases(content) {
  const cases = [];
  
  // 按 "## 试题" 分割
  const caseBlocks = content.split(/(?=## 试题\s*\d+)/).filter(b => b.trim());
  
  for (const block of caseBlocks) {
    const caseMatch = block.match(/^## 试题\s*(\d+)\s*\n([\s\S]*)/);
    if (!caseMatch) continue;
    
    const caseNum = parseInt(caseMatch[1]);
    const caseBody = caseMatch[2].trim();
    
    // 分割材料和小题
    // 材料内容：从开头到第一个 **【问题】**
    const materialMatch = caseBody.match(/^([\s\S]*?)(?=\*\*【问题\s*\d+】)/);
    const materialContent = materialMatch ? materialMatch[1].trim() : caseBody;
    
    // 提取小题
    const questions = [];
    const questionRegex = /\*\*【问题\s*(\d+)】\s*(?:（\s*(\d+)\s*分\s*）)?\*\*\s*\n?([\s\S]*?)(?=\*\*【问题\s*\d+】|$)/g;
    let qMatch;
    
    while ((qMatch = questionRegex.exec(caseBody)) !== null) {
      questions.push({
        number: parseInt(qMatch[1]),
        score: qMatch[2] ? parseInt(qMatch[2]) : null,
        title: qMatch[3].trim()
      });
    }
    
    cases.push({
      number: caseNum,
      material: materialContent,
      questions: questions
    });
  }
  
  return cases;
}

// 处理图片引用
function processImages(content, caseNum, questionNum, sourceDir) {
  let processedContent = content;
  const imgRegex = /<img\s+src="\.\/([^"]+)"\s*\/?>/g;
  let match;
  let imgSeq = 1;
  
  while ((match = imgRegex.exec(content)) !== null) {
    const originalImgName = match[1];
    const sourceImgPath = path.join(sourceDir, originalImgName);
    
    // 生成新文件名: case_{caseNum}_q{questionNum}_{seq}.png
    const ext = path.extname(originalImgName);
    const newImgName = `case_${caseNum}_q${questionNum}_${imgSeq}${ext}`;
    const targetImgPath = path.join(TARGET_IMAGE_DIR, newImgName);
    
    // 复制图片
    if (fs.existsSync(sourceImgPath)) {
      fs.copyFileSync(sourceImgPath, targetImgPath);
      console.log('  复制图片:', originalImgName, '->', newImgName);
    } else {
      console.warn('  警告: 找不到图片:', sourceImgPath);
    }
    
    // 替换引用路径
    // 在 Electron 中，public 目录下的文件可以通过根路径访问
    const webPath = `/case_images/${newImgName}`;
    processedContent = processedContent.replace(match[0], `![image](${webPath})`);
    
    imgSeq++;
  }
  
  return processedContent;
}

// 主流程
const cases = parseCases(mdContent);
console.log('解析到案例数:', cases.length);

const insertMaterial = db.prepare(`
  INSERT INTO case_materials (directory_id, title, content, sort_order)
  VALUES (?, ?, ?, ?)
`);

const insertQuestion = db.prepare(`
  INSERT INTO case_questions (material_id, question_number, title, answer, sort_order)
  VALUES (?, ?, ?, ?, ?)
`);

for (const caseItem of cases) {
  console.log(`\n处理案例 ${caseItem.number}:`);
  console.log('  材料长度:', caseItem.material.length);
  console.log('  小题数量:', caseItem.questions.length);
  
  // 处理材料中的图片（如果有的话，一般材料里没有图片）
  const processedMaterial = processImages(caseItem.material, caseItem.number, 0, sourceDir);
  
  // 插入案例材料
  const materialResult = insertMaterial.run(
    dirId,
    `案例 ${caseItem.number}`,
    processedMaterial,
    caseItem.number
  );
  const materialId = Number(materialResult.lastInsertRowid);
  console.log('  插入材料 id:', materialId);
  
  // 插入小题
  for (const q of caseItem.questions) {
    // 处理小题中的图片
    const processedQuestion = processImages(q.title, caseItem.number, q.number, sourceDir);
    
    const questionResult = insertQuestion.run(
      materialId,
      q.number,
      processedQuestion,
      null, // 答案暂时为空，需要另外录入
      q.number
    );
    console.log('  插入问题', q.number, 'id:', Number(questionResult.lastInsertRowid));
  }
}

console.log('\n完成!');
db.close();
