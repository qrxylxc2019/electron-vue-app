<template>
  <div class="english-word-container">
    <div class="header">
      <el-button class="back-btn" @click="goBack">
        <el-icon><ArrowLeft /></el-icon> 返回
      </el-button>
      <h2 class="title">英语单词 {{ currentRange }}</h2>
      <div class="header-actions">
        <el-button class="mode-btn" @click="toggleMode">
          {{ showMeaning ? '隐藏释义' : '显示释义' }}
        </el-button>
      </div>
    </div>

    <div class="word-grid">
      <div
        v-for="(word, index) in currentWords"
        :key="index"
        class="word-card"
        :class="{ 'show-meaning': showMeaning }"
      >
        <div class="word-text">{{ word.word }}</div>
        <div class="word-phonetic">{{ word.phonetic }}</div>
        <div class="word-meaning">{{ word.meaning }}</div>
      </div>
    </div>

    <div class="pagination-bar">
      <el-button
        class="page-btn"
        :disabled="currentPage === 1"
        @click="prevPage"
      >
        <el-icon><ArrowLeft /></el-icon> 上一页
      </el-button>
      <span class="page-info">第 {{ currentPage }} / {{ totalPages }} 页</span>
      <el-button
        class="page-btn"
        :disabled="currentPage === totalPages"
        @click="nextPage"
      >
        下一页 <el-icon><ArrowRight /></el-icon>
      </el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowLeft, ArrowRight } from '@element-plus/icons-vue'

const router = useRouter()

