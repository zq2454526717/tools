/*
 * @Author: zq
 * @Date: 2020-08-05 19:22:08
 * @LastEditors: zq
 * @LastEditTime: 2020-08-05 19:22:08
 * @Description: js计算相关
 */
/**
 * 获取数字小数部分长度
 * @param {Number,String} number
 * @return {Number}
 */
function getDecimalLength(number) {
    return (Number(number).toString().split(".")[1] || "").length;
}

/**
 * 将小数放大为整数
 * @param {Number,String} number
 * @param {Number} digit 小数点后移的位数
 * @return {Number}
 */
function enlargeNumber(number, digit) {
    return Number(Number(number).toFixed(digit).toString().replace(".", ""));
}
/**
 * 相加
 * @param {Number,String} num1
 * @param {Number,String} num2
 * @param {Number} fixes 保留的小数位数
 * @returns {Number}
 */
function add(num1, num2, fixes = 2) {
    const maxLength = Math.max(getDecimalLength(num1), getDecimalLength(num2));
    const multiple = Math.pow(10, maxLength);

    num1 = enlargeNumber(num1, maxLength);
    num2 = enlargeNumber(num2, maxLength);

    const result = (num1 + num2) / multiple;

    return Number(result.toFixed(fixes));
}

/**
 * 相减
 * @param {Number,String} num1
 * @param {Number,String} num2
 * * @param {Number} fixes 保留的小数位数
 * @returns {Number}
 */
function sub(num1, num2, fixes = 2) {
    const maxLength = Math.max(getDecimalLength(num1), getDecimalLength(num2));
    const multiple = Math.pow(10, maxLength);

    num1 = enlargeNumber(num1, maxLength);
    num2 = enlargeNumber(num2, maxLength);

    const result = (num1 - num2) / multiple;

    return Number(result.toFixed(fixes));
}

/**
 * 相乘
 * @param {Number,String} num1
 * @param {Number,String} num2
 * * @param {Number} fixes 保留的小数位数
 * @returns {Number}
 */
function mul(num1, num2, fixes = 2) {
    const maxLength = Math.max(getDecimalLength(num1), getDecimalLength(num2));
    const multiple = Math.pow(10, maxLength * 2);

    num1 = enlargeNumber(num1, maxLength);
    num2 = enlargeNumber(num2, maxLength);

    const result = num1 * num2 / multiple;

    return Number(result.toFixed(fixes));
}

/**
 * 相除
 * @param {Number,String} num1
 * @param {Number,String} num2
 * * @param {Number} fixes 保留的小数位数
 * @returns {Number}
 */
function div(num1, num2, fixes = 2) {
    const maxLength = Math.max(getDecimalLength(num1), getDecimalLength(num2));

    num1 = enlargeNumber(num1, maxLength);
    num2 = enlargeNumber(num2, maxLength);

    const result = num1 / num2;

    return Number(result.toFixed(fixes));
}

export {
    add,
    sub,
    mul,
    div
}
