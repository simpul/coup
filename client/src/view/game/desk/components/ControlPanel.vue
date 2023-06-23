<style scoped lang="less">
.control-panel-wrapper {
    height: 200px;
    margin: 10px;
    background-color: lightgrey;
}
</style>

<template>
    <div class="control-panel-wrapper">
        <!-- ready 阶段 -->
        <div v-if="stage === 'ready'">
            <a-button @click="handleClickReadyOrCancel">{{ state.isReady ? '取消准备' : '准备' }}</a-button>
        </div>

        <!-- game 阶段 -->
        <div v-if="stage === 'game'">
            <p v-if="state.handCards.length">
                您的角色是：{{ state.handCards.reduce((pre, cur) => pre + cur.label + ' ', '') }}
            </p>

            <!-- 其他玩家的单选内容 -->
            <div v-if="state.showTargetList">
                <span>请选择你要{{ state.targetActionText }}的目标玩家：</span>
                <a-radio-group v-model:value="state.target">
                    <a-radio-button
                        v-for="(player, index) in state.targetList"
                        :key="index"
                        :value="player"
                    >
                    {{ player }}
                    </a-radio-button>
                </a-radio-group>
                <a-button @click="confirmTarget">确定</a-button>
            </div>

            <!-- 自己手牌进行选择内容 -->
            <div v-if="state.showHandCards">
                <span v-if="state.cardAction === 'show'">请选择一个你要暴露的身份：</span>
                <span v-if="state.cardAction === 'exchange'">请选择两个要丢弃的身份：</span>
                <a-checkbox-group v-model:value="state.chooseHandCardIndex" :options="state.handCardsList" />
                <a-button @click="confirmCards">确定</a-button>
            </div>

            <!-- 是否选择反制 -->
            <div v-if="state.showChooseCounter">
                <span>是否选择反制当前回合玩家的行动？</span>
                <a-button @click="confirmChooseCounter(true)" type="primary">反制</a-button>
                <a-button @click="confirmChooseCounter(false)">不反制</a-button>
            </div>

            <!-- 是否选择质疑 -->
            <div v-if="state.showChooseDoubt">
                <span>是否选择质疑对面的身份？</span>
                <a-button @click="confirmChooseDoubt(true)" type="primary">质疑</a-button>
                <a-button @click="confirmChooseDoubt(false)">不质疑</a-button>
            </div>

            <!-- 是否选择自证身份 -->
            <div v-if="state.showSertificate">
                <div v-if="state.hasCharacter">
                    <span>您手牌中有{{ ROLES_TEXT_MAP[state.character] }}身份牌，是否选择打出该身份牌进行自证？</span>
                    <a-button @click="confirmSertificate(true)" type="primary">自证</a-button>
                    <a-button @click="confirmSertificate(false)">不自证</a-button>
                </div>
                <div v-else>
                    <span>您手牌中没有{{ ROLES_TEXT_MAP[state.character] }}身份牌，无法完成身份自证，请点击确定按钮</span>
                    <a-button @click="confirmSertificate(false)" type="primary">确定</a-button>
                </div>
            </div>
        </div>

        <!-- end阶段 -->
        <div v-if="stage === 'end'">
            <a-button @click="restartGame">再来一局</a-button>
        </div>
    </div>
</template>

<script setup>
import { reactive, computed, watch } from 'vue';
import { useStore } from 'vuex';
import { message } from 'ant-design-vue';
import Socket, {
    QUERY_HAND_CARDS,
    CHOOSE_TARGET,
    CHOOSE_CARD,
    QUESTION_COUNTER,
    QUESTION_DOUBT,
    SELF_SERTIFICATE,
} from '../../../../utils/socket';
import { actionsTextMap, rolesTextMap } from '../../../../utils/constants';

const ROLES_TEXT_MAP = rolesTextMap;
const socket = new Socket();

const store = useStore();

const state = reactive({
    isReady: false,
    handCards: [],

    chain: '', // 链路
    action: '', // 行动
    character: '', // 身份
    hasCharacter: false, // 是否拥有该身份

    showChooseCounter: false, // 是否展示选择反制
    showChooseDoubt: false, // 是否展示选择质疑
    showSertificate: false, // 是否展示自证

    showTargetList: false, // 是否展示其他玩家列表
    targetList: [], // 其他玩家列表
    target: '', // 选择的目标玩家
    targetAction: '', // 对目标玩家的行动
    targetActionText: '', // 对目标玩家的行动的文字描述

    showHandCards: false, // 是否展示自己的手牌
    handCardsList: [], // 自己的手牌列表
    chooseHandCardIndex: [], // 选择的手牌的索引
    cardAction: '', // 对手牌的行动

});

