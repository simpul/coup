import { createApp } from 'vue';
import 'normalize.css';
import './styles/style.less';
import 'ant-design-vue/es/notification/style/css';
import 'ant-design-vue/es/message/style/css';
import router from './router';
import store from './store';
import App from './App.vue';

const app = createApp(App);

app
    .use(store)
    .use(router);

app.mount('#v-app');
