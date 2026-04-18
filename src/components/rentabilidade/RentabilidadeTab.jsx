import { useState, useEffect, useMemo, useCallback } from 'react'
import recipesRaw from '../../data/recipes.json'
import { consultarPrecos, CIDADES_API } from '../../services/albionApi'
import {
  connectWebSocket, disconnectWebSocket,
  getWsPrice, getWsStatus, subscribeWs, subscribeWsData, getWsBuyOrders
} from '../../services/websocketClient'

// ─── Labels de categoria em PT-BR ────────────────────────────────────────────
const CATEGORY_LABELS = {
  consumables: 'Consumíveis',
  armor: 'Armaduras',
  weapon: 'Armas',
  offhand: 'Secundários',
  mount: 'Montarias',
  furniture: 'Mobília',
  other: 'Outros',
  farming: 'Fazenda',
  accessories: 'Acessórios',
}
const SUBCATEGORY_LABELS = {
  potions: 'Poções',
  food: 'Comida',
  cloth: 'Pano',
  leather: 'Couro',
  plate: 'Placa',
  axe: 'Machado', sword: 'Espada', dagger: 'Adaga', hammer: 'Martelo',
  spear: 'Lança', broadsword: 'Espadão',
  bow: 'Arco', crossbow: 'Besta',
  stafffire: 'Cajado de Fogo', staffholy: 'Cajado Sagrado',
  staffnature: 'Cajado da Natureza', stafffrost: 'Cajado de Gelo',
  staffcurse: 'Cajado da Maldição', staffarcane: 'Cajado Arcano',
  horse: 'Cavalo', direwolf: 'Lobo', ox: 'Boi',
  bag: 'Bolsa', cape: 'Capa',
  toolkit: 'Ferramentas',
  seed: 'Semente',
}

function catLabel(cat) { return CATEGORY_LABELS[cat] || cat }
function subLabel(sub) { return SUBCATEGORY_LABELS[sub] || sub }

// ─── Funções utilitárias ──────────────────────────────────────────────────────
const recipes = recipesRaw

function baseId(uniqueName) {
  // T4_POTION_HEAL → POTION_HEAL | T4_POTION_HEAL@1 → POTION_HEAL@1
  return uniqueName.replace(/^T\d+_/, '')
}

function formatSilver(v) {
  if (!v || v === 0) return '—'
  if (v >= 1_000_000) return (v / 1_000_000).toFixed(2) + 'M'
  if (v >= 1_000) return (v / 1_000).toFixed(1) + 'k'
  return v.toLocaleString('pt-BR')
}

function marginClass(pct) {
  if (pct > 10) return 'margin-positive'
  if (pct > 0) return 'margin-neutral'
  return 'margin-negative'
}

// ─── Hook: agrupamento de receitas ────────────────────────────────────────────
function useRecipeGroups() {
  return useMemo(() => {
    // categories → subcategories → base items
    const groups = {}
    for (const recipe of Object.values(recipes)) {
      if (!recipe.ingredients?.length) continue
      if (recipe.enchantmentLevel) continue // só base por enquanto
      const cat = recipe.category || 'other'
      const sub = recipe.subcategory || 'other'
      const base = baseId(recipe.id)
      if (!groups[cat]) groups[cat] = {}
      if (!groups[cat][sub]) groups[cat][sub] = new Set()
      groups[cat][sub].add(base)
    }
    // Converte Sets para Arrays ordenados
    for (const cat of Object.keys(groups))
      for (const sub of Object.keys(groups[cat]))
        groups[cat][sub] = [...groups[cat][sub]].sort()
    return groups
  }, [])
}

