export default [
    {
        path: '/',
        redirect: '/login',
    },
    {
        path: '/login',
        name: 'Login',
        component: () => import('../view/login/LoginIndex.vue'),
    },
    {
        path: '/game',
        name: 'Game',
        component: () => import('../view/game/GameIndex.vue'),
    }
];