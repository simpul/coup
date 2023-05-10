// 洗牌算法
// 1. 从数组最后一个元素开始，从数组中随机选取一个元素，与最后一个元素交换位置
// 2. 从数组倒数第二个元素开始，从数组中随机选取一个元素，与倒数第二个元素交换位置
// 3. 重复上述过程，直到第一个元素
// 4. 返回洗牌后的数组
const shuffle = (arr) => {
    let len = arr.length
    for (let i = 0; i < len - 1; i++) {
        let idx = Math.floor(Math.random() * (len - i));
        [arr[idx], arr[len - i - 1]] = [arr[len - i - 1], arr[idx]]
    }
    return arr
}

module.exports = {
    shuffle
}