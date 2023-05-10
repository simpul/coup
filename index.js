const { CHARACTERS } = require('./asset');
const { shuffle } = require('./utils');

// 玩家类
class Player {
    constructor(nick) {
        this.nick = nick;
        this.coins = 0; // 起始拥有金币
        this.shownCards = []; // 展示的角色牌
        this.handCards = []; // 手牌
    }
}

const bin = new Player('Bin');
const wei = new Player('Wei');
const jie = new Player('Jie');

const playerPool = [bin, wei, jie];
let cardsPool = [];

// 初始化游戏
function initGame() {
    // 洗牌
    cardsPool = shuffle(CHARACTERS);
    playerPool.forEach(player => {
        player.shownCards = []; // 清空展示的角色牌
        player.handCards = cardsPool.splice(0, 2); // 每人发两张牌
        player.coins = playerPool.length > 2 ? 2 : 1; // 2人局每人1金币，大于2人每人2金币
    });
}

initGame();
