import { createRouter, createWebHistory } from 'vue-router';
import AdminHome from '../pages/Home.vue';
import StudentPortal from '../pages/Student.vue';

const routes = [
  { path: '/', redirect: '/admin' },
  { path: '/admin', name: 'admin', component: AdminHome },
  { path: '/student', name: 'student', component: StudentPortal },
  { path: '/:pathMatch(.*)*', redirect: '/admin' }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

export default router;
