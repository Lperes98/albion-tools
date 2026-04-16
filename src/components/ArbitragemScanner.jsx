import { useState } from 'react'
import { CATEGORIAS, CIDADES, CIDADES_API, TAXA_PREMIUM, categoriaDoItem, consultarPrecosLote, calcularLucro, formatarPrata } from '../services/albionApi'

const CIDADES_PROXIMAS = {
  'Martlock':      ['Thetford', 'Bridgewatch'],
  'Bridgewatch':   ['Martlock', 'Lymhurst'],
  'Lymhurst':      ['Bridgewatch', 'Fort Sterling'],
  'Fort Sterling': ['Lymhurst', 'Thetford'],
  'Thetford':      ['Fort Sterling', 'Martlock'],
}

function saoProximas(cidadeA, cidadeB) {
  return CIDADES_PROXIMAS[cidadeA]?.includes(cidadeB) ?? false
}

export function ArbitragemScanner({ todosItens, servidor, setServidor, qualidade }) {
  const [categoria, setCategoria] = useState('equipamentos')
  const [tiers, setTiers] = useState([4, 5, 6, 7, 8])
  const [minPorcentagem, setMinPorcentagem] = useState(10)
  const [minLucroEquip, setMinLucroEquip] = useState(150000)
  const [cidadesAtivas, setCidadesAtivas] = useState(new Set(CIDADES_API))
  const [apenasProximas, setApenasProximas] = useState(false)
  const [calcInputs, setCalcInputs] = useState({})
  const [scanning, setScanning] = useState(false)
  const [progresso, setProgresso] = useState({ atual: 0, total: 0 })
  const [resultados, setResultados] = useState([])
  const [jaEscaneou, setJaEscaneou] = useState(false)

  const toggleTier = (tier) => {
    setTiers(prev =>
      prev.includes(tier) ? prev.filter(t => t !== tier) : [...prev, tier].sort()
    )
  }

  const toggleCidade = (cidadeApi) => {
    setCidadesAtivas(prev => {
      const next = new Set(prev)
      next.has(cidadeApi) ? next.delete(cidadeApi) : next.add(cidadeApi)
      return next
    })
  }

  const itensFiltrados = () => {
    return todosItens.filter(item => {
      const uid = item.UniqueName || ''
      const partes = uid.split('_')
      if (!partes[0]?.startsWith('T') || !partes[0].slice(1).match(/^\d+$/)) return false
      const tier = parseInt(partes[0].slice(1))
      if (tiers.length > 0 && !tiers.includes(tier)) return false
      return categoriaDoItem(uid) === categoria
    })
  }

  const handleScan = async () => {
    const itens = itensFiltrados()
    if (itens.length === 0 || cidadesAtivas.size === 0) return

    setScanning(true)
    setResultados([])
    setJaEscaneou(false)
    setProgresso({ atual: 0, total: itens.length })

    const ids = itens.map(i => i.UniqueName)
    const excluirCidades = CIDADES_API.filter(c => !cidadesAtivas.has(c))

    try {
      const dados = await consultarPrecosLote(ids, servidor, qualidade, (atual, total) => {
        setProgresso({ atual, total })
      }, excluirCidades)

      const catAtual = CATEGORIAS.find(c => c.id === categoria)
      const oportunidades = []
      for (const item of itens) {
        const analise = calcularLucro(dados, item.UniqueName)
        if (!analise?.melhorLucro) continue
        if (catAtual?.minLucroFixo != null) {
          if (analise.melhorLucro.lucro < minLucroEquip) continue
        } else {
          if (parseFloat(analise.melhorLucro.porcentagem) < minPorcentagem) continue
        }

        const nomes = item.LocalizedNames || {}
        const tier = parseInt(item.UniqueName.split('_')[0].slice(1))
        oportunidades.push({
          nome: nomes['PT-BR'] || nomes['EN-US'] || item.UniqueName,
          uniqueName: item.UniqueName,
          tier,
          ...analise.melhorLucro
        })
      }

      const resultado = oportunidades
        .map(o => ({ ...o, proximas: saoProximas(o.comprarEm, o.venderEm) }))
        .filter(o => !apenasProximas || o.proximas)
        .sort((a, b) => b.lucro - a.lucro)
      setResultados(resultado)
    } catch (error) {
      console.error('Erro ao escanear:', error)
    }

    setJaEscaneou(true)
    setScanning(false)
  }

  const getCalc = (r) => {
    const c = calcInputs[r.uniqueName] ?? {}
    return {
      compra: c.compra ?? r.precoCompra,
      venda:  c.venda  ?? r.precoVendaBruto,
      qty:    c.qty    ?? 1,
    }
  }

  const lucroCalc = (r) => {
    const { compra, venda, qty } = getCalc(r)
    return (Math.floor(venda * (1 - TAXA_PREMIUM)) - compra) * qty
  }

  const setCalc = (r, field, value) => {
    setCalcInputs(prev => ({
      ...prev,
      [r.uniqueName]: { ...getCalc(r), [field]: Number(value) }
    }))
  }

  const totalItens = itensFiltrados().length

  return (
    <div className="arbitragem-scanner">
      <div className="scanner-filters">
        <div className="scanner-filter-row">
          <span className="tier-label">Categoria:</span>
          {CATEGORIAS.map(cat => (
            <button
              key={cat.id}
              type="button"
              className={`category-button ${categoria === cat.id ? 'active' : ''}`}
              onClick={() => setCategoria(cat.id)}
              disabled={scanning}
            >
              {cat.label}
            </button>
          ))}
        </div>

        <div className="scanner-filter-row">
          <span className="tier-label">Tiers:</span>
          {[1, 2, 3, 4, 5, 6, 7, 8].map(tier => (
            <button
              key={tier}
              type="button"
              className={`tier-button ${tiers.includes(tier) ? 'active' : ''}`}
              onClick={() => toggleTier(tier)}
              disabled={scanning}
            >
              T{tier}
            </button>
          ))}
        </div>

        <div className="scanner-filter-row">
          <span className="tier-label">Cidades:</span>
          {CIDADES.map((cidade, i) => (
            <button
              key={cidade}
              type="button"
              className={`city-toggle-button ${cidadesAtivas.has(CIDADES_API[i]) ? 'active' : ''}`}
              onClick={() => toggleCidade(CIDADES_API[i])}
              disabled={scanning}
            >
              {cidade}
            </button>
          ))}
        </div>

        <div className="scanner-filter-row">
          {CATEGORIAS.find(c => c.id === categoria)?.minLucroFixo != null ? (
            <>
              <span className="tier-label">Lucro mínimo:</span>
              <input
                type="number"
                className="calc-input"
                style={{ width: '130px' }}
                value={minLucroEquip}
                min={0}
                step={10000}
                onChange={e => setMinLucroEquip(Number(e.target.value))}
                disabled={scanning}
              />
              <span className="taxa-info">prata</span>
            </>
          ) : (
            <>
              <span className="tier-label">Lucro mínimo:</span>
              <select
                value={minPorcentagem}
                onChange={e => setMinPorcentagem(Number(e.target.value))}
                className="scanner-select"
                disabled={scanning}
              >
                <option value={0}>Qualquer</option>
                <option value={5}>5%</option>
                <option value={10}>10%</option>
                <option value={20}>20%</option>
                <option value={50}>50%</option>
                <option value={100}>100%+</option>
              </select>
            </>
          )}

          <label className="toggle-label">
            <input
              type="checkbox"
              checked={apenasProximas}
              onChange={e => setApenasProximas(e.target.checked)}
              disabled={scanning}
            />
            Apenas cidades próximas
          </label>

          <span className="tier-label">Servidor:</span>
          <select
            value={servidor}
            onChange={e => setServidor(e.target.value)}
            className="scanner-select"
            disabled={scanning}
          >
            <option value="west">Americas (West)</option>
            <option value="europe">Europe</option>
            <option value="east">Asia (East)</option>
          </select>

          <button
            className="scan-button"
            onClick={handleScan}
            disabled={scanning || tiers.length === 0 || cidadesAtivas.size === 0}
          >
            {scanning ? 'Escaneando...' : `Escanear (${totalItens} itens)`}
          </button>
        </div>
      </div>

      {scanning && (
        <div className="scan-progress">
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{ width: `${progresso.total ? (progresso.atual / progresso.total) * 100 : 0}%` }}
            />
          </div>
          <span className="progress-text">
            {progresso.atual} / {progresso.total} itens consultados
          </span>
        </div>
      )}

      {!scanning && jaEscaneou && resultados.length === 0 && (
        <p className="no-data">Nenhuma oportunidade encontrada com os filtros selecionados.</p>
      )}

      {!scanning && resultados.length > 0 && (
        <div className="scanner-results">
          <h3>{resultados.length} oportunidade{resultados.length !== 1 ? 's' : ''} encontrada{resultados.length !== 1 ? 's' : ''}</h3>
          <div className="arbitragem-table-wrapper">
            <table className="arbitragem-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Item</th>
                  <th>Comprar em</th>
                  <th>Preço de compra</th>
                  <th>Vender em</th>
                  <th>Preço de venda (bruto)</th>
                  <th>Preço de venda (líquido −{TAXA_PREMIUM * 100}%)</th>
                  <th>Lucro líquido</th>
                  <th>%</th>
                  <th>Próximo</th>
                  <th title="Preço máximo de compra para lucro de 5%">Compra máx. (5%)</th>
                  <th>Compra</th>
                  <th>Venda</th>
                  <th>Qtd.</th>
                  <th>Lucro esperado</th>
                </tr>
              </thead>
              <tbody>
                {resultados.map((r, i) => (
                  <tr key={r.uniqueName}>
                    <td className="rank">{i + 1}</td>
                    <td className="item-col">
                      <span className={`item-tier tier-${r.tier}`}>T{r.tier}</span>
                      {' '}{r.nome}
                    </td>
                    <td>{r.comprarEm}</td>
                    <td className="price sell">{formatarPrata(r.precoCompra)}</td>
                    <td>{r.venderEm}</td>
                    <td className="price buy">{formatarPrata(r.precoVendaBruto)}</td>
                    <td className="price buy">{formatarPrata(r.precoVenda)}</td>
                    <td className="price sell">{formatarPrata(r.lucro)}</td>
                    <td className="profit-pct">{r.porcentagem}%</td>
                    <td className={r.proximas ? 'proximo-sim' : 'proximo-nao'}>
                      {r.proximas ? 'Sim' : 'Não'}
                    </td>
                    <td className="price sell">
                      {formatarPrata(Math.floor(r.precoVendaBruto * (1 - TAXA_PREMIUM) / 1.05))}
                    </td>
                    <td>
                      <input
                        type="number"
                        className="calc-input"
                        value={getCalc(r).compra}
                        onChange={e => setCalc(r, 'compra', e.target.value)}
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        className="calc-input"
                        value={getCalc(r).venda}
                        onChange={e => setCalc(r, 'venda', e.target.value)}
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        className="calc-input calc-input--qty"
                        value={getCalc(r).qty}
                        min={1}
                        onChange={e => setCalc(r, 'qty', e.target.value)}
                      />
                    </td>
                    <td className={lucroCalc(r) >= 0 ? 'price sell' : 'price no-price'}>
                      {formatarPrata(lucroCalc(r))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
