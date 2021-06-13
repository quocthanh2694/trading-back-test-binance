var WebSocketClient = require('websocket').client;
const { v4: uuid } = require('uuid');
var { apiKey, secretApiKey } = require('./config.js');
var { calcKDJ } = require('./kdj');
const technicalIndicators = require('technicalindicators');
const { calculateRSIData, getWinRate } = require('./functions.js');
const fs = require('fs');

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

let kdjOverBought = 65;
let kdjOverSold = 35;

let MACD_FAST = 12;
let MACD_SLOW = 26;
let MACD_SIGNAL = 9;

let EMA_PERIOD_20 = 20
let EMA_PERIOD_50 = 50
let EMA_PERIOD_100 = 100
let EMA_PERIOD_200 = 200

let RSI_PERIOD = 14
let RSI_OVERBOUGHT = 70
let RSI_OVERSOLD = 30;
let countHistory = 400;
let fee = 5; // percent per order
let endTime = Date.now();

let historyDistance = 2;

let profitPercent = 22.5;
let stopLossPercent = 22.5;
let leverage = 45;

let maxWinPerCommand = 6;

async function command({
    sym
}) {

    let totalAmount = 100;
    let dollarAmountPerOrder = 0.5;

    let tokenAmountPerOrder = 0; // => will auto get the market price and set to this var
    let stopTrading = false;
    let findingStopSpot = false;
    let increaseAfterLoss = true; // double your initial amount whenever loss an order

    let winCount = 0;

    let histories = [];
    let rawHistories = [];

    let TRADE_SYMBOL = sym + 'usdt';
    let TRADE_SYMBOL_SPLASH = sym + '/usdt';
    let CANDLE_PERIOD = '1m';

    console.log('Pair: ', TRADE_SYMBOL.toUpperCase())

    let databaseName = 'historyData/' + TRADE_SYMBOL + (new Date().toISOString().split(":").join("-")) + 'fileData.json';
    let databaseNameRaw = 'historyData/Raw_' + TRADE_SYMBOL + (new Date().toISOString().split(":").join("-")) + 'rawData.json';

    let closes = []
    let loading = false;
    let FSOCKET = `wss://fstream.binance.com/ws/${TRADE_SYMBOL}@kline_${CANDLE_PERIOD}`



    console.log('START Command......')

    await binance.useServerTime();
    const balanceRes = await binance.futuresBalance();
    const setLeverageRes = await binance.futuresLeverage(TRADE_SYMBOL, leverage);
    const marketPriceRes = await binance.futuresMarkPrice(TRADE_SYMBOL);

    if (marketPriceRes && marketPriceRes.markPrice) {
        const mkPrice = parseFloat(marketPriceRes.markPrice);

        tokenAmountPerOrder = parseFloat((dollarAmountPerOrder / mkPrice * leverage).toFixed(2));

        console.log('Market price: ', marketPriceRes.symbol, ': ', mkPrice);
        console.log('Token qty per order: ', tokenAmountPerOrder);
    }

    console.info('Balance: ', balanceRes[1].asset, balanceRes[1].balance);
    console.info('set leverage: ', setLeverageRes.symbol, setLeverageRes.leverage,);

    closes = await getHistoryTickCandle(TRADE_SYMBOL, CANDLE_PERIOD);


    const client = new WebSocketClient();

    client.on('connectFailed', function (error) {
        console.log('Connect Error: ' + error.toString());
    });

    client.on('connect', function (connection) {
        console.log('WebSocket Client Connected');
        loading = false;
        connection.on('error', function (error) {
            console.log("Connection Error: " + error.toString());
        });
        connection.on('close', function () {
            console.log('echo-protocol Connection Closed');
        });
        connection.on('message', async function (message) {
            if (message.type === 'utf8') {

                const candle = JSON.parse(message.utf8Data);
                if (stopTrading && loading) {
                    return;
                }
                process.stdout.clearLine();
                process.stdout.cursorTo(0);
                process.stdout.write('Current State: Stop: ' + stopTrading + ' P: ' + candle.k.c);

                // console.log('isStopTrade:', stopTrading, 'price: ' + candle.k.c, 'isClose: ' + candle.k.x, '', 'length: ' + closes.length);
                // candle closed
                if (!candle || !candle.k) {
                    return;
                }



                const is_candle_closed = candle['k']['x'];
                const close = parseFloat(candle['k']['c'] || '0');
                const open = parseFloat(candle['k']['o'] || '0');
                // const price  = candle.k.c

                if (is_candle_closed) {
                    loading = true;
                }

                ////////////////////////////////

                if (close > 0 && histories
                    && histories[histories.length - 1]
                    && !histories[histories.length - 1].processed) {
                    loading = true;
                    let lastItem = histories[histories.length - 1];

                    if (lastItem.todo == 'BUY') {
                        if (close >= lastItem.tp) {
                            const tpFilled = await isOrderFilled(TRADE_SYMBOL, lastItem.orderRes.tpRes.orderId);
                            if (tpFilled) {
                                // win
                                lastItem.result = 'WIN';
                                lastItem.processed = true;
                                winCount++;
                                if (findingStopSpot) {
                                    stopTrading = true;
                                }
                            }
                        } else if (close <= lastItem.sl) {
                            const slFilled = await isOrderFilled(TRADE_SYMBOL, lastItem.orderRes.slRes.orderId);
                            if (slFilled) {
                                lastItem.result = 'LOSS';
                                lastItem.processed = true;
                            }
                        }
                    } else {
                        // short
                        if (close >= lastItem.sl) {
                            const slFilled = await isOrderFilled(TRADE_SYMBOL, lastItem.orderRes.slRes.orderId);
                            if (slFilled) {
                                // win
                                lastItem.result = 'LOSS';
                                lastItem.processed = true;
                            }
                        } else if (close <= lastItem.tp) {
                            const tpFilled = await isOrderFilled(TRADE_SYMBOL, lastItem.orderRes.tpRes.orderId);
                            if (tpFilled) {
                                lastItem.result = 'WIN';
                                lastItem.processed = true;
                                winCount++;
                                if (findingStopSpot) {
                                    stopTrading = true;
                                }
                            }
                        }
                    }

                    if (lastItem.processed) {
                        const lastOfLastItem = histories[histories.length - 2];
                        if (lastItem.result == 'WIN') {
                            lastItem.winStreak = (lastOfLastItem?.winStreak || 0) + 1;
                            lastItem.lossStreak = 0;

                            lastItem.profitPercent = profitPercent;
                        } else {
                            lastItem.lossStreak = (lastOfLastItem?.lossStreak || 0) + 1;
                            lastItem.winStreak = 0;

                            lastItem.profitPercent = -profitPercent;
                        }
                        lastItem.profit = lastItem.amountPerOrder * lastItem.profitPercent / 100;
                        lastItem.totalAmount = lastItem.totalAmount + lastItem.profit;
                        totalAmount = lastItem.totalAmount;

                        clearLastItemPos(TRADE_SYMBOL);

                    }

                    // update DB after last item processed
                    fs.writeFileSync(databaseName, JSON.stringify(histories));

                }

                await processCloseTick(close, open, is_candle_closed, closes, stopTrading);
                loading = false;
            }
        });
    });

    async function processCloseTick(close, open, is_candle_closed) {

        if (is_candle_closed) {

            process.stdout.write("\n");
            console.log('isStopTrade:', stopTrading, 'price: ' + close, 'isClose: ' + is_candle_closed, '', 'length: ' + closes.length);


            let curClose = parseFloat(close);
            let curOpen = parseFloat(open);
            // let curHigh = parseFloat(high);
            // let curLow = parseFloat(low);

            closes.push(curClose);

            ///////

            let technicalIndicatorsRSI = technicalIndicators.RSI.calculate({
                values: closes,
                period: RSI_PERIOD,
            })

            let technicalIndicatorsEMA_20 = technicalIndicators.EMA.calculate({
                values: closes,
                period: EMA_PERIOD_20,
            })
            let technicalIndicatorsEMA_50 = technicalIndicators.EMA.calculate({
                values: closes,
                period: EMA_PERIOD_50,
            })
            let technicalIndicatorsEMA_100 = technicalIndicators.EMA.calculate({
                values: closes,
                period: EMA_PERIOD_100,
            })
            let technicalIndicatorsEMA_200 = technicalIndicators.EMA.calculate({
                values: closes,
                period: EMA_PERIOD_200,
            })

            let technicalIndicatorsMACD = technicalIndicators.MACD.calculate({
                values: closes,
                fastPeriod: MACD_FAST,
                slowPeriod: MACD_SLOW,
                signalPeriod: MACD_SIGNAL,
                SimpleMAOscillator: false,
                SimpleMASignal: false
            })


            let kdj = 0;//calcKDJ(9, 3, 3, _kLines);

            let rsi = calculateRSIData(closes, RSI_PERIOD);

            // rsiList.push(rsi);

            let tempAmount = dollarAmountPerOrder;
            let tempTokenAmount = tokenAmountPerOrder;
            if (increaseAfterLoss) {
                if (histories && histories.length > 0
                    && histories[histories.length - 1].result == 'LOSS') {
                    const _lastItem = histories[histories.length - 1];
                    tempAmount = parseFloat((_lastItem.amountPerOrder * 2).toFixed(2));
                    tempTokenAmount = parseFloat((_lastItem.tokenAmountPerOrder * 2).toFixed(2));
                }
            }

            await saveDataAndProcessTrade({
                date: new Date().toISOString(),
                winStreak: 0,
                lossStreak: 0,
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

            printWinRate(histories, rawHistories, dollarAmountPerOrder);

        }

    }


    async function saveDataAndProcessTrade(params) {

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

                    // new order
                    const isLastOrderClosed = await checkIsCloseLastOrder(TRADE_SYMBOL);
                    console.log("Is last position closed: ", isLastOrderClosed);
                    if (!isLastOrderClosed) {
                        // Last order was not close => ignore trend
                        console.log("Last position is not closed.")
                    } else {
                        const closeAllOpenRes = await binance.futuresCancelAll(TRADE_SYMBOL);
                        if (closeAllOpenRes?.code == 200) {
                            // const isCloseAllOpen = await checkIsCloseAllOpenPosition();
                            // console.log("Is isClosedAllOpen: ", isCloseAllOpen);
                            // if (!isCloseAllOpen) {
                            //     // close all open
                            // } else {
                            // place new order 

                            let orderRes;
                            if (todo == 'BUY') {
                                orderRes = await buy({
                                    symbol: TRADE_SYMBOL,
                                    qty: params.tokenAmountPerOrder,
                                    tp: tp,
                                    sl: sl
                                });
                            } else if (todo == 'SELL') {
                                orderRes = await sell({
                                    symbol: TRADE_SYMBOL,
                                    qty: params.tokenAmountPerOrder,
                                    tp: tp,
                                    sl: sl,
                                });
                            }
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
                                    winRate: getWinRate(histories),
                                    orderRes,
                                })
                            }
                            // }
                        } else {
                            console.log('Cannot close all open orders');
                        }

                    }

                } else {
                    console.log('STOP TRADE!!!!')
                }
            } else {
                console.log('Ignore trend.')
            }

        } else {
            console.log('Last order is not closed or don\'t have any opportunity to trade:', todo)
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
            winRate: getWinRate(histories),
        })


        fs.writeFileSync(databaseNameRaw, JSON.stringify(rawHistories));
        // });

    }

    client.connect(FSOCKET);

};

