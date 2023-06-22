<style scoped lang="less">
.system-info-wrapper {
    height: 50vh;
    overflow-y: scroll;
    padding: 10px 0;
    max-height: 50vh;

    .first-line {
        font-weight: bold;
        color: #1890ff;
    }
}
</style>
<template>
    <div class="system-info-wrapper">
        <a-timeline>
            <a-timeline-item
                v-for="(item, index) in systemInfo"
                :key="index"
                :class="index === 0 ? 'first-line' : ''"
            >{{ item }}</a-timeline-item>
        </a-timeline>
    </div>
</template>

<script setup>
import { ref } from 'vue';
import Socket, { SYSTEM_INFO } from '../../../utils/socket';

const socket = new Socket();
const systemInfo = ref([]);

socket.on(SYSTEM_INFO, (info) => {
    systemInfo.value.unshift(info);
});
</script>