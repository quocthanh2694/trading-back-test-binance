


let taapiKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6InF1b2N0aGFuaDI2OTRAZ21haWwuY29tIiwiaWF0IjoxNjIxMDU1MDc3LCJleHAiOjc5MjgyNTUwNzd9.EsNPp3YmIUrprcnrpjvUJCCILmW8hwtv8JJRwwE5kIc';




  // axios.get(`https://api.taapi.io/kdj?secret=${taapiKey}&exchange=binance&symbol=BTC/USDT&interval=${CANDLE_PERIOD}`).then(resp => {
    //     console.log('kdj: ', resp.data);
    //     axios.get(`https://api.taapi.io/rsi?secret=${taapiKey}&exchange=binance&symbol=BTC/USDT&interval=${CANDLE_PERIOD}`).then(respRsi => {
    //         console.log('rsi: ', respRsi.data);

    //         content.push({
    //             id: uuid(),

    //             d: Date.now(),
    //             symbol: TRADE_SYMBOL,
    //             period: CANDLE_PERIOD,

    //             ...params,

    //             kdj: resp.data,
    //             taapiRsi: respRsi.data,
    //         })
    //         fs.writeFileSync(databaseName, JSON.stringify(content));

    //     });

    // });







       // only kdj 
    // axios.get(`https://api.taapi.io/kdj?secret=${taapiKey}&exchange=binance&symbol=${TRADE_SYMBOL_SPLASH.toUpperCase()}&interval=${CANDLE_PERIOD}`).then(resp => {
    //     console.log('kdj: ', resp.data);
    // const kdj = resp.data;










    
// const app = express();
// const port = 5000;
// const axios = require('axios');

// // Where we will keep books
// let books = [];

// app.use(cors());

// // Configuring body parser middleware
// app.use(bodyParser.urlencoded({ extended: false }));
// app.use(bodyParser.json());

// app.get('/', (req, res) => {
//     res.send('Get success');
// });

// app.get('/info', (req, res) => {






// axios.get('https://fapi.binance.com/fapi/v1/time'
// ).then(time => {
//     console.log('timeeee: ', time.data.serverTime);


//     // let dataQuery = {
//     //     timestamp: time.data.serverTime,
//     // };
//     // let query = qs.stringify(dataQuery);

//     // let sign = crypto.createHmac('sha256', keyApiS).update(query).digest('hex');

//     // // get account balance
//     // axios.get('https://fapi.binance.com/fapi/v2/balance?' + query + '&signature=' + sign,
//     //     {
//     //         headers: {
//     //             'X-MBX-APIKEY': apiKey
//     //         }
//     //     }
//     // ).then(resp => {
//     //     console.log('balance: ', resp.data[1].asset + ':', resp.data[1].balance);
//     // }).catch(err => { console.log(err.data) });




//     /// position risk
//     // dataQuery = {
//     //     timestamp: time.data.serverTime,
//     //     symbol: TRADE_SYMBOL.toUpperCase(),
//     // };
//     // query = qs.stringify(dataQuery);

//     // sign = crypto.createHmac('sha256', keyApiS).update(query).digest('hex');
//     // // get list orders
//     // axios.get('https://fapi.binance.com/fapi/v1/positionRisk?' + query + '&signature=' + sign,
//     //     {
//     //         headers: {

//     //             'X-MBX-APIKEY': apiKey,
//     //         }
//     //     }
//     // ).then(resp => {
//     //     // .filter(x => x.symbol == TRADE_SYMBOL.toUpperCase())
//     //     console.log('list position: ', resp.data);
//     // }).catch(err => { console.log(err) });



//     // /// open set leverage


//     // dataQuery = {
//     //     timestamp: time.data.serverTime,
//     //     symbol: TRADE_SYMBOL.toUpperCase(),
//     //     leverage: leverage,
//     //     // recvWindow: 60000,
//     // };
//     // query = qs.stringify(dataQuery);

//     // sign = crypto.createHmac('sha256', keyApiS).update(query).digest('hex');
//     // // get list orders
//     // axios.post('https://fapi.binance.com/fapi/v1/leverage?' + query + '&signature=' + sign
//     //     , {}, {
//     //     headers: {

//     //         'X-MBX-APIKEY': apiKey,
//     //     }
//     // }
//     // ).then(resp => {
//     //     console.log('Set leverage success ', leverage, resp);
//     // }).catch(err => { console.log(err) });




//     // /// open open orders
//     // dataQuery = {
//     //     timestamp: time.data.serverTime,
//     //     // symbol: TRADE_SYMBOL.toUpperCase(),
//     // };
//     // query = qs.stringify(dataQuery);

//     // sign = crypto.createHmac('sha256', keyApiS).update(query).digest('hex');
//     // // get list orders
//     // axios.get('https://fapi.binance.com/fapi/v1/openOrders?' + query + '&signature=' + sign,
//     //     {
//     //         headers: {

//     //             'X-MBX-APIKEY': apiKey,
//     //         }
//     //     }
//     // ).then(resp => {
//     //     // .filter(x => x.symbol == TRADE_SYMBOL.toUpperCase())
//     //     console.log('list Orders: ', resp.data);
//     // }).catch(err => { console.log(err) });






//     //  /// open new order
//     //  dataQuery = {
//     //     timestamp: time.data.serverTime,
//     //     symbol: TRADE_SYMBOL.toUpperCase(),
//     //     side: 'BOTH',
//     //     type: 'MARKET',
//     //     newClientOrderId: uuid(),
//     //     quantity

//     // };
//     // query = qs.stringify(dataQuery);

//     // sign = crypto.createHmac('sha256', keyApiS).update(query).digest('hex');
//     // // get list orders
//     // axios.get('https://fapi.binance.com/fapi/v1/order?' + query + '&signature=' + sign,
//     //     {
//     //         headers: {

//     //             'X-MBX-APIKEY': apiKey,
//     //         }
//     //     }
//     // ).then(resp => {
//     //     // .filter(x => x.symbol == TRADE_SYMBOL.toUpperCase())
//     //     console.log('list Orders: ', resp.data);
//     // }).catch(err => { console.log(err) });





//     // // new order
//     // dataQuery = {
//     //     timestamp: time.data.serverTime,
//     //     symbol: TRADE_SYMBOL.toUpperCase(),
//     //     side: 'BUY',
//     //     type: 'LIMIT',
//     //     price: 1.11,
//     //     quantity: 1,
//     //     timeInForce: 'GTC',

//     // };
//     // query = qs.stringify(dataQuery);

//     // sign = crypto.createHmac('sha256', keyApiS).update(query).digest('hex');
//     // axios.get('https://fapi.binance.com/fapi/v1/order?' + query + '&signature=' + sign,
//     //     {
//     //         headers: {
//     //             'X-MBX-APIKEY': apiKey
//     //         }
//     //     }
//     // ).then(resp => {
//     //     console.log('NEW ORDER: ', resp.data);
//     // }).catch(err => { console.log(err) });


// }).catch(err => { console.log(err) });





// setInterval(() => {
//     fs.readFile(databaseName, 'utf8', function read(err, data) {
//         if (err) {
//             throw err;
//         }
//         const _histories = JSON.parse(data || '[]');
//         if (_histories.length != histories.length) {
//             fs.writeFileSync(databaseName, JSON.stringify(histories));
//         }
//     });
// }, 2000);