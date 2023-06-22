const { CHARACTERS, getCardByName } = require('./asset');
const { shuffle } = require('./utils');
const {
    QUERY_HAND_CARDS, 
    QUERY_PUBLIC_INFO,
    SYSTEM_INFO,
    IS_ON_TURN,
    NOTIFICATION,
    CHOOSE_TARGET,
    CHOOSE_CARD,
    QUESTION_COUNTER,
    QUESTION_DOUBT,
    SELF_SERTIFICATE,
    CHANGE_STAGE,
} = require('./constants');

// 游戏类
class Game {
    constructor(players) {
        this.index = 0; // 当前进行回合的玩家的索引
        this.cardsPool = CHARACTERS;
        this.playersPool = players.map(username => new Player(username));

        this.donePlayersNum = 0; // 已经抉择的玩家数量
        this.counterPlayer = null; // 选择反制的玩家
        this.doubtPlayers = []; // 选择质疑的玩家
        this.targetPlayer = null; // 当前回合玩家选择行动的目标玩家
    }
    // 开始游戏
    start() {
        this.suffleCards();
        this.shufflePlayers();
        this.index = 0;
        const playerNum = this.playersPool.length;
        this.playersPool.forEach(player => player.init(playerNum, this.cardsPool.splice(0, 2)));
    }
    // 洗牌
    suffleCards() {
        shuffle(this.cardsPool);
    }
    // 随机排列玩家顺序
    shufflePlayers() {
        shuffle(this.playersPool);
    }
    // 根据玩家名字获取玩家的手牌
    getHandCards(username) {
        return this.playersPool.find(player => player.username === username).handCards;
    }
    // 获取公开的信息
    getPublicInfo() {
        return this.playersPool.map(({ username, coins, shownCards }, index) => ({
            username,
            coins,
            shownCards,
            isMyTurn: index === this.index, // 是否是当前回合的玩家
        }));
    }
    // 获取当前回合的玩家
    getOnTurnPlayer() {
        return this.playersPool[this.index];
    }
    // 获取存活的玩家
    getLivePlayers(exceptPlayerName = '') {
        return this.playersPool.filter(player => player.username !== exceptPlayerName && player.shownCards.length < 2);
    }
    // 把回合交给下一个玩家
    nextTurn() {
        this.index = (this.index + 1) % this.playersPool.length;
        if (this.playersPool[this.index].shownCards.length === 2) { // 跳过已经出局的玩家
            this.nextTurn();
        }
    }
    // 重置反制流程的参数
    resetCounterParams() {
        this.donePlayersNum = 0;
        this.counterPlayer = null;
    }
    // 重置质疑流程的参数
    resetDoubtParams() {
        this.donePlayersNum = 0;
        this.doubtPlayers = [];
    }
    // 指定一名玩家，从手牌中取出指定身份的牌（如果有）
    discardCard(username, cardName) {
        const player = this.playersPool.find(player => player.username === username);
        const card = player.discardCard(cardName);
        if (card) {
            this.cardsPool.push(card);
            this.suffleCards();
        }
    }
    // 指定一名玩家，从卡池中重新抽一张手牌
    drawCard(username) {
        const player = this.playersPool.find(player => player.username === username);
        player.handCards.push(this.cardsPool.shift());
    }
}

// 玩家类
class Player {
    constructor(username) {
        this.username = username;
        this.reset();
    }
    // 重置玩家资产
    reset() {
        this.coins = 0; // 起始拥有金币
        this.shownCards = []; // 展示的角色牌
        this.handCards = []; // 手牌
    }
    // 初始化玩家资产
    init(playerNum, cards) {
        this.coins = playerNum > 2 ? 2 : 1; // 2人局每人1金币，大于2人每人2金币
        this.handCards = cards; // 每人两张手牌
    }
    // 玩家出局
    isOut() {
        return this.shownCards.length === 2;
    }
    // 从手牌中拿出一张指定身份的牌（如果有）
    discardCard(cardName) {
        const index = this.handCards.findIndex(card => card.name === cardName);
        if (index !== -1) {
            return this.handCards.splice(index, 1)[0];
        }
    }
}

let game = null;

// 更新信息（桌面信息 & 玩家个人信息）
function renewAllInfo(usocket, io) {
    const onTurnPlayer = game.getOnTurnPlayer();
    Object.values(usocket).forEach(({ username, socket }) => {
        socket.emit(QUERY_HAND_CARDS, game.getHandCards(username)); // 告知每个玩家他的手牌
        socket.emit(IS_ON_TURN, username === onTurnPlayer.username); // 告知每个玩家是否是当前回合的玩家
    });
    io.emit(QUERY_PUBLIC_INFO, game.getPublicInfo()); // 广播公开的玩家信息
}

// 判断是否游戏结束了
function judgeIsGameOver(usocket, io) {
    if (game.getLivePlayers().length === 1) { // 只剩一个玩家存活
        const winner = game.getLivePlayers()[0];
        const winnerSocket = Object.values(usocket).find(({ username }) => username === winner.username).socket;
        winnerSocket.emit(NOTIFICATION, {
            type: 'success',
            message: '系统通知',
            description: '游戏结束，您获胜了！',
        });
        io.emit(SYSTEM_INFO, `游戏结束，${winner.username} 获胜！`);
        Object.values(usocket).forEach(({ socket }) => {
            socket.emit(CHANGE_STAGE, 'end');
        });
        destroyGame();
        return true;
    }
}

