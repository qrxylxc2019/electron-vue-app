import { createRouter, createWebHashHistory } from 'vue-router';
import DirectoryList from '../views/DirectoryList.vue';
import Quiz from '../views/Quiz.vue';
import CaseQuiz from '../views/CaseQuiz.vue';

const routes = [
  { path: '/', name: 'Home', component: DirectoryList },
  { path: '/quiz/:directoryId', name: 'Quiz', component: Quiz, props: true },
  { path: '/case/:directoryId', name: 'CaseQuiz', component: CaseQuiz, props: true },
];

const router = createRouter({
  history: createWebHashHistory(),
  routes,
});

export default router;
