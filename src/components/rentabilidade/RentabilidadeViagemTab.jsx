import { useState, useEffect, useMemo, useCallback } from 'react'
import recipesRaw from '../../data/recipes.json'
import { consultarPrecos, buscarVolume6h, CIDADES_API } from '../../services/albionApi'

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

function catLabel(c) { return CATEGORY_LABELS[c] || c }
function subLabel(s) { return SUBCATEGORY_LABELS[s] || s }

function formatSilver(v) {
  if (!v || v === 0) return '—'
  if (v >= 1_000_000) return (v / 1_000_000).toFixed(2) + 'M'
  if (v >= 1_000) return (v / 1_000).toFixed(1) + 'k'
  return v.toLocaleString('pt-BR')
}

function cellClass(margem) {
  if (margem === null || margem === undefined) return 'comp-nodata'
  if (margem >= 10) return 'comp-good'
  if (margem >= 0) return 'comp-neutral'
  return 'comp-bad'
}

function baseId(uniqueName) {
  return uniqueName.replace(/^T\d+_/, '')
}

// ─── Bônus de crafting por cidade ─────────────────────────────────────────────
const CITY_CRAFT_BONUSES = {
  Thetford:    { mace: 15, staffnature: 15, stafffire: 15, leather: 15, cloth: 15 },
  Lymhurst:    { sword: 15, bow: 15, staffarcane: 15, leather: 15 },
  Bridgewatch: { crossbow: 15, dagger: 15, staffcurse: 15, plate: 15, cloth: 15 },
  Martlock:    { axe: 15, quarterstaff: 15, stafffrost: 15, plate: 15, offhand: 15 },
  FortSterling:{ hammer: 15, spear: 15, staffholy: 15, plate: 15, cloth: 15 },
  Brecilien:   { toolkit: 15, food: 15, potions: 15, cape: 15, bag: 15, knuckles: 15 },
  Caerleon:    { axe: 15, crossbow: 15, hammer: 15, mace: 15, sword: 15, plate: 15 },
  BlackMarket: {},
}

function getAutoRetorno(cityKey, sub) {
  const bonus = (CITY_CRAFT_BONUSES[cityKey] || {})[sub] || 0
  return 15 + bonus
}

