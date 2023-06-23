<style scoped lang="less">
.game-index-wrapper {
    .divider {
        margin: 0;
    }
    .ant-row {
        flex-wrap: nowrap;
    }
}
</style>

<template>
    <div class="game-index-wrapper">
        <a-row type="flex">
            <a-col style="width: 60vw;">
                <DeskTop />
            </a-col>
            <a-col style="width: 40vw;">
                <SystemInfo />
                <a-divider class="divider" dashed>{{ state.username }}的聊天室(共{{ state.players.length }}人)</a-divider>
                <ChatRoom />
            </a-col>
        </a-row>
    </div>
</template>

<script setup>
import { reactive, onBeforeMount } from 'vue';
import { useStore } from 'vuex';
import SystemInfo from './systeminfo/SystemInfo.vue';
import ChatRoom from './chatroom/ChatRoom.vue';
import DeskTop from './desk/DeskTop.vue';
import Socket, { JOIN_ROOM, CHANGE_STAGE, QUERY_PLAYERS } from '../../utils/socket';

const socket = new Socket();
const store = useStore();

socket.on(JOIN_ROOM, (username) => {
    state.username = username;
});

socket.on(QUERY_PLAYERS, (players) => {
    state.players = players;
});

socket.on(CHANGE_STAGE, (stage) => {
    store.commit('updateStage', stage);
});

onBeforeMount(() => {
    // 建立socket连接
    const socket = new Socket();
    const username = store.state.username;
    socket.joinRoom(username); // 加入房间
});

const state = reactive({
    username: '游客',
    players: [],
});

</script>