const stage = computed(() => store.state.stage);

socket.on(QUERY_HAND_CARDS, (handCards) => {
    state.handCards = handCards;
});

socket.on(CHOOSE_TARGET, ({ players, action }) => {
    state.targetList = players;
    state.targetAction = action;
    state.targetActionText = actionsTextMap[action];
    state.showTargetList = true;
});

// action=show|exchange
socket.on(CHOOSE_CARD, ({ handCards, action, chain }) => {
    state.handCardsList = handCards.map((card, index) => ({ label: card.label, name: card.name, value: index }));
    state.cardAction = action;
    state.chain = chain;
    state.showHandCards = true;
});

socket.on(QUESTION_COUNTER, ({ action }) => {
    state.action = action;
    state.showChooseCounter = true;
});

socket.on(QUESTION_DOUBT, ({ action }) => {
    state.action = action;
    state.showChooseDoubt = true;
});

socket.on(SELF_SERTIFICATE, ({ hasCharacter, character, action }) => {
    state.hasCharacter = hasCharacter;
    state.character = character;
    state.action = action;
    state.showSertificate = true;
});

// 准备游戏
const handleClickReadyOrCancel = () => {
    state.isReady = !state.isReady;
    socket.changeReady(state.isReady);
};

// 当阶段变为 ready 时，重置 isReady
watch(() => stage.value, (stage) => {
    if (stage === 'ready') {
        state.isReady = false;
    }
});

// 确认选择玩家
const confirmTarget = () => {
    if (!state.target) {
        message.error(`请选择你要${state.targetActionText}的目标玩家`);
        return;
    }
    const action = state.targetAction;
    const target = state.target;
    console.log(`socket emit ${CHOOSE_TARGET}:`, { action, target });
    socket.emit(CHOOSE_TARGET, { action, target });
    state.target = '';
    state.showTargetList = false;
};

// 确认选择手牌
const confirmCards = () => {
    if (state.cardAction === 'show') {
        // 公开手牌
        if (state.chooseHandCardIndex.length !== 1) {
            message.error('请选择一个你要暴露的身份');
            return;
        }
    } else if (state.cardAction === 'exchange') {
        // 交换手牌
        if (state.chooseHandCardIndex.length !== 2) {
            message.error('请选择两个要丢弃的身份');
            return;
        }
    }
    const action = state.cardAction;
    const cards = state.chooseHandCardIndex.map(index => state.handCardsList[index].name);
    const chain = state.chain;
    console.log(`socket emit ${CHOOSE_CARD}:`, { action, cards, chain });
    socket.emit(CHOOSE_CARD, { action, cards, chain });
    state.chooseHandCardIndex = [];
    state.chain = '';
    state.showHandCards = false;
};

// 确认选择是否反制
const confirmChooseCounter = (counter) => {
    console.log(`socket emit ${QUESTION_COUNTER}:`, { counter, action: state.action });
    socket.emit(QUESTION_COUNTER, { counter, action: state.action });
    state.action = '';
    state.showChooseCounter = false;
};

// 确认选择是否质疑
const confirmChooseDoubt = (doubt) => {
    console.log(`socket emit ${QUESTION_DOUBT}:`, { doubt, action: state.action });
    socket.emit(QUESTION_DOUBT, { doubt, action: state.action });
    state.action = '';
    state.showChooseDoubt = false;
};

// 确认选择是否自证
const confirmSertificate = (canSertificate) => {
    console.log(`socket emit ${SELF_SERTIFICATE}:`, { canSertificate, character: state.character, action: state.action });
    socket.emit(SELF_SERTIFICATE, { canSertificate, character: state.character, action: state.action });
    state.action = '';
    state.character = '';
    state.hasCharacter = false;
    state.showSertificate = false;
};

// 重新开一局
const restartGame = () => {
    store.commit('updateStage', 'ready'); // 进入ready状态
};

</script>
