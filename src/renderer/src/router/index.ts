import { createRouter, createWebHashHistory } from 'vue-router';
import DirectoryList from '../views/Learn/DirectoryList.vue';
import Quiz from '../views/Learn/Quiz.vue';
import CaseQuiz from '../views/Learn/CaseQuiz.vue';
import AIQuiz from '../views/Learn/AIQuiz.vue';
import English from '../views/Learn/English.vue';
import Translate from '../views/Learn/Translate.vue';
import Article from '../views/Learn/Article.vue';
import Cloze from '../views/Learn/Cloze.vue';
import Shuxue from '../views/Learn/Shuxue.vue';
import Plan from '../views/Plan/Plan.vue';
import Solicit from '../views/Solicit/Solicit.vue';
import Collect from '../views/Collect/Collect.vue';
import Project from '../views/Project/Project.vue';
import YearPlan from '../views/YearPlan/YearPlan.vue';

const routes = [
  { path: '/', name: 'Home', component: DirectoryList },
  { path: '/quiz/:directoryId', name: 'Quiz', component: Quiz, props: true },
  { path: '/case/:directoryId', name: 'CaseQuiz', component: CaseQuiz, props: true },
  { path: '/ai/:directoryId', name: 'AIQuiz', component: AIQuiz, props: true },
  { path: '/english/:directoryId', name: 'English', component: English, props: true },
  { path: '/translate/:directoryId', name: 'Translate', component: Translate, props: true },
  { path: '/article/:directoryId', name: 'Article', component: Article, props: true },
  { path: '/cloze/:directoryId', name: 'Cloze', component: Cloze, props: true },
  { path: '/shuxue/:directoryId', name: 'Shuxue', component: Shuxue, props: true },
  { path: '/plan', name: 'Plan', component: Plan },
  { path: '/solicit', name: 'Solicit', component: Solicit },
  { path: '/collect', name: 'Collect', component: Collect },
  { path: '/project', name: 'Project', component: Project },
  { path: '/yearplan', name: 'YearPlan', component: YearPlan },
];

const router = createRouter({
  history: createWebHashHistory(),
  routes,
});

export default router;
