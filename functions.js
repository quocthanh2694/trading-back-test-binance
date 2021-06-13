


function calculateRSIData(closes, RSI_PERIOD) {
    let changeUp = 0;
    let changeDown = 0;
    let last_closeHigh = 0;
let last_closeLow = 0;

    let listClose = closes;
    for (x = 0; x < RSI_PERIOD; x++) {
        previous_close = (parseFloat(listClose[x - 1]));
        current_close = (parseFloat(listClose[x]));
        // HIGH
        if (current_close > previous_close) {
            upChange = current_close - previous_close;
            changeUp += upChange;
            if (x == RSI_PERIOD - 1) {
                last_closeHigh = current_close - previous_close;
            }
        }
        // LOW
        if (previous_close > current_close) {
            downChange = previous_close - current_close;
            changeDown += downChange;
            if (x == RSI_PERIOD - 1) {
                last_closeLow = previous_close - current_close;
            }
        }
        if (x == RSI_PERIOD - 1) {
            AVGHigh = changeUp / RSI_PERIOD;
            AVGLow = changeDown / RSI_PERIOD;
            Upavg = (AVGHigh * (RSI_PERIOD - 1) + last_closeHigh) / (RSI_PERIOD);
            Downavg = (AVGLow * (RSI_PERIOD - 1) + last_closeLow) / (RSI_PERIOD);
            RS = Upavg / Downavg;
            RSI = (100 - (100 / (1 + RS)));
            // console.log('RSI Calculated: ', RSI);
            // console.log(listClose)
            return RSI;
        }
    }

    return -100;
}

function getWinRate(histories) {
    let winRate = 0;
    if (histories.length > 0) {
        const winArr = histories.filter(x => x.result == 'WIN');
        const lossArr = histories.filter(x => x.result != 'WIN');
        const total = winArr.length + lossArr.length;
        winRate = winArr.length / total * 100;
        console.log("W Count", winArr.length, "Loss count:", lossArr.length);
    }
    return winRate;
}

module.exports = {
    calculateRSIData,
    getWinRate
}