// 开始下一回合
function moveToNextTurn(usocket, io) {
    if (judgeIsGameOver(usocket, io)) return;
    game.nextTurn();
    renewAllInfo(usocket, io);
    const onTurnPlayer = game.getOnTurnPlayer();
    io.emit(SYSTEM_INFO, `${onTurnPlayer.username} 的回合`); // 广播当前回合的玩家
}

// 开始游戏
function startGame(usocket/* { socket.id: { username, socket } } */, io) {
    const players = Object.values(usocket).map(({ username }) => username);
    game = new Game(players);
    game.start();
    renewAllInfo(usocket, io);
    const onTurnPlayer = game.getOnTurnPlayer();
    io.emit(SYSTEM_INFO, `${onTurnPlayer.username} 的回合`); // 广播当前回合的玩家
}

// 结束游戏
function destroyGame() {
    game = null;
}

// 玩家行动
function playerAction(usocket/* { socket.id: { username, socket } } */, id, action, io) {
    const socket = usocket[id].socket;
    if (!game) {
        return socket.emit(NOTIFICATION, {
            type: 'error',
            message: '系统通知',
            description: '游戏尚未开始',
        });
    }

    // 判断是不是该执行回合的玩家
    const currentPlayer = game.getOnTurnPlayer();
    if (usocket[id].username !== currentPlayer.username) {
        return socket.emit(NOTIFICATION, {
            type: 'warning',
            message: '系统通知',
            description: '当前不是您的回合',
        });
    }

    if (currentPlayer.coins >= 10 && action !== 'coup') {
        return socket.emit(NOTIFICATION, {
            type: 'warning',
            message: '系统通知',
            description: '您的金币数量大于等于10，只能执行政变',
        });
    }

    const otherLivePlayers = game.getLivePlayers(currentPlayer.username);
    switch (action) {
        case 'income':
            // 执行收入
            currentPlayer.coins += 1;
            io.emit(SYSTEM_INFO, `${currentPlayer.username} 选择了收入，金币+1`);
            moveToNextTurn(usocket, io);
            break;
        case 'foreignAid':
            // 执行外援
            io.emit(SYSTEM_INFO, `${currentPlayer.username} 选择了外援，请其他玩家选择是否进行反制`);
            game.resetCounterParams();
            otherLivePlayers.forEach(({ username }) => {
                const otherPlayerSocket = Object.values(usocket).find(({ username: un }) => un === username).socket;
                otherPlayerSocket.emit(QUESTION_COUNTER, { action });
            });
            break;
        case 'coup':
            // 执行政变
            if (currentPlayer.coins < 7) {
                return socket.emit(NOTIFICATION, {
                    type: 'warning',
                    message: '系统通知',
                    description: '您的金币数量小于7，无法执行政变',
                });
            } else {
                currentPlayer.coins -= 7;
                io.emit(SYSTEM_INFO, `${currentPlayer.username} 选择了政变，金币-7，请选择目标玩家`);
                renewAllInfo(usocket, io);
                socket.emit(CHOOSE_TARGET, { players: game.getLivePlayers(currentPlayer.username).map(({ username }) => username), action });
            }
            break;
        case 'tax':
            // 执行征税
            io.emit(SYSTEM_INFO, `${currentPlayer.username} 选择了征税，请其他玩家选择是否质疑其公爵身份`);
            game.resetDoubtParams();
            otherLivePlayers.forEach(({ username }) => {
                const otherPlayerSocket = Object.values(usocket).find(({ username: un }) => un === username).socket;
                otherPlayerSocket.emit(QUESTION_DOUBT, { action });
            });
            break;
        case 'assassinate':
            // 执行暗杀
            if (currentPlayer.coins < 3) {
                return socket.emit(NOTIFICATION, {
                    type: 'warning',
                    message: '系统通知',
                    description: '您的金币数量小于3，无法执行暗杀',
                });
            } else {
                currentPlayer.coins -= 3;
                io.emit(SYSTEM_INFO, `${currentPlayer.username} 选择了暗杀，金币-3，请选择目标玩家`);
                renewAllInfo(usocket, io);
                socket.emit(CHOOSE_TARGET, { players: game.getLivePlayers(currentPlayer.username).map(({ username }) => username), action });
            }
            break;
        case 'exchange':
            // 执行交换
            io.emit(SYSTEM_INFO, `${currentPlayer.username} 选择了交换，请其他玩家选择是否质疑其大使身份`);
            game.resetDoubtParams();
            otherLivePlayers.forEach(({ username }) => {
                const otherPlayerSocket = Object.values(usocket).find(({ username: un }) => un === username).socket;
                otherPlayerSocket.emit(QUESTION_DOUBT, { action });
            });
            break;
        case 'steal':
            // 执行偷窃
            io.emit(SYSTEM_INFO, `${currentPlayer.username} 选择了偷窃，请选择想要偷窃的目标玩家`);
            socket.emit(CHOOSE_TARGET, { players: game.getLivePlayers(currentPlayer.username).map(({ username }) => username), action });
            break;
    }
}

