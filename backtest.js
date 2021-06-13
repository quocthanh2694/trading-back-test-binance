const axios = require('axios');
const { v4: uuid } = require('uuid');
var { apiKey, secretApiKey } = require('./config.js');
var { calcKDJ } = require('./kdj');

const Binance = require('node-binance-api');
const binance = new Binance().options({
    APIKEY: apiKey,
    APISECRET: secretApiKey,
    verbose: true,
    useServerTime: true,
    // recvWindow: 60000, // Set a higher recvWindow to increase response timeout
    log: log => {
        console.log('BINANCE LOGS:', log); // You can create your own logger here, or disable console output
    }
});

const technicalIndicators = require('technicalindicators');

const { calculateRSIData } = require('./functions.js');

let totalAmount = 100;
let dollarAmountPerOrder = 0.5;
let maxWinPerCommand = 1000;

let tokenAmountPerOrder = 0; // => will auto get the market price and set to this var
let stopTrading = false;
let increaseAfterLoss = true;

// let tradeIncreasePerLossStreak = 4; // lossStreak % 4 = double. Ex: 5 % 4 => 2;
let historyDistance = 2;
let countHistory = 1000;
let fee = 5; // percent per order
let winCount = 0;

let sym = 'link';
let TRADE_SYMBOL = sym + 'usdt';
let TRADE_SYMBOL_SPLASH = sym + '/usdt';
console.log('Pair: ', TRADE_SYMBOL.toUpperCase())
let CANDLE_PERIOD = '1m';

let kdjOverBought = 65;
let kdjOverSold = 35;

let profitPercent = 25;
let stopLossPercent = 25;
let leverage = 50;

let histories = [];
let rawHistories = [];

let EMA_PERIOD_20 = 20
let EMA_PERIOD_50 = 50
let EMA_PERIOD_100 = 100
let EMA_PERIOD_200 = 200

let RSI_PERIOD = 14
let RSI_OVERBOUGHT = 70
let RSI_OVERSOLD = 30


let endTime = Date.now(); // normal
// let endTime = new Date(2021, 2, 19).getTime(); // up trend
// let endTime = new Date(2021, 5, 18).getTime(); // down trend
// let endTime = new Date(2021, 5, 22).getTime();

let databaseName = 'historyData/backTest_' + TRADE_SYMBOL + (new Date().toISOString().split(":").join("-")) + 'fileData.json';
let databaseNameRaw = 'historyData/backTestRaw_' + TRADE_SYMBOL + (new Date().toISOString().split(":").join("-")) + 'rawData.json';

let closes = []

let rsiList = [];


const fs = require('fs');




