import { CIDADES, CIDADES_API, formatarPrata, formatarData, calcularLucro } from '../services/albionApi'

export function PriceTable({ item, dados, qualidade }) {
  if (!item || !dados || dados.length === 0) {
    return null
  }

  const analise = calcularLucro(dados, item.uniqueName)
  if (!analise) {
    return (
      <div className="price-table">
        <h3>T{item.tier} - {item.nome}</h3>
        <p className="no-data">Nenhum dado disponível para este item.</p>
      </div>
    )
  }

  const { precos, maisBarato, maisCaro, melhorLucro } = analise

  return (
    <div className="price-table">
      <div className="price-header">
        <h3>T{item.tier} - {item.nome}</h3>
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
            <th>Atualizado</th>
          </tr>
        </thead>
        <tbody>
          {CIDADES.map((cidade, index) => {
            const cidadeApi = CIDADES_API[index]
            const preco = precos.find(p => p.cidade === cidade)

            const isBarato = maisBarato?.cidade === cidade
            const isCaro = maisCaro?.cidade === cidade

            return (
              <tr key={cidade} className={`${isBarato ? 'cheapest' : ''} ${isCaro ? 'expensive' : ''}`}>
                <td className="city-name">
                  {cidade}
                  {isBarato && <span className="tag cheapest-tag">Mais barato</span>}
                  {isCaro && <span className="tag expensive-tag">Melhor venda</span>}
                </td>
                <td className={`price sell ${preco?.vendaMin > 0 ? '' : 'no-price'}`}>
                  {formatarPrata(preco?.vendaMin)}
                </td>
                <td className={`price buy ${preco?.compraMax > 0 ? '' : 'no-price'}`}>
                  {formatarPrata(preco?.compraMax)}
                </td>
                <td className="date">
                  {formatarData(preco?.dataVenda || preco?.dataCompra)}
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