// 执行偷窃（第一阶段: 其他玩家可以质疑当前回合玩家的队长身份）
function continueSteal(usocket/* { socket.id: { username, socket } } */, id, targetPlayerName, io) {
    io.emit(SYSTEM_INFO, `${usocket[id].username} 选择了偷窃 ${targetPlayerName}，请其他玩家选择是否质疑其队长身份`);
    game.targetPlayer = game.playersPool.find(({ username }) => username === targetPlayerName);
    game.resetDoubtParams();
    const otherLivePlayers = game.getLivePlayers(usocket[id].username);
    otherLivePlayers.forEach(({ username }) => {
        const otherPlayerSocket = Object.values(usocket).find(({ username: un }) => un === username).socket;
        otherPlayerSocket.emit(QUESTION_DOUBT, { action: 'steal' });
    });
}

// 执行偷窃（第二阶段, 质疑阶段结束，进入目标玩家的反制阶段）
function stillContinueSteal(usocket/* { socket.id: { username, socket } } */, id, io) {
    const targetPlayer = game.targetPlayer;
    const currentPlayer = game.getOnTurnPlayer();
    if (targetPlayer.isOut()) {
        // 若目标玩家阵亡，直接进行偷窃
        io.emit(SYSTEM_INFO, `${targetPlayer.username} 已阵亡，${currentPlayer.username} 直接进行偷窃`);
        executeSteal(usocket, id, io);
    } else {
        // 若目标玩家存活，则等待目标玩家选择是否反制
        io.emit(SYSTEM_INFO, `等待${targetPlayer.username} 选择是否反制当前回合玩家的偷窃行动`);
        game.resetCounterParams();
        const targetPlayerSocket = Object.values(usocket).find(({ username }) => username === targetPlayer.username).socket;
        targetPlayerSocket.emit(QUESTION_COUNTER, { action: 'steal' });
    }
}

// 执行暗杀（第一阶段: 其他玩家可以质疑当前回合玩家的刺客身份）
function contineAssassinate(usocket/* { socket.id: { username, socket } } */, id, targetPlayerName, io) {
    io.emit(SYSTEM_INFO, `${usocket[id].username} 选择了暗杀 ${targetPlayerName}，请其他玩家选择是否质疑其刺客身份`);
    game.targetPlayer = game.playersPool.find(({ username }) => username === targetPlayerName);
    game.resetDoubtParams();
    const otherLivePlayers = game.getLivePlayers(usocket[id].username);
    otherLivePlayers.forEach(({ username }) => {
        const otherPlayerSocket = Object.values(usocket).find(({ username: un }) => un === username).socket;
        otherPlayerSocket.emit(QUESTION_DOUBT, { action: 'assassinate' });
    });
}

// 执行暗杀（第二阶段, 质疑阶段结束，进入目标玩家的反制阶段）
function stillContinueAssassinate(usocket/* { socket.id: { username, socket } } */, id, io) {
    const targetPlayer = game.targetPlayer;
    if (targetPlayer.isOut()) {
        // 若目标玩家阵亡，直接下一回合
        io.emit(SYSTEM_INFO, `${targetPlayer.username} 已阵亡，直接下一回合`);
        moveToNextTurn(usocket, io);
    } else {
        // 若目标玩家存活，则等待目标玩家选择是否反制
        io.emit(SYSTEM_INFO, `等待${targetPlayer.username} 选择是否反制当前回合玩家的暗杀行动`);
        game.resetCounterParams();
        const targetPlayerSocket = Object.values(usocket).find(({ username }) => username === targetPlayer.username).socket;
        targetPlayerSocket.emit(QUESTION_COUNTER, { action: 'assassinate' });
    }
}

// 执行政变
function executeCoup(usocket/* { socket.id: { username, socket } } */, id, targetPlayerName, io) {
    io.emit(SYSTEM_INFO, `${usocket[id].username} 选择了对 ${targetPlayerName} 发动政变，等待 ${targetPlayerName} 选择一张手牌进行公开`);
    const targetSocket = Object.values(usocket).find(({ username }) => username === targetPlayerName).socket;
    const targetPlayerObj = game.playersPool.find(({ username }) => username === targetPlayerName);
    const targetPlayerHandCards = targetPlayerObj.handCards;
    targetSocket.emit(CHOOSE_CARD, { handCards: targetPlayerHandCards, action: 'show', chain: 'coup' }); // 让目标玩家选择一张手牌进行公开
}

// 执行外援
function executeForeignAid(usocket/* { socket.id: { username, socket } } */, io) {
    const currentPlayer = game.getOnTurnPlayer();
    io.emit(SYSTEM_INFO, `成功执行外援, ${currentPlayer.username} 直接金币+2`);
    currentPlayer.coins += 2;
    moveToNextTurn(usocket, io);
}

// 执行征税
function executeTax(usocket/* { socket.id: { username, socket } } */, id, io) {
    const username = usocket[id].username;
    game.doubtPlayers.splice(game.doubtPlayers.findIndex(({ username: un }) => un === username), 1);
    if (game.doubtPlayers.length === 0) {
        const currentPlayer = game.getOnTurnPlayer();
        io.emit(SYSTEM_INFO, `成功执行征税, ${currentPlayer.username} 直接金币+3`);
        currentPlayer.coins += 3;
        moveToNextTurn(usocket, io);
    }
}

