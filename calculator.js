/*
 * @Author: zq
 * @Date: 2020-08-02 21:22:08
 * @LastEditors: zq
 * @LastEditTime: 2020-08-02 23:10:05
 * @Description: js保留小数精度计算方法
 */
/**
 * 获取数字小数部分长度
 * @param {Number,String} number
 * @return {Number} 
 */
function getDecimallength(number) {
    return (new Number(number).toString().split(".")[1] || "").length;
}

/**
 * 将小数放大为整数
 * @param {Number,String} number
 * @param {Number} digit : 小数点后移的位数
 * @return {Number} 
 */
function enlargeNumber(number, digit) {
    return new Number(new Number(number).toFixed(digit).toString().replace(".", ""));
}
/**
 * 相加
 * @param {Number,String} num1 
 * @param {Number,String} num2 
 * @returns {Number}
 */
function add(num1, num2, fixes) {
    const maxLength = Math.max(getDecimallength(num1), getDecimallength(num2));
    const multiple = Math.pow(10, maxLength);

    num1 = enlargeNumber(num1, maxLength);
    num2 = enlargeNumber(num2, maxLength);

    const result = (num1 + num2) / multiple;

    return result.toFixed(fixes || 2);
}

/**
 * 相减
 * @param {Number,String} num1 
 * @param {Number,String} num2 
 * @returns {Number}
 */
function sub(num1, num2, fixes) {
    const maxLength = Math.max(getDecimallength(num1), getDecimallength(num2));
    const multiple = Math.pow(10, maxLength);

    num1 = enlargeNumber(num1, maxLength);
    num2 = enlargeNumber(num2, maxLength);

    const result = (num1 - num2) / multiple;

    return result.toFixed(fixes || 2);
}

/**
 * 相乘
 * @param {Number,String} num1 
 * @param {Number,String} num2 
 * @returns {Number}
 */
function mul(num1, num2, fixes) {
    const maxLength = Math.max(getDecimallength(num1), getDecimallength(num2));
    const multiple = Math.pow(10, maxLength * 2);

    num1 = enlargeNumber(num1, maxLength);
    num2 = enlargeNumber(num2, maxLength);

    const result = num1 * num2 / multiple;

    return result.toFixed(fixes || 2);
}

/**
 * 相除
 * @param {Number,String} num1 
 * @param {Number,String} num2 
 * @returns {Number}
 */
function div(num1, num2, fixes) {
    const maxLength = Math.max(getDecimallength(num1), getDecimallength(num2));

    num1 = enlargeNumber(num1, maxLength);
    num2 = enlargeNumber(num2, maxLength);

    const result = num1 / num2;

    return result.toFixed(fixes || 2);
}

export {
    add,
    sub,
    mul,
    div
}