// ─── Componente principal ─────────────────────────────────────────────────────
export function RentabilidadeTab({ servidor, setServidor, itensDisponiveis }) {
  const groups = useRecipeGroups()

  // Seletores
  const [categoria, setCategoria] = useState('')
  const [subcategoria, setSubcategoria] = useState('')
  const [baseItem, setBaseItem] = useState('')

  // Configurações
  const [cidade, setCidade] = useState('Caerleon')
  const [taxaRetorno, setTaxaRetorno] = useState(27.5)
  const [taxaMercado, setTaxaMercado] = useState(3)
  const [custoLoja, setCustoLoja] = useState(0)
  const [quantidade, setQuantidade] = useState(1)
  const [usarOrdemCompra, setUsarOrdemCompra] = useState(false)

  // Dados
  const [rows, setRows] = useState([])
  const [cityMargins, setCityMargins] = useState({})
  const [oportunidades, setOportunidades] = useState([])
  const [loading, setLoading] = useState(false)
  const [loadingOport, setLoadingOport] = useState(false)

  // WebSocket
  const [wsStatus, setWsStatus] = useState(getWsStatus())
  const [wsDataVersion, setWsDataVersion] = useState(0)
  useEffect(() => subscribeWs(setWsStatus), [])

  // Mapa uniqueName → nome PT-BR
  const nameMap = useMemo(() => {
    const m = {}
    for (const item of (itensDisponiveis || [])) {
      m[item.UniqueName] = item.LocalizedNames?.['PT-BR'] || item.LocalizedNames?.['EN-US'] || item.UniqueName
    }
    return m
  }, [itensDisponiveis])

  // Ao trocar categoria, reseta subcategoria/item
  const categorias = Object.keys(groups).sort()
  const subcategorias = categoria ? Object.keys(groups[categoria] || {}).sort() : []
  const baseItems = (categoria && subcategoria) ? (groups[categoria]?.[subcategoria] || []) : []

  function handleCategoria(v) { setCategoria(v); setSubcategoria(''); setBaseItem('') }
  function handleSubcategoria(v) { setSubcategoria(v); setBaseItem('') }

  // Calcula lucro para uma linha
  // ordemCompra: override explícito (undefined = usa state usarOrdemCompra)
  function calcRow(recipe, prices, ordemCompra) {
    const ret = taxaRetorno / 100
    const tax = taxaMercado / 100
    const qtd = Math.max(1, quantidade)
    const modoOrdem = ordemCompra !== undefined ? ordemCompra : usarOrdemCompra

    let custoPorBatch = 0
    const ingredienteInfo = []
    for (const ing of recipe.ingredients) {
      const p = prices[ing.id]
      const preco = p?.sellMin || 0
      const efetivo = ing.count * (1 - ret) * preco
      custoPorBatch += efetivo
      ingredienteInfo.push({ ...ing, preco, efetivo, countTotal: ing.count * qtd })
    }
    custoPorBatch += recipe.silver || 0
    custoPorBatch += custoLoja

    const custoTotal = custoPorBatch * qtd

    const itemPreco = modoOrdem
      ? (prices[recipe.id]?.buyMax || 0)
      : (prices[recipe.id]?.sellMin || 0)
    const receitaBruta = itemPreco * recipe.amountCrafted
    const receitaLiquida = receitaBruta * (1 - tax)
    const lucro = receitaLiquida - custoPorBatch
    const margem = receitaBruta > 0 ? (lucro / receitaBruta) * 100 : 0

    // Preço mínimo por unidade para atingir 5% de margem
    // margem = lucro / receitaBruta = 0.05
    // precoMin * amountCrafted * (1 - tax) - custoPorBatch = 0.05 * precoMin * amountCrafted
    // precoMin = custoPorBatch / (amountCrafted * (1 - tax - 0.05))
    const divisor = recipe.amountCrafted * (1 - tax - 0.05)
    const precoMin5pct = divisor > 0 ? custoPorBatch / divisor : 0

    const lucroTotal = lucro * qtd
    const lucroTotal5pct = precoMin5pct > 0 ? 0.05 * precoMin5pct * recipe.amountCrafted * qtd : 0

    return {
      ...recipe,
      custoIngredientes: custoPorBatch,
      custoTotal,
      itemPreco,
      receitaBruta,
      receitaLiquida,
      lucro,
      lucroTotal,
      margem,
      precoMin5pct,
      lucroTotal5pct,
      ingredienteInfo,
      ingredienteSemPreco: ingredienteInfo.some(ing => ing.preco === 0),
      isLive: false,
    }
  }

  // Busca preços e calcula
  const calcular = useCallback(async () => {
    if (!baseItem) return
    setLoading(true)

    // Pega receitas de todos os tiers para esse item base
    const tierRecipes = []
    for (let t = 2; t <= 8; t++) {
      const key = `T${t}_${baseItem}`
      if (recipes[key]) tierRecipes.push(recipes[key])
    }
    if (!tierRecipes.length) { setLoading(false); return }

    // Coleta todos os IDs necessários (item final + ingredientes)
    const allIds = new Set()
    for (const r of tierRecipes) {
      allIds.add(r.id)
      for (const ing of r.ingredients) allIds.add(ing.id)
    }

    // Busca preços na API pública (quality 0 = recursos brutos, 1 = itens craftados)
    let apiData = []
    try {
      apiData = await consultarPrecos([...allIds], servidor, '0,1')
    } catch { /* continua com WS */ }

    // Monta mapa de preços por cidade: { city: { itemId: { sellMin, buyMax } } }
    // Normaliza nome da cidade removendo espaços (API retorna "Fort Sterling", nós usamos "FortSterling")
    const pricesByCity = {}
    for (const d of apiData) {
      if (!d.city) continue
      const cityKey = d.city.replace(/\s/g, '')
      if (!pricesByCity[cityKey]) pricesByCity[cityKey] = {}
      if (!pricesByCity[cityKey][d.item_id]) pricesByCity[cityKey][d.item_id] = {}
      const entry = pricesByCity[cityKey][d.item_id]
      if (d.sell_price_min > 0)
        entry.sellMin = entry.sellMin ? Math.min(entry.sellMin, d.sell_price_min) : d.sell_price_min
      if (d.buy_price_max > 0)
        entry.buyMax = entry.buyMax ? Math.max(entry.buyMax, d.buy_price_max) : d.buy_price_max
    }

    // Preços da cidade selecionada (com overlay do WebSocket)
    const cidadeKey = cidade.replace(/\s/g, '')
    const prices = { ...(pricesByCity[cidadeKey] || pricesByCity[cidade] || {}) }
    let anyLive = false
    for (const id of allIds) {
      const ws = getWsPrice(id, cidade)
      if (ws) {
        if (!prices[id]) prices[id] = {}
        if (ws.sellMin) prices[id].sellMin = ws.sellMin
        if (ws.buyMax) prices[id].buyMax = ws.buyMax
        anyLive = true
      }
    }

    // Calcula margens para todas as cidades × tiers (modo atual)
    const newCityMargins = {}
    for (const [city, cityPrices] of Object.entries(pricesByCity)) {
      newCityMargins[city] = {}
      for (const r of tierRecipes) {
        const row = calcRow(r, cityPrices)
        newCityMargins[city][r.id] = row.receitaBruta > 0
          ? { margem: row.margem, semPreco: row.ingredienteSemPreco }
          : null
      }
    }
    setCityMargins(newCityMargins)

    const newRows = tierRecipes.map(r => ({ ...calcRow(r, prices), isLive: anyLive }))
    setRows(newRows)
    setLoading(false)
  }, [baseItem, cidade, servidor, taxaRetorno, taxaMercado, custoLoja, quantidade, usarOrdemCompra])

  // Busca oportunidades para TODOS os itens da subcategoria
  const calcularOportunidades = useCallback(async () => {
    if (!subcategoria || !baseItems.length) return
    setLoadingOport(true)

    // Coleta todas as receitas da subcategoria (todos os tiers)
    const todasReceitas = []
    for (const base of baseItems) {
      for (let t = 2; t <= 8; t++) {
        const key = `T${t}_${base}`
        if (recipes[key]) todasReceitas.push({ ...recipes[key], baseId: base })
      }
    }
    if (!todasReceitas.length) { setLoadingOport(false); return }

    // Coleta todos os IDs únicos
    const allIds = new Set()
    for (const r of todasReceitas) {
      allIds.add(r.id)
      for (const ing of r.ingredients) allIds.add(ing.id)
    }

    // Busca em batches de 50 IDs (quality 0 = recursos brutos, 1 = itens craftados)
    const BATCH = 50
    const idsArray = [...allIds]
    let apiData = []
    for (let i = 0; i < idsArray.length; i += BATCH) {
      try {
        const data = await consultarPrecos(idsArray.slice(i, i + BATCH), servidor, '0,1')
        apiData = apiData.concat(data)
      } catch {}
    }

    // Monta mapa por cidade — normaliza espaços ("Fort Sterling" → "FortSterling")
    const pricesByCity = {}
    for (const d of apiData) {
      if (!d.city) continue
      const cityKey = d.city.replace(/\s/g, '')
      if (!pricesByCity[cityKey]) pricesByCity[cityKey] = {}
      if (!pricesByCity[cityKey][d.item_id]) pricesByCity[cityKey][d.item_id] = {}
      const entry = pricesByCity[cityKey][d.item_id]
      if (d.sell_price_min > 0)
        entry.sellMin = entry.sellMin ? Math.min(entry.sellMin, d.sell_price_min) : d.sell_price_min
      if (d.buy_price_max > 0)
        entry.buyMax = entry.buyMax ? Math.max(entry.buyMax, d.buy_price_max) : d.buy_price_max
    }

    // Calcula oportunidades (sempre buy order)
    const novas = []
    for (const [city, cityPrices] of Object.entries(pricesByCity)) {
      for (const r of todasReceitas) {
        const row = calcRow(r, cityPrices, true)
        const algumIngredienteSemPreco = row.ingredienteInfo.some(ing => ing.preco === 0)
        if (row.receitaBruta > 0 && row.margem >= 5 && !algumIngredienteSemPreco) {
          const nomeItem = (nameMap[`T4_${r.baseId}`] || nameMap[`T5_${r.baseId}`] || r.baseId)
            ?.replace(/^T\d+\s/, '')
          // Preço de break-even: abaixo disso a venda deixa de ser lucrativa
          const tax = taxaMercado / 100
          const divisorBE = r.amountCrafted * (1 - tax)
          const precoBreakeven = divisorBE > 0 ? row.custoIngredientes / divisorBE : 0
          novas.push({
            city: CITY_DISPLAY[city] || city,
            cityKey: city,
            tierId: r.id,
            tier: r.tier,
            nomeItem,
            margem: row.margem,
            lucro: row.lucro,
            lucroTotal: row.lucroTotal,
            precoCompra: row.itemPreco,
            custoPorBatch: row.custoIngredientes,
            precoBreakeven,
          })
        }
      }
    }

    novas.sort((a, b) => b.margem - a.margem)
    setOportunidades(novas)
    setLoadingOport(false)
  }, [subcategoria, baseItems, servidor, taxaRetorno, taxaMercado, custoLoja, quantidade, nameMap])

  // Recalcula ao mudar item ou configurações
  useEffect(() => { if (baseItem) calcular() }, [baseItem, cidade, taxaRetorno, taxaMercado, custoLoja, quantidade, usarOrdemCompra])

  // Recalcula oportunidades ao mudar subcategoria ou configurações
  useEffect(() => { if (subcategoria) calcularOportunidades() }, [subcategoria, servidor, taxaRetorno, taxaMercado, custoLoja, quantidade])

  // Quando chega dado novo do WS, recalcula (definido após calcular e calcularOportunidades)
  useEffect(() => {
    return subscribeWsData((v) => {
      setWsDataVersion(v)
      if (baseItem) calcular()
      if (subcategoria) calcularOportunidades()
    })
  }, [baseItem, subcategoria, calcular, calcularOportunidades])

  const handleAtualizar = () => {
    if (baseItem) calcular()
    if (subcategoria) calcularOportunidades()
  }

  const itemDisplayName = baseItem
    ? (nameMap[`T4_${baseItem}`] || nameMap[`T5_${baseItem}`] || baseItem)?.replace(/^(T\d+\s)/, '')
    : ''

  return (
    <div className="rentabilidade-tab">
      {/* Header com configurações */}
      <div className="rent-header">
        <div className="rent-selectors">
          <div className="rent-field">
            <label>Categoria</label>
            <select value={categoria} onChange={e => handleCategoria(e.target.value)}>
              <option value="">Selecionar...</option>
              {categorias.map(c => (
                <option key={c} value={c}>{catLabel(c)}</option>
              ))}
            </select>
          </div>

          <div className="rent-field">
            <label>Subcategoria</label>
            <select value={subcategoria} onChange={e => handleSubcategoria(e.target.value)} disabled={!categoria}>
              <option value="">Selecionar...</option>
              {subcategorias.map(s => (
                <option key={s} value={s}>{subLabel(s)}</option>
              ))}
            </select>
          </div>

          <div className="rent-field">
            <label>Item</label>
            <select value={baseItem} onChange={e => setBaseItem(e.target.value)} disabled={!subcategoria}>
              <option value="">Selecionar...</option>
              {baseItems.map(b => {
                const display = (nameMap[`T4_${b}`] || nameMap[`T5_${b}`] || b)?.replace(/^T\d+\s/, '')
                return <option key={b} value={b}>{display || b}</option>
              })}
            </select>
          </div>

          <div className="rent-field">
            <label>Cidade</label>
            <select value={cidade} onChange={e => setCidade(e.target.value)}>
              {CIDADES_API.map(c => <option key={c} value={c}>{c.replace('Fort', 'Fort ')}</option>)}
            </select>
          </div>

          <div className="rent-field">
            <label>Servidor</label>
            <select value={servidor} onChange={e => setServidor(e.target.value)}>
              <option value="west">Americas (West)</option>
              <option value="europe">Europe</option>
              <option value="east">Asia (East)</option>
            </select>
          </div>
        </div>

        <div className="rent-settings">
          <div className="rent-field rent-field-sm">
            <label>Qtd. Crafts</label>
            <input
              type="number" min="1" step="1"
              value={quantidade}
              onChange={e => setQuantidade(parseInt(e.target.value) || 1)}
            />
          </div>
          <div className="rent-field rent-field-sm">
            <label>Retorno (%)</label>
            <input
              type="number" min="0" max="60" step="0.5"
              value={taxaRetorno}
              onChange={e => setTaxaRetorno(parseFloat(e.target.value) || 0)}
            />
          </div>
          <div className="rent-field rent-field-sm">
            <label>Taxa Mercado (%)</label>
            <input
              type="number" min="0" max="10" step="0.1"
              value={taxaMercado}
              onChange={e => setTaxaMercado(parseFloat(e.target.value) || 0)}
            />
          </div>
          <div className="rent-field rent-field-sm">
            <label>Custo Loja</label>
            <input
              type="number" min="0" step="1"
              value={custoLoja}
              onChange={e => setCustoLoja(parseFloat(e.target.value) || 0)}
              placeholder="0"
            />
          </div>

          <label className="checkbox-toggle">
            <input
              type="checkbox"
              checked={usarOrdemCompra}
              onChange={e => setUsarOrdemCompra(e.target.checked)}
            />
            <span>Ordem de Compra</span>
          </label>

          <div className={`ws-badge ws-${wsStatus}`} title={`WebSocket: ${wsStatus}`}>
            <span className="ws-dot" />
            {wsStatus === 'connected' ? 'Live' : wsStatus === 'connecting' ? 'Conectando...' : 'Offline'}
          </div>

          {wsStatus === 'disconnected' || wsStatus === 'error' ? (
            <button className="btn-ws-connect" onClick={connectWebSocket}>
              Conectar WS
            </button>
          ) : (
            <button className="btn-ws-connect btn-ws-disconnect" onClick={disconnectWebSocket}>
              Desconectar
            </button>
          )}

          {(baseItem || subcategoria) && (
            <button
              className="btn-refresh-rent"
              onClick={handleAtualizar}
              disabled={loading || loadingOport}
              title="Buscar preços atualizados da API"
            >
              {(loading || loadingOport) ? '...' : '↻'} Atualizar
            </button>
          )}

        </div>
      </div>

      {/* Tabela de resultados */}
      {baseItem ? (
        loading && rows.length === 0 ? (
          <div className="loading"><div className="spinner" /><p>Buscando preços...</p></div>
        ) : rows.length > 0 ? (
          <>
            <h3 className="rent-title">
              {itemDisplayName}
              <CopyButton text={itemDisplayName} />
              {rows[0]?.isLive && <span className="live-badge">LIVE</span>}
            </h3>
            <div className="rent-table-wrap">
              <table className="rent-table">
                <thead>
                  <tr>
                    <th>Tier</th>
                    <th>Prod./Batch</th>
                    <th>Custo (1 batch)</th>
                    <th>Custo Total</th>
                    <th>{usarOrdemCompra ? 'Melhor Ordem Compra' : 'Preço de Venda'}</th>
                    <th>Lucro/Batch</th>
                    <th>Margem</th>
                    <th title="Preço mínimo por unidade para 5% de margem">Preço Mín. 5%</th>
                    <th title="Lucro total ao preço atual da API">Lucro Total (API)</th>
                    <th title="Lucro total ao preço mínimo de 5%">Lucro Total (5%)</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(row => (
                    <tr key={row.id}>
                      <td className="tier-cell">T{row.tier}.0</td>
                      <td className="center">{row.amountCrafted}</td>
                      <td>{formatSilver(Math.round(row.custoIngredientes))}</td>
                      <td className="font-bold">{formatSilver(Math.round(row.custoTotal))}</td>
                      <td>{formatSilver(row.itemPreco)}</td>
                      <td className={row.lucro >= 0 ? 'profit-positive' : 'profit-negative'}>
                        {formatSilver(Math.round(row.lucro))}
                        {row.ingredienteSemPreco && (
                          <span className="missing-price-tag" title="Um ou mais ingredientes sem preço — valor pode estar incorreto">*</span>
                        )}
                        {row.receitaBruta > 0 && (
                          <span className={`margin-tag ${marginClass(row.margem)}`}>
                            {row.margem.toFixed(1)}%
                          </span>
                        )}
                      </td>
                      <td className={marginClass(row.margem)}>
                        {row.receitaBruta > 0 ? row.margem.toFixed(2) + '%' : '—'}
                      </td>
                      <td className="preco-min">
                        {row.precoMin5pct > 0 ? formatSilver(Math.round(row.precoMin5pct)) : '—'}
                      </td>
                      <td className={row.lucroTotal >= 0 ? 'profit-positive' : 'profit-negative'}>
                        {formatSilver(Math.round(row.lucroTotal))}
                      </td>
                      <td className="profit-neutral">
                        {row.lucroTotal5pct > 0 ? formatSilver(Math.round(row.lucroTotal5pct)) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Ingredientes do primeiro tier com preço */}
            <IngredientesSection rows={rows} nameMap={nameMap} />

            {/* Comparativo todas as cidades */}
            <CidadesComparativo cityMargins={cityMargins} rows={rows} usarOrdemCompra={usarOrdemCompra} />

            {/* Oportunidades de ordem de compra */}
            <OportunidadesSection oportunidades={oportunidades} quantidade={quantidade} loading={loadingOport} subLabel={subLabel(subcategoria)} wsDataVersion={wsDataVersion} />
          </>
        ) : (
          <div className="empty-state">
            <p>Nenhuma receita encontrada para este item.</p>
          </div>
        )
      ) : (
        <div className="rent-empty">
          <p>Selecione uma categoria e item para ver a rentabilidade por tier.</p>
          <p className="hint">
            Conecte o <strong>albiondata-client</strong> com WebSocket para atualizar preços
            em tempo real ao visitar o mercado no jogo.
          </p>
        </div>
      )}
    </div>
  )
}

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false)
  function handleCopy() {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }
  return (
    <button className="copy-btn" onClick={handleCopy} title="Copiar nome">
      {copied ? '✓' : '⎘'}
    </button>
  )
}

