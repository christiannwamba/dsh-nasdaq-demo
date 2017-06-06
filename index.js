const fs = require('fs');
const deepstream = require('deepstream.io-client-js')
const parse = require('csv-parse');

let nasdaqList


function hydrateRecordsAndPopulateList(list, callback) {
  const parser = parse({}, function(err, data) {
    const parsed = []
    let initialLine = true
    let totalEntries = data.length - 1
    let count = 0
    for (let i = 1; i < data.length; i++) {
      const v = data[i]
      const value = {
        symbol: v[0],
        name: v[1],
        price: v[2],
        sector: v[6]
      }
      setTimeout(() => {
        const rec = client.record.getRecord(`EQ/${value.symbol}`);
        rec.whenReady(() => {
          rec.set(value, (err) => {
            console.log('adding', rec.name)
            list.addEntry(rec.name)
            count++
            if (count === totalEntries) {
              console.log('done')
              callback && callback()
            }
          })
        })
      }, i * 5)
    }
  })
  fs.createReadStream(__dirname+'/companylist.csv').pipe(parser);
}

function randomStocks(stockList) {
    var range = stockList.length / 30;
    return Array.from({length: Math.floor(range)}, () => stockList[Math.floor(Math.random() * range)]);
}

function startIrregularUpdates(client, stockList) {
    randomStocks(stockList).forEach((recName) => {
        var rec = client.record.getRecord(recName);
        rec.whenReady(() => {
            console.log(rec.get())
          rec.set(Object.assign(rec.get(), {price: (Math.random() * 25).toFixed(2)}))
        })
    })
}

const client = deepstream('wss://154.deepstreamhub.com?apiKey=852d4585-2693-43ea-953a-4f95a7c51202')
client.login({}, () => {
  nasdaqList = client.record.getList('nasdaq')
  nasdaqList.whenReady((list) => {
    // list.delete()
    console.log(list.getEntries().length)
    if(list.getEntries().length < 1) {
      console.log('ass hole')
      hydrateRecordsAndPopulateList(list, () => setInterval(startIrregularUpdates.bind(null, client, list.getEntries()), 2000))
    } else {
      setInterval(startIrregularUpdates.bind(null, client, list.getEntries()), 2000)
    }
  })
})
.on('connectionStateChanged', connectionState => {
    console.log(connectionState)
})

.on('error', err => console.log(err))