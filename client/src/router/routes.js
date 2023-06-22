import Login from '../view/login/LoginIndex.vue';
import Game from '../view/game/GameIndex.vue';

export default [
    {
        path: '/',
        redirect: '/login',
    },
    {
        path: '/login',
        name: 'Login',
        component: Login,
    },
    {
        path: '/game',
        name: 'Game',
        component: Game,
    }
];