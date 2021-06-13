
// openOrders
const openOrders = [
    {
        orderId: 31819260775,
        symbol: 'BNBUSDT',
        status: 'NEW',
        clientOrderId: 'ios_ptuZBYMDLpsrJoyrK95v',
        price: '0',
        avgPrice: '0',
        origQty: '0',
        executedQty: '0',
        cumQuote: '0',
        timeInForce: 'GTE_GTC',
        type: 'TAKE_PROFIT_MARKET',
        reduceOnly: true,
        closePosition: true,
        side: 'SELL',
        positionSide: 'BOTH',
        stopPrice: '700',
        workingType: 'MARK_PRICE',
        priceProtect: true,
        origType: 'TAKE_PROFIT_MARKET',
        time: 1622386191556,
        updateTime: 1622386191556
    },
    {
        orderId: 31819260768,
        symbol: 'BNBUSDT',
        status: 'NEW',
        clientOrderId: 'ios_YkuV6scAqa3uRqnpo46w',
        price: '0',
        avgPrice: '0',
        origQty: '0',
        executedQty: '0',
        cumQuote: '0',
        timeInForce: 'GTE_GTC',
        type: 'STOP_MARKET',
        reduceOnly: true,
        closePosition: true,
        side: 'SELL',
        positionSide: 'BOTH',
        stopPrice: '100',
        workingType: 'MARK_PRICE',
        priceProtect: true,
        origType: 'STOP_MARKET',
        time: 1622386191552,
        updateTime: 1622386191552
    }
]

// positionRisk
const openPositions = [
    {
        symbol: 'BNBUSDT',
        positionAmt: '0.07', // long
        entryPrice: '323.17000',
        markPrice: '323.12699179',
        unRealizedProfit: '-0.00301057',
        liquidationPrice: '216.74024818', // '0' => closed
        leverage: '3',
        maxNotionalValue: '10000000',
        marginType: 'isolated',
        isolatedMargin: '7.54568887',
        isAutoAddMargin: 'false',
        positionSide: 'BOTH',
        notional: '22.61888942',
        isolatedWallet: '7.54869944',
        updateTime: 1622386144878
    },
    {
        symbol: 'BNBUSDT',
        positionAmt: '-0.04', // short
        entryPrice: '321.26000',
        markPrice: '321.00713826',
        unRealizedProfit: '0.01011446',
        liquidationPrice: '425.45272206',
        leverage: '3',
        maxNotionalValue: '10000000',
        marginType: 'isolated',
        isolatedMargin: '4.28844105',
        isAutoAddMargin: 'false',
        positionSide: 'BOTH',
        notional: '-12.84028553',
        isolatedWallet: '4.27832659',
        updateTime: 1622386515358
    }
]


const newOrderSuccessResponse = {
    orderId: 31821918116,
    symbol: 'BNBUSDT',
    status: 'NEW',
    clientOrderId: 'G6ZqbMRXZqWYWWrjSzb4nC',
    price: '0',
    avgPrice: '0.00000',
    origQty: '0.10',
    executedQty: '0',
    cumQty: '0',
    cumQuote: '0',
    timeInForce: 'GTC',
    type: 'MARKET',
    reduceOnly: false,
    closePosition: false,
    side: 'BUY',
    positionSide: 'BOTH',
    stopPrice: '0',
    workingType: 'CONTRACT_PRICE',
    priceProtect: false,
    origType: 'MARKET',
    updateTime: 1622391000981
}


// 
const FILLED_ORDER = {
    orderId: 13911430571,
    symbol: 'ADAUSDT',
    status: 'FILLED',
    clientOrderId: 'P3qlH9YXZmI4Qg324u8V3e',
    price: '0',
    avgPrice: '1.82540',
    origQty: '10',
    executedQty: '10',
    cumQuote: '18.25400',
    timeInForce: 'GTC',
    type: 'MARKET',
    reduceOnly: false,
    closePosition: false,
    side: 'SELL',
    positionSide: 'BOTH',
    stopPrice: '0',
    workingType: 'CONTRACT_PRICE',
    priceProtect: false,
    origType: 'MARKET',
    time: 1622728931939,
    updateTime: 1622728931939
  }


  // new order luc tạo server trả về 
  const New_order = {
    orderId: 13912186345,
    symbol: 'ADAUSDT',
    status: 'NEW',
    clientOrderId: 'lrSwfC0GMsBdfRJkvcypeq',
    price: '0',
    avgPrice: '0.00000',
    origQty: '5',
    executedQty: '0',
    cumQty: '0',
    cumQuote: '0',
    timeInForce: 'GTC',
    type: 'MARKET',
    reduceOnly: false,
    closePosition: false,
    side: 'SELL',
    positionSide: 'BOTH',
    stopPrice: '0',
    workingType: 'CONTRACT_PRICE',
    priceProtect: false,
    origType: 'MARKET',
    updateTime: 1622730563308
  }