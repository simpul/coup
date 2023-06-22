// 加入游戏房间
export const JOIN_ROOM = 'joinRoom';
// 查询房间内玩家名单
export const QUERY_PLAYERS = 'queryPlayers';
// 公告通知事件
export const SYSTEM_INFO = 'systemInfo';
// 公聊事件
export const PUBLIC_CHAT = 'publicChat';
// 玩家准备游戏事件
export const CHANGE_READY = 'changeReady';
// 游戏阶段改变事件
export const CHANGE_STAGE = 'changeStage';
// 获取玩家手牌
export const QUERY_HAND_CARDS = 'queryHandCards';
// 获取玩家公开信息
export const QUERY_PUBLIC_INFO = 'queryPublicInfo';
// 玩家是否轮到
export const IS_ON_TURN = 'isOnTURN';
// 系统通知
export const NOTIFICATION = 'notification';
// 玩家执行回合
export const ACTION = 'action';
// 玩家选择目标
export const CHOOSE_TARGET = 'chooseTarget';
// 玩家选择卡牌
export const CHOOSE_CARD = 'chooseCard';
// 询问其他玩家是否反制当前回合玩家的行动
export const QUESTION_COUNTER = 'questionCounter';
// 询问玩家是否质疑身份
export const QUESTION_DOUBT = 'questionDoubt';
// 玩家自证身份
export const SELF_SERTIFICATE = 'selfSertificate';
// 玩家查询自己的信息
export const CHECK_MY_INFO = 'checkMyInfo';

export default class Socket {
    constructor() {
        if (!Socket.instance) {
            Socket.instance = this;
            // eslint-disable-next-line no-undef, no-unused-vars
            this.socket = io();
        }
        return Socket.instance;
    }

    // 加入房间
    joinRoom(username) {
        this.socket.emit(JOIN_ROOM, username);
    }

    // 公共聊天
    publicChat(text) {
        this.socket.emit(PUBLIC_CHAT, text);
    }

    // 准备or取消准备
    changeReady(isReady) {
        this.socket.emit(CHANGE_READY, isReady);
    }

    on(eventName, callback) {
        this.socket.on(eventName, callback);
    }

    emit(eventName, data) {
        this.socket.emit(eventName, data);
    }
}