function getWinRate() {
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


async function saveData(params) {


    let todo = '';
    let sl = -1;
    let tp = -1;

    if (
        rawHistories?.length > (historyDistance)
        && rawHistories[rawHistories.length - historyDistance].macd2
    ) {

        let lastItem = rawHistories[rawHistories.length - historyDistance];
        // let lastItem2 = rawHistories[rawHistories.length - historyDistance * 2];
        if (
            params.macd2.MACD < params.macd2.signal
            && lastItem.macd2.MACD > lastItem.macd2.signal
        ) {
            // if (params.rsi2 > RSI_OVERBOUGHT) {
            // if (kdj.valueJ > kdjOverBought) {
            console.log('Should SELL SELL SELL SELL');
            todo = 'SELL';
            sl = parseFloat((params.closePrice + params.closePrice * (stopLossPercent / leverage) / 100).toFixed(2));
            tp = parseFloat((params.closePrice - params.closePrice * (profitPercent / leverage) / 100).toFixed(2));
        }
        if (
            params.macd2.MACD > params.macd2.signal
            && lastItem.macd2.MACD < lastItem.macd2.signal
        ) {
            // if (params.rsi2 < RSI_OVERSOLD) {
            // if (kdj.valueJ < kdjOverSold) {
            console.log('Should BUY BUY BUY BUY');
            todo = 'BUY';
            sl = parseFloat((params.closePrice - params.closePrice * (stopLossPercent / leverage) / 100).toFixed(2));
            tp = parseFloat((params.closePrice + params.closePrice * (profitPercent / leverage) / 100).toFixed(2));
        }
    }


    if (todo &&
        ((!histories || !histories[histories.length - 1])
            || histories[histories.length - 1].processed
        )
    ) {
        let ignoreTrend = false;

        if (!ignoreTrend) {
            if (winCount >= maxWinPerCommand) {
                stopTrading = true;
            }

            if (!stopTrading) {
                if (todo == 'BUY' || todo == 'SELL') {
                    histories.push({
                        id: uuid(),

                        d: Date.now(),
                        symbol: TRADE_SYMBOL,
                        period: CANDLE_PERIOD,

                        ...params,

                        todo,
                        sl,
                        tp,
                        winRate: getWinRate(),
                    })
                }

            } else {
                console.log('STOP TRADE!!!!')
            }
        } else {
            console.log('Ignore trend.')
        }

    } else {
        console.log('Last order is not closed or don\'t have any opportunity to trade.')
    }

    fs.writeFileSync(databaseName, JSON.stringify(histories));

    rawHistories.push({
        id: uuid(),

        d: Date.now(),
        symbol: TRADE_SYMBOL,
        period: CANDLE_PERIOD,

        ...params,

        // kdj: resp.data,
        todo,
        sl,
        tp,
        winRate: getWinRate(),
    })


    fs.writeFileSync(databaseNameRaw, JSON.stringify(rawHistories));
    // });



}




function PrintWinRate() {
    if (!histories.length) {
        console.log('No result.')
        return;
    }
    winRate = getWinRate();
    console.log('Total length', rawHistories.length);
    const confuseArr = histories.filter(x => x.result == 'CONFUSE');
    console.log("🚀 confuseArr", confuseArr.length);
    const lossStreakArr = histories.map(x => x.lossStreak);
    const winStreakArr = histories.map(x => x.winStreak);
    console.log('Max LossStreak: ', Math.max(...lossStreakArr));
    console.log('Max WinStreak: ', Math.max(...winStreakArr));
    console.log('Total Fee: ', dollarAmountPerOrder * histories.length * fee / 100)
    console.log('Total amount final: ', histories[histories.length - 1].totalAmount)

    console.log('========================================W rate: ', winRate, '%', 'of', histories?.length)
}




function startBackTest() {
    binance.candlesticks(TRADE_SYMBOL.toUpperCase(), CANDLE_PERIOD, (error, ticks, symbol) => {
        console.log('init closes length: ', closes?.length)
        closes = ticks;
        testHistory(closes);

    }, {
        limit: countHistory,
        endTime,
    });

}
/////////////////// back test
var _closes = [];
var _kLines = [];
// call in get history for backtest
function testHistory(arr = []) {
    console.log('START test history', arr.length)
    for (let i = 0; i < arr.length; i++) {
        const [time, open, high, low, close, volume, closeTime, assetVolume,
            trades, buyBaseVolume, buyAssetVolume, ignored] = arr[i];
        let curClose = parseFloat(close);
        let curOpen = parseFloat(open);
        let curHigh = parseFloat(high);
        let curLow = parseFloat(low);

        _closes.push(curClose);
        _kLines.push({
            close: curClose,
            open: curOpen,
            high: curHigh,
            low: curLow,
        });


        ///////
        if (histories
            && histories[histories.length - 1]
            && !histories[histories.length - 1].processed) {
            let lastItem = histories[histories.length - 1];
            if (lastItem.todo == 'BUY') {
                if (lastItem.tp >= curLow && lastItem.tp <= curHigh) {
                    // win
                    lastItem.result = 'WIN';
                    lastItem.processed = true;
                    winCount++;
                } else if (lastItem.sl >= curLow && lastItem.sl <= curHigh) {
                    lastItem.result = 'LOSS';
                    lastItem.processed = true;
                }
                if (lastItem.tp >= curLow && lastItem.tp <= curHigh
                    && lastItem.sl >= curLow && lastItem.sl <= curHigh) {
                    lastItem.result = 'CONFUSE';
                }
            } else {
                if (lastItem.sl >= curLow && lastItem.sl <= curHigh) {
                    // win
                    lastItem.result = 'LOSS';
                    lastItem.processed = true;
                } else if (lastItem.tp >= curLow && lastItem.tp <= curHigh) {
                    lastItem.result = 'WIN';
                    lastItem.processed = true;
                    winCount++;
                }
                if (lastItem.sl >= curLow && lastItem.sl <= curHigh
                    && lastItem.tp >= curLow && lastItem.tp <= curHigh) {
                    lastItem.result = 'CONFUSE';
                }
            }


        }



        // calculate profit
        if (histories && histories.length && histories[histories.length - 1].processed
            && !histories[histories.length - 1].profit
        ) {
            lastItem = histories[histories.length - 1];
            if (lastItem.result == 'WIN') {
                lastItem.profitPercent = profitPercent;

            } else if (lastItem.result == 'LOSS') {
                lastItem.profitPercent = -profitPercent;
            }
            lastItem.profit = lastItem.amountPerOrder * lastItem.profitPercent / 100;
            lastItem.totalAmount = lastItem.totalAmount + lastItem.profit;
            totalAmount = lastItem.totalAmount;
        }


        ///////

        let technicalIndicatorsRSI = technicalIndicators.RSI.calculate({
            values: _closes,
            period: RSI_PERIOD,
        })

        let technicalIndicatorsEMA_20 = technicalIndicators.EMA.calculate({
            values: _closes,
            period: EMA_PERIOD_20,
        })
        let technicalIndicatorsEMA_50 = technicalIndicators.EMA.calculate({
            values: _closes,
            period: EMA_PERIOD_50,
        })
        let technicalIndicatorsEMA_100 = technicalIndicators.EMA.calculate({
            values: _closes,
            period: EMA_PERIOD_100,
        })
        let technicalIndicatorsEMA_200 = technicalIndicators.EMA.calculate({
            values: _closes,
            period: EMA_PERIOD_200,
        })

        let technicalIndicatorsMACD = technicalIndicators.MACD.calculate({
            values: _closes,
            fastPeriod: 12,
            slowPeriod: 26,
            signalPeriod: 9,
            SimpleMAOscillator: false,
            SimpleMASignal: false
        })

        let kdj = 0;//calcKDJ(9, 3, 3, _kLines);

        let rsi = calculateRSIData(_closes, RSI_PERIOD);

        rsiList.push(rsi);


        ////////////////
        let winStreak = 0;
        let lossStreak = 0;

        if (histories && histories.length > 1 && histories[histories.length - 1].processed) {
            if (histories[histories.length - 1].result == 'WIN') {
                histories[histories.length - 1].winStreak = (histories[histories.length - 2].winStreak || 0) + 1;
                histories[histories.length - 1].lossStreak = 0;
            } else {
                histories[histories.length - 1].lossStreak = (histories[histories.length - 2].lossStreak || 0) + 1;
                histories[histories.length - 1].winStreak = 0;
            }
        }

        // 
        let tempAmount = dollarAmountPerOrder;
        let tempTokenAmount = tokenAmountPerOrder;
        if (increaseAfterLoss) {
            if (histories && histories.length > 0 && histories[histories.length - 1].lossStreak > 0) {
                tempAmount = histories[histories.length - 1].amountPerOrder * 2;
                tempTokenAmount = histories[histories.length - 1].tokenAmountPerOrder * 2;
            }
        }


        saveData({
            date: new Date().toUTCString(),
            winStreak,
            lossStreak,
            kdj,
            rsi,
            rsi2: technicalIndicatorsRSI[technicalIndicatorsRSI.length - 1],
            macd2: technicalIndicatorsMACD[technicalIndicatorsMACD.length - 1],
            ema20: technicalIndicatorsEMA_20[technicalIndicatorsEMA_20.length - 1],
            ema50: technicalIndicatorsEMA_50[technicalIndicatorsEMA_50.length - 1],
            ema100: technicalIndicatorsEMA_100[technicalIndicatorsEMA_100.length - 1],
            ema200: technicalIndicatorsEMA_200[technicalIndicatorsEMA_200.length - 1],
            closePrice: curClose,
            openPrice: curOpen,
            placeOrderType: 'nothing',

            leverage,
            amountPerOrder: tempAmount,
            tokenAmountPerOrder: tempTokenAmount, // number to trade
            totalAmount,
        })
    }
    console.log('Test success~!!!!');
    PrintWinRate();
}


// start back test
startBackTest();