// 考研核心词汇
const allWords = ref([
  { word: 'abandon', phonetic: '/əˈbændən/', meaning: 'v. 放弃，抛弃' },
  { word: 'ability', phonetic: '/əˈbɪləti/', meaning: 'n. 能力，才能' },
  { word: 'absolute', phonetic: '/ˈæbsəluːt/', meaning: 'adj. 绝对的，完全的' },
  { word: 'absorb', phonetic: '/əbˈsɔːrb/', meaning: 'v. 吸收，吸引' },
  { word: 'abstract', phonetic: '/ˈæbstrækt/', meaning: 'adj. 抽象的 n. 摘要' },
  { word: 'abundant', phonetic: '/əˈbʌndənt/', meaning: 'adj. 丰富的，充裕的' },
  { word: 'academic', phonetic: '/ˌækəˈdemɪk/', meaning: 'adj. 学术的，学院的' },
  { word: 'accelerate', phonetic: '/əkˈseləreɪt/', meaning: 'v. 加速，促进' },
  { word: 'access', phonetic: '/ˈækses/', meaning: 'n. 进入，通道 v. 存取' },
  { word: 'accommodate', phonetic: '/əˈkɒmədeɪt/', meaning: 'v. 容纳，适应' },
  { word: 'accomplish', phonetic: '/əˈkɒmplɪʃ/', meaning: 'v. 完成，达到' },
  { word: 'account', phonetic: '/əˈkaʊnt/', meaning: 'n. 账户 v. 解释' },
  { word: 'accumulate', phonetic: '/əˈkjuːmjəleɪt/', meaning: 'v. 积累，积聚' },
  { word: 'accurate', phonetic: '/ˈækjərət/', meaning: 'adj. 准确的，精确的' },
  { word: 'achieve', phonetic: '/əˈtʃiːv/', meaning: 'v. 完成，达到' },
  { word: 'acknowledge', phonetic: '/əkˈnɒlɪdʒ/', meaning: 'v. 承认，致谢' },
  { word: 'acquire', phonetic: '/əˈkwaɪər/', meaning: 'v. 获得，习得' },
  { word: 'adapt', phonetic: '/əˈdæpt/', meaning: 'v. 适应，改编' },
  { word: 'adequate', phonetic: '/ˈædɪkwət/', meaning: 'adj. 足够的，适当的' },
  { word: 'adjust', phonetic: '/əˈdʒʌst/', meaning: 'v. 调整，适应' },
  { word: 'administration', phonetic: '/ədˌmɪnɪˈstreɪʃn/', meaning: 'n. 管理，行政' },
  { word: 'admire', phonetic: '/ədˈmaɪər/', meaning: 'v. 钦佩，赞赏' },
  { word: 'adopt', phonetic: '/əˈdɒpt/', meaning: 'v. 采用，收养' },
  { word: 'advance', phonetic: '/ədˈvɑːns/', meaning: 'v./n. 前进，进步' },
  { word: 'advantage', phonetic: '/ədˈvɑːntɪdʒ/', meaning: 'n. 优势，有利条件' },
  { word: 'adventure', phonetic: '/ədˈventʃər/', meaning: 'n. 冒险，奇遇' },
  { word: 'advocate', phonetic: '/ˈædvəkeɪt/', meaning: 'v. 提倡 n. 提倡者' },
  { word: 'affect', phonetic: '/əˈfekt/', meaning: 'v. 影响，感动' },
  { word: 'afford', phonetic: '/əˈfɔːrd/', meaning: 'v. 买得起，提供' },
  { word: 'aggressive', phonetic: '/əˈɡresɪv/', meaning: 'adj. 侵略的，好斗的' },
  { word: 'allocate', phonetic: '/ˈæləkeɪt/', meaning: 'v. 分配，拨给' },
  { word: 'alter', phonetic: '/ˈɔːltər/', meaning: 'v. 改变，修改' },
  { word: 'alternative', phonetic: '/ɔːlˈtɜːrnətɪv/', meaning: 'n. 替代品 adj. 可替代的' },
  { word: 'ambition', phonetic: '/æmˈbɪʃn/', meaning: 'n. 雄心，抱负' },
  { word: 'amount', phonetic: '/əˈmaʊnt/', meaning: 'n. 数量 v. 总计' },
  { word: 'analyze', phonetic: '/ˈænəlaɪz/', meaning: 'v. 分析，解析' },
  { word: 'ancestor', phonetic: '/ˈænsestər/', meaning: 'n. 祖先，先驱' },
  { word: 'announce', phonetic: '/əˈnaʊns/', meaning: 'v. 宣布，通知' },
  { word: 'annual', phonetic: '/ˈænjuəl/', meaning: 'adj. 每年的 n. 年刊' },
  { word: 'anticipate', phonetic: '/ænˈtɪsɪpeɪt/', meaning: 'v. 预期，期望' },
  { word: 'apparent', phonetic: '/əˈpærənt/', meaning: 'adj. 明显的，表面上的' },
  { word: 'appeal', phonetic: '/əˈpiːl/', meaning: 'v. 呼吁 n. 吸引力' },
  { word: 'appetite', phonetic: '/ˈæpɪtaɪt/', meaning: 'n. 食欲，欲望' },
  { word: 'apply', phonetic: '/əˈplaɪ/', meaning: 'v. 申请，应用' },
  { word: 'appoint', phonetic: '/əˈpɔɪnt/', meaning: 'v. 任命，约定' },
  { word: 'appreciate', phonetic: '/əˈpriːʃieɪt/', meaning: 'v. 感激，欣赏' },
  { word: 'approach', phonetic: '/əˈprəʊtʃ/', meaning: 'v. 接近 n. 方法' },
  { word: 'appropriate', phonetic: '/əˈprəʊpriət/', meaning: 'adj. 适当的，恰当的' },
  { word: 'approve', phonetic: '/əˈpruːv/', meaning: 'v. 批准，赞成' },
  { word: 'argue', phonetic: '/ˈɑːɡjuː/', meaning: 'v. 争论，辩论' },
  { word: 'arise', phonetic: '/əˈraɪz/', meaning: 'v. 出现，产生' },
  { word: 'arrange', phonetic: '/əˈreɪndʒ/', meaning: 'v. 安排，整理' },
  { word: 'artificial', phonetic: '/ˌɑːrtɪˈfɪʃl/', meaning: 'adj. 人工的，虚假的' },
  { word: 'aspect', phonetic: '/ˈæspekt/', meaning: 'n. 方面，外观' },
  { word: 'assemble', phonetic: '/əˈsembl/', meaning: 'v. 集合，装配' },
  { word: 'assess', phonetic: '/əˈses/', meaning: 'v. 评估，评定' },
  { word: 'assign', phonetic: '/əˈsaɪn/', meaning: 'v. 分配，指派' },
  { word: 'assist', phonetic: '/əˈsɪst/', meaning: 'v. 帮助，协助' },
  { word: 'associate', phonetic: '/əˈsəʊʃieɪt/', meaning: 'v. 联系 n. 同事' },
  { word: 'assume', phonetic: '/əˈsjuːm/', meaning: 'v. 假定，承担' },
  { word: 'assure', phonetic: '/əˈʃʊər/', meaning: 'v. 保证，使确信' },
  { word: 'atmosphere', phonetic: '/ˈætməsfɪər/', meaning: 'n. 大气，氛围' },
  { word: 'attach', phonetic: '/əˈtætʃ/', meaning: 'v. 附上，依恋' },
  { word: 'attain', phonetic: '/əˈteɪn/', meaning: 'v. 达到，获得' },
  { word: 'attempt', phonetic: '/əˈtempt/', meaning: 'v./n. 尝试，企图' },
  { word: 'attribute', phonetic: '/əˈtrɪbjuːt/', meaning: 'v. 归因于 n. 属性' },
  { word: 'authority', phonetic: '/ɔːˈθɒrəti/', meaning: 'n. 权威，当局' },
  { word: 'automatic', phonetic: '/ˌɔːtəˈmætɪk/', meaning: 'adj. 自动的' },
  { word: 'available', phonetic: '/əˈveɪləbl/', meaning: 'adj. 可用的，可得到的' },
  { word: 'average', phonetic: '/ˈævərɪdʒ/', meaning: 'n. 平均 adj. 平均的' },
  { word: 'aware', phonetic: '/əˈweər/', meaning: 'adj. 意识到的' },
  { word: 'balance', phonetic: '/ˈbæləns/', meaning: 'n. 平衡 v. 权衡' },
  { word: 'barrier', phonetic: '/ˈbæriər/', meaning: 'n. 障碍，屏障' },
  { word: 'behalf', phonetic: '/bɪˈhɑːf/', meaning: 'n. 利益，代表' },
  { word: 'behave', phonetic: '/bɪˈheɪv/', meaning: 'v. 行为，表现' },
  { word: 'benefit', phonetic: '/ˈbenɪfɪt/', meaning: 'n. 利益 v. 有益于' },
  { word: 'bias', phonetic: '/ˈbaɪəs/', meaning: 'n. 偏见 v. 使有偏见' },
  { word: 'bond', phonetic: '/bɒnd/', meaning: 'n. 纽带，债券 v. 结合' },
  { word: 'boundary', phonetic: '/ˈbaʊndəri/', meaning: 'n. 边界，界限' },
  { word: 'burden', phonetic: '/ˈbɜːrdn/', meaning: 'n. 负担 v. 使负重' },
  { word: 'calculate', phonetic: '/ˈkælkjuleɪt/', meaning: 'v. 计算，推算' },
  { word: 'campaign', phonetic: '/kæmˈpeɪn/', meaning: 'n. 运动，战役' },
  { word: 'capable', phonetic: '/ˈkeɪpəbl/', meaning: 'adj. 有能力的' },
  { word: 'capacity', phonetic: '/kəˈpæsəti/', meaning: 'n. 容量，能力' },
  { word: 'capture', phonetic: '/ˈkæptʃər/', meaning: 'v. 捕获 n. 捕获' },
  { word: 'category', phonetic: '/ˈkætəɡəri/', meaning: 'n. 类别，范畴' },
  { word: 'cease', phonetic: '/siːs/', meaning: 'v. 停止，终止' },
  { word: 'challenge', phonetic: '/ˈtʃælɪndʒ/', meaning: 'n./v. 挑战' },
  { word: 'channel', phonetic: '/ˈtʃænl/', meaning: 'n. 频道，渠道' },
  { word: 'chapter', phonetic: '/ˈtʃæptər/', meaning: 'n. 章节' },
  { word: 'circumstance', phonetic: '/ˈsɜːrkəmstæns/', meaning: 'n. 情况，环境' },
  { word: 'civil', phonetic: '/ˈsɪvl/', meaning: 'adj. 公民的，文明的' },
  { word: 'claim', phonetic: '/kleɪm/', meaning: 'v. 声称 n. 要求' },
  { word: 'classify', phonetic: '/ˈklæsɪfaɪ/', meaning: 'v. 分类，归类' },
  { word: 'climate', phonetic: '/ˈklaɪmət/', meaning: 'n. 气候' },
  { word: 'coincide', phonetic: '/ˌkəʊɪnˈsaɪd/', meaning: 'v. 同时发生，一致' },
  { word: 'collapse', phonetic: '/kəˈlæps/', meaning: 'v./n. 倒塌，崩溃' },
  { word: 'colleague', phonetic: '/ˈkɒliːɡ/', meaning: 'n. 同事' },
  { word: 'combine', phonetic: '/kəmˈbaɪn/', meaning: 'v. 结合，联合' },
  { word: 'commerce', phonetic: '/ˈkɒmɜːrs/', meaning: 'n. 商业，贸易' },
  { word: 'commit', phonetic: '/kəˈmɪt/', meaning: 'v. 犯(罪)，承诺' },
  { word: 'communicate', phonetic: '/kəˈmjuːnɪkeɪt/', meaning: 'v. 交流，传达' },
  { word: 'community', phonetic: '/kəˈmjuːnəti/', meaning: 'n. 社区，共同体' },
  { word: 'compare', phonetic: '/kəmˈpeər/', meaning: 'v. 比较，对比' },
  { word: 'compel', phonetic: '/kəmˈpel/', meaning: 'v. 强迫，迫使' },
  { word: 'compensate', phonetic: '/ˈkɒmpenseɪt/', meaning: 'v. 补偿，赔偿' },
  { word: 'compete', phonetic: '/kəmˈpiːt/', meaning: 'v. 竞争，比赛' },
  { word: 'competent', phonetic: '/ˈkɒmpɪtənt/', meaning: 'adj. 有能力的，胜任的' },
  { word: 'complaint', phonetic: '/kəmˈpleɪnt/', meaning: 'n. 抱怨，投诉' },
  { word: 'complex', phonetic: '/ˈkɒmpleks/', meaning: 'adj. 复杂的 n. 综合体' },
  { word: 'component', phonetic: '/kəmˈpəʊnənt/', meaning: 'n. 组成部分，零件' },
  { word: 'compose', phonetic: '/kəmˈpəʊz/', meaning: 'v. 组成，创作' },
  { word: 'comprehensive', phonetic: '/ˌkɒmprɪˈhensɪv/', meaning: 'adj. 全面的，综合的' },
  { word: 'compromise', phonetic: '/ˈkɒmprəmaɪz/', meaning: 'n./v. 妥协' },
  { word: 'concentrate', phonetic: '/ˈkɒnsntreɪt/', meaning: 'v. 集中，专注' },
  { word: 'concept', phonetic: '/ˈkɒnsept/', meaning: 'n. 概念，观念' },
  { word: 'conclude', phonetic: '/kənˈkluːd/', meaning: 'v. 结束，得出结论' },
  { word: 'concrete', phonetic: '/ˈkɒŋkriːt/', meaning: 'adj. 具体的 n. 混凝土' },
  { word: 'conduct', phonetic: '/kənˈdʌkt/', meaning: 'v. 实施 n. 行为' },
  { word: 'conference', phonetic: '/ˈkɒnfərəns/', meaning: 'n. 会议' },
  { word: 'confidence', phonetic: '/ˈkɒnfɪdəns/', meaning: 'n. 信心，自信' },
  { word: 'confirm', phonetic: '/kənˈfɜːrm/', meaning: 'v. 证实，确认' },
  { word: 'conflict', phonetic: '/ˈkɒnflɪkt/', meaning: 'n. 冲突，矛盾' },
  { word: 'confront', phonetic: '/kənˈfrʌnt/', meaning: 'v. 面对，遭遇' },
  { word: 'confuse', phonetic: '/kənˈfjuːz/', meaning: 'v. 使困惑，混淆' },
  { word: 'connect', phonetic: '/kəˈnekt/', meaning: 'v. 连接，联系' },
  { word: 'conscience', phonetic: '/ˈkɒnʃəns/', meaning: 'n. 良心，良知' },
  { word: 'conscious', phonetic: '/ˈkɒnʃəs/', meaning: 'adj. 有意识的，自觉的' },
  { word: 'consequence', phonetic: '/ˈkɒnsɪkwəns/', meaning: 'n. 结果，后果' },
  { word: 'conservative', phonetic: '/kənˈsɜːrvətɪv/', meaning: 'adj. 保守的 n. 保守者' },
  { word: 'considerable', phonetic: '/kənˈsɪdərəbl/', meaning: 'adj. 相当大的，重要的' },
  { word: 'considerate', phonetic: '/kənˈsɪdərət/', meaning: 'adj. 体贴的，考虑周到的' },
  { word: 'consist', phonetic: '/kənˈsɪst/', meaning: 'v. 由…组成，在于' },
  { word: 'consistent', phonetic: '/kənˈsɪstənt/', meaning: 'adj. 一致的，连贯的' },
  { word: 'constant', phonetic: '/ˈkɒnstənt/', meaning: 'adj. 不断的，恒定的' },
  { word: 'constitute', phonetic: '/ˈkɒnstɪtjuːt/', meaning: 'v. 构成，组成' },
  { word: 'construct', phonetic: '/kənˈstrʌkt/', meaning: 'v. 建造，构建' },
  { word: 'consult', phonetic: '/kənˈsʌlt/', meaning: 'v. 咨询，请教' },
  { word: 'consume', phonetic: '/kənˈsjuːm/', meaning: 'v. 消耗，消费' },
  { word: 'contact', phonetic: '/ˈkɒntækt/', meaning: 'n./v. 接触，联系' },
  { word: 'contain', phonetic: '/kənˈteɪn/', meaning: 'v. 包含，容纳' },
  { word: 'contemporary', phonetic: '/kənˈtempərəri/', meaning: 'adj. 当代的 n. 同代人' },
  { word: 'content', phonetic: '/ˈkɒntent/', meaning: 'n. 内容 adj. 满足的' },
  { word: 'contest', phonetic: '/ˈkɒntest/', meaning: 'n. 竞赛 v. 争夺' },
  { word: 'context', phonetic: '/ˈkɒntekst/', meaning: 'n. 上下文，环境' },
  { word: 'contract', phonetic: '/ˈkɒntrækt/', meaning: 'n. 合同 v. 收缩' },
  { word: 'contradict', phonetic: '/ˌkɒntrəˈdɪkt/', meaning: 'v. 矛盾，反驳' },
  { word: 'contrary', phonetic: '/ˈkɒntrəri/', meaning: 'adj. 相反的 n. 反面' },
  { word: 'contribute', phonetic: '/kənˈtrɪbjuːt/', meaning: 'v. 贡献，捐助' },
  { word: 'controversy', phonetic: '/ˈkɒntrəvɜːrsi/', meaning: 'n. 争论，争议' },
  { word: 'convenient', phonetic: '/kənˈviːniənt/', meaning: 'adj. 方便的' },
  { word: 'convention', phonetic: '/kənˈvenʃn/', meaning: 'n. 惯例，大会' },
  { word: 'convince', phonetic: '/kənˈvɪns/', meaning: 'v. 使确信，说服' },
  { word: 'cooperate', phonetic: '/kəʊˈɒpəreɪt/', meaning: 'v. 合作，协作' },
  { word: 'corporate', phonetic: '/ˈkɔːrpərət/', meaning: 'adj. 公司的，法人的' },
  { word: 'correspond', phonetic: '/ˌkɒrɪˈspɒnd/', meaning: 'v. 相符，通信' },
  { word: 'corrupt', phonetic: '/kəˈrʌpt/', meaning: 'adj. 腐败的 v. 使腐败' },
  { word: 'council', phonetic: '/ˈkaʊnsl/', meaning: 'n. 委员会，理事会' },
  { word: 'crucial', phonetic: '/ˈkruːʃl/', meaning: 'adj. 关键的，决定性的' },
  { word: 'cultivate', phonetic: '/ˈkʌltɪveɪt/', meaning: 'v. 培养，耕作' },
  { word: 'current', phonetic: '/ˈkʌrənt/', meaning: 'adj. 当前的 n. 水流' },
  { word: 'curriculum', phonetic: '/kəˈrɪkjələm/', meaning: 'n. 课程' },
  { word: 'deadline', phonetic: '/ˈdedlaɪn/', meaning: 'n. 截止日期' },
  { word: 'debate', phonetic: '/dɪˈbeɪt/', meaning: 'n./v. 辩论，争论' },
  { word: 'decade', phonetic: '/ˈdekeɪd/', meaning: 'n. 十年' },
  { word: 'decline', phonetic: '/dɪˈklaɪn/', meaning: 'v. 下降，拒绝' },
  { word: 'dedicate', phonetic: '/ˈdedɪkeɪt/', meaning: 'v. 致力于，奉献' },
  { word: 'define', phonetic: '/dɪˈfaɪn/', meaning: 'v. 定义，界定' },
  { word: 'deliberate', phonetic: '/dɪˈlɪbərət/', meaning: 'adj. 故意的 v. 深思' },
  { word: 'demonstrate', phonetic: '/ˈdemənstreɪt/', meaning: 'v. 证明，示范' },
  { word: 'deny', phonetic: '/dɪˈnaɪ/', meaning: 'v. 否认，拒绝' },
  { word: 'depart', phonetic: '/dɪˈpɑːrt/', meaning: 'v. 离开，出发' },
  { word: 'depend', phonetic: '/dɪˈpend/', meaning: 'v. 依靠，取决于' },
  { word: 'depict', phonetic: '/dɪˈpɪkt/', meaning: 'v. 描绘，描述' },
  { word: 'deprive', phonetic: '/dɪˈpraɪv/', meaning: 'v. 剥夺，使丧失' },
  { word: 'derive', phonetic: '/dɪˈraɪv/', meaning: 'v. 源于，获得' },
  { word: 'deserve', phonetic: '/dɪˈzɜːrv/', meaning: 'v. 应得，值得' },
  { word: 'desperate', phonetic: '/ˈdespərət/', meaning: 'adj. 绝望的，拼命的' },
  { word: 'destination', phonetic: '/ˌdestɪˈneɪʃn/', meaning: 'n. 目的地' },
  { word: 'detect', phonetic: '/dɪˈtekt/', meaning: 'v. 发现，探测' },
  { word: 'determine', phonetic: '/dɪˈtɜːrmɪn/', meaning: 'v. 决定，确定' },
  { word: 'devise', phonetic: '/dɪˈvaɪz/', meaning: 'v. 设计，发明' },
  { word: 'dimension', phonetic: '/daɪˈmenʃn/', meaning: 'n. 尺寸，维度' },
  { word: 'diminish', phonetic: '/dɪˈmɪnɪʃ/', meaning: 'v. 减少，缩小' },
  { word: 'discipline', phonetic: '/ˈdɪsəplɪn/', meaning: 'n. 纪律，学科' },
  { word: 'discrimination', phonetic: '/dɪˌskrɪmɪˈneɪʃn/', meaning: 'n. 歧视，辨别力' },
  { word: 'disguise', phonetic: '/dɪsˈɡaɪz/', meaning: 'v./n. 伪装，假扮' },
  { word: 'dismiss', phonetic: '/dɪsˈmɪs/', meaning: 'v. 解雇，驳回' },
  { word: 'dispute', phonetic: '/dɪˈspjuːt/', meaning: 'n./v. 争论，纠纷' },
  { word: 'distinct', phonetic: '/dɪˈstɪŋkt/', meaning: 'adj. 明显的，独特的' },
  { word: 'distinguish', phonetic: '/dɪˈstɪŋɡwɪʃ/', meaning: 'v. 区分，辨别' },
  { word: 'distribute', phonetic: '/dɪˈstrɪbjuːt/', meaning: 'v. 分配，分布' },
  { word: 'diverse', phonetic: '/daɪˈvɜːrs/', meaning: 'adj. 多样的，不同的' },
  { word: 'domestic', phonetic: '/dəˈmestɪk/', meaning: 'adj. 国内的，家庭的' },
  { word: 'dominant', phonetic: '/ˈdɒmɪnənt/', meaning: 'adj. 占主导的，支配的' },
  { word: 'dominate', phonetic: '/ˈdɒmɪneɪt/', meaning: 'v. 支配，控制' },
  { word: 'dramatic', phonetic: '/drəˈmætɪk/', meaning: 'adj. 戏剧性的，引人注目的' },
  { word: 'durable', phonetic: '/ˈdjʊərəbl/', meaning: 'adj. 持久的，耐用的' },
  { word: 'dynamic', phonetic: '/daɪˈnæmɪk/', meaning: 'adj. 动态的，有活力的' },
  { word: 'economy', phonetic: '/ɪˈkɒnəmi/', meaning: 'n. 经济，节约' },
  { word: 'efficient', phonetic: '/ɪˈfɪʃnt/', meaning: 'adj. 高效的' },
  { word: 'elaborate', phonetic: '/ɪˈlæbərət/', meaning: 'adj. 精心的 v. 详述' },
  { word: 'eliminate', phonetic: '/ɪˈlɪmɪneɪt/', meaning: 'v. 消除，淘汰' },
  { word: 'embrace', phonetic: '/ɪmˈbreɪs/', meaning: 'v. 拥抱，接受' },
  { word: 'emerge', phonetic: '/ɪˈmɜːrdʒ/', meaning: 'v. 出现，浮现' },
  { word: 'emission', phonetic: '/ɪˈmɪʃn/', meaning: 'n. 排放，散发' },
  { word: 'emotion', phonetic: '/ɪˈməʊʃn/', meaning: 'n. 情感，情绪' },
  { word: 'emphasis', phonetic: '/ˈemfəsɪs/', meaning: 'n. 强调，重点' },
  { word: 'employ', phonetic: '/ɪmˈplɔɪ/', meaning: 'v. 雇用，使用' },
  { word: 'enable', phonetic: '/ɪˈneɪbl/', meaning: 'v. 使能够' },
  { word: 'encounter', phonetic: '/ɪnˈkaʊntər/', meaning: 'v./n. 遭遇，邂逅' },
  { word: 'encourage', phonetic: '/ɪnˈkʌrɪdʒ/', meaning: 'v. 鼓励，促进' },
  { word: 'endure', phonetic: '/ɪnˈdjʊər/', meaning: 'v. 忍受，持久' },
  { word: 'enforce', phonetic: '/ɪnˈfɔːrs/', meaning: 'v. 执行，强制' },
  { word: 'engage', phonetic: '/ɪnˈɡeɪdʒ/', meaning: 'v. 从事，吸引' },
  { word: 'enhance', phonetic: '/ɪnˈhɑːns/', meaning: 'v. 增强，提高' },
  { word: 'enormous', phonetic: '/ɪˈnɔːrməs/', meaning: 'adj. 巨大的' },
  { word: 'ensure', phonetic: '/ɪnˈʃʊər/', meaning: 'v. 确保，保证' },
  { word: 'enterprise', phonetic: '/ˈentərpraɪz/', meaning: 'n. 企业，事业' },
  { word: 'entitle', phonetic: '/ɪnˈtaɪtl/', meaning: 'v. 授权，给…称号' },
  { word: 'environment', phonetic: '/ɪnˈvaɪrənmənt/', meaning: 'n. 环境' },
  { word: 'episode', phonetic: '/ˈepɪsəʊd/', meaning: 'n. 一集，事件' },
  { word: 'equivalent', phonetic: '/ɪˈkwɪvələnt/', meaning: 'adj. 等价的 n. 等价物' },
  { word: 'essential', phonetic: '/ɪˈsenʃl/', meaning: 'adj. 本质的，必要的' },
  { word: 'establish', phonetic: '/ɪˈstæblɪʃ/', meaning: 'v. 建立，确立' },
  { word: 'estimate', phonetic: '/ˈestɪmeɪt/', meaning: 'v./n. 估计，评估' },
  { word: 'evaluate', phonetic: '/ɪˈvæljueɪt/', meaning: 'v. 评估，评价' },
  { word: 'evidence', phonetic: '/ˈevɪdəns/', meaning: 'n. 证据，迹象' },
  { word: 'evident', phonetic: '/ˈevɪdənt/', meaning: 'adj. 明显的' },
  { word: 'evolution', phonetic: '/ˌiːvəˈluːʃn/', meaning: 'n. 进化，演变' },
  { word: 'exaggerate', phonetic: '/ɪɡˈzædʒəreɪt/', meaning: 'v. 夸大，夸张' },
  { word: 'exceed', phonetic: '/ɪkˈsiːd/', meaning: 'v. 超过，超越' },
  { word: 'exception', phonetic: '/ɪkˈsepʃn/', meaning: 'n. 例外' },
  { word: 'excessive', phonetic: '/ɪkˈsesɪv/', meaning: 'adj. 过多的，过度的' },
  { word: 'exclude', phonetic: '/ɪkˈskluːd/', meaning: 'v. 排除，排斥' },
  { word: 'execute', phonetic: '/ˈeksɪkjuːt/', meaning: 'v. 执行，实施' },
  { word: 'exhibit', phonetic: '/ɪɡˈzɪbɪt/', meaning: 'v. 展示 n. 展品' },
  { word: 'expand', phonetic: '/ɪkˈspænd/', meaning: 'v. 扩大，扩展' },
  { word: 'expedition', phonetic: '/ˌekspəˈdɪʃn/', meaning: 'n. 远征，探险' },
  { word: 'expense', phonetic: '/ɪkˈspens/', meaning: 'n. 费用，开支' },
  { word: 'exploit', phonetic: '/ɪkˈsplɔɪt/', meaning: 'v. 开发，利用' },
  { word: 'expose', phonetic: '/ɪkˈspəʊz/', meaning: 'v. 暴露，揭露' },
  { word: 'extension', phonetic: '/ɪkˈstenʃn/', meaning: 'n. 延伸，扩展' },
  { word: 'extensive', phonetic: '/ɪkˈstensɪv/', meaning: 'adj. 广泛的，大量的' },
  { word: 'external', phonetic: '/ɪkˈstɜːrnl/', meaning: 'adj. 外部的，外面的' },
  { word: 'extraordinary', phonetic: '/ɪkˈstrɔːrdneri/', meaning: 'adj. 非凡的，特别的' },
  { word: 'extreme', phonetic: '/ɪkˈstriːm/', meaning: 'adj. 极端的 n. 极端' },
  { word: 'facilitate', phonetic: '/fəˈsɪlɪteɪt/', meaning: 'v. 促进，使便利' },
  { word: 'faculty', phonetic: '/ˈfæklti/', meaning: 'n. 全体教员，能力' },
  { word: 'faithful', phonetic: '/ˈfeɪθfl/', meaning: 'adj. 忠诚的，忠实的' },
  { word: 'fatal', phonetic: '/ˈfeɪtl/', meaning: 'adj. 致命的' },
  { word: 'favorable', phonetic: '/ˈfeɪvərəbl/', meaning: 'adj. 有利的，赞成的' },
  { word: 'feasible', phonetic: '/ˈfiːzəbl/', meaning: 'adj. 可行的' },
  { word: 'feature', phonetic: '/ˈfiːtʃər/', meaning: 'n. 特征，特色' },
  { word: 'federal', phonetic: '/ˈfedərəl/', meaning: 'adj. 联邦的' },
  { word: 'flexible', phonetic: '/ˈfleksəbl/', meaning: 'adj. 灵活的，可变的' },
  { word: 'flourish', phonetic: '/ˈflʌrɪʃ/', meaning: 'v. 繁荣，兴旺' },
  { word: 'forecast', phonetic: '/ˈfɔːrkɑːst/', meaning: 'v./n. 预测，预报' },
  { word: 'former', phonetic: '/ˈfɔːrmər/', meaning: 'adj. 以前的 n. 前者' },
  { word: 'formula', phonetic: '/ˈfɔːrmjələ/', meaning: 'n. 公式，配方' },
  { word: 'fortune', phonetic: '/ˈfɔːrtʃuːn/', meaning: 'n. 财富，运气' },
  { word: 'foundation', phonetic: '/faʊnˈdeɪʃn/', meaning: 'n. 基础，基金会' },
  { word: 'fraction', phonetic: '/ˈfrækʃn/', meaning: 'n. 分数，小部分' },
  { word: 'fragment', phonetic: '/ˈfræɡmənt/', meaning: 'n. 碎片 v. 分裂' },
  { word: 'framework', phonetic: '/ˈfreɪmwɜːrk/', meaning: 'n. 框架，体制' },
  { word: 'frequency', phonetic: '/ˈfriːkwənsi/', meaning: 'n. 频率，频繁' },
  { word: 'friction', phonetic: '/ˈfrɪkʃn/', meaning: 'n. 摩擦，冲突' },
  { word: 'frustrate', phonetic: '/frʌˈstreɪt/', meaning: 'v. 使沮丧，挫败' },
  { word: 'fulfill', phonetic: '/fʊlˈfɪl/', meaning: 'v. 履行，实现' },
  { word: 'function', phonetic: '/ˈfʌŋkʃn/', meaning: 'n. 功能 v. 运作' },
  { word: 'fundamental', phonetic: '/ˌfʌndəˈmentl/', meaning: 'adj. 基本的 n. 基本原则' },
  { word: 'generate', phonetic: '/ˈdʒenəreɪt/', meaning: 'v. 产生，发生' },
  { word: 'generous', phonetic: '/ˈdʒenərəs/', meaning: 'adj. 慷慨的，大量的' },
  { word: 'genuine', phonetic: '/ˈdʒenjuɪn/', meaning: 'adj. 真正的，真诚的' },
  { word: 'globe', phonetic: '/ɡləʊb/', meaning: 'n. 地球，球体' },
  { word: 'govern', phonetic: '/ˈɡʌvərn/', meaning: 'v. 统治，管理' },
  { word: 'grant', phonetic: '/ɡrɑːnt/', meaning: 'v. 授予 n. 拨款' },
  { word: 'guarantee', phonetic: '/ˌɡærənˈtiː/', meaning: 'v./n. 保证，担保' },
  { word: 'harmony', phonetic: '/ˈhɑːrməni/', meaning: 'n. 和谐，协调' },
  { word: 'harsh', phonetic: '/hɑːrʃ/', meaning: 'adj. 严厉的，粗糙的' },
  { word: 'heritage', phonetic: '/ˈherɪtɪdʒ/', meaning: 'n. 遗产，传统' },
  { word: 'hesitate', phonetic: '/ˈhezɪteɪt/', meaning: 'v. 犹豫，踌躇' },
  { word: 'highlight', phonetic: '/ˈhaɪlaɪt/', meaning: 'v. 强调 n. 亮点' },
  { word: 'honor', phonetic: '/ˈɒnər/', meaning: 'n. 荣誉 v. 尊敬' },
  { word: 'horizon', phonetic: '/həˈraɪzn/', meaning: 'n. 地平线，视野' },
  { word: 'hostile', phonetic: '/ˈhɒstaɪl/', meaning: 'adj. 敌对的，不友好的' },
  { word: 'humble', phonetic: '/ˈhʌmbl/', meaning: 'adj. 谦逊的，卑微的' },
  { word: 'identical', phonetic: '/aɪˈdentɪkl/', meaning: 'adj. 完全相同的' },
  { word: 'identify', phonetic: '/aɪˈdentɪfaɪ/', meaning: 'v. 识别，确认' },
  { word: 'ideology', phonetic: '/ˌaɪdiˈɒlədʒi/', meaning: 'n. 意识形态' },
  { word: 'ignorance', phonetic: '/ˈɪɡnərəns/', meaning: 'n. 无知，愚昧' },
  { word: 'illustrate', phonetic: '/ˈɪləstreɪt/', meaning: 'v. 说明，图解' },
  { word: 'imaginary', phonetic: '/ɪˈmædʒɪnəri/', meaning: 'adj. 想象的，虚构的' },
  { word: 'immediate', phonetic: '/ɪˈmiːdiət/', meaning: 'adj. 立即的，直接的' },
  { word: 'immense', phonetic: '/ɪˈmens/', meaning: 'adj. 巨大的，广大的' },
  { word: 'immune', phonetic: '/ɪˈmjuːn/', meaning: 'adj. 免疫的，不受影响的' },
  { word: 'impact', phonetic: '/ˈɪmpækt/', meaning: 'n./v. 影响，冲击' },
  { word: 'implement', phonetic: '/ˈɪmplɪment/', meaning: 'v. 实施 n. 工具' },
  { word: 'implicit', phonetic: '/ɪmˈplɪsɪt/', meaning: 'adj. 隐含的，含蓄的' },
  { word: 'impose', phonetic: '/ɪmˈpəʊz/', meaning: 'v. 强加，征收' },
  { word: 'impression', phonetic: '/ɪmˈpreʃn/', meaning: 'n. 印象，感觉' },
  { word: 'impulse', phonetic: '/ˈɪmpʌls/', meaning: 'n. 冲动，脉冲' },
  { word: 'inadequate', phonetic: '/ɪnˈædɪkwət/', meaning: 'adj. 不充分的，不适当的' },
  { word: 'incident', phonetic: '/ˈɪnsɪdənt/', meaning: 'n. 事件，事变' },
  { word: 'indicate', phonetic: '/ˈɪndɪkeɪt/', meaning: 'v. 表明，指示' },
  { word: 'individual', phonetic: '/ˌɪndɪˈvɪdʒuəl/', meaning: 'adj. 个人的 n. 个体' },
  { word: 'inevitable', phonetic: '/ɪnˈevɪtəbl/', meaning: 'adj. 不可避免的' },
  { word: 'infinite', phonetic: '/ˈɪnfɪnət/', meaning: 'adj. 无限的，无穷的' },
  { word: 'inflation', phonetic: '/ɪnˈfleɪʃn/', meaning: 'n. 通货膨胀' },
  { word: 'influence', phonetic: '/ˈɪnfluəns/', meaning: 'n./v. 影响' },
  { word: 'infrastructure', phonetic: '/ˈɪnfrəstrʌktʃər/', meaning: 'n. 基础设施' },
  { word: 'inherit', phonetic: '/ɪnˈherɪt/', meaning: 'v. 继承' },
  { word: 'initial', phonetic: '/ɪˈnɪʃl/', meaning: 'adj. 最初的 n. 首字母' },
  { word: 'initiative', phonetic: '/ɪˈnɪʃətɪv/', meaning: 'n. 主动性，倡议' },
  { word: 'innovation', phonetic: '/ˌɪnəˈveɪʃn/', meaning: 'n. 创新，革新' },
  { word: 'inspect', phonetic: '/ɪnˈspekt/', meaning: 'v. 检查，视察' },
  { word: 'inspire', phonetic: '/ɪnˈspaɪər/', meaning: 'v. 激励，启发' },
  { word: 'institute', phonetic: '/ˈɪnstɪtjuːt/', meaning: 'n. 学院 v. 制定' },
  { word: 'integrate', phonetic: '/ˈɪntɪɡreɪt/', meaning: 'v. 整合，融入' },
  { word: 'intellectual', phonetic: '/ˌɪntəˈlektʃuəl/', meaning: 'adj. 智力的 n. 知识分子' },
  { word: 'intense', phonetic: '/ɪnˈtens/', meaning: 'adj. 强烈的，紧张的' },
  { word: 'interact', phonetic: '/ˌɪntərˈækt/', meaning: 'v. 互动，交互' },
  { word: 'interfere', phonetic: '/ˌɪntərˈfɪər/', meaning: 'v. 干涉，妨碍' },
  { word: 'interpret', phonetic: '/ɪnˈtɜːrprɪt/', meaning: 'v. 解释，口译' },
])