// 执行交换
function executeExchange(usocket/* { socket.id: { username, socket } } */, id, io) {
    const username = usocket[id].username;
    game.doubtPlayers.splice(game.doubtPlayers.findIndex(({ username: un }) => un === username), 1);
    if (game.doubtPlayers.length === 0) {
        const currentPlayer = game.getOnTurnPlayer();
        const currentPlayerSocket = Object.values(usocket).find(({ username }) => username === currentPlayer.username).socket;
        io.emit(SYSTEM_INFO, `成功执行交换, ${currentPlayer.username} 从卡池中抽两张牌到手牌中, 然后选择两张手牌归还到卡池中`);
        // 先从卡池中抽两张牌到手牌中
        currentPlayer.handCards = [...currentPlayer.handCards, ...game.cardsPool.splice(0, 2)];
        currentPlayerSocket.emit(CHOOSE_CARD, { handCards: currentPlayer.handCards, action: 'exchange' });
    }
}

// 执行偷窃
function executeSteal(usocket/* { socket.id: { username, socket } } */, id, io) {
    const targetPlayer = game.targetPlayer;
    const currentPlayer = game.getOnTurnPlayer();
    let stealCoinsNum = targetPlayer.coins ? 1 : 0;
    if (targetPlayer.coins >= 2) {
        stealCoinsNum = 2;
    }
    io.emit(SYSTEM_INFO, `${currentPlayer.username} 成功从${targetPlayer.username} 处偷窃了${stealCoinsNum}金币`);
    targetPlayer.coins -= stealCoinsNum;
    currentPlayer.coins += stealCoinsNum;
    moveToNextTurn(usocket, io);
}

// 执行暗杀
function executeAssassinate(usocket/* { socket.id: { username, socket } } */, id, io) {
    const targetPlayer = game.targetPlayer;
    const currentPlayer = game.getOnTurnPlayer();
    io.emit(SYSTEM_INFO, `${currentPlayer.username} 成功暗杀，等待${targetPlayer.username}选择公开一张手牌`);
    const targetPlayerSocket = Object.values(usocket).find(({ username }) => username === targetPlayer.username).socket;
    targetPlayerSocket.emit(CHOOSE_CARD, { handCards: targetPlayer.handCards, action: 'show', chain: 'assassinate' }); // 让目标玩家选择一张手牌进行公开
}

// 公开手牌
function exposeHandCards(usocket, id, cards, io) {
    const player = game.playersPool.find(({ username }) => username === usocket[id].username);
    const socket = usocket[id].socket;
    cards.forEach((cardName) => {
        const index = player.handCards.findIndex(card => card.name === cardName);
        if (index !== -1) {
            const card = player.handCards.splice(index, 1)[0];
            player.shownCards.push(card);
            io.emit(SYSTEM_INFO, `${player.username} 公开了ta的身份: ${card.label}`);
        }
    });

    // 判断该玩家是否已经没有手牌了
    if (player.isOut()) {
        io.emit(SYSTEM_INFO, `${player.username} 已经没有手牌了，出局`);
        socket.emit(NOTIFICATION, {
            type: 'error',
            message: '系统通知',
            description: '您的游戏已经结束，下一把再接再厉',
        });
    }

    renewAllInfo(usocket, io);
}

// 丢弃手牌
function discardHandCards(usocket, id, cards, io) {
    const player = game.playersPool.find(({ username }) => username === usocket[id].username);
    cards.forEach((cardName) => {
        const index = player.handCards.findIndex(card => card.name === cardName);
        if (index !== -1) {
            const card = player.handCards.splice(index, 1)[0];
            game.cardsPool.push(card);
        }
    });
    io.emit(SYSTEM_INFO, `${player.username} 丢弃了 ${cards.length} 张手牌`);
}

/**
 * 处理反制流程
 * action=foreignAid 回合外玩家
 * action=steal 回合外玩家
 * aciont=assassinate 回合外玩家
 */
