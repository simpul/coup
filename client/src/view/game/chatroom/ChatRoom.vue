<style scoped lang="less">
.char-room-wrapper {
    position: relative;
    height: calc(50vh - 30px);

    .content {
        height: calc(50vh - 70px);
        overflow-y: scroll;
        ul {
            margin: 0;
            padding: 0;
            list-style: none;
        }
        .chat-input {
            position: absolute;
            bottom: 6px;
        }
    }
}
</style>

<template>
    <div class="char-room-wrapper">
        <div ref="content" class="content">
            <ul>
                <li v-for="(item, index) in chatInfo" :key="index">
                    {{ item }}
                </li>
            </ul>
            <a-input
                class="chat-input"
                v-model:value="chatText"
                @pressEnter="handleChat"
                placeholder="说点什么呢..."
            />
        </div>
    </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import Socket, { PUBLIC_CHAT } from '../../../utils/socket';

const chatText = ref('');
const chatInfo = ref([]);
const content = ref(null);
const socket = new Socket();

onMounted(() => {
    content.value.addEventListener('DOMNodeInserted', () => {
        content.value.scrollTop = content.value.scrollHeight;
    });
});

socket.on(PUBLIC_CHAT, ({ username, text }) => {
    chatInfo.value.push(`${username}: ${text}`);
});

const handleChat = () => {
    socket.publicChat(chatText.value);
    chatText.value = '';
};

chatInfo.value = [];

</script>