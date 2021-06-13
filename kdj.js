var input, kdj;
var calcLLV, calcHHV, calcSMA, calcRSV, calcKDJ;

/*
   * Calculate the minimum value
   * @param {number} pos latest value index
   * @param {number} n takes the minimum range period
   * @param {array} data input data
   * @param {string} field calculation field configuration
 */
calcLLV = function (pos, n, data, field) {
    var i, l, min;
    n--;
    min = data[pos][field];
    l = pos - n;
    l < 0 ? l = 0 : 1;
    for (i = pos; i >= l; i--) {
        if (min > data[i][field]) {
            min = data[i][field];
        }
    }
    return min;
};

/*
   * Calculate the maximum value
   * @param {number} pos latest value index
   * @param {number} n takes the maximum range period
   * @param {array} data input data
   * @param {string} field calculation field configuration
 */
calcHHV = function (pos, n, data, field) {
    var i, l, max;
    n--;
    max = data[pos][field];
    l = pos - n;
    l < 0 ? l = 0 : 1;
    for (i = pos; i >= l; i--) {
        if (max < data[i][field]) {
            max = data[i][field];
        }
    }
    return max;
};

/*
   * Calculate SMA, weighted moving average indicator
   * @param {number} n time window
   * @param {number} m weight
   * @param {array} data input data
 */
calcSMA = function (n, m, data) {
    var i, l, sma;
    sma = [100];
    for (i = 1, l = data.length; i < l; i++) {
        sma.push((data[i] * m + sma[i - 1] * (n - m)) / n);
    }
    return sma;
};

/*
   * Calculate RSV, immature random value indicator
   * @param {number} n calculate the highest price/Lowest price time window
 * @param {array}  data Enter stock price data
 */
calcRSV = function (n, data) {
    var i, l, rsv, low, tempValue;
    rsv = [];
    for (i = 0, l = data.length; i < l; i++) {
        low = calcLLV(i, n, data, "low");
        tempValue = 100 * (data[i].close - low) / (calcHHV(i, n, data, "high") - low);
        if (isNaN(tempValue)) {
            if (i === 0) {
                tempValue = 100;
            } else {
                tempValue = rsv[i - 1];
            }
        }
        rsv.push(tempValue);
    }
    return rsv;
};

/*
   * Calculate KDJ
   * @param {number} n Time window for calculating rsv
   * @param {number} m1 time window for calculating K
   * @param {number} m2 Time window for calculating D
 */
calcKDJ = function (n, m1, m2, data) {
    var i, l, rsv, k, d, j;
    rsv = calcRSV(n, data);
    k = calcSMA(m1, 1, rsv);
    d = calcSMA(m2, 1, k);
    j = [];
    for (i = 0, l = k.length; i < l; i++) {
        j.push(3 * k[i] - 2 * d[i]);
    }
    return {
        k: k,
        d: d,
        j: j
    };
};

/*
 * K-line data
   * Opening price, closing price, lowest price, highest price
//  */
// input = [
//     { open: 3.89, close: 3.89, low: 3.86, high: 3.93 },
//     { open: 3.88, close: 3.85, low: 3.81, high: 3.89 },
//     { open: 3.85, close: 3.91, low: 3.82, high: 3.95 },
//     { open: 3.89, close: 4.02, low: 3.89, high: 4.07 },
//     { open: 4.04, close: 4.05, low: 4.00, high: 4.08 },
//     { open: 4.05, close: 4.00, low: 3.98, high: 4.08 },
//     { open: 4.00, close: 4.00, low: 3.97, high: 4.04 },
//     { open: 3.99, close: 3.90, low: 3.88, high: 4.00 },
//     { open: 3.89, close: 3.90, low: 3.88, high: 3.92 },
//     { open: 3.89, close: 3.98, low: 3.88, high: 3.98 },
//     { open: 3.99, close: 3.98, low: 3.95, high: 4.03 },
//     { open: 3.98, close: 4.06, low: 3.96, high: 4.08 },
//     //2017/06/21
//     { open: 4.08, close: 4.08, low: 4.02, high: 4.08 }
// ];


module.exports = {
    calcKDJ
}