function handleCounterProcess(usocket/* { socket.id: { username, socket } } */, id, counter, action, io) {
    const player = game.playersPool.find(({ username }) => username === usocket[id].username);
    io.emit(SYSTEM_INFO, `${player.username} 选择了 ${counter ? '反制' : '不反制'}`);
    // 选择反制的情况下，只保留第一个反制的玩家
    if (counter && !game.counterPlayer) {
        game.counterPlayer = player;
    }
    game.donePlayersNum++;
    const currentPlayer = game.getOnTurnPlayer();
    const currentPlayerSocket = Object.values(usocket).find(({ username }) => username === currentPlayer.username).socket;

    // 当所有玩家都选择抉择完后
    if (action === 'foreignAid') {
        if (game.donePlayersNum === game.getLivePlayers().length - 1) {
            if (game.counterPlayer) {
                // 有反制玩家
                io.emit(SYSTEM_INFO, `${game.counterPlayer.username} 是第一个选择了反制的玩家，等待 ${currentPlayer.username} 选择是否质疑反制玩家的身份`);
                currentPlayerSocket.emit(QUESTION_DOUBT, { action });
            } else {
                // 无反制玩家
                io.emit(SYSTEM_INFO, `没有玩家选择反制, ${currentPlayer.username} 直接金币+2`);
                currentPlayer.coins += 2;
                moveToNextTurn(usocket, io);
                return;
            }
        }
    } else if (action === 'steal') {
        // 偷窃阶段反制玩家只有目标玩家一个人
        if (game.donePlayersNum === 1) {
            if (game.counterPlayer) {
                // 有反制玩家
                io.emit(SYSTEM_INFO, `${game.counterPlayer.username} 选择了反制，等待 ${currentPlayer.username} 选择是否质疑反制玩家的队长身份`);
                game.resetDoubtParams();
                currentPlayerSocket.emit(QUESTION_DOUBT, { action: `${action}-counter` });
            } else {
                // 无反制玩家
                io.emit(SYSTEM_INFO, `${game.targetPlayer.username} 选择了不反制, ${currentPlayer.username} 直接偷窃`);
                executeSteal(usocket, id, io);
            }
        }
    } else if (action === 'assassinate') {
        // 暗杀阶段反制玩家只有目标玩家一个人
        if (game.donePlayersNum === 1) {
            if (game.counterPlayer) {
                // 有反制玩家
                io.emit(SYSTEM_INFO, `${game.counterPlayer.username} 选择了反制，等待 ${currentPlayer.username} 选择是否质疑反制玩家的伯爵夫人身份`);
                game.resetDoubtParams();
                currentPlayerSocket.emit(QUESTION_DOUBT, { action: `${action}-counter` });
            } else {
                // 无反制玩家
                io.emit(SYSTEM_INFO, `${game.targetPlayer.username} 选择了不反制, ${currentPlayer.username} 直接暗杀`);
                executeAssassinate(usocket, id, io);
            }
        }
    }
}

/**
 * 处理质疑流程
 * action=foreignAid 回合中玩家
 * action=tax 回合外玩家
 * action=exchange 回合外玩家
 * action=steal 回合外玩家
 * action=steal-counter 回合中玩家
 * action=assassinate 回合外玩家
 * action=assassinate-counter 回合中玩家
 */
function handleDoubtProcess(usocket, id, doubt, action, io) {
    const username = usocket[id].username;
    switch (action) {
        case 'foreignAid':
            if (doubt) {
                // 如果质疑了
                const { handCards, username: counterPlayerUsername } = game.counterPlayer;
                io.emit(SYSTEM_INFO, `${username} 选择了质疑对方的公爵身份, 等待${counterPlayerUsername} 自证身份`);
                const hasDuke = handCards.some(({ name }) => name === 'DUKE');
                const counterPlayerSocket = Object.values(usocket).find(({ username }) => username === counterPlayerUsername).socket;
                counterPlayerSocket.emit(SELF_SERTIFICATE, { hasCharacter: hasDuke, character: 'DUKE', action });
                break;
            } else {
                // 如果不质疑
                io.emit(SYSTEM_INFO, `${username} 选择了不质疑对方的公爵身份, 因被反制导致无法进行外援`);
                moveToNextTurn(usocket, io);
                break;
            }
        case 'tax':
        case 'exchange':
        case 'steal':
        case 'steal-counter':
        case 'assassinate':
        case 'assassinate-counter':
            handleBatchDoubtProcess(usocket, id, doubt, action, io);
            break;
    }
}

/**
 * 处理批量质疑流程
 * action=tax 回合外玩家
 * action=exchange 回合外玩家
 * action=steal 回合外玩家
 * action=steal-counter 回合内玩家
 * action=assassinate 回合外玩家
 * action=assassinate-counter 回合内玩家
 */
