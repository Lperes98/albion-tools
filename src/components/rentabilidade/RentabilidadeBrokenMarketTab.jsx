import { useState, useEffect, useMemo, useCallback } from 'react'
import recipesRaw from '../../data/recipes.json'
import { consultarPrecos, buscarVolume6h, CIDADES_API } from '../../services/albionApi'
import { connectWebSocket, disconnectWebSocket, getWsStatus, subscribeWs } from '../../services/websocketClient'

const recipes = recipesRaw

const CATEGORY_LABELS = {
  consumables: 'Consumíveis', armor: 'Armaduras', weapon: 'Armas',
  offhand: 'Secundários', mount: 'Montarias', furniture: 'Mobília',
  other: 'Outros', farming: 'Fazenda', accessories: 'Acessórios',
}
const SUBCATEGORY_LABELS = {
  potions: 'Poções', food: 'Comida', cloth: 'Pano', leather: 'Couro',
  plate: 'Placa', axe: 'Machado', sword: 'Espada', dagger: 'Adaga',
  hammer: 'Martelo', spear: 'Lança', broadsword: 'Espadão',
  bow: 'Arco', crossbow: 'Besta', stafffire: 'Cajado de Fogo',
  staffholy: 'Cajado Sagrado', staffnature: 'Cajado da Natureza',
  stafffrost: 'Cajado de Gelo', staffcurse: 'Cajado da Maldição',
  staffarcane: 'Cajado Arcano', horse: 'Cavalo', direwolf: 'Lobo',
  ox: 'Boi', bag: 'Bolsa', cape: 'Capa', toolkit: 'Ferramentas', seed: 'Semente',
}

const CITY_DISPLAY = {
  Caerleon: 'Caerleon', Bridgewatch: 'Bridgewatch', Lymhurst: 'Lymhurst',
  Thetford: 'Thetford', FortSterling: 'Fort Sterling', Martlock: 'Martlock',
  Brecilien: 'Brecilien', BlackMarket: 'Black Market',
}

// Cidades onde é possível craftar (não inclui Black Market)
const CRAFT_CITIES = CIDADES_API.filter(c => c !== 'BlackMarket')

const CITY_CRAFT_BONUSES = {
  Thetford:     { mace: 15, staffnature: 15, stafffire: 15, leather: 15, cloth: 15 },
  Lymhurst:     { sword: 15, bow: 15, staffarcane: 15, leather: 15 },
  Bridgewatch:  { crossbow: 15, dagger: 15, staffcurse: 15, plate: 15, cloth: 15 },
  Martlock:     { axe: 15, quarterstaff: 15, stafffrost: 15, plate: 15, offhand: 15 },
  FortSterling: { hammer: 15, spear: 15, staffholy: 15, plate: 15, cloth: 15 },
  Brecilien:    { toolkit: 15, food: 15, potions: 15, cape: 15, bag: 15, knuckles: 15 },
  Caerleon:     { axe: 15, crossbow: 15, hammer: 15, mace: 15, sword: 15, plate: 15 },
  BlackMarket:  {},
}

function catLabel(c) { return CATEGORY_LABELS[c] || c }
function subLabel(s) { return SUBCATEGORY_LABELS[s] || s }

function formatSilver(v) {
  if (!v || v === 0) return '—'
  if (v >= 1_000_000) return (v / 1_000_000).toFixed(2) + 'M'
  if (v >= 1_000) return (v / 1_000).toFixed(1) + 'k'
  return v.toLocaleString('pt-BR')
}

function marginClass(pct) {
  if (pct > 10) return 'margin-positive'
  if (pct > 0)  return 'margin-neutral'
  return 'margin-negative'
}

function cellClass(pct) {
  if (pct >= 10) return 'comp-good'
  if (pct >= 0)  return 'comp-neutral'
  return 'comp-bad'
}

