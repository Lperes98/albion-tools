import { useState, useEffect } from 'react'
import { CIDADES, CIDADES_API, formatarPrata, formatarData, calcularLucro, buscarVolume6h } from '../services/albionApi'
import { getWsPrice } from '../services/websocketClient'

export function PriceTable({ item, dados, qualidade, servidor = 'west', wsDataVersion = 0 }) {
  const [volume6h, setVolume6h] = useState({})

  useEffect(() => {
    if (!item) return
    setVolume6h({})
    buscarVolume6h([item.uniqueName], CIDADES_API, servidor)
      .then(vol => setVolume6h(vol))
  }, [item?.uniqueName, servidor])

  if (!item || !dados || dados.length === 0) return null

  // Mescla preços da API com overlay do WebSocket
  const dadosMesclados = CIDADES.map((cidade, index) => {
    const cidadeApi = CIDADES_API[index]
    const apiEntry  = dados.find(d => d.city?.replace(/\s/g, '') === cidadeApi || d.city === cidade)
    const ws        = getWsPrice(item.uniqueName, cidade)

    const vendaMin  = ws?.sellMin || apiEntry?.sell_price_min || 0
    const compraMax = ws?.buyMax  || apiEntry?.buy_price_max  || 0
    const isLive    = !!(ws?.sellMin || ws?.buyMax)

    return {
      cidade,
      cidadeApi,
      vendaMin,
      compraMax,
      dataVenda:  apiEntry?.sell_price_min_date,
      dataCompra: apiEntry?.buy_price_max_date,
      isLive,
    }
  })

  // Recalcula arbitragem com dados mesclados
  const comVenda  = dadosMesclados.filter(p => p.vendaMin > 0)
  const comCompra = dadosMesclados.filter(p => p.compraMax > 0)
  const maisBarato = comVenda.length  ? comVenda.reduce((a, b)  => a.vendaMin  < b.vendaMin  ? a : b) : null
  const maisCaro   = comCompra.length ? comCompra.reduce((a, b) => a.compraMax > b.compraMax ? a : b) : null

  const melhorLucro = (maisBarato && maisCaro && maisCaro.compraMax > maisBarato.vendaMin)
    ? {
        comprarEm:   maisBarato.cidade,
        precoCompra: maisBarato.vendaMin,
        venderEm:    maisCaro.cidade,
        precoVenda:  maisCaro.compraMax,
        lucro:       maisCaro.compraMax - maisBarato.vendaMin,
        porcentagem: (((maisCaro.compraMax - maisBarato.vendaMin) / maisBarato.vendaMin) * 100).toFixed(1),
      }
    : null

  const anyLive = dadosMesclados.some(d => d.isLive)

  return (
    <div className="price-table">
      <div className="price-header">
        <h3>
          T{item.tier} - {item.nome}
          {anyLive && <span className="live-badge">LIVE</span>}
        </h3>
        <span className="item-quality">Qualidade: {qualidade}</span>
      </div>

      {melhorLucro && (
        <div className="profit-alert">
          <div className="profit-title">Oportunidade de Arbitragem!</div>
          <div className="profit-details">
            <span className="buy-info">
              Comprar em <strong>{melhorLucro.comprarEm}</strong> por <strong>{formatarPrata(melhorLucro.precoCompra)}</strong>
            </span>
            <span className="arrow">→</span>
            <span className="sell-info">
              Vender em <strong>{melhorLucro.venderEm}</strong> por <strong>{formatarPrata(melhorLucro.precoVenda)}</strong>
            </span>
          </div>
          <div className="profit-value">
            Lucro: <strong>{formatarPrata(melhorLucro.lucro)}</strong> ({melhorLucro.porcentagem}%)
          </div>
        </div>
      )}

      <table>
        <thead>
          <tr>
            <th>Cidade</th>
            <th>Venda (mín)</th>
            <th>Compra (máx)</th>
            <th title="Volume vendido nas últimas 6 horas">Vol. 6h</th>
            <th>Atualizado</th>
          </tr>
        </thead>
        <tbody>
          {dadosMesclados.map(({ cidade, cidadeApi, vendaMin, compraMax, dataVenda, dataCompra, isLive }) => {
            const volKey   = `${item.uniqueName}__${cidadeApi}`
            const vol      = volume6h[volKey]
            const isBarato = maisBarato?.cidade === cidade
            const isCaro   = maisCaro?.cidade   === cidade

            return (
              <tr key={cidade} className={`${isBarato ? 'cheapest' : ''} ${isCaro ? 'expensive' : ''}`}>
                <td className="city-name">
                  {cidade}
                  {isLive && <span className="tag live-tag" title="Preço em tempo real via WebSocket">Live</span>}
                  {isBarato && <span className="tag cheapest-tag">Mais barato</span>}
                  {isCaro   && <span className="tag expensive-tag">Melhor venda</span>}
                </td>
                <td className={`price sell ${vendaMin > 0 ? '' : 'no-price'}`}>
                  {formatarPrata(vendaMin)}
                </td>
                <td className={`price buy ${compraMax > 0 ? '' : 'no-price'}`}>
                  {formatarPrata(compraMax)}
                </td>
                <td className="vol-6h">
                  {vol != null ? vol.toLocaleString('pt-BR') : '—'}
                </td>
                <td className="date">
                  {isLive ? <span style={{ color: 'var(--accent)', fontWeight: 600 }}>agora</span>
                           : formatarData(dataVenda || dataCompra)}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>

      <div className="price-legend">
        <span className="legend-item"><span className="dot sell"></span> Venda = ordens de venda (onde você compra)</span>
        <span className="legend-item"><span className="dot buy"></span> Compra = ordens de compra (onde você vende)</span>
      </div>
    </div>
  )
}
