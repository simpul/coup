export const instructionColumns = [
    {
        title: '角色',
        dataIndex: 'role',
        key: 'role',
    },
    {
        title: '行动',
        key: 'action',
    },
    {
        title: '效果',
        dataIndex: 'effect',
        key: 'effect',
    },
    {
        title: '反制',
        dataIndex: 'counter',
        key: 'counter',
    }
];

export const instructionContent = [
    {
        key: 'income',
        role: '--',
        action: '收入',
        effect: '获得1硬币',
        counter: 'X',
    },
    {
        key: 'foreignAid',
        role: '--',
        action: '外援',
        effect: '获得2硬币',
        counter: 'X',
    },
    {
        key: 'coup',
        role: '--',
        action: '政变',
        effect: '花费7个硬币，指定一个玩家翻开一张角色卡。（回合开始时大于等于10个硬币时强制执行）',
        counter: 'X',
    },
    {
        key: 'tax',
        role: '公爵',
        action: '征税',
        effect: '获得3硬币',
        counter: '阻止外援',
    },
    {
        key: 'assassinate',
        role: '刺客',
        action: '暗杀',
        effect: '花费3个硬币，指定一个玩家翻开一张角色卡',
        counter: 'X',
    },
    {
        key: 'exchange',
        role: '大使',
        action: '交换',
        effect: '抽两张角色卡，然后归还两张角色卡到牌堆中。',
        counter: '阻止偷窃',
    },
    {
        key: 'steal',
        role: '队长',
        action: '偷窃',
        effect: '从另外一名玩家中获取2个硬币。（只有1个则拿走1个）',
        counter: '阻止偷窃',
    },
    {
        key: '8',
        role: '伯爵夫人',
        action: 'X',
        effect: 'X',
        counter: '阻止暗杀',
    }
];

export const actionsTextMap = {
    'income': '收入',
    'foreignAid': '外援',
    'coup': '政变',
    'tax': '征税',
    'assassinate': '暗杀',
    'exchange': '交换',
    'steal': '偷窃',
};

export const rolesTextMap = {
    'DUKE': '公爵',
    'ASSASSIN': '刺客',
    'AMBASSADOR': '大使',
    'CAPTAIN': '队长',
    'CONTESSA': '伯爵夫人',
};
