import { useState } from 'react'
import { formatarPrata, CIDADES } from '../../services/albionApi'

export function ComprasTable({ compras, onAdicionar, onRemover, onEditar, itensDisponiveis }) {
  const [novaCompra, setNovaCompra] = useState({
    itemNome: '',
    itemId: '',
    quantidade: '',
    valorUnitario: '',
    cidade: 'Caerleon'
  })
  const [buscaItem, setBuscaItem] = useState('')
  const [sugestoes, setSugestoes] = useState([])
  const [mostrarSugestoes, setMostrarSugestoes] = useState(false)

  // Busca itens para autocomplete
  const handleBuscaItem = (termo) => {
    setBuscaItem(termo)
    setNovaCompra(prev => ({ ...prev, itemNome: termo, itemId: '' }))

    if (termo.length >= 2 && itensDisponiveis) {
      const resultados = itensDisponiveis
        .filter(item => {
          const nomes = item.LocalizedNames || {}
          const nome = (nomes['PT-BR'] || nomes['EN-US'] || item.UniqueName || '').toLowerCase()
          return nome.includes(termo.toLowerCase())
        })
        .slice(0, 8)
        .map(item => ({
          id: item.UniqueName,
          nome: item.LocalizedNames?.['PT-BR'] || item.LocalizedNames?.['EN-US'] || item.UniqueName
        }))

      setSugestoes(resultados)
      setMostrarSugestoes(resultados.length > 0)
    } else {
      setSugestoes([])
      setMostrarSugestoes(false)
    }
  }

  const selecionarItem = (item) => {
    setNovaCompra(prev => ({
      ...prev,
      itemNome: item.nome,
      itemId: item.id
    }))
    setBuscaItem(item.nome)
    setMostrarSugestoes(false)
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!novaCompra.itemNome || !novaCompra.quantidade || !novaCompra.valorUnitario) return

    // Converte valores (suporta k e m)
    let valor = novaCompra.valorUnitario.toString().toLowerCase().trim()
    if (valor.endsWith('m')) {
      valor = parseFloat(valor) * 1000000
    } else if (valor.endsWith('k')) {
      valor = parseFloat(valor) * 1000
    } else {
      valor = parseFloat(valor.replace(/\./g, '').replace(',', '.'))
    }

    onAdicionar({
      ...novaCompra,
      valorUnitario: valor
    })

    // Reset form
    setNovaCompra({
      itemNome: '',
      itemId: '',
      quantidade: '',
      valorUnitario: '',
      cidade: 'Caerleon'
    })
    setBuscaItem('')
  }

  const totalGasto = compras.reduce((t, c) => t + (c.quantidade * c.valorUnitario), 0)

  return (
    <div className="compras-section">
      <div className="section-header">
        <h3>Registro de Compras</h3>
        <span className="total-badge">
          Total: {formatarPrata(totalGasto)}
        </span>
      </div>

      {/* Formulário de nova compra */}
      <form onSubmit={handleSubmit} className="compra-form">
        <div className="form-row">
          <div className="form-group autocomplete-container">
            <label>Item</label>
            <input
              type="text"
              value={buscaItem}
              onChange={(e) => handleBuscaItem(e.target.value)}
              onFocus={() => sugestoes.length > 0 && setMostrarSugestoes(true)}
              onBlur={() => setTimeout(() => setMostrarSugestoes(false), 200)}
              placeholder="Buscar item..."
              required
            />
            {mostrarSugestoes && (
              <ul className="autocomplete-list">
                {sugestoes.map(item => (
                  <li key={item.id} onClick={() => selecionarItem(item)}>
                    <span className="item-nome">{item.nome}</span>
                    <span className="item-id">{item.id}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="form-group form-group-sm">
            <label>Qtd</label>
            <input
              type="number"
              value={novaCompra.quantidade}
              onChange={(e) => setNovaCompra(prev => ({ ...prev, quantidade: e.target.value }))}
              placeholder="20"
              min="1"
              required
            />
          </div>

          <div className="form-group form-group-sm">
            <label>Valor Un.</label>
            <input
              type="text"
              value={novaCompra.valorUnitario}
              onChange={(e) => setNovaCompra(prev => ({ ...prev, valorUnitario: e.target.value }))}
              placeholder="66k"
              required
            />
          </div>

          <div className="form-group">
            <label>Cidade</label>
            <select
              value={novaCompra.cidade}
              onChange={(e) => setNovaCompra(prev => ({ ...prev, cidade: e.target.value }))}
            >
              {CIDADES.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <button type="submit" className="btn-add">+ Adicionar</button>
        </div>
      </form>

      {/* Tabela de compras */}
      {compras.length > 0 ? (
        <div className="table-container">
          <table className="compras-table">
            <thead>
              <tr>
                <th>Item</th>
                <th>Qtd</th>
                <th>Valor Un.</th>
                <th>Total</th>
                <th>Cidade</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {compras.map(compra => (
                <tr key={compra.id}>
                  <td className="item-cell">
                    <span className="item-nome">{compra.itemNome}</span>
                  </td>
                  <td className="number-cell">{compra.quantidade.toLocaleString('pt-BR')}</td>
                  <td className="number-cell">{formatarPrata(compra.valorUnitario)}</td>
                  <td className="number-cell total-cell">
                    {formatarPrata(compra.quantidade * compra.valorUnitario)}
                  </td>
                  <td>{compra.cidade}</td>
                  <td>
                    <button
                      className="btn-remove"
                      onClick={() => onRemover(compra.id)}
                      title="Remover compra"
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="empty-state">
          <p>Nenhuma compra registrada ainda.</p>
          <p className="hint">Adicione os materiais que você comprou para o craft.</p>
        </div>
      )}
    </div>
  )
}