function handleBatchDoubtProcess(usocket, id, doubt, action, io) {
    const doubtPlayer = game.playersPool.find(({ username }) => username === usocket[id].username);
    const currentPlayer = game.getOnTurnPlayer();
    const currentPlayerSocket = Object.values(usocket).find(({ username }) => username === currentPlayer.username).socket;
    let targetPlayer, targetPlayerSocket;
    if (game.targetPlayer) {
        targetPlayer = game.targetPlayer;
        targetPlayerSocket = Object.values(usocket).find(({ username }) => username === targetPlayer.username).socket;
    }
    switch (action) {
        case 'tax':
            if (doubt) {
                game.doubtPlayers.push(doubtPlayer);
            }
            io.emit(SYSTEM_INFO, `${doubtPlayer.username} 完成了质疑选择`);
            game.donePlayersNum++;
            // 当所有玩家都抉择完后
            if (game.donePlayersNum === game.getLivePlayers().length - 1) {
                if (game.doubtPlayers.length) {
                    // 有玩家选择质疑
                    io.emit(SYSTEM_INFO, `有${game.doubtPlayers.length}位玩家选择质疑, 等待 ${currentPlayer.username} 自证身份`);
                    const hasDuke = currentPlayer.handCards.some(({ name }) => name === 'DUKE');
                    currentPlayerSocket.emit(SELF_SERTIFICATE, { hasCharacter: hasDuke, character: 'DUKE', action });
                } else {
                    // 没有玩家选择质疑
                    io.emit(SYSTEM_INFO, `没有玩家选择质疑, ${currentPlayer.username} 直接金币+3`);
                    currentPlayer.coins += 3;
                    moveToNextTurn(usocket, io);
                }
            }
            break;
        case 'exchange':
            if (doubt) {
                game.doubtPlayers.push(doubtPlayer);
            }
            io.emit(SYSTEM_INFO, `${doubtPlayer.username} 完成了质疑选择`);
            game.donePlayersNum++;
            // 当所有玩家都抉择完后
            if (game.donePlayersNum === game.getLivePlayers().length - 1) {
                if (game.doubtPlayers.length) {
                    // 有玩家选择质疑
                    io.emit(SYSTEM_INFO, `有${game.doubtPlayers.length}位玩家选择质疑, 等待 ${currentPlayer.username} 自证身份`);
                    const hasAmbassador = currentPlayer.handCards.some(({ name }) => name === 'AMBASSADOR');
                    currentPlayerSocket.emit(SELF_SERTIFICATE, { hasCharacter: hasAmbassador, character: 'AMBASSADOR', action });
                } else {
                    // 没有玩家选择质疑
                    io.emit(SYSTEM_INFO, `没有玩家选择质疑, ${currentPlayer.username} 执行交换, 从卡池中抽两张牌到手牌，然后选择两张手牌放回卡池`);
                    // 先从卡池中抽两张牌到手牌中
                    currentPlayer.handCards = [...currentPlayer.handCards, ...game.cardsPool.splice(0, 2)];
                    currentPlayerSocket.emit(CHOOSE_CARD, { handCards: currentPlayer.handCards, action });
                }
            }
            break;
        case 'steal':
            if (doubt) {
                game.doubtPlayers.push(doubtPlayer);
            }
            io.emit(SYSTEM_INFO, `${doubtPlayer.username} 完成了质疑选择`);
            game.donePlayersNum++;
            // 当所有玩家都抉择完后
            if (game.donePlayersNum === game.getLivePlayers().length - 1) {
                if (game.doubtPlayers.length) {
                    // 有玩家选择质疑
                    io.emit(SYSTEM_INFO, `有${game.doubtPlayers.length}位玩家选择质疑, 等待 ${currentPlayer.username} 自证身份`);
                    const hasCaptain = currentPlayer.handCards.some(({ name }) => name === 'CAPTAIN');
                    currentPlayerSocket.emit(SELF_SERTIFICATE, { hasCharacter: hasCaptain, character: 'CAPTAIN', action });
                } else {
                    // 没有玩家选择质疑
                    io.emit(SYSTEM_INFO, `没有玩家选择质疑`);
                    stillContinueSteal(usocket, id, io);
                }
            }
            break;
        case 'steal-counter':
            // 回合内玩家质疑目标玩家声明反制的队长身份
            if (doubt) {
                // 质疑，则需要目标玩家进行自证身份
                io.emit(SYSTEM_INFO, `${currentPlayer.username} 选择了质疑，等待 ${targetPlayer.username} 自证身份`);
                const hasCaptain = targetPlayer.handCards.some(({ name }) => name === 'CAPTAIN');
                targetPlayerSocket.emit(SELF_SERTIFICATE, { hasCharacter: hasCaptain, character: 'CAPTAIN', action });
            } else {
                // 不质疑，则目标玩家反制成功，本回合内玩家无法执行偷窃
                io.emit(SYSTEM_INFO, `${currentPlayer.username} 选择了不质疑，${targetPlayer.username} 反制成功，本回合${currentPlayer.username} 无法执行偷窃`);
                moveToNextTurn(usocket, io);
            }
            break;
        case 'assassinate':
            if (doubt) {
                game.doubtPlayers.push(doubtPlayer);
            }
            io.emit(SYSTEM_INFO, `${doubtPlayer.username} 完成了质疑选择`);
            game.donePlayersNum++;
            // 当所有玩家都抉择完后
            if (game.donePlayersNum === game.getLivePlayers().length - 1) {
                if (game.doubtPlayers.length) {
                    // 有玩家选择质疑
                    io.emit(SYSTEM_INFO, `有${game.doubtPlayers.length}位玩家选择质疑, 等待 ${currentPlayer.username} 自证身份`);
                    const hasAssassin = currentPlayer.handCards.some(({ name }) => name === 'ASSASSIN');
                    currentPlayerSocket.emit(SELF_SERTIFICATE, { hasCharacter: hasAssassin, character: 'ASSASSIN', action });
                } else {
                    // 没有玩家选择质疑
                    io.emit(SYSTEM_INFO, `没有玩家选择质疑`);
                    stillContinueAssassinate(usocket, id, io);
                }
            }
            break;
        case 'assassinate-counter':
            // 回合内玩家质疑目标玩家声明反制的伯爵夫人身份
            if (doubt) {
                // 质疑，则需要目标玩家进行自证身份
                io.emit(SYSTEM_INFO, `${currentPlayer.username} 选择了质疑，等待 ${targetPlayer.username} 自证身份`);
                const hasContessa = targetPlayer.handCards.some(({ name }) => name === 'CONTESSA');
                targetPlayerSocket.emit(SELF_SERTIFICATE, { hasCharacter: hasContessa, character: 'CONTESSA', action });
            } else {
                // 不质疑，则目标玩家反制成功，本回合内玩家无法执行暗杀
                io.emit(SYSTEM_INFO, `${currentPlayer.username} 选择了不质疑，${targetPlayer.username} 反制成功，本回合${currentPlayer.username} 无法执行暗杀`);
                moveToNextTurn(usocket, io);
            }
            break;
    }
}

