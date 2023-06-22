import { createStore } from 'vuex';

export default createStore({
    state: {
        stage: 'ready'
    },
    mutations: {
        updateStage(state, stage) {
            state.stage = stage;
        }
    }
});