function IngredientesSection({ rows, nameMap }) {
  const [expanded, setExpanded] = useState(null)

  if (!rows.length) return null

  return (
    <div className="ingredientes-section">
      <h4>Ingredientes por Tier</h4>
      <div className="ingredientes-tiers">
        {rows.map(row => (
          <div key={row.id} className="ing-tier-card">
            <button
              className="ing-tier-header"
              onClick={() => setExpanded(expanded === row.id ? null : row.id)}
            >
              <span className="tier-badge">T{row.tier}</span>
              <span>{row.ingredienteInfo.length} ingredientes</span>
              <span className="ing-total">Total: {formatSilver(Math.round(row.custoIngredientes))}</span>
              <span>{expanded === row.id ? '▲' : '▼'}</span>
            </button>
            {expanded === row.id && (
              <div className="ing-list">
                <table>
                  <thead>
                    <tr><th>Ingrediente</th><th>Qtd/Batch</th><th>Qtd Total</th><th>Qtd Efetiva</th><th>Preço Unit.</th><th>Total</th></tr>
                  </thead>
                  <tbody>
                    {row.ingredienteInfo.map(ing => (
                      <tr key={ing.id}>
                        <td>
                          {nameMap[ing.id] || ing.id}
                          <CopyButton text={nameMap[ing.id] || ing.id} />
                        </td>
                        <td className="center">{ing.count}</td>
                        <td className="center font-bold">{ing.countTotal}</td>
                        <td className="center">{ing.efetivo > 0 ? (ing.efetivo / (ing.preco || 1)).toFixed(1) : ing.count}</td>
                        <td>{formatSilver(ing.preco)}</td>
                        <td>{formatSilver(Math.round(ing.efetivo))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

const CITY_DISPLAY = {
  Caerleon: 'Caerleon',
  Bridgewatch: 'Bridgewatch',
  Lymhurst: 'Lymhurst',
  Thetford: 'Thetford',
  FortSterling: 'Fort Sterling',
  Martlock: 'Martlock',
  Brecilien: 'Brecilien',
  BlackMarket: 'Black Market',
}

function CidadesComparativo({ cityMargins, rows, usarOrdemCompra }) {
  if (!rows.length || !Object.keys(cityMargins).length) return null

  const cidades = Object.keys(CITY_DISPLAY).filter(c => cityMargins[c])
  if (!cidades.length) return null

  return (
    <div className="cidades-comparativo">
      <h4>Comparativo por Cidade {usarOrdemCompra && <span className="ordem-compra-tag">Ordem de Compra</span>}</h4>
      <div className="comp-table-wrap">
        <table className="comp-table">
          <thead>
            <tr>
              <th>Cidade</th>
              {rows.map(r => <th key={r.id}>T{r.tier}</th>)}
            </tr>
          </thead>
          <tbody>
            {cidades.map(city => (
              <tr key={city}>
                <td className="comp-city">{CITY_DISPLAY[city]}</td>
                {rows.map(r => {
                  const entry = cityMargins[city]?.[r.id]
                  if (entry === null || entry === undefined) {
                    return <td key={r.id} className="comp-nodata">—</td>
                  }
                  const m = entry.margem
                  return (
                    <td key={r.id} className={m >= 5 ? 'comp-good' : m >= 0 ? 'comp-neutral' : 'comp-bad'}>
                      {m.toFixed(1)}%
                      {entry.semPreco && (
                        <span className="missing-price-tag" title="Um ou mais ingredientes sem preço — valor pode estar incorreto">*</span>
                      )}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function OportunidadesSection({ oportunidades, quantidade, loading, subLabel, wsDataVersion: _ }) {
  return (
    <div className="oportunidades-section">
      <div className="oport-header">
        <h4>Oportunidades — Ordem de Compra</h4>
        <span className="oport-sub">
          Todos os itens de <strong>{subLabel}</strong> onde vender para ordens de compra gera {'>'}= 5% de margem
        </span>
      </div>

      {loading ? (
        <div className="oport-empty">Calculando...</div>
      ) : oportunidades.length === 0 ? (
        <div className="oport-empty">
          Nenhuma oportunidade encontrada com {'>'} 5% de margem via ordem de compra nas cidades disponíveis.
          <span className="oport-hint">Tente visitar os mercados no jogo para atualizar os preços via WebSocket.</span>
        </div>
      ) : (
        <div className="oport-table-wrap">
          <table className="oport-table">
            <thead>
              <tr>
                <th>Item</th>
                <th>Tier</th>
                <th>Cidade</th>
                <th>Ordem de Compra</th>
                <th>Custo/Batch</th>
                <th>Lucro/Batch</th>
                <th>Margem</th>
                <th>Lucro Total ({quantidade}x)</th>
                <th title="Qtd. total em pedidos de compra acima do break-even (dados do WS)">Qtd. Lucrativa 🔴</th>
              </tr>
            </thead>
            <tbody>
              {oportunidades.map((op, i) => {
                const buyOrders = getWsBuyOrders(op.tierId, op.cityKey)
                const qtdLucrativa = buyOrders
                  .filter(o => o.price >= op.precoBreakeven)
                  .reduce((sum, o) => sum + o.amount, 0)
                return (
                  <tr key={`${op.cityKey}-${op.tierId}`} className={i === 0 ? 'oport-top' : ''}>
                    <td className="oport-nome">{op.nomeItem}</td>
                    <td className="tier-cell">T{op.tier}.0</td>
                    <td className="oport-city">{op.city}</td>
                    <td className="oport-preco">{formatSilver(op.precoCompra)}</td>
                    <td>{formatSilver(Math.round(op.custoPorBatch))}</td>
                    <td className="profit-positive">{formatSilver(Math.round(op.lucro))}</td>
                    <td><span className="oport-margem">{op.margem.toFixed(1)}%</span></td>
                    <td className="profit-positive">{formatSilver(Math.round(op.lucroTotal))}</td>
                    <td className={qtdLucrativa > 0 ? 'profit-positive font-bold' : 'comp-nodata'}>
                      {buyOrders.length === 0 ? <span title="Visite o mercado no jogo para obter dados">—</span> : qtdLucrativa.toLocaleString('pt-BR')}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
