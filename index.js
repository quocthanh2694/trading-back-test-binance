var WebSocketClient = require('websocket').client;
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
let maxWinPerCommand = 2;

let tokenAmountPerOrder = 0; // => will auto get the market price and set to this var
let stopTrading = false;
let findingStopSpot = false;
let increaseAfterLoss = true;

// let tradeIncreasePerLossStreak = 4; // lossStreak % 4 = double. Ex: 5 % 4 => 2;

let countHistory = 400;
let fee = 5; // percent per order
let winCount = 0;

let kdjOverBought = 65;
let kdjOverSold = 35;
// profitPercent / leverage => percent range

let profitPercent = 22.5;
let stopLossPercent = 22.5;
let leverage = 45;

let histories = [];
let rawHistories = [];

let EMA_PERIOD_20 = 20
let EMA_PERIOD_50 = 50
let EMA_PERIOD_100 = 100
let EMA_PERIOD_200 = 200

let RSI_PERIOD = 14
let RSI_OVERBOUGHT = 70
let RSI_OVERSOLD = 30
let sym = 'link';
let TRADE_SYMBOL = sym + 'usdt';
let TRADE_SYMBOL_SPLASH = sym + '/usdt';
console.log('Pair: ', TRADE_SYMBOL.toUpperCase())
let CANDLE_PERIOD = '1m';

let historyDistance = 2;
let endTime = Date.now();

let databaseName = 'historyData/' + TRADE_SYMBOL + (new Date().toISOString().split(":").join("-")) + 'fileData.json';
let databaseNameRaw = 'historyData/Raw_' + TRADE_SYMBOL + (new Date().toISOString().split(":").join("-")) + 'rawData.json';

let closes = []

let rsiList = [];

let loading = false;


// let SOCKET = `wss://stream.binance.com:9443/ws/${TRADE_SYMBOL}@kline_${CANDLE_PERIOD}`
let FSOCKET = `wss://fstream.binance.com/ws/${TRADE_SYMBOL}@kline_${CANDLE_PERIOD}`

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

/**
 * Return true is ready for new order
 * LastOrder closed
 */
async function checkIsCloseLastOrder() {
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
// /**
//  * Return true => all position were closed
//  */
// async function checkIsCloseAllOpenPosition() {
//     const openOrderRes = await binance.futuresOpenOrders(TRADE_SYMBOL);
//     if (openOrderRes?.length > 0) {
//         return false;
//     }
//     return true;
// }

async function command() {

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



    // if (balanceRes.length > 1 && balanceRes[1].asset) {
    //     totalAmount = parseFloat(balanceRes[1].balance);
    // }

    // tpRes = await binance.futuresMarketBuy(TRADE_SYMBOL, 1, {
    //     reduceOnly: true,
    //     stopPrice: 15,
    //     price: 15,
    //     type: 'TAKE_PROFIT',
    //     timeInForce: 'GTC',
    // });
    // console.log("🚀 ~ file: index.js ~ line 172 ~ command ~ tpRes", tpRes)


    // const x = await binance.futuresOrderStatus(TRADE_SYMBOL, { orderId: '13699726711' });
    // console.log(x)




    // console.info('status: ', await binance.futuresOrderStatus(TRADE_SYMBOL, { orderId: "13912186345" }));

    // const res = await buy({
    //     symbol: TRADE_SYMBOL,
    //     qty: tokenAmountPerOrder,
    //     tp: 25,
    //     sl: 15
    // });
    // console.log("🚀 ~ file: i BUY res", res)

    // const res = await sell({
    //     symbol: TRADE_SYMBOL,
    //     qty: 5,
    //     tp: 1.8,
    //     sl: 1.9
    // });






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

command();



// binance.futuresMarkPriceStream('BTCUSDT', function (data) { console.log(data.markPrice) });
// binance.futuresSubscribe( 'btcusdt@kline_1m', function (data) { console.log('Kline: ' + data.k.o) } );



function startTrade() {
    binance.candlesticks(TRADE_SYMBOL.toUpperCase(), CANDLE_PERIOD, (error, ticks, symbol) => {
        // let [time, open, high, low, close, volume, closeTime, assetVolume, trades, buyBaseVolume, buyAssetVolume, ignored] = last_tick;
        // console.info(symbol + " last close: " + close);
        for (let i = ticks.length - 1; i >= 0; i--) {
            let [time, open, high, low, close, volume, closeTime, assetVolume,
                trades, buyBaseVolume, buyAssetVolume, ignored] = ticks[i];
            closes.push(parseFloat(close))
        }

        client.connect(FSOCKET);

    }, {
        limit: countHistory,
        endTime,
    });

}

async function clearLastItemPos() {
    const isLastOrderClosed = await checkIsCloseLastOrder();
    console.log("(1) Is last position closed: ", isLastOrderClosed);
    if (isLastOrderClosed) {
        const closeAllOpenRes = await binance.futuresCancelAll(TRADE_SYMBOL);
        console.log("(1) Clear lastItemPosition success: ", closeAllOpenRes.code == 200)
    }
}

async function isOrderFilled(id) {
    const x = await binance.futuresOrderStatus(TRADE_SYMBOL, { orderId: id });
    // if (x.status == 'EXPIRED') {
    //     return false;
    // }
    return x.status == 'FILLED';
}


// wss://stream.binance.com:9443
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
                        const tpFilled = await isOrderFilled(lastItem.orderRes.tpRes.orderId);
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
                        const slFilled = await isOrderFilled(lastItem.orderRes.slRes.orderId);
                        if (slFilled) {
                            lastItem.result = 'LOSS';
                            lastItem.processed = true;
                        }
                    }
                } else {
                    // short
                    if (close >= lastItem.sl) {
                        const slFilled = await isOrderFilled(lastItem.orderRes.slRes.orderId);
                        if (slFilled) {
                            // win
                            lastItem.result = 'LOSS';
                            lastItem.processed = true;
                        }
                    } else if (close <= lastItem.tp) {
                        const tpFilled = await isOrderFilled(lastItem.orderRes.tpRes.orderId);
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

                    clearLastItemPos();

                }

                // update DB after last item processed
                fs.writeFileSync(databaseName, JSON.stringify(histories));

            }

            await processCloseTick(close, open, is_candle_closed);
            loading = false;
        }
    });
});




async function processCloseTick(close, open, is_candle_closed) {
    ////////////////////////////////

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
            fastPeriod: 12,
            slowPeriod: 26,
            signalPeriod: 9,
            SimpleMAOscillator: false,
            SimpleMASignal: false
        })


        let kdj = 0;//calcKDJ(9, 3, 3, _kLines);

        let rsi = calculateRSIData(closes, RSI_PERIOD);

        rsiList.push(rsi);




        // 
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

        await saveData({
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

        PrintWinRate();

    }

}


// app.listen(port, () => console.log(`Hello world app listening on port ${port}!`));


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

                // new order
                const isLastOrderClosed = await checkIsCloseLastOrder();
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
                                winRate: getWinRate(),
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
        winRate: getWinRate(),
    })


    fs.writeFileSync(databaseNameRaw, JSON.stringify(rawHistories));
    // });

}


function PrintWinRate() {
    console.log('================', new Date().toISOString());
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


// trade
startTrade();


