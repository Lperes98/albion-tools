import { useState } from 'react'
import { formatarPrata, CIDADES } from '../../services/albionApi'

export function CraftTable({ crafts, onAdicionar, onRemover, onAtualizar, onAtualizarTodos, onMarcarVendido, onDesmarcarVendido, loading, itensDisponiveis }) {
  const [novoCraft, setNovoCraft] = useState({
    itemNome: '',
    itemId: '',
    quantidade: '',
    custoCraft: ''
  })
  const [buscaItem, setBuscaItem] = useState('')
  const [sugestoes, setSugestoes] = useState([])
  const [mostrarSugestoes, setMostrarSugestoes] = useState(false)
  const [craftExpandido, setCraftExpandido] = useState(null)
  const [vendaInput, setVendaInput] = useState({})
  const [mostrarInputVenda, setMostrarInputVenda] = useState(null)

  // Busca itens para autocomplete
  const handleBuscaItem = (termo) => {
    setBuscaItem(termo)
    setNovoCraft(prev => ({ ...prev, itemNome: termo, itemId: '' }))

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
    setNovoCraft(prev => ({
      ...prev,
      itemNome: item.nome,
      itemId: item.id
    }))
    setBuscaItem(item.nome)
    setMostrarSugestoes(false)
  }

  // Converte valores (suporta k e m)
  const parseValor = (valor) => {
    if (!valor) return 0
    let v = valor.toString().toLowerCase().trim()
    if (v.endsWith('m')) {
      return parseFloat(v) * 1000000
    } else if (v.endsWith('k')) {
      return parseFloat(v) * 1000
    }
    return parseFloat(v.replace(/\./g, '').replace(',', '.')) || 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!novoCraft.itemId || !novoCraft.quantidade) return

    await onAdicionar({
      ...novoCraft,
      custoCraft: parseValor(novoCraft.custoCraft)
    })

    // Reset form
    setNovoCraft({
      itemNome: '',
      itemId: '',
      quantidade: '',
      custoCraft: ''
    })
    setBuscaItem('')
  }

  const craftsNaoVendidos = crafts.filter(c => !c.vendido)
  const craftsVendidos = crafts.filter(c => c.vendido)
  const totalReceitaProjetada = craftsNaoVendidos.reduce((t, c) => t + (c.quantidade * c.melhorPreco), 0)
  const totalReceitaRealizada = craftsVendidos.reduce((t, c) => t + (c.valorVendido || 0), 0)
  const totalCustoCraft = crafts.reduce((t, c) => t + (c.custoCraft || 0), 0)

  const handleVenda = (id) => {
    const valor = vendaInput[id]
    onMarcarVendido(id, valor)
    setMostrarInputVenda(null)
    setVendaInput(prev => ({ ...prev, [id]: '' }))
  }

  return (
    <div className="craft-section">
      <div className="section-header">
        <h3>Registro de Craft</h3>
        <div className="header-actions">
          <span className="total-badge">
            Custo: {formatarPrata(totalCustoCraft)}
          </span>
          {totalReceitaRealizada > 0 && (
            <span className="total-badge vendido">
              Vendido: {formatarPrata(totalReceitaRealizada)}
            </span>
          )}
          <span className="total-badge receita">
            Projetado: {formatarPrata(totalReceitaProjetada)}
          </span>
          {crafts.length > 0 && (
            <button
              className="btn-refresh"
              onClick={onAtualizarTodos}
              disabled={loading}
              title="Atualizar todos os preços"
            >
              {loading ? '...' : '↻'} Atualizar
            </button>
          )}
        </div>
      </div>

      {/* Formulário de novo craft */}
      <form onSubmit={handleSubmit} className="craft-form">
        <div className="form-row">
          <div className="form-group autocomplete-container">
            <label>Item Craftado</label>
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
            <label>Quantidade</label>
            <input
              type="number"
              value={novoCraft.quantidade}
              onChange={(e) => setNovoCraft(prev => ({ ...prev, quantidade: e.target.value }))}
              placeholder="550"
              min="1"
              required
            />
          </div>

          <div className="form-group form-group-sm">
            <label>Taxa Craft</label>
            <input
              type="text"
              value={novoCraft.custoCraft}
              onChange={(e) => setNovoCraft(prev => ({ ...prev, custoCraft: e.target.value }))}
              placeholder="90k"
              title="Custo de uso da estação (ex: 90k, 1.5m)"
            />
          </div>

          <button type="submit" className="btn-add" disabled={loading}>
            {loading ? 'Buscando...' : '+ Adicionar'}
          </button>
        </div>
      </form>

      {/* Lista de crafts */}
      {crafts.length > 0 ? (
        <div className="crafts-list">
          {crafts.map(craft => (
            <div key={craft.id} className={`craft-card ${craft.vendido ? 'vendido' : ''}`}>
              <div className="craft-main" onClick={() => setCraftExpandido(
                craftExpandido === craft.id ? null : craft.id
              )}>
                <div className="craft-info">
                  <h4>
                    {craft.itemNome}
                    {craft.vendido && <span className="tag-vendido">VENDIDO</span>}
                  </h4>
                  <span className="craft-qty">{craft.quantidade.toLocaleString('pt-BR')} un.</span>
                  {craft.custoCraft > 0 && (
                    <span className="craft-custo">Taxa: {formatarPrata(craft.custoCraft)}</span>
                  )}
                </div>

                <div className="craft-preco">
                  {craft.vendido ? (
                    <>
                      <div className="melhor-preco vendido">
                        <span className="label">Vendido por:</span>
                        <span className="valor">{formatarPrata(craft.valorVendido)}</span>
                      </div>
                      <div className="data-venda">
                        {new Date(craft.dataVenda).toLocaleDateString('pt-BR')}
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="melhor-preco">
                        <span className="label">Melhor preço:</span>
                        <span className="valor">{formatarPrata(craft.melhorPreco)}</span>
                      </div>
                      <div className="melhor-cidade">
                        <span className="cidade-badge">{craft.melhorCidade}</span>
                      </div>
                    </>
                  )}
                </div>

                <div className="craft-total">
                  <span className="label">{craft.vendido ? 'Total Recebido:' : 'Receita Projetada:'}</span>
                  <span className="valor-total">
                    {craft.vendido
                      ? formatarPrata(craft.valorVendido)
                      : formatarPrata(craft.quantidade * craft.melhorPreco)
                    }
                  </span>
                </div>

                <div className="craft-actions">
                  {!craft.vendido ? (
                    <>
                      {mostrarInputVenda === craft.id ? (
                        <div className="venda-input-container" onClick={e => e.stopPropagation()}>
                          <input
                            type="text"
                            value={vendaInput[craft.id] || ''}
                            onChange={(e) => setVendaInput(prev => ({ ...prev, [craft.id]: e.target.value }))}
                            placeholder="Valor (ex: 500k)"
                            autoFocus
                          />
                          <button className="btn-icon success" onClick={() => handleVenda(craft.id)}>✓</button>
                          <button className="btn-icon" onClick={() => setMostrarInputVenda(null)}>✕</button>
                        </div>
                      ) : (
                        <button
                          className="btn-vendido"
                          onClick={(e) => {
                            e.stopPropagation()
                            setMostrarInputVenda(craft.id)
                            setVendaInput(prev => ({ ...prev, [craft.id]: '' }))
                          }}
                          title="Marcar como vendido"
                        >
                          Vendido
                        </button>
                      )}
                      <button
                        className="btn-icon"
                        onClick={(e) => {
                          e.stopPropagation()
                          onAtualizar(craft.id)
                        }}
                        disabled={loading}
                        title="Atualizar preços"
                      >
                        ↻
                      </button>
                    </>
                  ) : (
                    <button
                      className="btn-icon warning"
                      onClick={(e) => {
                        e.stopPropagation()
                        onDesmarcarVendido(craft.id)
                      }}
                      title="Desfazer venda"
                    >
                      ↩
                    </button>
                  )}
                  <button
                    className="btn-icon danger"
                    onClick={(e) => {
                      e.stopPropagation()
                      onRemover(craft.id)
                    }}
                    title="Remover"
                  >
                    ✕
                  </button>
                  <span className="expand-icon">
                    {craftExpandido === craft.id ? '▲' : '▼'}
                  </span>
                </div>
              </div>

              {/* Detalhes expandidos - preços por cidade */}
              {craftExpandido === craft.id && craft.precosPorCidade?.length > 0 && (
                <div className="craft-detalhes">
                  <h5>Preços por Cidade</h5>
                  <div className="cidades-grid">
                    {craft.precosPorCidade.map(({ cidade, preco }, index) => (
                      <div
                        key={cidade}
                        className={`cidade-item ${index === 0 ? 'melhor' : ''}`}
                      >
                        <span className="cidade-nome">{cidade}</span>
                        <span className="cidade-preco">{formatarPrata(preco)}</span>
                        {index === 0 && <span className="tag-melhor">Melhor</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <p>Nenhum item craftado registrado.</p>
          <p className="hint">Adicione os itens que você produziu para ver onde vender pelo melhor preço.</p>
        </div>
      )}
    </div>
  )
}
