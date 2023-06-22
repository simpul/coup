<style scoped lang="less">
.desktop-wrapper {
    .instructions {
        height: calc(100vh - 435px);
        overflow-y: scroll;
    }
}
</style>

<template>
    <div class="desktop-wrapper">
        <PlayerPool />
        <ControlPanel />
        <div v-if="stage !== 'ready'" class="instructions">
            <a-table
                :pagination="false"
                :dataSource="dataSource"
                :columns="columns"
            >
                <template #bodyCell="{ column, record }">
                    <template v-if="column.key === 'action'">
                        <a-popconfirm
                            v-if="record.action !== 'X' && state.isMyTurn"
                            :title="'确定执行' + record.action + '吗?'"
                            ok-text="Yes"
                            cancel-text="No"
                            @confirm="confirmAction(record.key)"
                        >
                            <a href="#">{{ record.action }}</a>
                        </a-popconfirm>
                        <span v-else-if="record.action !== 'X'">{{ record.action }}</span>
                    </template>
                </template>
            </a-table>
        </div>
    </div>
</template>

<script setup>
import { notification } from 'ant-design-vue';
import { computed, reactive } from 'vue';
import { useStore } from 'vuex';
import Socket, { IS_ON_TURN, NOTIFICATION, ACTION } from '../../../utils/socket';
import { instructionColumns, instructionContent } from '../../../utils/constants';
import ControlPanel from './components/ControlPanel.vue';
import PlayerPool from './components/PlayerPool.vue';

const columns = instructionColumns;
const dataSource = instructionContent;

const store = useStore();
const socket = new Socket();
const state = reactive({
    isMyTurn: false
});
const stage = computed(() => store.state.stage);

// 是否轮到我行动
socket.on(IS_ON_TURN, (isMyTurn) => {
    state.isMyTurn = isMyTurn;
});

// 弹出系统通知
socket.on(NOTIFICATION, ({ type, message, description }) => {
    notification[type]({
        message,
        description
    });
});

// 玩家确定执行行动
const confirmAction = (key) => {
    console.log('我执行了', key);
    socket.emit(ACTION, { action: key });
};
</script>