function useRecipeGroups() {
  return useMemo(() => {
    const groups = {}
    for (const recipe of Object.values(recipes)) {
      if (!recipe.ingredients?.length) continue
      if (recipe.enchantmentLevel) continue
      const cat = recipe.category || 'other'
      const sub = recipe.subcategory || 'other'
      const base = baseId(recipe.id)
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

export function RentabilidadeViagemTab({ servidor, setServidor, itensDisponiveis }) {
  const groups = useRecipeGroups()

  const [categoria, setCategoria] = useState('')
  const [subcategoria, setSubcategoria] = useState('')
  const [baseItem, setBaseItem] = useState('')
  const [cidadeOrigem, setCidadeOrigem] = useState('Caerleon')
  const [taxaRetorno, setTaxaRetorno] = useState(15)
  const [taxaMercado, setTaxaMercado] = useState(3)
  const [custoLoja, setCustoLoja] = useState(0)
  const [quantidade, setQuantidade] = useState(1)
  const [usarOrdemCompra, setUsarOrdemCompra] = useState(false)

  const [tabelaViagem, setTabelaViagem] = useState([])
  const [tierRecipes, setTierRecipes] = useState([])
  const [ingredientRows, setIngredientRows] = useState([])
  const [volumeData, setVolumeData] = useState({})
  const [loading, setLoading] = useState(false)

  const [oportunidadesViagem, setOportunidadesViagem] = useState([])
  const [volumeDataOport, setVolumeDataOport] = useState({})
  const [loadingOport, setLoadingOport] = useState(false)

  const categorias = Object.keys(groups).sort()
  const subcategorias = categoria ? Object.keys(groups[categoria] || {}).sort() : []
  const baseItems = (categoria && subcategoria) ? (groups[categoria]?.[subcategoria] || []) : []

  function handleCategoria(v) { setCategoria(v); setSubcategoria(''); setBaseItem('') }
  function handleSubcategoria(v) { setSubcategoria(v); setBaseItem('') }

  // Auto-preenche taxa de retorno conforme cidade de origem e subcategoria
  const origemKey = cidadeOrigem.replace(/\s/g, '')
  const cityCraftBonus = (CITY_CRAFT_BONUSES[origemKey] || {})[subcategoria] || 0
  useEffect(() => {
    setTaxaRetorno(getAutoRetorno(origemKey, subcategoria))
  }, [cidadeOrigem, subcategoria])

  const nameMap = useMemo(() => {
    const m = {}
    for (const item of (itensDisponiveis || [])) {
      m[item.UniqueName] = item.LocalizedNames?.['PT-BR'] || item.LocalizedNames?.['EN-US'] || item.UniqueName
    }
    return m
  }, [itensDisponiveis])

  const calcular = useCallback(async () => {
    if (!baseItem) return
    setLoading(true)

    const tiers = []
    for (let t = 2; t <= 8; t++) {
      const key = `T${t}_${baseItem}`
      if (recipes[key]) tiers.push(recipes[key])
    }
    if (!tiers.length) { setLoading(false); return }
    setTierRecipes(tiers)

    const allIds = new Set()
    for (const r of tiers) {
      allIds.add(r.id)
      for (const ing of r.ingredients) allIds.add(ing.id)
    }

    let apiData = []
    try {
      apiData = await consultarPrecos([...allIds], servidor, '0,1')
    } catch { setLoading(false); return }

    // Monta mapa por cidade (normaliza espaços)
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

    const ret = taxaRetorno / 100
    const tax = taxaMercado / 100
    const qtd = Math.max(1, quantidade)
    const origemKey = cidadeOrigem.replace(/\s/g, '')
    const origemPrices = pricesByCity[origemKey] || {}

    // Para cada tier, calcula custo de craft na cidade de origem
    const craftCosts = tiers.map(r => {
      let custo = 0
      let semPreco = false
      const ingredienteInfo = []
      for (const ing of r.ingredients) {
        const preco = origemPrices[ing.id]?.sellMin || 0
        if (preco === 0) semPreco = true
        const efetivo = ing.count * (1 - ret) * preco
        custo += efetivo
        ingredienteInfo.push({ ...ing, preco, efetivo, countTotal: ing.count * qtd })
      }
      custo += (r.silver || 0) + custoLoja
      return { recipe: r, custo, semPreco, ingredienteInfo }
    })

    setIngredientRows(craftCosts.map(({ recipe, custo, semPreco, ingredienteInfo }) => ({
      id: recipe.id,
      tier: recipe.tier,
      custoIngredientes: custo,
      ingredienteInfo,
      semPreco,
    })))

    // Para cada cidade de destino, calcula lucro de venda
    const novaTabela = []
    for (const cityKey of Object.keys(CITY_DISPLAY)) {
      const cityPrices = pricesByCity[cityKey] || {}

      const tiersResult = craftCosts.map(({ recipe, custo, semPreco }) => {
        const itemPreco = usarOrdemCompra
          ? (cityPrices[recipe.id]?.buyMax || 0)
          : (cityPrices[recipe.id]?.sellMin || 0)
        const receitaBruta = itemPreco * recipe.amountCrafted
        const receitaLiquida = receitaBruta * (1 - tax)
        const lucro = receitaLiquida - custo
        const margem = receitaBruta > 0 ? (lucro / receitaBruta) * 100 : null
        const lucroTotal = lucro * qtd
        return {
          tierId: recipe.id,
          tier: recipe.tier,
          lucro: Math.round(lucro),
          lucroTotal: Math.round(lucroTotal),
          margem,
          precoVenda: itemPreco,
          custoIngredientes: Math.round(custo),
          semPreco,
          temDado: itemPreco > 0,
        }
      })

      novaTabela.push({ cityKey, cidade: CITY_DISPLAY[cityKey], tiers: tiersResult })
    }

    setTabelaViagem(novaTabela)

    // Busca volume 6h para cidades de destino × tiers
    const uniIds = tiers.map(r => r.id)
    const uniCities = Object.keys(CITY_DISPLAY)
    buscarVolume6h(uniIds, uniCities, servidor).then(vol => setVolumeData(vol))

    setLoading(false)
  }, [baseItem, cidadeOrigem, servidor, taxaRetorno, taxaMercado, custoLoja, quantidade, usarOrdemCompra])

  useEffect(() => { if (baseItem) calcular() }, [baseItem, cidadeOrigem, servidor, taxaRetorno, taxaMercado, custoLoja, quantidade, usarOrdemCompra])

  const calcularOportunidadesViagem = useCallback(async () => {
    if (!subcategoria || !baseItems.length) return
    setLoadingOport(true)

    const todasReceitas = []
    for (const base of baseItems) {
      for (let t = 2; t <= 8; t++) {
        const key = `T${t}_${base}`
        if (recipes[key]) todasReceitas.push({ ...recipes[key], baseId: base })
      }
    }
    if (!todasReceitas.length) { setLoadingOport(false); return }

    const allIds = new Set()
    for (const r of todasReceitas) {
      allIds.add(r.id)
      for (const ing of r.ingredients) allIds.add(ing.id)
    }

    const BATCH = 50
    const idsArray = [...allIds]
    let apiData = []
    for (let i = 0; i < idsArray.length; i += BATCH) {
      try {
        const data = await consultarPrecos(idsArray.slice(i, i + BATCH), servidor, '0,1')
        apiData = apiData.concat(data)
      } catch {}
    }

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

    const ret = taxaRetorno / 100
    const tax = taxaMercado / 100
    const qtd = Math.max(1, quantidade)
    const oriKey = cidadeOrigem.replace(/\s/g, '')
    const origemPrices = pricesByCity[oriKey] || {}

    const novas = []
    for (const r of todasReceitas) {
      let custo = 0
      let semPreco = false
      for (const ing of r.ingredients) {
        const preco = origemPrices[ing.id]?.sellMin || 0
        if (preco === 0) semPreco = true
        custo += ing.count * (1 - ret) * preco
      }
      custo += (r.silver || 0) + custoLoja
      if (semPreco) continue

      for (const [cityKey, cityPrices] of Object.entries(pricesByCity)) {
        const itemPreco = usarOrdemCompra
          ? (cityPrices[r.id]?.buyMax || 0)
          : (cityPrices[r.id]?.sellMin || 0)
        if (itemPreco === 0) continue
        const receitaBruta = itemPreco * r.amountCrafted
        const receitaLiquida = receitaBruta * (1 - tax)
        const lucro = receitaLiquida - custo
        const margem = (lucro / receitaBruta) * 100
        if (margem < 5) continue
        const nomeItem = (nameMap[`T4_${r.baseId}`] || nameMap[`T5_${r.baseId}`] || r.baseId)?.replace(/^T\d+\s/, '')
        novas.push({
          cidade: CITY_DISPLAY[cityKey] || cityKey,
          cityKey,
          tierId: r.id,
          tier: r.tier,
          nomeItem,
          margem,
          lucro: Math.round(lucro),
          lucroTotal: Math.round(lucro * qtd),
          precoVenda: itemPreco,
          custoIngredientes: Math.round(custo),
        })
      }
    }

    novas.sort((a, b) => b.margem - a.margem)
    setOportunidadesViagem(novas)

    const uniIds = [...new Set(novas.map(o => o.tierId))]
    const uniCities = [...new Set(novas.map(o => o.cityKey))]
    buscarVolume6h(uniIds, uniCities, servidor).then(vol => setVolumeDataOport(vol))

    setLoadingOport(false)
  }, [subcategoria, baseItems, cidadeOrigem, servidor, taxaRetorno, taxaMercado, custoLoja, quantidade, usarOrdemCompra, nameMap])

  useEffect(() => {
    if (subcategoria) calcularOportunidadesViagem()
  }, [subcategoria, cidadeOrigem, servidor, taxaRetorno, taxaMercado, custoLoja, quantidade, usarOrdemCompra])

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
            <div className="item-select-row">
              <select value={baseItem} onChange={e => setBaseItem(e.target.value)} disabled={!subcategoria}>
                <option value="">Selecionar...</option>
                {baseItems.map(b => {
                  const display = (nameMap[`T4_${b}`] || nameMap[`T5_${b}`] || b)?.replace(/^T\d+\s/, '')
                  return <option key={b} value={b}>{display || b}</option>
                })}
              </select>
              {baseItem && (
                <button
                  className="item-clear-btn"
                  onClick={() => setBaseItem('')}
                  title="Limpar item — voltar à visão da subcategoria"
                >✕</button>
              )}
            </div>
          </div>
          <div className="rent-field">
            <label>Cidade de Origem</label>
            <select value={cidadeOrigem} onChange={e => setCidadeOrigem(e.target.value)}>
              {CIDADES_API.map(c => <option key={c} value={c}>{CITY_DISPLAY[c] || c}</option>)}
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
            <label>
              Retorno (%)
              {cityCraftBonus > 0 && (
                <span className="city-bonus-tag" title={`+${cityCraftBonus}% de bônus de crafting desta cidade para este tipo de item`}>
                  +{cityCraftBonus}%
                </span>
              )}
            </label>
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
          {(baseItem || subcategoria) && (
            <button
              className="btn-refresh-rent"
              onClick={() => { if (baseItem) calcular(); else calcularOportunidadesViagem() }}
              disabled={loading || loadingOport}
            >
              {(loading || loadingOport) ? '...' : '↻'} Atualizar
            </button>
          )}
        </div>
      </div>

      {/* Conteúdo */}
      {!baseItem && !subcategoria ? (
        <div className="rent-empty">
          <p>Selecione uma categoria e subcategoria para ver as oportunidades de viagem.</p>
          <p className="hint">
            Escolha a <strong>Cidade de Origem</strong> onde você craftará o item.
            Selecionar um item específico exibe a tabela completa por cidade.
          </p>
        </div>
      ) : !baseItem ? (
        loadingOport ? (
          <div className="loading"><div className="spinner" /><p>Calculando oportunidades...</p></div>
        ) : (
          <MelhorOportunidade
            tabelaViagem={[]}
            quantidade={quantidade}
            volumeData={volumeDataOport}
            oportunidades={oportunidadesViagem}
            subLabel={subLabel(subcategoria)}
          />
        )
      ) : loading ? (
        <div className="loading"><div className="spinner" /><p>Buscando preços...</p></div>
      ) : tabelaViagem.length === 0 ? (
        <div className="empty-state"><p>Nenhum dado disponível.</p></div>
      ) : (
        <div className="viagem-section">
          <h3 className="rent-title">
            {itemDisplayName}
            <span className="viagem-origem-badge">
              Craftado em {CITY_DISPLAY[cidadeOrigem.replace(/\s/g, '')] || cidadeOrigem}
            </span>
          </h3>

          <div className="viagem-legend">
            <span className="viagem-leg comp-good">≥ 10%</span>
            <span className="viagem-leg comp-neutral">0–10%</span>
            <span className="viagem-leg comp-bad">Prejuízo</span>
            <span className="viagem-leg comp-nodata">Sem dados</span>
            {usarOrdemCompra && <span className="ordem-compra-tag">Ordem de Compra</span>}
          </div>

          <div className="comp-table-wrap">
            <table className="comp-table viagem-table">
              <thead>
                <tr>
                  <th>Cidade de Destino</th>
                  {tierRecipes.map(r => <th key={r.id}>T{r.tier}</th>)}
                </tr>
              </thead>
              <tbody>
                {tabelaViagem.map(({ cityKey, cidade, tiers }) => (
                  <tr key={cityKey}>
                    <td className="comp-city">{cidade}</td>
                    {tiers.map(t => (
                      <td key={t.tierId}
                        className={!t.temDado ? 'comp-nodata' : cellClass(t.margem)}
                        title={t.temDado
                          ? `Venda: ${formatSilver(t.precoVenda)} | Custo: ${formatSilver(t.custoIngredientes)} | Lucro total: ${formatSilver(t.lucroTotal)}`
                          : 'Sem preço de venda nesta cidade'}
                      >
                        {!t.temDado ? '—' : (
                          <>
                            {t.margem !== null ? t.margem.toFixed(1) + '%' : '—'}
                            {t.semPreco && <span className="missing-price-tag" title="Ingrediente sem preço">*</span>}
                            <div className="viagem-lucro">{formatSilver(t.lucro)}</div>
                          </>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Ingredientes por tier (custo na cidade de origem) */}
          <IngredientesViagem rows={ingredientRows} nameMap={nameMap} cidade={CITY_DISPLAY[cidadeOrigem.replace(/\s/g, '')] || cidadeOrigem} />

          {/* Melhor oportunidade — item específico */}
          <MelhorOportunidade tabelaViagem={tabelaViagem} quantidade={quantidade} volumeData={volumeData} />
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

function IngredientesViagem({ rows, nameMap, cidade }) {
  const [expanded, setExpanded] = useState(null)
  if (!rows.length) return null

  return (
    <div className="ingredientes-section">
      <h4>Ingredientes por Tier — comprados em {cidade}</h4>
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
              {row.semPreco && <span className="missing-price-tag" title="Ingrediente sem preço">*</span>}
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

function MelhorOportunidade({ tabelaViagem, quantidade, volumeData = {}, oportunidades: extOps, subLabel }) {
  let melhores
  const isSubcat = !!extOps

  if (isSubcat) {
    melhores = extOps
  } else {
    melhores = []
    for (const { cidade, cityKey, tiers } of (tabelaViagem || [])) {
      for (const t of tiers) {
        if (t.temDado && t.margem !== null && t.margem >= 5 && !t.semPreco) {
          melhores.push({ cidade, cityKey, ...t })
        }
      }
    }
    melhores.sort((a, b) => b.margem - a.margem)
  }

  if (!melhores.length) return (
    <div className="oport-empty" style={{ marginTop: '1rem' }}>
      {isSubcat
        ? `Nenhuma oportunidade de viagem com margem ≥ 5% para ${subLabel || 'esta subcategoria'}.`
        : 'Nenhuma oportunidade de viagem com margem ≥ 5% encontrada.'}
    </div>
  )

  return (
    <div className="oportunidades-section" style={{ marginTop: '1.5rem' }}>
      <div className="oport-header">
        <h4>Melhores Oportunidades de Viagem</h4>
        <span className="oport-sub">
          {isSubcat
            ? <>Todos os itens de <strong>{subLabel}</strong> com margem ≥ 5%</>
            : 'Combinações cidade destino × tier com margem ≥ 5%'}
        </span>
      </div>
      <div className="oport-table-wrap">
        <table className="oport-table">
          <thead>
            <tr>
              {isSubcat && <th>Item</th>}
              <th>Cidade Destino</th>
              <th>Tier</th>
              <th>Preço Venda</th>
              <th>Custo/Batch</th>
              <th>Lucro/Batch</th>
              <th>Margem</th>
              <th>Lucro Total ({quantidade}x)</th>
              <th title="Volume vendido no último período de 6h registrado">Vol. 6h</th>
            </tr>
          </thead>
          <tbody>
            {melhores.slice(0, 20).map((op, i) => (
              <tr key={`${op.cityKey}-${op.tierId}-${i}`} className={i === 0 ? 'oport-top' : ''}>
                {isSubcat && <td className="oport-nome">{op.nomeItem}</td>}
                <td className="oport-city">{op.cidade}</td>
                <td className="tier-cell">T{op.tier}.0</td>
                <td className="oport-preco">{formatSilver(op.precoVenda)}</td>
                <td>{formatSilver(op.custoIngredientes)}</td>
                <td className="profit-positive">{formatSilver(op.lucro)}</td>
                <td><span className="oport-margem">{op.margem.toFixed(1)}%</span></td>
                <td className="profit-positive">{formatSilver(op.lucroTotal)}</td>
                <td className="center">
                  {volumeData[`${op.tierId}__${op.cityKey}`] != null
                    ? volumeData[`${op.tierId}__${op.cityKey}`].toLocaleString('pt-BR')
                    : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
