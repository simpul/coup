<style scoped lang="less">
.player-pool-wrapper {
    display: flex;
    flex-wrap: wrap;
    justify-content: space-around;
}
.bc-r {
    border-color: red;
}
.td-lt {
    text-decoration: line-through;
}
</style>

<template>
    <div class="player-pool-wrapper">
        <template v-if="stage !== 'ready'">
            <a-card
                v-for="(player, index) in state.publicInfo"
                :key="index"
                :title="player.username"
                style="min-width: 200px"
                :class="{ 'bc-r': player.isMyTurn, 'td-lt': player.shownCards.length === 2 }"
            >
                <p>硬币: {{ player.coins }}</p>
                <p
                    v-for="i in [0, 1]"
                    :key="i"
                >
                    身份牌: {{ player.shownCards[i] ? player.shownCards[i].label : '未知' }}
                </p>
            </a-card>
        </template>
    </div>
</template>

<script setup>
import { computed, reactive } from 'vue';
import { useStore } from 'vuex';
import Socket, { QUERY_PUBLIC_INFO } from '../../../../utils/socket';

const store = useStore();
const state = reactive({
    publicInfo: []
});
const stage = computed(() => store.state.stage);
const socket = new Socket();

socket.on(QUERY_PUBLIC_INFO, (publicInfo) => {
    state.publicInfo = publicInfo;
});

</script>