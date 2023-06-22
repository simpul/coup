const { Server } = require('socket.io');
const {
    startGame,
    destroyGame,
    playerAction,
    executeCoup,
    executeForeignAid,
    executeTax,
    executeExchange,
    exposeHandCards,
    discardHandCards,
    moveToNextTurn,
    handleCounterProcess,
    handleDoubtProcess,
    handleSelfCertificate,
    continueSteal,
    stillContinueSteal,
    executeSteal,
    contineAssassinate,
    executeAssassinate,
    stillContinueAssassinate,
} = require('./utils/game');

const {
    JOIN_ROOM,
    QUERY_PLAYERS,
    SYSTEM_INFO,
    PUBLIC_CHAT,
    CHANGE_READY,
    CHANGE_STAGE,
    ACTION,
    CHOOSE_TARGET,
    CHOOSE_CARD,
    QUESTION_COUNTER,
    QUESTION_DOUBT,
    SELF_SERTIFICATE,
    CHECK_MY_INFO,
} = require('./utils/constants');

const usocket = {}; // 管理所有的socket { socket.id: { username, socket } }
let isReadyNum = 0;

class Socket {
    constructor(httpServer, options = {}) {
        this.io = new Server(httpServer, options);
        this.init();
    }

    init() {
        this.io.on('connection', (socket) => {
            console.log('a user connected', socket.id);

            // 玩家掉线
            socket.on('disconnect', () => {
                console.log('a user has disconnected', socket.id);
                if (usocket[socket.id]) {
                    const { username } = usocket[socket.id];
                    this.emitAll(SYSTEM_INFO, `${username} 离开了游戏`);
                    delete usocket[socket.id];
                    this.emitAll(QUERY_PLAYERS, Object.values(usocket).map((item) => item.username));
                }
                destroyGame();
                isReadyNum = 0;
                this.emitAll(CHANGE_STAGE, 'ready');
            });

            // 确认是否加入了房间
            socket.on(CHECK_MY_INFO, () => {
                if (!socket.id || !usocket[socket.id]) {
                    socket.emit(CHECK_MY_INFO, '');
                    return;
                }
                socket.emit(CHECK_MY_INFO, usocket[socket.id] || '');
            });

            // 玩家加入房间
            socket.on(JOIN_ROOM, (username) => {
                usocket[socket.id] = { username, socket };
                // 系统通知所有在线的人xxx加入了游戏
                this.emitAll(SYSTEM_INFO, `${username} 加入了游戏`);
                this.emitAll(QUERY_PLAYERS, Object.values(usocket).map((item) => item.username));
                // 告知当前加入的玩家他的名字
                socket.emit(JOIN_ROOM, username);
            });

            // 玩家聊天
            socket.on(PUBLIC_CHAT, (text) => {
                const username = usocket[socket.id].username || '未知用户';
                this.emitAll(PUBLIC_CHAT, { username, text });
            });

            // 玩家准备游戏
            socket.on(CHANGE_READY, (isReady) => {
                const { username } = usocket[socket.id];
                this.emitAll(SYSTEM_INFO, `${username} ${isReady ? '已经准备好' : '取消了准备'}`);
                if (isReady) {
                    isReadyNum++;
                    if (isReadyNum === Object.keys(usocket).length) {
                        if (isReadyNum > 1) {
                            // 所有玩家都准备好了，开始游戏
                            this.emitAll(SYSTEM_INFO, '所有玩家都准备好了，开始游戏');
                            this.emitAll(CHANGE_STAGE, 'game');
                            startGame(usocket, this.io);
                            isReadyNum = 0;
                        } else {
                            // 少于两个玩家，无法开始游戏
                            this.emitAll(SYSTEM_INFO, '人数不足，无法开始游戏');
                        }
                    }
                } else {
                    isReadyNum--;
                }
            });

            // 玩家执行行动
            socket.on(ACTION, ({ action }) => {
                console.log('有人执行了回合:', action, socket.id);
                playerAction(usocket, socket.id, action, this.io);
            });

            // 当前回合玩家选择了目标玩家，然后执行行动
            socket.on(CHOOSE_TARGET, ({ action, target }) => {
                if (action === 'coup') {
                    executeCoup(usocket, socket.id, target, this.io);
                } else if (action === 'steal') {
                    continueSteal(usocket, socket.id, target, this.io);
                } else if (action === 'assassinate') {
                    contineAssassinate(usocket, socket.id, target, this.io);
                }
            });

            // 有玩家选择了卡牌
            socket.on(CHOOSE_CARD, ({ action, cards, chain }) => {
                if (action === 'show') {
                    // 表示选择的手牌需要展示出来
                    switch (chain) {
                        case 'coup':
                            // 表明是因其他玩家实施政变而展示手牌
                            exposeHandCards(usocket, socket.id, cards, this.io);
                            moveToNextTurn(usocket, this.io);
                            break;
                        case 'foreignAid-fail':
                            // 当前回合的玩家因为质疑失败，1.需要展示一张手牌，2.本回合外援行动失败
                            exposeHandCards(usocket, socket.id, cards, this.io);
                            moveToNextTurn(usocket, this.io);
                            break;
                        case 'foreignAid-success':
                            // 当前回合的玩家因为质疑成功，1.被质疑者需要展示一张手牌，2.本回合外援行动成功
                            exposeHandCards(usocket, socket.id, cards, this.io);
                            executeForeignAid(usocket, this.io);
                            break;
                        case 'tax-fail':
                            // 当前回合的玩家因为自证身份失败，1.需要展示一张手牌，2.本回合征税行动失败
                            exposeHandCards(usocket, socket.id, cards, this.io);
                            moveToNextTurn(usocket, this.io);
                            break;
                        case 'tax-success':
                            // 当前回合的玩家因为自证身份成功，1. 质疑的玩家都要展示一张手牌 2. 当前玩家成功执行收税行动
                            exposeHandCards(usocket, socket.id, cards, this.io);
                            executeTax(usocket, socket.id, this.io);
                            break;
                        case 'exchange-fail':
                            // 当前回合的玩家因为自证身份失败，1.需要展示一张手牌，2.本回合交换行动失败
                            exposeHandCards(usocket, socket.id, cards, this.io);
                            moveToNextTurn(usocket, this.io);
                            break;
                        case 'exchange-success':
                            // 当前回合的玩家因为自证身份成功，1. 质疑的玩家都要展示一张手牌 2. 当前玩家成功执行交换行动
                            exposeHandCards(usocket, socket.id, cards, this.io);
                            executeExchange(usocket, socket.id, this.io);
                            break;
                        case 'self-sertificate-captain-success':
                            // 当前回合的玩家因为自证队长身份成功，1. 质疑的玩家都要展示一张手牌 2. 若目标玩家存活，则等待目标玩家选择是否反制 3. 若目标玩家阵亡，直接进行偷窃
                            exposeHandCards(usocket, socket.id, cards, this.io);
                            stillContinueSteal(usocket, socket.id, this.io);
                            break;
                        case 'self-sertificate-captain-fail':
                            // 当前回合玩家因为自证队长身份失败，1. 展示一张手牌 2. 无法执行偷窃
                            exposeHandCards(usocket, socket.id, cards, this.io);
                            moveToNextTurn(usocket, this.io);
                            break;
                        case 'steal-counter-success':
                            // 当前回合玩家展示一张手牌，偷窃因被反制成功而无法执行
                            exposeHandCards(usocket, socket.id, cards, this.io);
                            moveToNextTurn(usocket, this.io);
                            break;
                        case 'steal-counter-fail':
                            exposeHandCards(usocket, socket.id, cards, this.io);
                            executeSteal(usocket, socket.id, this.io);
                            break;
                        case 'assassinate':
                            exposeHandCards(usocket, socket.id, cards, this.io);
                            moveToNextTurn(usocket, this.io);
                            break;
                        case 'assassinate-counter-success':
                            // 当前回合玩家展示一张手牌，暗杀因被反制成功而无法执行
                            exposeHandCards(usocket, socket.id, cards, this.io);
                            moveToNextTurn(usocket, this.io);
                            break;
                        case 'assassinate-counter-fail':
                            exposeHandCards(usocket, socket.id, cards, this.io);
                            executeAssassinate(usocket, socket.id, this.io);
                            break;
                        case 'self-sertificate-assassin-fail':
                            exposeHandCards(usocket, socket.id, cards, this.io);
                            moveToNextTurn(usocket, this.io);
                            break;
                        case 'self-sertificate-assassin-success':
                            exposeHandCards(usocket, socket.id, cards, this.io);
                            stillContinueAssassinate(usocket, socket.id, this.io);
                            break;
                    }
                } else if (action === 'exchange') {
                    // 表示从手牌中归还到卡池里
                    discardHandCards(usocket, socket.id, cards, this.io);
                    moveToNextTurn(usocket, this.io);
                }
            });

            // 玩家抉择是否反制
            socket.on(QUESTION_COUNTER, ({ counter, action }) => {
                handleCounterProcess(usocket, socket.id, counter, action, this.io)
            });

            // 玩家抉择是否质疑
            socket.on(QUESTION_DOUBT, ({ doubt, action }) => {
                handleDoubtProcess(usocket, socket.id, doubt, action, this.io)
            });

            // 玩家抉择是否自证身份
            socket.on(SELF_SERTIFICATE, ({ canSertificate, character, action }) => {
                handleSelfCertificate(usocket, socket.id, canSertificate, character, action, this.io)
            });
        });
    }

    emitAll() {
        this.io.emit(...arguments);
    }
}

module.exports = Socket;