function useRecipeGroups() {
  return useMemo(() => {
    const groups = {}
    for (const recipe of Object.values(recipes)) {
      if (!recipe.ingredients?.length) continue
      if (recipe.enchantmentLevel) continue
      const cat = recipe.category || 'other'
      const sub = recipe.subcategory || 'other'
      const base = recipe.id.replace(/^T\d+_/, '')
      if (!groups[cat]) groups[cat] = {}
      if (!groups[cat][sub]) groups[cat][sub] = new Set()
      groups[cat][sub].add(base)
    }
    for (const cat of Object.keys(groups))
      for (const sub of Object.keys(groups[cat]))
        groups[cat][sub] = [...groups[cat][sub]].sort()
    return groups
  }, [])
}

export function RentabilidadeBrokenMarketTab({ servidor, setServidor, itensDisponiveis }) {
  const groups = useRecipeGroups()

  const [categoria, setCategoria]       = useState('')
  const [subcategoria, setSubcategoria] = useState('')
  const [baseItem, setBaseItem]         = useState('')

  const [taxaRetorno, setTaxaRetorno]       = useState(15)
  const [taxaMercado, setTaxaMercado]       = useState(3)
  const [custoLoja, setCustoLoja]           = useState(0)
  const [quantidade, setQuantidade]         = useState(1)
  const [usarOrdemCompra, setUsarOrdemCompra] = useState(false)
  const [viagemSafe, setViagemSafe]           = useState(false)

  // Resultado por tier
  const [tierRows, setTierRows]           = useState([])  // linhas principais (global min prices + taxaRetorno base)
  const [ingredientRows, setIngredientRows] = useState([]) // ingredientes com preço mínimo global + cidade de origem
  const [craftCityRows, setCraftCityRows] = useState([])  // custo efetivo por cidade de craft (por tier)
  const [cityMargins, setCityMargins]     = useState({})  // margem por cidade de venda
  const [volumeData, setVolumeData]       = useState({})
  const [loading, setLoading]             = useState(false)

  const [wsStatus, setWsStatus] = useState(getWsStatus())
  useEffect(() => subscribeWs(setWsStatus), [])

  const nameMap = useMemo(() => {
    const m = {}
    for (const item of (itensDisponiveis || [])) {
      m[item.UniqueName] = item.LocalizedNames?.['PT-BR'] || item.LocalizedNames?.['EN-US'] || item.UniqueName
    }
    return m
  }, [itensDisponiveis])

  const categorias    = Object.keys(groups).sort()
  const subcategorias = categoria ? Object.keys(groups[categoria] || {}).sort() : []
  const baseItems     = (categoria && subcategoria) ? (groups[categoria]?.[subcategoria] || []) : []

  function handleCategoria(v)    { setCategoria(v); setSubcategoria(''); setBaseItem('') }
  function handleSubcategoria(v) { setSubcategoria(v); setBaseItem('') }

  const calcular = useCallback(async () => {
    if (!baseItem) return
    setLoading(true)

    // Receitas de todos os tiers para este item base
    const tiersRecipes = []
    for (let t = 2; t <= 8; t++) {
      const key = `T${t}_${baseItem}`
      if (recipes[key]) tiersRecipes.push(recipes[key])
    }
    if (!tiersRecipes.length) { setLoading(false); return }

    // Coleta todos os IDs necessários
    const allIds = new Set()
    for (const r of tiersRecipes) {
      allIds.add(r.id)
      for (const ing of r.ingredients) allIds.add(ing.id)
    }

    // Busca preços em todas as cidades
    let apiData = []
    try {
      apiData = await consultarPrecos([...allIds], servidor, '0,1')
    } catch {}

    // Monta mapa por cidade: { cityKey: { itemId: { sellMin, buyMax } } }
    const pricesByCity = {}
    for (const d of apiData) {
      if (!d.city) continue
      const ck = d.city.replace(/\s/g, '')
      if (!pricesByCity[ck]) pricesByCity[ck] = {}
      if (!pricesByCity[ck][d.item_id]) pricesByCity[ck][d.item_id] = {}
      const e = pricesByCity[ck][d.item_id]
      if (d.sell_price_min > 0)
        e.sellMin = e.sellMin ? Math.min(e.sellMin, d.sell_price_min) : d.sell_price_min
      if (d.buy_price_max > 0)
        e.buyMax = e.buyMax ? Math.max(e.buyMax, d.buy_price_max) : d.buy_price_max
    }

    // Remove Caerleon e Black Market quando Viagem Safe está ativo
    const SAFE_EXCLUDED = ['Caerleon', 'BlackMarket']
    if (viagemSafe) {
      for (const city of SAFE_EXCLUDED) delete pricesByCity[city]
    }

    // ── Preço mínimo global por ingrediente (menor entre todas as cidades) ──
    const globalMin = {} // itemId → { price, city }
    for (const id of allIds) {
      let minPrice = Infinity
      let minCity  = null
      for (const [ck, cp] of Object.entries(pricesByCity)) {
        const p = cp[id]?.sellMin
        if (p && p < minPrice) { minPrice = p; minCity = ck }
      }
      if (minPrice < Infinity) globalMin[id] = { price: minPrice, city: minCity }
    }

    const tax = taxaMercado / 100
    const ret = taxaRetorno / 100
    const qtd = Math.max(1, quantidade)

    // ── Tabela principal (global min + taxaRetorno base do usuário) ──
    const newTierRows = []
    for (const r of tiersRecipes) {
      let custoIng = 0
      let semPreco = false
      const ingInfo = []
      for (const ing of r.ingredients) {
        const g = globalMin[ing.id]
        if (!g) { semPreco = true; break }
        const efetivo = ing.count * (1 - ret) * g.price
        custoIng += efetivo
        ingInfo.push({ ...ing, preco: g.price, minCity: g.city, efetivo, countTotal: ing.count * qtd })
      }
      if (semPreco) continue
      custoIng += (r.silver || 0) + custoLoja

      // Melhor preço de venda entre todas as cidades
      let melhorPrecoVenda = 0
      let melhorCidadeVenda = null
      for (const [ck, cp] of Object.entries(pricesByCity)) {
        const p = usarOrdemCompra ? cp[r.id]?.buyMax : cp[r.id]?.sellMin
        if (p && p > melhorPrecoVenda) { melhorPrecoVenda = p; melhorCidadeVenda = ck }
      }

      const receitaBruta   = melhorPrecoVenda * r.amountCrafted
      const receitaLiquida = receitaBruta * (1 - tax)
      const lucro          = receitaLiquida - custoIng
      const margem         = receitaBruta > 0 ? (lucro / receitaBruta) * 100 : 0
      const divisor        = r.amountCrafted * (1 - tax - 0.05)
      const precoMin5pct   = divisor > 0 ? custoIng / divisor : 0

      newTierRows.push({
        ...r,
        custoIng: Math.round(custoIng),
        custoTotal: Math.round(custoIng * qtd),
        melhorPrecoVenda,
        melhorCidadeVenda,
        receitaBruta,
        receitaLiquida,
        lucro: Math.round(lucro),
        lucroTotal: Math.round(lucro * qtd),
        margem,
        precoMin5pct,
        ingInfo,
        semPreco,
        tax,
      })
    }
    setTierRows(newTierRows)

    // ── Ingredientes: lista de todos os ingredientes únicos com menor preço global ──
    const allIngs = new Map()
    for (const r of tiersRecipes) {
      for (const ing of r.ingredients) {
        if (!allIngs.has(ing.id)) {
          const g = globalMin[ing.id]
          allIngs.set(ing.id, { id: ing.id, price: g?.price || 0, city: g?.city || null })
        }
      }
    }
    setIngredientRows([...allIngs.values()])

    // ── Melhor cidade para craft: por tier, custo efetivo em cada cidade ──
    // (usa globalMin prices mas return rate varia por cidade)
    const newCraftCityRows = tiersRecipes.map(r => {
      const perCity = CRAFT_CITIES.map(ck => {
        const cityBonus = (CITY_CRAFT_BONUSES[ck] || {})[subcategoria] || 0
        const cityRet   = (taxaRetorno + cityBonus) / 100
        let custo = 0
        let semPreco = false
        for (const ing of r.ingredients) {
          const g = globalMin[ing.id]
          if (!g) { semPreco = true; break }
          custo += ing.count * (1 - cityRet) * g.price
        }
        if (semPreco) return null
        custo += (r.silver || 0) + custoLoja
        return { city: ck, cityBonus, retorno: taxaRetorno + cityBonus, custo: Math.round(custo) }
      }).filter(Boolean)

      perCity.sort((a, b) => a.custo - b.custo)
      return { tierId: r.id, tier: r.tier, perCity }
    })
    setCraftCityRows(newCraftCityRows)

    // ── Tabela de venda por cidade (formato oportunidades de viagem) ──
    const newCityMargins = {}
    for (const [ck, cp] of Object.entries(pricesByCity)) {
      newCityMargins[ck] = {}
      for (const r of tiersRecipes) {
        const baseRow = newTierRows.find(tr => tr.id === r.id)
        if (!baseRow) continue
        const precoVenda = usarOrdemCompra ? cp[r.id]?.buyMax : cp[r.id]?.sellMin
        if (!precoVenda) { newCityMargins[ck][r.id] = null; continue }
        const rb  = precoVenda * r.amountCrafted
        const rl  = rb * (1 - tax)
        const luc = rl - baseRow.custoIng
        const mg  = rb > 0 ? (luc / rb) * 100 : 0
        newCityMargins[ck][r.id] = {
          margem: mg,
          lucro: Math.round(luc),
          lucroTotal: Math.round(luc * qtd),
          precoVenda,
          custoIng: baseRow.custoIng,
          tier: r.tier,
          tierId: r.id,
        }
      }
    }
    setCityMargins(newCityMargins)

    // Volume 6h
    const todasOps = Object.entries(newCityMargins).flatMap(([ck, tiers]) =>
      Object.entries(tiers).filter(([, v]) => v).map(([tid]) => ({ cityKey: ck, tierId: tid }))
    )
    const uniIds    = [...new Set(todasOps.map(o => o.tierId))]
    const uniCities = [...new Set(todasOps.map(o => o.cityKey))]
    buscarVolume6h(uniIds, uniCities, servidor).then(vol => setVolumeData(vol))

    setLoading(false)
  }, [baseItem, subcategoria, servidor, taxaRetorno, taxaMercado, custoLoja, quantidade, usarOrdemCompra, viagemSafe])

  useEffect(() => { if (baseItem) calcular() }, [baseItem, servidor, taxaRetorno, taxaMercado, custoLoja, quantidade, usarOrdemCompra, viagemSafe])

  const itemDisplayName = baseItem
    ? (nameMap[`T4_${baseItem}`] || nameMap[`T5_${baseItem}`] || baseItem)?.replace(/^(T\d+\s)/, '')
    : ''

  return (
    <div className="rentabilidade-tab">
      {/* Header */}
      <div className="rent-header">
        <div className="rent-selectors">
          <div className="rent-field">
            <label>Categoria</label>
            <select value={categoria} onChange={e => handleCategoria(e.target.value)}>
              <option value="">Selecionar...</option>
              {categorias.map(c => <option key={c} value={c}>{catLabel(c)}</option>)}
            </select>
          </div>
          <div className="rent-field">
            <label>Subcategoria</label>
            <select value={subcategoria} onChange={e => handleSubcategoria(e.target.value)} disabled={!categoria}>
              <option value="">Selecionar...</option>
              {subcategorias.map(s => <option key={s} value={s}>{subLabel(s)}</option>)}
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
            <input type="number" min="1" step="1" value={quantidade}
              onChange={e => setQuantidade(parseInt(e.target.value) || 1)} />
          </div>
          <div className="rent-field rent-field-sm">
            <label>Retorno Base (%)</label>
            <input type="number" min="0" max="60" step="0.5" value={taxaRetorno}
              onChange={e => setTaxaRetorno(parseFloat(e.target.value) || 0)} />
          </div>
          <div className="rent-field rent-field-sm">
            <label>Taxa Mercado (%)</label>
            <input type="number" min="0" max="10" step="0.1" value={taxaMercado}
              onChange={e => setTaxaMercado(parseFloat(e.target.value) || 0)} />
          </div>
          <div className="rent-field rent-field-sm">
            <label>Custo Loja</label>
            <input type="number" min="0" step="1" value={custoLoja}
              onChange={e => setCustoLoja(parseFloat(e.target.value) || 0)} placeholder="0" />
          </div>
          <label className="checkbox-toggle">
            <input type="checkbox" checked={usarOrdemCompra}
              onChange={e => setUsarOrdemCompra(e.target.checked)} />
            <span>Ordem de Compra</span>
          </label>
          <label className="checkbox-toggle" title="Ignora Caerleon e Black Market na busca de ingredientes e na venda">
            <input type="checkbox" checked={viagemSafe}
              onChange={e => setViagemSafe(e.target.checked)} />
            <span>Viagem Safe</span>
          </label>

          <div className={`ws-badge ws-${wsStatus}`} title={`WebSocket: ${wsStatus}`}>
            <span className="ws-dot" />
            {wsStatus === 'connected' ? 'Live' : wsStatus === 'connecting' ? 'Conectando...' : 'Offline'}
          </div>
          {wsStatus === 'disconnected' || wsStatus === 'error' ? (
            <button className="btn-ws-connect" onClick={connectWebSocket}>Conectar WS</button>
          ) : (
            <button className="btn-ws-connect btn-ws-disconnect" onClick={disconnectWebSocket}>Desconectar</button>
          )}

          <button className="btn-refresh-rent" onClick={calcular} disabled={loading || !baseItem}>
            {loading ? '...' : '↻'} Atualizar
          </button>
        </div>
      </div>

      {/* Conteúdo */}
      {!baseItem ? (
        <div className="rent-empty">
          <p>Selecione um item para comparar o custo de craft com ingredientes do menor preço global.</p>
          <p className="hint">
            <strong>Broken Market</strong>: os ingredientes são comprados pela menor cotação entre todas as
            cidades. A análise mostra onde craftar (maior retorno) e onde vender (maior lucro).
          </p>
        </div>
      ) : loading && tierRows.length === 0 ? (
        <div className="loading"><div className="spinner" /><p>Buscando preços em todas as cidades...</p></div>
      ) : tierRows.length === 0 ? (
        <div className="empty-state"><p>Nenhum dado de preço encontrado para este item.</p></div>
      ) : (
        <>
          <h3 className="rent-title">{itemDisplayName}</h3>

          {/* ── Tabela principal por tier ── */}
          <div className="rent-table-wrap">
            <table className="rent-table">
              <thead>
                <tr>
                  <th>Tier</th>
                  <th>Prod./Batch</th>
                  <th>Custo/Batch <small>(ingredientes globais)</small></th>
                  <th>Custo Total</th>
                  <th>Melhor Venda</th>
                  <th>{usarOrdemCompra ? 'Melhor Ordem Compra' : 'Melhor Preço Venda'}</th>
                  <th>Lucro/Batch</th>
                  <th>Margem</th>
                  <th title="Preço mínimo por unidade para 5% de margem">Preço Mín. 5%</th>
                  <th>Lucro Total</th>
                </tr>
              </thead>
              <tbody>
                {tierRows.map(row => (
                  <tr key={row.id}>
                    <td className="tier-cell">T{row.tier}.0</td>
                    <td className="center">{row.amountCrafted}</td>
                    <td>{formatSilver(row.custoIng)}</td>
                    <td className="font-bold">{formatSilver(row.custoTotal)}</td>
                    <td className="oport-city">{CITY_DISPLAY[row.melhorCidadeVenda] || row.melhorCidadeVenda || '—'}</td>
                    <td>{formatSilver(row.melhorPrecoVenda)}</td>
                    <td className={row.lucro >= 0 ? 'profit-positive' : 'profit-negative'}>
                      {formatSilver(row.lucro)}
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
                      {formatSilver(row.lucroTotal)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* ── Ingredientes com menor preço global ── */}
          <BmIngredientesSection tierRows={tierRows} nameMap={nameMap} />

          {/* ── Melhor cidade para craft ── */}
          <BmMelhorCidadeCraft craftCityRows={craftCityRows} taxaRetorno={taxaRetorno} />

          {/* ── Lucro de venda por cidade ── */}
          <BmCidadesVenda cityMargins={cityMargins} tierRows={tierRows} usarOrdemCompra={usarOrdemCompra} quantidade={quantidade} volumeData={volumeData} />
        </>
      )}
    </div>
  )
}

// ── Ingredientes com menor preço global ──────────────────────────────────────
function BmIngredientesSection({ tierRows, nameMap }) {
  const [expanded, setExpanded] = useState(null)
  if (!tierRows.length) return null

  return (
    <div className="ingredientes-section">
      <h4>Ingredientes por Tier <small style={{ fontWeight: 400, color: 'var(--text-muted)' }}>— menor preço entre todas as cidades</small></h4>
      <div className="ingredientes-tiers">
        {tierRows.map(row => (
          <div key={row.id} className="ing-tier-card">
            <button
              className="ing-tier-header"
              onClick={() => setExpanded(expanded === row.id ? null : row.id)}
            >
              <span className="tier-badge">T{row.tier}</span>
              <span>{row.ingInfo.length} ingredientes</span>
              <span className="ing-total">Total: {formatSilver(row.custoIng)}</span>
              <span>{expanded === row.id ? '▲' : '▼'}</span>
            </button>
            {expanded === row.id && (
              <div className="ing-list">
                <table>
                  <thead>
                    <tr>
                      <th>Ingrediente</th>
                      <th>Qtd/Batch</th>
                      <th>Qtd Total</th>
                      <th>Cidade mais barata</th>
                      <th>Preço Unit.</th>
                      <th>Custo Efetivo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {row.ingInfo.map(ing => (
                      <tr key={ing.id}>
                        <td>{nameMap[ing.id] || ing.id}</td>
                        <td className="center">{ing.count}</td>
                        <td className="center font-bold">{ing.countTotal}</td>
                        <td className="oport-city">{CITY_DISPLAY[ing.minCity] || ing.minCity || '—'}</td>
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

// ── Melhor cidade para craft (por taxa de retorno) ────────────────────────────
function BmMelhorCidadeCraft({ craftCityRows, taxaRetorno }) {
  if (!craftCityRows.length) return null

  // Tiers disponíveis
  const tiers = craftCityRows.map(r => r.tier)

  // Todas as cidades que apareceram
  const allCities = CRAFT_CITIES

  return (
    <div className="cidades-comparativo">
      <h4>
        Melhor Cidade para Craft
        <small style={{ fontWeight: 400, color: 'var(--text-muted)', marginLeft: '0.5rem' }}>
          — custo efetivo usando ingredientes do menor preço global + retorno da cidade
        </small>
      </h4>
      <div className="comp-table-wrap">
        <table className="comp-table">
          <thead>
            <tr>
              <th>Cidade</th>
              <th>Retorno</th>
              {tiers.map(t => <th key={t}>T{t} — Custo</th>)}
            </tr>
          </thead>
          <tbody>
            {allCities.map(city => {
              const cityBonus = Object.values(
                craftCityRows[0]?.perCity.find(r => r.city === city) || {}
              )
              const firstEntry = craftCityRows[0]?.perCity.find(r => r.city === city)
              if (!firstEntry) return null
              const retorno = firstEntry.retorno

              return (
                <tr key={city}>
                  <td className="comp-city">{CITY_DISPLAY[city] || city}</td>
                  <td className="center">
                    {retorno}%
                    {firstEntry.cityBonus > 0 && (
                      <span className="city-bonus-tag" title={`+${firstEntry.cityBonus}% bônus desta cidade`}>
                        +{firstEntry.cityBonus}%
                      </span>
                    )}
                  </td>
                  {craftCityRows.map(({ tierId, tier, perCity }) => {
                    const entry = perCity.find(r => r.city === city)
                    if (!entry) return <td key={tierId} className="comp-nodata">—</td>
                    // Destaca a cidade com menor custo neste tier
                    const isBest = perCity[0].city === city
                    return (
                      <td key={tierId} className={isBest ? 'comp-good' : 'comp-neutral'}>
                        {isBest && '★ '}{formatSilver(entry.custo)}
                      </td>
                    )
                  })}
                </tr>
              )
            }).filter(Boolean)}
          </tbody>
        </table>
      </div>
    </div>
  )
}

const COLUNAS_VENDA = [
  { key: 'cidade',     label: 'Cidade Destino' },
  { key: 'tier',       label: 'Tier' },
  { key: 'precoVenda', label: 'Preço Venda' },
  { key: 'custoIng',   label: 'Custo/Batch' },
  { key: 'lucro',      label: 'Lucro/Batch' },
  { key: 'margem',     label: 'Margem' },
  { key: 'lucroTotal', label: null },  // label dinâmico
  { key: 'volume',     label: 'Vol. 6h', title: 'Volume vendido no último período de 6h registrado' },
]

// ── Lucro de venda por cidade ─────────────────────────────────────────────────
function BmCidadesVenda({ cityMargins, tierRows, usarOrdemCompra, quantidade, volumeData = {} }) {
  const [sortKey, setSortKey]   = useState('margem')
  const [sortDir, setSortDir]   = useState('desc')

  if (!tierRows.length || !Object.keys(cityMargins).length) return null

  // Achata em linhas, uma por (cidade × tier), filtra sem dados
  const linhas = []
  for (const [cityKey, tiers] of Object.entries(cityMargins)) {
    for (const [, entry] of Object.entries(tiers)) {
      if (!entry) continue
      const vol = volumeData[`${entry.tierId}__${cityKey}`] ?? -1
      linhas.push({ cityKey, cidade: CITY_DISPLAY[cityKey] || cityKey, ...entry, volume: vol })
    }
  }

  // Ordena conforme coluna ativa
  linhas.sort((a, b) => {
    let av = a[sortKey], bv = b[sortKey]
    if (sortKey === 'cidade') { av = av || ''; bv = bv || '' }
    else { av = av ?? -Infinity; bv = bv ?? -Infinity }
    if (typeof av === 'string') return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av)
    return sortDir === 'asc' ? av - bv : bv - av
  })

  if (!linhas.length) return null

  function handleSort(key) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('desc') }
  }

  function sortIcon(key) {
    if (sortKey !== key) return <span className="sort-icon sort-idle">⇅</span>
    return <span className="sort-icon">{sortDir === 'asc' ? '↑' : '↓'}</span>
  }

  return (
    <div className="oportunidades-section" style={{ marginTop: '1.5rem' }}>
      <div className="oport-header">
        <h4>
          Lucro de Venda por Cidade
          {usarOrdemCompra && <span className="ordem-compra-tag">Ordem de Compra</span>}
        </h4>
        <span className="oport-sub">
          Custo de craft = ingredientes pelo menor preço global + retorno base
        </span>
      </div>
      <div className="oport-table-wrap">
        <table className="oport-table">
          <thead>
            <tr>
              {COLUNAS_VENDA.map(col => (
                <th
                  key={col.key}
                  title={col.title}
                  onClick={() => handleSort(col.key)}
                  style={{ cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }}
                  className={sortKey === col.key ? 'col-sorted' : ''}
                >
                  {col.key === 'lucroTotal' ? `Lucro Total (${quantidade}x)` : col.label}
                  {sortIcon(col.key)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {linhas.map((op, i) => (
              <tr key={`${op.cityKey}-${op.tierId}`} className={i === 0 ? 'oport-top' : ''}>
                <td className="oport-city">{op.cidade}</td>
                <td className="tier-cell">T{op.tier}.0</td>
                <td className="oport-preco">{formatSilver(op.precoVenda)}</td>
                <td>{formatSilver(op.custoIng)}</td>
                <td className={op.lucro >= 0 ? 'profit-positive' : 'profit-negative'}>
                  {formatSilver(op.lucro)}
                </td>
                <td><span className="oport-margem">{op.margem.toFixed(1)}%</span></td>
                <td className={op.lucroTotal >= 0 ? 'profit-positive' : 'profit-negative'}>
                  {formatSilver(op.lucroTotal)}
                </td>
                <td className="center">
                  {op.volume >= 0 ? op.volume.toLocaleString('pt-BR') : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
