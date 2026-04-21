import { useState, useEffect, useMemo, useCallback } from 'react'
import { buscarItensPorNome, consultarPrecos, buscarVolume6h, CIDADES_API, QUALIDADES } from '../../services/albionApi'

function formatSilver(v) {
  if (!v || v === 0) return '—'
  if (v >= 1_000_000) return (v / 1_000_000).toFixed(2) + 'M'
  if (v >= 1_000) return (v / 1_000).toFixed(1) + 'k'
  return Math.round(v).toLocaleString('pt-BR')
}

const CITY_DISPLAY = {
  Caerleon: 'Caerleon', Bridgewatch: 'Bridgewatch', Lymhurst: 'Lymhurst',
  Thetford: 'Thetford', FortSterling: 'Fort Sterling', Martlock: 'Martlock',
  Brecilien: 'Brecilien', BlackMarket: 'Black Market',
}

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2)
}

// Extrai o nome base sem o prefixo de tier ("T4 Poção de Cura" → "Poção de Cura")
function nomeBase(nome) {
  return nome?.replace(/^T\d+\s+/, '') || nome
}

export function ComparativoTab({ itensDisponiveis, servidor, setServidor }) {
  const [qualidade, setQualidade]         = useState(1)
  const [termoBusca, setTermoBusca]       = useState('')
  const [resultadosBusca, setResultadosBusca] = useState([])
  const [itensSelecionados, setItensSelecionados] = useState([]) // [{ id, uniqueName, nome, tier }]
  const [precos, setPrecos]               = useState({}) // { uniqueName: { cityKey: { sellMin, buyMax } } }
  const [volumes, setVolumes]             = useState({}) // { `uniqueName__cityKey`: count }
  const [loading, setLoading]             = useState(false)

  // Busca enquanto digita
  useEffect(() => {
    if (!termoBusca.trim()) { setResultadosBusca([]); return }
    const seen = new Set()
    const res = buscarItensPorNome(itensDisponiveis, termoBusca)
      .filter(i => {
        if (i.uniqueName.includes('@')) return false
        const key = `${i.tier}_${i.nome}`
        if (seen.has(key)) return false
        seen.add(key)
        return true
      })
      .slice(0, 20)
    setResultadosBusca(res)
  }, [termoBusca, itensDisponiveis])

  function adicionarItem(item) {
    if (itensSelecionados.some(i => i.uniqueName === item.uniqueName)) return
    setItensSelecionados(prev => [...prev, { id: uid(), ...item }])
    setTermoBusca('')
    setResultadosBusca([])
  }

  function removerItem(id) {
    const item = itensSelecionados.find(i => i.id === id)
    setItensSelecionados(prev => prev.filter(i => i.id !== id))
    if (item) setPrecos(prev => { const n = { ...prev }; delete n[item.uniqueName]; return n })
  }

  const buscarPrecos = useCallback(async () => {
    if (!itensSelecionados.length) return
    setLoading(true)
    const ids = itensSelecionados.map(i => i.uniqueName)
    let apiData = []
    try { apiData = await consultarPrecos(ids, servidor, qualidade) } catch {}

    const mapa = {}
    for (const d of apiData) {
      if (!d.city || !d.item_id) continue
      const ck = d.city.replace(/\s/g, '')
      if (!mapa[d.item_id]) mapa[d.item_id] = {}
      if (!mapa[d.item_id][ck]) mapa[d.item_id][ck] = {}
      const e = mapa[d.item_id][ck]
      if (d.sell_price_min > 0) e.sellMin = e.sellMin ? Math.min(e.sellMin, d.sell_price_min) : d.sell_price_min
      if (d.buy_price_max > 0)  e.buyMax  = e.buyMax  ? Math.max(e.buyMax,  d.buy_price_max)  : d.buy_price_max
    }
    setPrecos(mapa)

    // Volume 6h para todos os itens × todas as cidades
    const volIds = itensSelecionados.map(i => i.uniqueName)
    buscarVolume6h(volIds, CIDADES_API, servidor).then(vol => setVolumes(vol))

    setLoading(false)
  }, [itensSelecionados, servidor, qualidade])

  useEffect(() => {
    if (itensSelecionados.length) buscarPrecos()
  }, [itensSelecionados, servidor, qualidade])

  // Agrupa itens por nome base, ordenados por tier
  const grupos = useMemo(() => {
    const g = {}
    for (const item of itensSelecionados) {
      const base = nomeBase(item.nome)
      if (!g[base]) g[base] = []
      g[base].push(item)
    }
    for (const base of Object.keys(g))
      g[base].sort((a, b) => a.tier - b.tier)
    return g
  }, [itensSelecionados])

  return (
    <div className="comparativo-tab">
      {/* Header */}
      <div className="rent-header">
        <div className="rent-selectors">
          <div className="rent-field">
            <label>Servidor</label>
            <select value={servidor} onChange={e => setServidor(e.target.value)}>
              <option value="west">Americas (West)</option>
              <option value="europe">Europe</option>
              <option value="east">Asia (East)</option>
            </select>
          </div>
          <div className="rent-field">
            <label>Qualidade</label>
            <select value={qualidade} onChange={e => setQualidade(parseInt(e.target.value))}>
              {Object.entries(QUALIDADES).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="rent-settings">
          {itensSelecionados.length > 0 && (
            <button className="btn-refresh-rent" onClick={buscarPrecos} disabled={loading}>
              {loading ? '...' : '↻'} Atualizar
            </button>
          )}
        </div>
      </div>

      {/* Barra de busca */}
      <div className="comp-search-bar">
        <div className="comp-search-wrap">
          <input
            className="comp-search-input"
            placeholder="Buscar item para adicionar..."
            value={termoBusca}
            onChange={e => setTermoBusca(e.target.value)}
            onKeyDown={e => e.key === 'Escape' && setTermoBusca('')}
          />
          {resultadosBusca.length > 0 && (
            <ul className="comp-search-results">
              {resultadosBusca.map(i => (
                <li
                  key={i.uniqueName}
                  onClick={() => adicionarItem(i)}
                  className={itensSelecionados.some(s => s.uniqueName === i.uniqueName) ? 'already-added' : ''}
                >
                  <span className="tier-badge-sm">T{i.tier}</span>
                  {i.nome}
                  {itensSelecionados.some(s => s.uniqueName === i.uniqueName) && (
                    <span className="comp-added-tag">já adicionado</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
        {itensSelecionados.length > 0 && (
          <div className="comp-chips">
            {itensSelecionados.map(i => (
              <span key={i.id} className="comp-chip">
                <span className="tier-badge-sm">T{i.tier}</span>
                {nomeBase(i.nome)}
                <button onClick={() => removerItem(i.id)}>✕</button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Conteúdo */}
      {itensSelecionados.length === 0 ? (
        <div className="rent-empty">
          <p>Busque e adicione itens para ver o preço de venda em cada cidade.</p>
          <p className="hint">Você pode adicionar vários itens e tiers ao mesmo tempo.</p>
        </div>
      ) : loading && Object.keys(precos).length === 0 ? (
        <div className="loading"><div className="spinner" /><p>Buscando preços...</p></div>
      ) : (
        <div className="comp-cards-row" style={{ marginTop: '1.5rem' }}>
          {Object.entries(grupos).map(([nomeGrupo, itens]) =>
            itens.map(item => (
              <ItemCard
                key={item.id}
                item={item}
                nomeGrupo={nomeGrupo}
                itemPrecos={precos[item.uniqueName] || {}}
                volumes={volumes}
                onRemover={() => removerItem(item.id)}
              />
            ))
          )}
        </div>
      )}
    </div>
  )
}

function ItemCard({ item, nomeGrupo, itemPrecos, volumes, onRemover }) {
  // Acha melhor sell e melhor buy entre todas as cidades
  let bestSellCity = null, bestSell = 0
  let bestBuyCity  = null, bestBuy  = 0
  for (const [ck, d] of Object.entries(itemPrecos)) {
    if (d.sellMin && d.sellMin > bestSell) { bestSell = d.sellMin; bestSellCity = ck }
    if (d.buyMax  && d.buyMax  > bestBuy)  { bestBuy  = d.buyMax;  bestBuyCity  = ck }
  }

  const hasData = Object.keys(itemPrecos).length > 0

  return (
    <div className="comp-card">
      <div className="comp-card-header">
        <span className="tier-badge">T{item.tier}</span>
        <span className="comp-card-nome" title={nomeGrupo}>{nomeGrupo}</span>
        <button className="comp-card-remove" onClick={onRemover} title="Remover">✕</button>
      </div>

      {!hasData ? (
        <div className="comp-card-empty">Sem dados</div>
      ) : (
        <table className="comp-card-table">
          <thead>
            <tr>
              <th>Cidade</th>
              <th>Venda</th>
              <th>Compra</th>
              <th title="Volume vendido nas últimas 6h">6h</th>
            </tr>
          </thead>
          <tbody>
            {CIDADES_API.map(ck => {
              const d          = itemPrecos[ck] || {}
              const isBestSell = ck === bestSellCity
              const isBestBuy  = ck === bestBuyCity
              const volKey     = `${item.uniqueName}__${ck}`
              const vol        = volumes?.[volKey]

              return (
                <tr key={ck} className={isBestSell ? 'comp-card-best-sell' : isBestBuy ? 'comp-card-best-buy' : ''}>
                  <td className="comp-card-city">
                    {CITY_DISPLAY[ck] || ck}
                    {isBestSell && <span className="comp-star" title="Melhor venda">★</span>}
                  </td>
                  <td className={`comp-card-price ${!d.sellMin ? 'comp-nodata' : isBestSell ? 'font-bold' : ''}`}>
                    {formatSilver(d.sellMin)}
                  </td>
                  <td className={`comp-card-price ${!d.buyMax ? 'comp-nodata' : isBestBuy ? 'font-bold' : ''}`}>
                    {formatSilver(d.buyMax)}
                  </td>
                  <td className="comp-card-price comp-nodata" style={{ fontSize: '0.78rem' }}>
                    {vol != null ? vol.toLocaleString('pt-BR') : '—'}
                  </td>
                </tr>
              )
            })}
          </tbody>
          {(bestSell > 0 || bestBuy > 0) && (
            <tfoot>
              <tr>
                <td colSpan={3} className="comp-card-footer">
                  {bestSell > 0 && (
                    <span>Melhor venda: <strong>{formatSilver(bestSell)}</strong> em {CITY_DISPLAY[bestSellCity] || bestSellCity}</span>
                  )}
                  {bestBuy > 0 && (
                    <span style={{ marginLeft: '0.75rem' }}>Melhor compra: <strong>{formatSilver(bestBuy)}</strong> em {CITY_DISPLAY[bestBuyCity] || bestBuyCity}</span>
                  )}
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      )}
    </div>
  )
}
