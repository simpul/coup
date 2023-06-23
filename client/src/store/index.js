import { createStore } from 'vuex';

export default createStore({
    state: {
        stage: 'ready',
        username: '', // 玩家名称
    },
    mutations: {
        updateStage(state, stage) {
            state.stage = stage;
        },
        updateUsername(state, username) {
            state.username = username;
        },
    }
});