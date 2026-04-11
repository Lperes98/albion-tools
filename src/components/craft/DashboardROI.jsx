import { useState } from 'react'
import { formatarPrata } from '../../services/albionApi'

export function DashboardROI({ calculos, taxaCraft, onSetTaxaCraft, onReset }) {
  const [editandoTaxa, setEditandoTaxa] = useState(false)
  const [taxaInput, setTaxaInput] = useState('')
  const [confirmandoReset, setConfirmandoReset] = useState(false)

  const {
    gastoMateriais,
    gastoCraftTotal,
    gastoTotal,
    investimentoTotal,
    receitaReal,
    receitaProjetada,
    lucroRealizado,
    lucroProjetado,
    melhorCidadeGeral,
    totalCompras,
    totalCrafts,
    totalVendidos,
    totalNaoVendidos,
    quantidadeItensProdzidos,
    quantidadeVendidos,
    quantidadeNaoVendidos
  } = calculos

  const handleTaxaSubmit = (e) => {
    e.preventDefault()
    let valor = taxaInput.toLowerCase().trim()
    if (valor.endsWith('m')) {
      valor = parseFloat(valor) * 1000000
    } else if (valor.endsWith('k')) {
      valor = parseFloat(valor) * 1000
    } else {
      valor = parseFloat(valor.replace(/\./g, '').replace(',', '.')) || 0
    }
    onSetTaxaCraft(valor)
    setEditandoTaxa(false)
    setTaxaInput('')
  }

  const handleReset = () => {
    if (confirmandoReset) {
      onReset()
      setConfirmandoReset(false)
    } else {
      setConfirmandoReset(true)
      setTimeout(() => setConfirmandoReset(false), 3000)
    }
  }

  const temVendidos = totalVendidos > 0
  const temNaoVendidos = totalNaoVendidos > 0
  const isLucrativo = lucroRealizado > 0

  return (
    <div className="dashboard-roi">
      <div className="dashboard-header">
        <h3>Dashboard de Operação</h3>
        <button
          className={`btn-reset ${confirmandoReset ? 'confirming' : ''}`}
          onClick={handleReset}
        >
          {confirmandoReset ? 'Confirmar Reset?' : 'Nova Operação'}
        </button>
      </div>

      {/* Cards de métricas */}
      <div className="metrics-grid">
        {/* Gasto com Materiais */}
        <div className="metric-card despesa">
          <div className="metric-icon">📦</div>
          <div className="metric-content">
            <span className="metric-label">Gasto com Materiais</span>
            <span className="metric-value">{formatarPrata(gastoMateriais)}</span>
            <span className="metric-detail">{totalCompras} compras registradas</span>
          </div>
        </div>

        {/* Custo de Craft (soma das taxas individuais) */}
        <div className="metric-card despesa">
          <div className="metric-icon">🔨</div>
          <div className="metric-content">
            <span className="metric-label">Custo de Craft</span>
            <span className="metric-value">{formatarPrata(gastoCraftTotal || 0)}</span>
            <span className="metric-detail">{totalCrafts} crafts registrados</span>
          </div>
        </div>

        {/* Taxa Extra (opcional) */}
        <div className="metric-card despesa">
          <div className="metric-icon">📝</div>
          <div className="metric-content">
            <span className="metric-label">Taxa Extra</span>
            {editandoTaxa ? (
              <form onSubmit={handleTaxaSubmit} className="taxa-form">
                <input
                  type="text"
                  value={taxaInput}
                  onChange={(e) => setTaxaInput(e.target.value)}
                  placeholder="0"
                  autoFocus
                />
                <button type="submit">OK</button>
              </form>
            ) : (
              <>
                <span className="metric-value">{formatarPrata(taxaCraft)}</span>
                <button className="btn-edit-taxa" onClick={() => setEditandoTaxa(true)}>
                  Adicionar taxa
                </button>
              </>
            )}
          </div>
        </div>

        {/* Investimento Total (itens não vendidos) */}
        <div className="metric-card investimento">
          <div className="metric-icon">💼</div>
          <div className="metric-content">
            <span className="metric-label">Investimento em Estoque</span>
            <span className="metric-value">{formatarPrata(investimentoTotal)}</span>
            <span className="metric-detail">{quantidadeNaoVendidos.toLocaleString('pt-BR')} itens aguardando venda</span>
          </div>
        </div>

        {/* Receita Projetada (itens não vendidos) */}
        {temNaoVendidos && (
          <div className="metric-card receita projetada">
            <div className="metric-icon">📈</div>
            <div className="metric-content">
              <span className="metric-label">Receita Projetada</span>
              <span className="metric-value">{formatarPrata(receitaProjetada)}</span>
              <span className="metric-detail">{totalNaoVendidos} itens para vender</span>
            </div>
          </div>
        )}

        {/* Receita Realizada (itens vendidos) */}
        {temVendidos && (
          <div className="metric-card receita realizada">
            <div className="metric-icon">💰</div>
            <div className="metric-content">
              <span className="metric-label">Receita Realizada</span>
              <span className="metric-value positivo">{formatarPrata(receitaReal)}</span>
              <span className="metric-detail">{quantidadeVendidos.toLocaleString('pt-BR')} itens vendidos</span>
            </div>
          </div>
        )}
      </div>

      {/* Card de Investimento (itens não vendidos) */}
      {temNaoVendidos && (
        <div className="investimento-card">
          <div className="investimento-header">
            <span className="investimento-icon">📊</span>
            <span className="investimento-titulo">Investimento em Andamento</span>
          </div>

          <div className="investimento-content">
            <div className="investimento-info">
              <span className="info-label">Total Investido:</span>
              <span className="info-valor">{formatarPrata(investimentoTotal)}</span>
            </div>
            <div className="investimento-info">
              <span className="info-label">Retorno Esperado:</span>
              <span className="info-valor positivo">{formatarPrata(receitaProjetada)}</span>
            </div>
            <div className="investimento-info">
              <span className="info-label">Lucro Projetado:</span>
              <span className={`info-valor ${lucroProjetado >= 0 ? 'positivo' : 'negativo'}`}>
                {lucroProjetado >= 0 ? '+' : ''}{formatarPrata(lucroProjetado)}
              </span>
            </div>
          </div>

          {melhorCidadeGeral !== 'N/A' && (
            <div className="investimento-detalhe">
              Melhor cidade para vender: <strong>{melhorCidadeGeral}</strong>
            </div>
          )}
        </div>
      )}

      {/* Card de Lucro Realizado (itens vendidos) */}
      {temVendidos && (
        <div className={`lucro-card ${isLucrativo ? 'lucrativo' : 'prejuizo'}`}>
          <div className="lucro-header">
            <span className="lucro-icon">{isLucrativo ? '🎉' : '⚠️'}</span>
            <span className="lucro-titulo">
              {isLucrativo ? 'Lucro Realizado' : 'Prejuízo Realizado'}
            </span>
          </div>

          <div className="lucro-valor">
            {isLucrativo ? '+' : '-'}{formatarPrata(Math.abs(lucroRealizado))}
          </div>

          <div className="lucro-detail">
            {totalVendidos} craft(s) vendido(s) - {quantidadeVendidos.toLocaleString('pt-BR')} itens
          </div>
        </div>
      )}

      {/* Resumo quando não tem nada ainda */}
      {!temVendidos && !temNaoVendidos && (
        <div className="empty-dashboard">
          <p>Adicione compras e crafts para ver o dashboard de operação.</p>
        </div>
      )}
    </div>
  )
}
