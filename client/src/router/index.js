import { createRouter, createWebHistory } from 'vue-router';
import routes from './routes';
import { getUsername } from '../utils/cookie';

const router = createRouter({
    history: createWebHistory(),
    routes,
});

router.beforeEach((to, from, next) => {
    const username = getUsername();
    if (!username) {
        if (to.path === '/login' || to.path === '/register') {
            next();
        } else {
            next('/login');
        }
    } else {
        next();
    }
});

export default router;