const WORDS_PER_PAGE = 49
const currentPage = ref(1)
const showMeaning = ref(true)

const totalPages = computed(() => Math.ceil(allWords.value.length / WORDS_PER_PAGE))

const currentWords = computed(() => {
  const start = (currentPage.value - 1) * WORDS_PER_PAGE
  const end = start + WORDS_PER_PAGE
  return allWords.value.slice(start, end)
})

const currentRange = computed(() => {
  const start = (currentPage.value - 1) * WORDS_PER_PAGE + 1
  const end = Math.min(currentPage.value * WORDS_PER_PAGE, allWords.value.length)
  return `(${start}-${end})`
})

const goBack = () => {
  router.push('/')
}

const toggleMode = () => {
  showMeaning.value = !showMeaning.value
}

const prevPage = () => {
  if (currentPage.value > 1) {
    currentPage.value--
  }
}

const nextPage = () => {
  if (currentPage.value < totalPages.value) {
    currentPage.value++
  }
}
</script>

<style scoped>
.english-word-container {
  padding: 20px;
  background-color: #faf8f5;
  height: 100vh;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  overflow: hidden;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding: 16px 20px;
  background: #fff;
  border-radius: 12px;
  border-bottom: 1px solid #e8e4df;
}

.title {
  font-size: 18px;
  font-weight: 600;
  color: #3d3d3a;
  margin: 0;
}

