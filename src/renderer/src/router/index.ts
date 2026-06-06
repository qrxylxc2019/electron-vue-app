import { createRouter, createWebHashHistory } from 'vue-router';
import DirectoryList from '../views/DirectoryList.vue';
import Quiz from '../views/Quiz.vue';
import CaseQuiz from '../views/CaseQuiz.vue';
import AIQuiz from '../views/AIQuiz.vue';
import English from '../views/English.vue';
import Translate from '../views/Translate.vue';

const routes = [
  { path: '/', name: 'Home', component: DirectoryList },
  { path: '/quiz/:directoryId', name: 'Quiz', component: Quiz, props: true },
  { path: '/case/:directoryId', name: 'CaseQuiz', component: CaseQuiz, props: true },
  { path: '/ai/:directoryId', name: 'AIQuiz', component: AIQuiz, props: true },
  { path: '/english/:directoryId', name: 'English', component: English, props: true },
  { path: '/translate/:directoryId', name: 'Translate', component: Translate, props: true },
];

const router = createRouter({
  history: createWebHashHistory(),
  routes,
});

export default router;
