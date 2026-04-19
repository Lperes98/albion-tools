import { useState, useCallback } from 'react'
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

function useRecipeGroups() {
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
}

const RANK_LABELS = { 1: '🥇 1°', 2: '🥈 2°', 3: '🥉 3°' }

const COLUNAS = [
  { key: 'nomeItem',        label: 'Item' },
  { key: 'tier',            label: 'Tier' },
  { key: 'rank',            label: 'Rank' },
  { key: 'precoVenda',      label: 'Preço Venda' },
  { key: 'custoIng',        label: 'Custo/Batch' },
  { key: 'lucro',           label: 'Lucro/Batch' },
  { key: 'margem',          label: 'Margem' },
  { key: 'lucroTotal',      label: null },
  { key: 'volume',          label: 'Vol. 6h', title: 'Volume vendido no último período de 6h' },
  { key: 'maiorPreco',      label: 'Maior Preço', title: 'Preço unitário da cidade com maior valor de venda do item' },
]

export function RentabilidadeCidadeTab({ servidor, setServidor, itensDisponiveis }) {
  const groups = useRecipeGroups()

  const [cidade, setCidade]           = useState('Bridgewatch')
  const [categoria, setCategoria]     = useState('')
  const [subcategoria, setSubcategoria] = useState('')

  const [taxaRetorno, setTaxaRetorno]       = useState(15)
  const [taxaMercado, setTaxaMercado]       = useState(3)
  const [custoLoja, setCustoLoja]           = useState(0)
  const [quantidade, setQuantidade]         = useState(1)
  const [usarOrdemCompra, setUsarOrdemCompra] = useState(false)

  const [resultados, setResultados] = useState([])
  const [volumeData, setVolumeData] = useState({})
  const [loading, setLoading]       = useState(false)
  const [erro, setErro]             = useState('')

  const [sortKey, setSortKey] = useState('margem')
  const [sortDir, setSortDir] = useState('desc')

  const nameMap = {}
  for (const item of (itensDisponiveis || [])) {
    nameMap[item.UniqueName] = item.LocalizedNames?.['PT-BR'] || item.LocalizedNames?.['EN-US'] || item.UniqueName
  }

  const categorias    = Object.keys(groups).sort()
  const subcategorias = categoria ? Object.keys(groups[categoria] || {}).sort() : []
  const baseItems     = (categoria && subcategoria) ? (groups[categoria]?.[subcategoria] || []) : []

  function handleCategoria(v)    { setCategoria(v); setSubcategoria('') }
  function handleSubcategoria(v) { setSubcategoria(v) }

  const buscar = useCallback(async () => {
    if (!subcategoria || !baseItems.length) return
    setLoading(true)
    setErro('')
    setResultados([])

    // Todas as receitas da subcategoria
    const todasReceitas = []
    for (const base of baseItems) {
      for (let t = 2; t <= 8; t++) {
        const key = `T${t}_${base}`
        if (recipes[key]) todasReceitas.push({ ...recipes[key], baseId: base })
      }
    }
    if (!todasReceitas.length) { setLoading(false); return }

    // Todos os IDs
    const allIds = new Set()
    for (const r of todasReceitas) {
      allIds.add(r.id)
      for (const ing of r.ingredients) allIds.add(ing.id)
    }

    // Busca em batches
    const BATCH = 50
    const idsArr = [...allIds]
    let apiData = []
    for (let i = 0; i < idsArr.length; i += BATCH) {
      try {
        const d = await consultarPrecos(idsArr.slice(i, i + BATCH), servidor, '0,1')
        apiData = apiData.concat(d)
      } catch {}
    }

    // Mapa por cidade
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

    // Preço mínimo global por ingrediente (menor entre todas as cidades)
    const globalMin = {}
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
    const cidadeKey = cidade.replace(/\s/g, '')

    const novas = []

    for (const r of todasReceitas) {
      // Custo com ingredientes globais
      let custoIng = 0
      let semPreco = false
      for (const ing of r.ingredients) {
        const g = globalMin[ing.id]
        if (!g) { semPreco = true; break }
        custoIng += ing.count * (1 - ret) * g.price
      }
      if (semPreco) continue
      custoIng += (r.silver || 0) + custoLoja

      // Margem em cada cidade de venda
      const margensPorCidade = []
      for (const [ck, cp] of Object.entries(pricesByCity)) {
        const precoVenda = usarOrdemCompra ? cp[r.id]?.buyMax : cp[r.id]?.sellMin
        if (!precoVenda) continue
        const rb  = precoVenda * r.amountCrafted
        const rl  = rb * (1 - tax)
        const luc = rl - custoIng
        const mg  = rb > 0 ? (luc / rb) * 100 : 0
        margensPorCidade.push({ cityKey: ck, margem: mg, precoVenda, lucro: Math.round(luc) })
      }

      // Ordena por preço de venda para achar o maior
      const maiorPrecoEntry = [...margensPorCidade].sort((a, b) => b.precoVenda - a.precoVenda)[0]

      // Ordena por margem e pega rank da cidade selecionada
      margensPorCidade.sort((a, b) => b.margem - a.margem)
      const rankIdx = margensPorCidade.findIndex(c => c.cityKey === cidadeKey)
      if (rankIdx === -1 || rankIdx > 2) continue  // não está no top 3

      const entry = margensPorCidade[rankIdx]
      const nomeItem = (nameMap[`T4_${r.baseId}`] || nameMap[`T5_${r.baseId}`] || r.baseId)?.replace(/^T\d+\s/, '')

      novas.push({
        baseId: r.baseId,
        tierId: r.id,
        tier: r.tier,
        nomeItem,
        rank: rankIdx + 1,
        precoVenda: entry.precoVenda,
        custoIng: Math.round(custoIng),
        lucro: entry.lucro,
        lucroTotal: Math.round(entry.lucro * qtd),
        margem: entry.margem,
        volume: -1,
        maiorPreco: maiorPrecoEntry?.precoVenda || 0,
        maiorPrecoCidade: CITY_DISPLAY[maiorPrecoEntry?.cityKey] || maiorPrecoEntry?.cityKey || '—',
      })
    }

    novas.sort((a, b) => b.margem - a.margem)
    setResultados(novas)

    // Volume 6h
    const uniIds    = [...new Set(novas.map(o => o.tierId))]
    const uniCities = [cidadeKey]
    buscarVolume6h(uniIds, uniCities, servidor).then(vol => {
      setVolumeData(vol)
      setResultados(prev => prev.map(o => ({
        ...o,
        volume: vol[`${o.tierId}__${cidadeKey}`] ?? -1,
      })))
    })

    setLoading(false)
  }, [subcategoria, baseItems, cidade, servidor, taxaRetorno, taxaMercado, custoLoja, quantidade, usarOrdemCompra])

  // Ordenação
  function handleSort(key) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('desc') }
  }

  function sortIcon(key) {
    if (sortKey !== key) return <span className="sort-icon sort-idle">⇅</span>
    return <span className="sort-icon">{sortDir === 'asc' ? '↑' : '↓'}</span>
  }

  const linhasOrdenadas = [...resultados].sort((a, b) => {
    let av = a[sortKey], bv = b[sortKey]
    if (sortKey === 'nomeItem') { av = av || ''; bv = bv || '' }
    else { av = av ?? -Infinity; bv = bv ?? -Infinity }
    if (typeof av === 'string') return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av)
    return sortDir === 'asc' ? av - bv : bv - av
  })

  // Agrupamento por categoria/subcategoria para exibição
  const grupos = {}
  for (const row of linhasOrdenadas) {
    const r = recipes[row.tierId]
    const cat = r?.category || 'other'
    const sub = r?.subcategory || 'other'
    const grpKey = `${cat}||${sub}`
    if (!grupos[grpKey]) grupos[grpKey] = { cat, sub, rows: [] }
    grupos[grpKey].rows.push(row)
  }

  const temResultados = linhasOrdenadas.length > 0

  return (
    <div className="rentabilidade-tab">
      {/* Header */}
      <div className="rent-header">
        <div className="rent-selectors">
          <div className="rent-field">
            <label>Cidade</label>
            <select value={cidade} onChange={e => setCidade(e.target.value)}>
              {CIDADES_API.map(c => (
                <option key={c} value={c}>{CITY_DISPLAY[c] || c}</option>
              ))}
            </select>
          </div>
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
            <label>Retorno (%)</label>
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
          <button
            className="btn-refresh-rent"
            onClick={buscar}
            disabled={loading || !subcategoria}
            title={!subcategoria ? 'Selecione uma subcategoria' : 'Buscar oportunidades'}
          >
            {loading ? '...' : '↻'} Buscar
          </button>
        </div>
      </div>

      {/* Conteúdo */}
      {!subcategoria ? (
        <div className="rent-empty">
          <p>Selecione uma <strong>cidade</strong>, categoria e subcategoria e clique em <strong>Buscar</strong>.</p>
          <p className="hint">
            Serão exibidos apenas os itens onde <strong>{CITY_DISPLAY[cidade] || cidade}</strong> está
            entre as 3 cidades mais rentáveis para vender o item craftado.
          </p>
        </div>
      ) : loading ? (
        <div className="loading"><div className="spinner" /><p>Calculando melhores oportunidades em {CITY_DISPLAY[cidade] || cidade}...</p></div>
      ) : erro ? (
        <div className="empty-state"><p>{erro}</p></div>
      ) : !temResultados && resultados.length === 0 ? (
        <div className="rent-empty">
          <p>Clique em <strong>Buscar</strong> para ver os itens mais lucrativos em <strong>{CITY_DISPLAY[cidade] || cidade}</strong>.</p>
        </div>
      ) : !temResultados ? (
        <div className="empty-state">
          <p>{CITY_DISPLAY[cidade] || cidade} não está no top 3 de nenhum item desta subcategoria com os preços atuais.</p>
        </div>
      ) : (
        <>
          <div className="cidade-scanner-summary">
            <span className="cidade-scanner-city">{CITY_DISPLAY[cidade] || cidade}</span>
            <span className="cidade-scanner-count">
              {linhasOrdenadas.length} item{linhasOrdenadas.length !== 1 ? 's' : ''} no top 3
            </span>
            <span className="cidade-scanner-sub">— {subLabel(subcategoria)}</span>
          </div>

          {Object.values(grupos).map(({ cat, sub, rows }) => (
            <div key={`${cat}-${sub}`} className="cidade-scanner-group">
              <h4 className="cidade-scanner-group-title">
                {catLabel(cat)} — {subLabel(sub)}
                <span className="cidade-scanner-group-count">{rows.length} itens</span>
              </h4>

              <div className="oport-table-wrap">
                <table className="oport-table">
                  <thead>
                    <tr>
                      {COLUNAS.map(col => (
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
                    {rows.map((op, i) => (
                      <tr key={`${op.tierId}`} className={op.rank === 1 ? 'oport-top' : ''}>
                        <td className="oport-nome">{op.nomeItem}</td>
                        <td className="tier-cell">T{op.tier}.0</td>
                        <td className="center cidade-scanner-rank">
                          {RANK_LABELS[op.rank] || `${op.rank}°`}
                        </td>
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
                        <td className="oport-preco" title={`Maior preço: ${op.maiorPrecoCidade}`}>
                          {formatSilver(op.maiorPreco)}
                          <span style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                            {op.maiorPrecoCidade}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  )
}