.back-btn,
.mode-btn {
  background-color: #f5f0e8;
  border-color: #e8e4df;
  color: #3d3d3a;
  border-radius: 10px;
}

.back-btn:hover,
.mode-btn:hover {
  background-color: #efe9de;
  border-color: #cc785c;
}

.word-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 12px;
  margin-bottom: 20px;
  flex: 1;
  overflow-y: auto;
  align-content: start;
}

.word-card {
  background: #fff;
  border: 1px solid #e8e4df;
  border-radius: 12px;
  padding: 16px;
  text-align: center;
  transition: all 0.3s ease;
  cursor: pointer;
}

.word-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  border-color: #cc785c;
}

.word-text {
  font-size: 18px;
  font-weight: 600;
  color: #3d3d3a;
  margin-bottom: 4px;
}

.word-phonetic {
  font-size: 13px;
  color: #8e8b82;
  margin-bottom: 8px;
}

.word-meaning {
  font-size: 14px;
  color: #6c6a64;
  line-height: 1.4;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.word-card.show-meaning .word-meaning {
  opacity: 1;
}

.pagination-bar {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 20px;
  padding: 16px;
  background: #fff;
  border-radius: 12px;
  border: 1px solid #e8e4df;
}

.page-btn {
  background-color: #8b9a6d;
  border-color: #8b9a6d;
  color: #fff;
  border-radius: 10px;
}

.page-btn:hover:not(:disabled) {
  background-color: #7a895c;
  border-color: #7a895c;
}

.page-btn:disabled {
  background-color: #c0c4cc;
  border-color: #c0c4cc;
}

.page-info {
  font-size: 16px;
  color: #3d3d3a;
  font-weight: 500;
}
</style>
