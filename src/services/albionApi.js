// Configurações da API
const SERVERS = {
  west: 'https://west.albion-online-data.com',
  east: 'https://east.albion-online-data.com',
  europe: 'https://europe.albion-online-data.com'
}

const ITEMS_JSON_URL = 'https://raw.githubusercontent.com/ao-data/ao-bin-dumps/master/formatted/items.json'
const CACHE_KEY = 'albion_items_cache'
const CACHE_EXPIRY_HOURS = 24

export const CIDADES = [
  'Caerleon',
  'Bridgewatch',
  'Lymhurst',
  'Thetford',
  'Fort Sterling',
  'Martlock',
  'Brecilien',
  'Black Market'
]

export const CIDADES_API = [
  'Caerleon',
  'Bridgewatch',
  'Lymhurst',
  'Thetford',
  'FortSterling',
  'Martlock',
  'Brecilien',
  'BlackMarket'
]

export const QUALIDADES = {
  1: 'Normal',
  2: 'Boa',
  3: 'Excelente',
  4: 'Magistral',
  5: 'Obra-Prima'
}

// Cache de itens no localStorage
function getItemsFromCache() {
  try {
    const cached = localStorage.getItem(CACHE_KEY)
    if (!cached) return null

    const { items, timestamp } = JSON.parse(cached)
    const hoursElapsed = (Date.now() - timestamp) / (1000 * 60 * 60)

    if (hoursElapsed > CACHE_EXPIRY_HOURS) {
      localStorage.removeItem(CACHE_KEY)
      return null
    }

    return items
  } catch {
    return null
  }
}

function saveItemsToCache(items) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({
      items,
      timestamp: Date.now()
    }))
  } catch (e) {
    console.warn('Erro ao salvar cache:', e)
  }
}

// Carrega lista de itens do jogo
export async function carregarItens() {
  const cached = getItemsFromCache()
  if (cached) {
    console.log('Usando itens do cache local')
    return cached
  }

  console.log('Baixando lista de itens...')
  const response = await fetch(ITEMS_JSON_URL)
  if (!response.ok) throw new Error('Erro ao baixar itens')

  const items = await response.json()
  saveItemsToCache(items)
  console.log(`${items.length} itens carregados`)
  return items
}

// Busca itens por nome
export function buscarItensPorNome(items, nomeBusca, tiers = []) {
  const nomeLower = nomeBusca.toLowerCase().trim()
  if (!nomeLower) return []

  const resultados = []

  for (const item of items) {
    const uid = item.UniqueName || ''
    const nomes = item.LocalizedNames || {}

    // Tenta PT-BR, fallback para EN-US
    const nomePtbr = nomes['PT-BR'] || nomes['EN-US'] || uid
    const nomePtbrLower = nomePtbr.toLowerCase()

    if (!nomePtbrLower.includes(nomeLower)) continue

    // Extrai tier do UniqueName (ex: T4_HIDE_ROUGH → tier 4)
    const partes = uid.split('_')
    if (!partes[0]?.startsWith('T') || !partes[0].slice(1).match(/^\d+$/)) continue

    const tierItem = parseInt(partes[0].slice(1))

    if (tiers.length === 0 || tiers.includes(tierItem)) {
      resultados.push({
        tier: tierItem,
        uniqueName: uid,
        nome: nomePtbr,
        nomeEn: nomes['EN-US'] || uid
      })
    }
  }

  // Ordena por tier, depois por nome
  resultados.sort((a, b) => a.tier - b.tier || a.nome.localeCompare(b.nome))
  return resultados
}

// Consulta preços de itens
export async function consultarPrecos(itemIds, servidor = 'west', qualidade = 1) {
  const baseUrl = SERVERS[servidor] || SERVERS.west
  const idsStr = itemIds.join(',')
  const locationsStr = CIDADES_API.join(',')

  const url = `${baseUrl}/api/v2/stats/prices/${idsStr}.json?locations=${locationsStr}&qualities=${qualidade}`

  const response = await fetch(url)
  if (!response.ok) throw new Error('Erro ao consultar preços')

  return response.json()
}

// Consulta histórico de preços
export async function consultarHistorico(itemId, servidor = 'west', qualidade = 1, cidade = 'Caerleon') {
  const baseUrl = SERVERS[servidor] || SERVERS.west
  const cidadeApi = CIDADES_API[CIDADES.indexOf(cidade)] || cidade

  // API de histórico - últimos 30 dias
  const url = `${baseUrl}/api/v2/stats/history/${itemId}.json?locations=${cidadeApi}&qualities=${qualidade}&time-scale=24`

  try {
    const response = await fetch(url)
    if (!response.ok) return []
    return response.json()
  } catch {
    return []
  }
}

// Calcula lucro entre cidades
export function calcularLucro(dados, itemId) {
  const registros = dados.filter(d => d.item_id === itemId)
  if (registros.length === 0) return null

  const precos = []

  for (const r of registros) {
    const cidadeIndex = CIDADES_API.indexOf(r.city)
    const cidadeNome = cidadeIndex >= 0 ? CIDADES[cidadeIndex] : r.city

    precos.push({
      cidade: cidadeNome,
      vendaMin: r.sell_price_min || 0,
      compraMax: r.buy_price_max || 0,
      dataVenda: r.sell_price_min_date,
      dataCompra: r.buy_price_max_date
    })
  }

  // Encontra melhor oportunidade de arbitragem
  let melhorLucro = null
  let maisBarato = null
  let maisCaro = null

  // Preços de venda válidos (onde comprar)
  const comVenda = precos.filter(p => p.vendaMin > 0)
  // Preços de compra válidos (onde vender para ordem de compra)
  const comCompra = precos.filter(p => p.compraMax > 0)

  if (comVenda.length > 0) {
    maisBarato = comVenda.reduce((a, b) => a.vendaMin < b.vendaMin ? a : b)
  }

  if (comCompra.length > 0) {
    maisCaro = comCompra.reduce((a, b) => a.compraMax > b.compraMax ? a : b)
  }

  if (maisBarato && maisCaro && maisCaro.compraMax > maisBarato.vendaMin) {
    const lucro = maisCaro.compraMax - maisBarato.vendaMin
    const porcentagem = ((lucro / maisBarato.vendaMin) * 100).toFixed(1)

    melhorLucro = {
      comprarEm: maisBarato.cidade,
      precoCompra: maisBarato.vendaMin,
      venderEm: maisCaro.cidade,
      precoVenda: maisCaro.compraMax,
      lucro,
      porcentagem
    }
  }

  return {
    precos,
    maisBarato,
    maisCaro,
    melhorLucro
  }
}

// Formata número como prata
export function formatarPrata(valor) {
  if (!valor || valor === 0) return '—'
  return valor.toLocaleString('pt-BR') + ' prata'
}

// Formata data
export function formatarData(dataStr) {
  if (!dataStr) return ''
  const data = new Date(dataStr)
  return data.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}
