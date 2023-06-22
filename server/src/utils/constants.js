// 加入游戏房间
const JOIN_ROOM = 'joinRoom';
// 查询房间内玩家名单
const QUERY_PLAYERS = 'queryPlayers';
// 公告通知事件
const SYSTEM_INFO = 'systemInfo';
// 公聊事件
const PUBLIC_CHAT = 'publicChat';
// 玩家准备游戏事件
const CHANGE_READY = 'changeReady';
// 游戏阶段改变事件
const CHANGE_STAGE = 'changeStage';
// 获取玩家手牌
const QUERY_HAND_CARDS = 'queryHandCards';
// 获取玩家公开信息
const QUERY_PUBLIC_INFO = 'queryPublicInfo';
// 玩家是否轮到
const IS_ON_TURN = 'isOnTURN';
// 系统通知(系统告知某个玩家)
const NOTIFICATION = 'notification';
// 玩家执行回合
const ACTION = 'action';
// 玩家选择目标
const CHOOSE_TARGET = 'chooseTarget';
// 玩家选择卡牌
const CHOOSE_CARD = 'chooseCard';
// 询问其他玩家是否反制当前回合玩家的行动
const QUESTION_COUNTER = 'questionCounter';
// 询问玩家是否质疑身份
const QUESTION_DOUBT = 'questionDoubt';
// 玩家自证身份
const SELF_SERTIFICATE = 'selfSertificate';
// 玩家查询自己的信息
const CHECK_MY_INFO = 'checkMyInfo';

module.exports = {
    JOIN_ROOM,
    QUERY_PLAYERS,
    SYSTEM_INFO,
    PUBLIC_CHAT,
    CHANGE_READY,
    CHANGE_STAGE,
    QUERY_HAND_CARDS,
    QUERY_PUBLIC_INFO,
    IS_ON_TURN,
    NOTIFICATION,
    ACTION,
    CHOOSE_TARGET,
    CHOOSE_CARD,
    QUESTION_COUNTER,
    QUESTION_DOUBT,
    SELF_SERTIFICATE,
    CHECK_MY_INFO,
};