command({
    sym: 'link',
});
command({
    sym: 'ltc',
});
command({
    sym: 'etc',
});









///////////////////////////////////////////////// Result win rate
///////////////////////////////////////////////// Result win rate
///////////////////////////////////////////////// Result win rate
///////////////////////////////////////////////// Result win rate
///////////////////////////////////////////////// Result win rate
///////////////////////////////////////////////// Result win rate
function printWinRate(histories, rawHistories, dollarAmountPerOrder) {
    console.log('================', new Date().toISOString());
    if (!histories.length) {
        console.log('No result.')
        return;
    }
    winRate = getWinRate(histories);
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






///////////////////////////////////////////////// Binance api helper
///////////////////////////////////////////////// Binance api helper
///////////////////////////////////////////////// Binance api helper
///////////////////////////////////////////////// Binance api helper
///////////////////////////////////////////////// Binance api helper

function getHistoryTickCandle(TRADE_SYMBOL, CANDLE_PERIOD) {
    return new Promise(resolve => {
        let closes = [];
        binance.candlesticks(TRADE_SYMBOL.toUpperCase(), CANDLE_PERIOD, (error, ticks, symbol) => {
            // let [time, open, high, low, close, volume, closeTime, assetVolume, trades, buyBaseVolume, buyAssetVolume, ignored] = last_tick;
            // console.info(symbol + " last close: " + close);
            for (let i = ticks.length - 1; i >= 0; i--) {
                let [time, open, high, low, close, volume, closeTime, assetVolume,
                    trades, buyBaseVolume, buyAssetVolume, ignored] = ticks[i];
                closes.push(parseFloat(close));
                resolve(closes);
            }
        }, {
            limit: countHistory,
            endTime,
        });
    })

}


async function clearLastItemPos(TRADE_SYMBOL) {
    const isLastOrderClosed = await checkIsCloseLastOrder(TRADE_SYMBOL);
    console.log("(1) Is last position closed: ", isLastOrderClosed);
    if (isLastOrderClosed) {
        const closeAllOpenRes = await binance.futuresCancelAll(TRADE_SYMBOL);
        console.log("(1) Clear lastItemPosition success: ", closeAllOpenRes.code == 200)
    }
}

/**
 * Return true is ready for new order
 * LastOrder closed
 */
async function checkIsCloseLastOrder(TRADE_SYMBOL) {
    const positionRiskRes = await binance.futuresPositionRisk({ symbol: TRADE_SYMBOL })
    console.info('Position risk:', positionRiskRes);
    if (positionRiskRes && positionRiskRes.length > 0
        && positionRiskRes[0] && positionRiskRes[0].symbol == TRADE_SYMBOL.toUpperCase()) {
        const positionAmt = parseFloat(positionRiskRes[0].positionAmt);
        if (positionAmt == 0) {
            console.log('Last position is CLOSED')
            return true;
        } else {
            console.log('Last position is OPENING')
            return false;
        }
    }
    return false;
}

async function isOrderFilled(TRADE_SYMBOL, id) {
    const x = await binance.futuresOrderStatus(TRADE_SYMBOL, { orderId: id });
    // if (x.status == 'EXPIRED') {
    //     return false;
    // }
    return x.status == 'FILLED';
}


async function buy({ symbol, qty, tp, sl }) {
    let orderRes, tpRes, slRes;
    orderRes = await binance.futuresMarketBuy(symbol, qty,);
    if (orderRes?.orderId && tp) {
        tpRes = await binance.futuresMarketSell(symbol, qty, {
            reduceOnly: true,
            stopPrice: tp,
            price: tp,
            type: 'TAKE_PROFIT',
            timeInForce: 'GTC',
        });
    }
    if (orderRes?.orderId && sl) {
        slRes = await binance.futuresMarketSell(symbol, qty, {
            reduceOnly: true,
            stopPrice: sl,
            // price: sl,
            type: 'STOP_MARKET',
            timeInForce: 'GTC',
        })
    }
    return {
        orderRes,
        tpRes,
        slRes,
    }
}

async function sell({ symbol, qty, tp, sl }) {
    let orderRes, tpRes, slRes;
    orderRes = await binance.futuresMarketSell(symbol, qty);
    if (orderRes?.orderId && tp) {
        tpRes = await binance.futuresMarketBuy(symbol, qty, {
            reduceOnly: true,
            stopPrice: tp,
            price: tp,
            type: 'TAKE_PROFIT',
            timeInForce: 'GTC',
        });
    }
    if (orderRes?.orderId && sl) {
        slRes = await binance.futuresMarketBuy(symbol, qty, {
            reduceOnly: true,
            stopPrice: sl,
            // price: sl,
            type: 'STOP_MARKET',
            timeInForce: 'GTC',
        })
    }
    return {
        orderRes,
        tpRes,
        slRes,
    }
}
