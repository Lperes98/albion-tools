import { useState } from 'react'
import { formatarPrata } from '../../services/albionApi'

export function Bankroll({ bankroll, bankrollInicial, onDefinirBankroll, onAjustar }) {
  const [inputValue, setInputValue] = useState('')
  const [editando, setEditando] = useState(false)

  const variacao = bankroll - bankrollInicial
  const variacaoPercent = bankrollInicial > 0 ? ((variacao / bankrollInicial) * 100).toFixed(1) : 0

  const handleSubmit = (e) => {
    e.preventDefault()
    if (inputValue.trim()) {
      // Suporta notação simplificada: 70.9m = 70.900.000
      let valor = inputValue.toLowerCase().trim()
      if (valor.endsWith('m')) {
        valor = parseFloat(valor) * 1000000
      } else if (valor.endsWith('k')) {
        valor = parseFloat(valor) * 1000
      } else {
        valor = parseFloat(valor.replace(/\./g, '').replace(',', '.'))
      }

      onDefinirBankroll(valor)
      setInputValue('')
      setEditando(false)
    }
  }

  return (
    <div className="bankroll-card">
      <div className="bankroll-header">
        <h3>Carteira</h3>
        <button
          className="btn-icon"
          onClick={() => setEditando(!editando)}
          title={editando ? 'Cancelar' : 'Editar saldo'}
        >
          {editando ? '✕' : '✎'}
        </button>
      </div>

      <div className="bankroll-value">
        <span className="currency-symbol">$</span>
        <span className="value">{formatarPrata(bankroll).replace(' prata', '')}</span>
      </div>

      {bankrollInicial > 0 && (
        <div className={`bankroll-variacao ${variacao >= 0 ? 'positivo' : 'negativo'}`}>
          <span className="variacao-icon">{variacao >= 0 ? '↑' : '↓'}</span>
          <span>{formatarPrata(Math.abs(variacao)).replace(' prata', '')}</span>
          <span className="variacao-percent">({variacaoPercent}%)</span>
        </div>
      )}

      {editando && (
        <form onSubmit={handleSubmit} className="bankroll-form">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Ex: 70.9m ou 5000000"
            autoFocus
          />
          <button type="submit" className="btn-primary">Definir</button>
        </form>
      )}

      <p className="bankroll-hint">
        Use: 70.9m = 70.900.000 | 500k = 500.000
      </p>
    </div>
  )
}
