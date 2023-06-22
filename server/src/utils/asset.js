// 角色卡
const DUKE = {
    label: '公爵',
    name: 'DUKE',
};

const ASSASSIN = {
    label: '杀手',
    name: 'ASSASSIN',
};

const AMBASSADOR = {
    label: '大使',
    name: 'AMBASSADOR',
};

const CAPTAIN = {
    label: '队长',
    name: 'CAPTAIN',
};

const CONTESSA = {
    label: '伯爵夫人',
    name: 'CONTESSA',
};

// 起始角色卡，5个角色 * 3张
const CHARACTERS = [
    DUKE, DUKE, DUKE,
    ASSASSIN, ASSASSIN, ASSASSIN,
    AMBASSADOR, AMBASSADOR, AMBASSADOR,
    CAPTAIN, CAPTAIN, CAPTAIN,
    CONTESSA, CONTESSA, CONTESSA
];

const getCardByName = (name) => {
    return CHARACTERS.find(character => character.name === name);
}

module.exports = {
    CHARACTERS,
    getCardByName,
};