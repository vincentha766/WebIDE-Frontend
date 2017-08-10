const defaultPackageList = function () {
  const list = []
  for (let i = 4001; i <= 4010; i++) {
    list.push('http://localhost:' + i)
  }
  return list
}()

const list = require('./.plugins.json')
const axios = require('axios')

const http = require('http')
const PORT = process.env.PORT || 4000

console.log(`lisitening on PORT ${PORT}`)

const commonHeaders = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': 'http://localhost:8060',
  'Access-Control-Allow-Credentials': true,
  'Access-Control-Allow-Headers': 'Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With, X-Space-Key'
}

http.createServer((req, res) => {
  if (req.url.startsWith('/packages')) {
    const headers = Object.assign({}, commonHeaders, {
      'Access-Control-Allow-Origin': req.headers.host,
      'Access-Control-Allow-Headers': Object.keys(req.headers).join(', ')
    })
    const listPromises = (list || defaultPackageList).map(
      item => axios.get(`${item}/packages`).then(res => Object.assign(res.data[0], { TARGET: item })).catch(err => {})
    )

    Promise.all(listPromises)
    .then((values) => {
      const result = values.filter(value => value)
      res.writeHead(200, headers)
      res.write(JSON.stringify(result))
      res.end()
    })
    .catch((e) => {
      res.writeHead(500, headers)
      res.write(JSON.stringify({ error: e }))
      res.end()
    })
  } else {
    res.write('it works')
    res.end()
  }
}).listen(PORT)
