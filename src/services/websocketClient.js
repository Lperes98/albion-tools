// Mapeamento de LocationId (interno do jogo) → nome da cidade na API pública
const LOCATION_MAP = {
  '0002': 'Caerleon',
  '1002': 'Caerleon',
  '2002': 'Thetford',
  '3002': 'FortSterling',
  '4002': 'Lymhurst',
  '5002': 'Bridgewatch',
  '6002': 'Martlock',
  '3005': 'BlackMarket',
  '9014': 'Brecilien',
}

export function locationToCity(locationId) {
  return LOCATION_MAP[String(locationId)] || String(locationId)
}

// Cache: itemId → { [city]: { sellMin, buyMax, timestamp } }
const priceCache = new Map()
// buyOrdersCache: itemId → { [city]: { [orderId]: { price, amount } } }
const buyOrdersCache = new Map()
const statusListeners = new Set()
const dataListeners = new Set()  // dispara só quando novos preços chegam

let ws = null
let _status = 'disconnected'
let _dataVersion = 0  // incrementa a cada batch de preços recebido

function setStatus(s) {
  _status = s
  statusListeners.forEach(fn => fn(s))
}

function handleMessage(raw) {
  let msg
  try { msg = JSON.parse(raw) } catch { return }

  if (msg.topic !== 'marketorders.ingest') return
  const orders = msg.data?.Orders
  if (!Array.isArray(orders)) return

  let updated = false
  for (const order of orders) {
    const itemId = order.ItemTypeId
    const city = locationToCity(order.LocationId)
    const price = order.UnitPriceSilver
    if (!itemId || !price) continue

    if (!priceCache.has(itemId)) priceCache.set(itemId, {})
    const byCity = priceCache.get(itemId)
    const existing = byCity[city] || {}

    if (order.AuctionType === 'offer') {
      if (!existing.sellMin || price < existing.sellMin) {
        byCity[city] = { ...existing, sellMin: price, timestamp: Date.now() }
        updated = true
      }
    } else if (order.AuctionType === 'request') {
      if (!existing.buyMax || price > existing.buyMax) {
        byCity[city] = { ...existing, buyMax: price, timestamp: Date.now() }
        updated = true
      }
      // Armazena pedido de compra com quantidade por ID de ordem
      const orderId = order.Id
      if (orderId != null && order.Amount > 0) {
        if (!buyOrdersCache.has(itemId)) buyOrdersCache.set(itemId, {})
        const bCity = buyOrdersCache.get(itemId)
        if (!bCity[city]) bCity[city] = {}
        bCity[city][orderId] = { price, amount: order.Amount }
      }
    }
  }

  // Só notifica se algum preço realmente mudou
  if (updated) {
    _dataVersion++
    dataListeners.forEach(fn => fn(_dataVersion))
  }
}

export function connectWebSocket() {
  if (ws) return
  setStatus('connecting')
  try {
    ws = new WebSocket('ws://localhost:8099/ws')
    ws.onopen = () => setStatus('connected')
    ws.onmessage = e => handleMessage(e.data)
    ws.onclose = () => { ws = null; setStatus('disconnected') }
    ws.onerror = () => { setStatus('error') }
  } catch {
    setStatus('error')
  }
}

export function getWsDataVersion() {
  return _dataVersion
}

export function disconnectWebSocket() {
  ws?.close()
  ws = null
}

export function getWsPrice(itemId, city) {
  return priceCache.get(itemId)?.[city] || null
}

// Retorna pedidos de compra ordenados por preço desc: [{price, amount}]
export function getWsBuyOrders(itemId, city) {
  const byCity = buyOrdersCache.get(itemId)
  if (!byCity?.[city]) return []
  return Object.values(byCity[city]).sort((a, b) => b.price - a.price)
}

export function getWsStatus() {
  return _status
}

// Assina mudanças de status (connected/disconnected/etc)
export function subscribeWs(fn) {
  statusListeners.add(fn)
  return () => statusListeners.delete(fn)
}

// Assina novos dados de preço — fn recebe o dataVersion incrementado
export function subscribeWsData(fn) {
  dataListeners.add(fn)
  return () => dataListeners.delete(fn)
}
