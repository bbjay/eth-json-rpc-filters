const EthBlockTracker = require('eth-block-tracker')
const EthQuery = require('ethjs-query')
const JsonRpcEngine = require('json-rpc-engine')
const asMiddleware = require('json-rpc-engine/src/asMiddleware')
const createBlockRefMiddleware = require('eth-json-rpc-middleware/block-ref')
const TestBlockMiddleware = require('eth-block-tracker/test/util/testBlockMiddleware')
const createScaffoldMiddleware = require('eth-json-rpc-middleware/scaffold')
const providerAsMiddleware = require('eth-json-rpc-middleware/providerAsMiddleware')
const providerFromEngine = require('eth-json-rpc-middleware/providerFromEngine')
const GanacheCore = require('ganache-core')

module.exports = {
  createPayload,
  createEngineFromGanacheCore,
  createEngineFromTestBlockMiddleware,
  createTestSetup,
  createTestBlockMiddlewareTestSetup,
}

function createTestSetup () {
  // raw data source
  const { provider: dataProvider, forceNextBlock } = createEngineFromGanacheCore()
  // create block trackerfilterId
  const blockTracker = new EthBlockTracker({
    provider: dataProvider,
    pollingInterval: 200,
  })
  // create higher level
  const engine = new JsonRpcEngine()
  const provider = providerFromEngine(engine)
  // add block ref middleware
  engine.push(createBlockRefMiddleware({ blockTracker }))
  // matching logs middleware
  const matchingTxs = []
  engine.push(createScaffoldMiddleware({ eth_getLogs: matchingTxs }))
  // add data source
  engine.push(providerAsMiddleware(dataProvider))
  const query = new EthQuery(provider)
  return { dataProvider, forceNextBlock, engine, provider, query, blockTracker, matchingTxs }
}

function createEngineFromGanacheCore () {
  const provider = GanacheCore.provider()
  return { provider, forceNextBlock }

  function forceNextBlock(cb) {
    // custom ganache-core method
    provider.sendAsync(createPayload({ method: 'evm_mine' }), cb)
  }
}

function createTestBlockMiddlewareTestSetup () {
  // raw data source
  const { engine: dataEngine, testBlockSource } = createEngineFromTestBlockMiddleware()
  const dataProvider = providerFromEngine(dataEngine)
  // create block trackerfilterId
  const blockTracker = new EthBlockTracker({
    provider: dataProvider,
    pollingInterval: 200,
  })
  // create higher level
  const engine = new JsonRpcEngine()
  const provider = providerFromEngine(engine)
  // add block ref middleware
  engine.push(createBlockRefMiddleware({ blockTracker }))
  // matching logs middleware
  const matchingTxs = []
  engine.push(createScaffoldMiddleware({ eth_getLogs: matchingTxs }))
  // add data source
  engine.push(asMiddleware(dataEngine))
  const query = new EthQuery(provider)
  return { engine, provider, dataEngine, dataProvider, query, blockTracker, testBlockSource, matchingTxs }
}

function createEngineFromTestBlockMiddleware () {
  const engine = new JsonRpcEngine()
  const testBlockSource = new TestBlockMiddleware()
  engine.push(testBlockSource.createMiddleware())
  return { engine, testBlockSource }
}

function createPayload(payload) {
  return Object.assign({ id: 1, jsonrpc: '2.0', params: [] }, payload)
}