/**
 * 处理自证流程
 * action=foreignAid 回合外玩家 自证 DUKE身份
 * action=tax 回合内玩家 自证 DUKE身份
 * action=exchange 回合内玩家 自证 AMBASSADOR身份
 * action=steal 回合内玩家 自证 CAPTAIN身份
 * action=steal-counter 回合外玩家 自证 CAPTAIN身份
 * action=assassinate 回合内玩家 自证 ASSASSIN身份
 * action=assassinate-counter 回合外玩家 自证 CONTESSA身份
 */
function handleSelfCertificate(usocket, id, canSertificate, character, action, io) {
    const player = game.playersPool.find(({ username }) => username === usocket[id].username);
    const currentPlayer = game.getOnTurnPlayer();
    const playerSocket = usocket[id].socket;
    const currentPlayerSocket = Object.values(usocket).find(({ username }) => username === currentPlayer.username).socket;
    const card = getCardByName(character);
    switch (action) {
        case 'foreignAid':
            if (canSertificate) {
                // 自证身份
                io.emit(SYSTEM_INFO, `${player.username} 成功自证了${card.label}身份`);
                // 自证玩家先从手牌中把该角色卡还给牌堆
                game.discardCard(player.username, character);
                // 然后从牌堆中抽取一张牌
                game.drawCard(player.username);
                // 当前回合的玩家因为质疑失败，1.需要展示一张手牌，2.本回合外援行动失败
                io.emit(SYSTEM_INFO, `${currentPlayer.username} 质疑失败，需要选择一张手牌进行公开。并且本回合无法执行外援行动。`);
                currentPlayerSocket.emit(CHOOSE_CARD, { handCards: currentPlayer.handCards, action: 'show', chain: `${action}-fail` });
            } else {
                // 放弃自证身份
                io.emit(SYSTEM_INFO, `${player.username} 放弃了自证${card.label}身份, 需要选择一张手牌进行公开`);
                playerSocket.emit(CHOOSE_CARD, { handCards: player.handCards, action: 'show', chain: `${action}-success` });
            }
            break;
        case 'tax':
            if (canSertificate) {
                // 自证身份
                io.emit(SYSTEM_INFO, `${currentPlayer.username} 成功自证了${card.label}身份`);
                // 自证玩家先从手牌中把该角色卡还给牌堆
                game.discardCard(currentPlayer.username, character);
                // 然后从牌堆中抽取一张牌
                game.drawCard(currentPlayer.username);
                // 1. 质疑的玩家都要展示一张手牌 2. 当前玩家成功执行收税行动
                game.doubtPlayers.forEach((player) => {
                    const playerSocket = Object.values(usocket).find(({ username }) => username === player.username).socket;
                    io.emit(SYSTEM_INFO, `${player.username} 质疑失败，需要选择一张手牌进行公开。`);
                    playerSocket.emit(CHOOSE_CARD, { handCards: player.handCards, action: 'show', chain: `${action}-success` });
                });
            } else {
                // 放弃自证身份
                io.emit(SYSTEM_INFO, `${currentPlayer.username} 放弃了自证${card.label}身份, 需要选择一张手牌进行公开`);
                currentPlayerSocket.emit(CHOOSE_CARD, { handCards: currentPlayer.handCards, action: 'show', chain: `${action}-fail` });
            }
            break;
        case 'exchange':
            if (canSertificate) {
                // 自证身份
                io.emit(SYSTEM_INFO, `${currentPlayer.username} 成功自证了${card.label}身份`);
                // 自证玩家先从手牌中把该角色卡还给牌堆
                game.discardCard(currentPlayer.username, character);
                // 然后从牌堆中抽取一张牌
                game.drawCard(currentPlayer.username);
                // 1. 质疑的玩家都要展示一张手牌 2. 当前玩家成功执行交换行动
                game.doubtPlayers.forEach((player) => {
                    const playerSocket = Object.values(usocket).find(({ username }) => username === player.username).socket;
                    io.emit(SYSTEM_INFO, `${player.username} 质疑失败，需要选择一张手牌进行公开。`);
                    playerSocket.emit(CHOOSE_CARD, { handCards: player.handCards, action: 'show', chain: `${action}-success` });
                });
            } else {
                // 放弃自证身份
                io.emit(SYSTEM_INFO, `${currentPlayer.username} 放弃了自证${card.label}身份, 需要选择一张手牌进行公开`);
                currentPlayerSocket.emit(CHOOSE_CARD, { handCards: currentPlayer.handCards, action: 'show', chain: `${action}-fail` });
            }
            break;
        case 'steal':
            if (canSertificate) {
                // 自证身份
                io.emit(SYSTEM_INFO, `${currentPlayer.username} 成功自证了${card.label}身份`);
                // 自证玩家先从手牌中把该角色卡还给牌堆
                game.discardCard(currentPlayer.username, character);
                // 然后从牌堆中抽取一张牌
                game.drawCard(currentPlayer.username);
                // 1. 质疑的玩家都要展示一张手牌 2. 若目标玩家存活，则等待目标玩家选择是否反制 3. 若目标玩家阵亡，直接进行偷窃
                game.doubtPlayers.forEach((player) => {
                    const playerSocket = Object.values(usocket).find(({ username }) => username === player.username).socket;
                    io.emit(SYSTEM_INFO, `${player.username} 质疑失败，需要选择一张手牌进行公开。`);
                    playerSocket.emit(CHOOSE_CARD, { handCards: player.handCards, action: 'show', chain: `self-sertificate-captain-success` });
                });
            } else {
                // 无法自证身份
                io.emit(SYSTEM_INFO, `${currentPlayer.username} 无法自证${card.label}身份, 需要选择一张手牌进行公开。并且本回合偷窃失败。`);
                currentPlayerSocket.emit(CHOOSE_CARD, { handCards: currentPlayer.handCards, action: 'show', chain: `self-sertificate-captain-fail` });
            }
            break;
        case 'steal-counter':
            if (canSertificate) {
                // 目标玩家成功自证身份
                io.emit(SYSTEM_INFO, `${player.username} 成功自证了${card.label}身份`);
                // 目标玩家先从手牌中把该角色卡还给牌堆
                game.discardCard(player.username, character);
                // 然后从牌堆中抽取一张牌
                game.drawCard(player.username);
                // 质疑的当前回合玩家展示一张手牌，偷窃因被反制成功而无法执行
                io.emit(SYSTEM_INFO, `${currentPlayer.username} 质疑失败，需要选择一张手牌进行公开。并且本回合偷窃行动被反制成功而无法执行。`);
                currentPlayerSocket.emit(CHOOSE_CARD, { handCards: currentPlayer.handCards, action: 'show', chain: `steal-counter-success` });
            } else {
                // 目标玩家无法自证身份
                io.emit(SYSTEM_INFO, `${player.username} 无法自证${card.label}身份，需要选择一张手牌进行公开。本回合玩家偷窃行动继续执行。`);
                playerSocket.emit(CHOOSE_CARD, { handCards: player.handCards, action: 'show', chain: `steal-counter-fail` });
            }
            break;
        case 'assassinate':
            if (canSertificate) {
                // 自证身份
                io.emit(SYSTEM_INFO, `${currentPlayer.username} 成功自证了${card.label}身份`);
                // 自证玩家先从手牌中把该角色卡还给牌堆
                game.discardCard(currentPlayer.username, character);
                // 然后从牌堆中抽取一张牌
                game.drawCard(currentPlayer.username);
                // 1. 质疑的玩家都要展示一张手牌 2. 若目标玩家存活，则等待目标玩家选择是否反制 3. 若目标玩家阵亡，则直接下一回合
                game.doubtPlayers.forEach((player) => {
                    const playerSocket = Object.values(usocket).find(({ username }) => username === player.username).socket;
                    io.emit(SYSTEM_INFO, `${player.username} 质疑失败，需要选择一张手牌进行公开。`);
                    playerSocket.emit(CHOOSE_CARD, { handCards: player.handCards, action: 'show', chain: `self-sertificate-assassin-success` });
                });
            } else {
                // 无法自证身份
                io.emit(SYSTEM_INFO, `${currentPlayer.username} 无法自证${card.label}身份, 需要选择一张手牌进行公开。并且本回合暗杀失败。`);
                currentPlayerSocket.emit(CHOOSE_CARD, { handCards: currentPlayer.handCards, action: 'show', chain: `self-sertificate-assassin-fail` });
            }
            break;
        case 'assassinate-counter':
            if (canSertificate) {
                // 目标玩家成功自证身份
                io.emit(SYSTEM_INFO, `${player.username} 成功自证了${card.label}身份`);
                // 目标玩家先从手牌中把该角色卡还给牌堆
                game.discardCard(player.username, character);
                // 然后从牌堆中抽取一张牌
                game.drawCard(player.username);
                // 质疑的当前回合玩家展示一张手牌，暗杀因被反制成功而无法执行
                io.emit(SYSTEM_INFO, `${currentPlayer.username} 质疑失败，需要选择一张手牌进行公开。并且本回合暗杀行动被反制成功而无法执行。`);
                currentPlayerSocket.emit(CHOOSE_CARD, { handCards: currentPlayer.handCards, action: 'show', chain: `assassinate-counter-success` });
            } else {
                // 目标玩家无法自证身份
                io.emit(SYSTEM_INFO, `${player.username} 无法自证${card.label}身份，需要选择一张手牌进行公开。本回合玩家暗杀行动继续执行。`);
                playerSocket.emit(CHOOSE_CARD, { handCards: player.handCards, action: 'show', chain: `assassinate-counter-fail` });
            }
            break;
    }
}

function getGame() {
    return game;
}

module.exports = {
    startGame,
    destroyGame,
    playerAction,
    executeCoup,
    executeForeignAid,
    executeTax,
    executeExchange,
    executeSteal,
    exposeHandCards,
    discardHandCards,
    moveToNextTurn,
    handleCounterProcess,
    handleDoubtProcess,
    handleSelfCertificate,
    continueSteal,
    stillContinueSteal,
    contineAssassinate,
    executeAssassinate,
    stillContinueAssassinate,
    getGame,
};
