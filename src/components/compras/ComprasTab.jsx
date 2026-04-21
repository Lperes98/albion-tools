import { useState, useEffect, useMemo, useRef } from 'react'
import recipesRaw from '../../data/recipes.json'
import { buscarItensPorNome } from '../../services/albionApi'

const recipes = recipesRaw
const STORAGE_KEY = 'albion_compras'

// ─── Utilitários ─────────────────────────────────────────────────────────────
function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2)
}

function formatSilver(v) {
  if (!v || v === 0) return '—'
  if (v >= 1_000_000) return (v / 1_000_000).toFixed(2) + 'M'
  if (v >= 1_000) return (v / 1_000).toFixed(1) + 'k'
  return Math.round(v).toLocaleString('pt-BR')
}

function formatDate(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: '2-digit',
    hour: '2-digit', minute: '2-digit',
  })
}

function loadPedidos() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') } catch { return [] }
}

function savePedidos(list) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(list)) } catch {}
}

// ─── Componente principal ─────────────────────────────────────────────────────
export function ComprasTab({ itensDisponiveis }) {
  const [pedidos, setPedidos] = useState(() => loadPedidos())
  const [pedidoAtivoId, setPedidoAtivoId] = useState(null)
  const [modoForm, setModoForm] = useState(false)

  // Form
  const [nomePedido, setNomePedido] = useState('')
  const [termoBusca, setTermoBusca] = useState('')
  const [resultadosBusca, setResultadosBusca] = useState([])
  const [itemSelecionado, setItemSelecionado] = useState(null)
  const [recipe, setRecipe] = useState(null)
  const [ingredientesPrecos, setIngredientesPrecos] = useState({})
  const [gastos, setGastos] = useState([])
  const [novoGastoDesc, setNovoGastoDesc] = useState('')
  const [novoGastoValor, setNovoGastoValor] = useState('')
  const [taxaRetorno, setTaxaRetorno] = useState(15)
  const [taxaMercado, setTaxaMercado] = useState(3)
  const [quantidade, setQuantidade] = useState(1)
  const importRef = useRef(null)

  const nameMap = useMemo(() => {
    const m = {}
    for (const item of (itensDisponiveis || [])) {
      m[item.UniqueName] = item.LocalizedNames?.['PT-BR'] || item.LocalizedNames?.['EN-US'] || item.UniqueName
    }
    return m
  }, [itensDisponiveis])

  // Busca itens com receita
  useEffect(() => {
    if (!termoBusca.trim()) { setResultadosBusca([]); return }
    const res = buscarItensPorNome(itensDisponiveis, termoBusca)
      .filter(i => recipes[i.uniqueName])
      .slice(0, 15)
    setResultadosBusca(res)
  }, [termoBusca, itensDisponiveis])

  // Receita é carregada explicitamente ao clicar no resultado da busca
  // (não via useEffect para não sobrescrever preços ao abrir pedido salvo)

  // Cálculo
  const calculo = useMemo(() => {
    if (!recipe) return null
    const ret = taxaRetorno / 100
    const tax = taxaMercado / 100
    const qtd = Math.max(1, quantidade)

    // O retorno de crafting permite fazer mais batches com os mesmos ingredientes.
    // Se você tem materiais para qtd batches e retorno = ret:
    //   batchesEfetivos = qtd / (1 - ret)
    // Exemplo: 10 batches + 15% retorno → 10 / 0.85 = 11,76 batches reais
    const batchesEfetivos = ret < 1 ? qtd / (1 - ret) : qtd
    const batchesExtras = batchesEfetivos - qtd

    let custoIngTotal = 0
    const detalhe = recipe.ingredients.map(ing => {
      const totalPago = ingredientesPrecos[ing.id] || 0
      const qtdNecessaria = ing.count * qtd
      const precoUnit = qtdNecessaria > 0 ? totalPago / qtdNecessaria : 0
      custoIngTotal += totalPago
      return { ...ing, totalPago, qtdNecessaria, precoUnit }
    })
    custoIngTotal += (recipe.silver || 0) * qtd

    // Gastos extras contam UMA vez, independente da quantidade de batches
    const custoGastos = gastos.reduce((s, g) => s + (g.valor || 0), 0)
    const custoTotalGeral = custoIngTotal + custoGastos

    // Preços mínimos calculados sobre o total REAL de unidades produzidas
    const ac = recipe.amountCrafted
    const totalUnidades = Math.floor(batchesEfetivos * ac)
    const precoMinBE  = totalUnidades * (1 - tax) > 0 ? custoTotalGeral / (totalUnidades * (1 - tax)) : 0
    const precoMin5   = totalUnidades * (1 - tax - 0.05) > 0 ? custoTotalGeral / (totalUnidades * (1 - tax - 0.05)) : 0
    const precoMin10  = totalUnidades * (1 - tax - 0.10) > 0 ? custoTotalGeral / (totalUnidades * (1 - tax - 0.10)) : 0
    const precoMin15  = totalUnidades * (1 - tax - 0.15) > 0 ? custoTotalGeral / (totalUnidades * (1 - tax - 0.15)) : 0

    return {
      detalhe,
      custoIngTotal,
      custoGastos,
      custoTotalGeral,
      batchesEfetivos,
      batchesExtras,
      totalUnidades,
      precoMinBE,
      precoMin5,
      precoMin10,
      precoMin15,
      amountCrafted: ac,
    }
  }, [recipe, ingredientesPrecos, gastos, taxaRetorno, taxaMercado, quantidade])

  // ─── Ações ─────────────────────────────────────────────────────────────────
  function resetForm() {
    setNomePedido('')
    setTermoBusca('')
    setResultadosBusca([])
    setItemSelecionado(null)
    setRecipe(null)
    setIngredientesPrecos({})
    setGastos([])
    setNovoGastoDesc('')
    setNovoGastoValor('')
    setTaxaRetorno(15)
    setTaxaMercado(3)
    setQuantidade(1)
    setPedidoAtivoId(null)
  }

  function novaCompra() {
    resetForm()
    setModoForm(true)
  }

  function abrirPedido(pedido) {
    setNomePedido(pedido.nome || '')
    setTermoBusca(pedido.item?.nome || '')
    setResultadosBusca([])
    setItemSelecionado(pedido.item || null)
    setRecipe(pedido.recipe || null)
    setIngredientesPrecos(pedido.ingredientesPrecos || {})
    setGastos(pedido.gastos || [])
    setTaxaRetorno(pedido.taxaRetorno ?? 15)
    setTaxaMercado(pedido.taxaMercado ?? 3)
    setQuantidade(pedido.quantidade ?? 1)
    setPedidoAtivoId(pedido.id)
    setModoForm(true)
  }

  function salvar() {
    if (!recipe || !itemSelecionado) return
    const pedido = {
      id: pedidoAtivoId || uid(),
      nome: nomePedido.trim() || itemSelecionado.nome,
      criadoEm: new Date().toISOString(),
      item: itemSelecionado,
      recipe,
      ingredientesPrecos,
      gastos,
      taxaRetorno,
      taxaMercado,
      quantidade,
      custoTotal: calculo?.custoPorBatch || 0,
      precoMinBE: calculo?.precoMinBE || 0,
    }
    const novos = pedidoAtivoId
      ? pedidos.map(p => p.id === pedidoAtivoId ? pedido : p)
      : [...pedidos, pedido]
    setPedidos(novos)
    savePedidos(novos)
    setPedidoAtivoId(pedido.id)
  }

  function excluirPedido(id, e) {
    e.stopPropagation()
    if (!confirm('Excluir este pedido?')) return
    const novos = pedidos.filter(p => p.id !== id)
    setPedidos(novos)
    savePedidos(novos)
    if (pedidoAtivoId === id) { resetForm(); setModoForm(false) }
  }

  function exportarJSON() {
    if (!recipe || !itemSelecionado) return
    const data = {
      nome: nomePedido.trim() || itemSelecionado.nome,
      criadoEm: new Date().toISOString(),
      item: itemSelecionado,
      recipe,
      ingredientesPrecos,
      gastos,
      taxaRetorno,
      taxaMercado,
      quantidade,
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `compra_${(data.nome).replace(/\s+/g, '_')}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  function importarJSON(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      try {
        const data = JSON.parse(ev.target.result)
        abrirPedido({ id: uid(), ...data })
      } catch { alert('Arquivo JSON inválido') }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  function adicionarGasto() {
    if (!novoGastoDesc.trim() && !novoGastoValor) return
    setGastos(prev => [...prev, {
      id: uid(),
      descricao: novoGastoDesc.trim() || 'Gasto',
      valor: parseFloat(novoGastoValor) || 0,
    }])
    setNovoGastoDesc('')
    setNovoGastoValor('')
  }

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="compras-tab">
      <div className="compras-layout">

        {/* ── Sidebar de pedidos salvos ── */}
        <aside className="compras-sidebar">
          <div className="compras-sidebar-header">
            <h3>Pedidos</h3>
            <div className="compras-sidebar-actions">
              <button className="btn-compra-novo" onClick={novaCompra}>+ Novo</button>
              <button
                className="btn-compra-import"
                title="Importar JSON"
                onClick={() => importRef.current?.click()}
              >📂</button>
              <input ref={importRef} type="file" accept=".json" style={{ display: 'none' }} onChange={importarJSON} />
            </div>
          </div>

          {pedidos.length === 0 ? (
            <div className="compras-empty-list">Nenhum pedido salvo</div>
          ) : (
            <ul className="compras-list">
              {[...pedidos].reverse().map(p => (
                <li
                  key={p.id}
                  className={`compras-list-item ${p.id === pedidoAtivoId ? 'active' : ''}`}
                  onClick={() => abrirPedido(p)}
                >
                  <div className="cli-nome">{p.nome}</div>
                  <div className="cli-meta">
                    <span className="cli-custo">{formatSilver(p.custoTotal)}/batch</span>
                    <span className="cli-date">{formatDate(p.criadoEm)}</span>
                  </div>
                  <button className="cli-del" onClick={e => excluirPedido(p.id, e)} title="Excluir">✕</button>
                </li>
              ))}
            </ul>
          )}
        </aside>

        {/* ── Conteúdo principal ── */}
        <div className="compras-content">
          {!modoForm ? (
            <div className="compras-welcome">
              <p>Selecione um pedido ou clique em <strong>+ Novo</strong> para começar.</p>
            </div>
          ) : (
            <div className="compras-form">

              {/* Nome do pedido */}
              <div className="compras-form-header">
                <input
                  className="compras-nome-input"
                  placeholder="Nome do pedido (opcional)"
                  value={nomePedido}
                  onChange={e => setNomePedido(e.target.value)}
                />
                <div className="compras-form-actions">
                  {recipe && (
                    <>
                      <button className="btn-compra-salvar" onClick={salvar}>💾 Salvar</button>
                      <button className="btn-compra-export" onClick={exportarJSON}>⬇ JSON</button>
                    </>
                  )}
                </div>
              </div>

              {/* ── Seção: Busca de item ── */}
              <section className="compras-section">
                <h4 className="compras-section-title">Item</h4>
                <div className="compras-search">
                  <input
                    className="compras-search-input"
                    placeholder="Buscar item com receita..."
                    value={termoBusca}
                    onChange={e => setTermoBusca(e.target.value)}
                  />
                  {itemSelecionado && (
                    <button
                      className="item-clear-btn"
                      onClick={() => { setItemSelecionado(null); setRecipe(null); setIngredientesPrecos({}); setTermoBusca('') }}
                      title="Limpar item"
                    >✕</button>
                  )}
                </div>

                {resultadosBusca.length > 0 && !itemSelecionado && (
                  <ul className="compras-search-results">
                    {resultadosBusca.map(i => (
                      <li key={i.uniqueName} onClick={() => {
                        setItemSelecionado(i)
                        setRecipe(recipes[i.uniqueName] || null)
                        setIngredientesPrecos({})
                        setTermoBusca(i.nome)
                        setResultadosBusca([])
                      }}>
                        <span className="tier-badge-sm">T{i.tier}</span>
                        {i.nome}
                      </li>
                    ))}
                  </ul>
                )}

                {itemSelecionado && (
                  <div className="compras-item-badge">
                    <span className="tier-badge">T{itemSelecionado.tier}</span>
                    <strong>{itemSelecionado.nome}</strong>
                    {recipe && <span className="compras-crafted">→ {recipe.amountCrafted} un./batch</span>}
                  </div>
                )}
              </section>

              {recipe && (
                <>
                  {/* ── Seção: Configurações ── */}
                  <section className="compras-section">
                    <h4 className="compras-section-title">Configurações</h4>
                    <div className="compras-configs">
                      <div className="rent-field rent-field-sm">
                        <label>Qtd. Batches</label>
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
                    </div>
                  </section>

                  {/* ── Seção: Ingredientes ── */}
                  <section className="compras-section">
                    <h4 className="compras-section-title">
                      Ingredientes — total pago por todos os itens ({quantidade} batch{quantidade > 1 ? 'es' : ''})
                    </h4>
                    <table className="compras-ing-table">
                      <thead>
                        <tr>
                          <th>Ingrediente</th>
                          <th className="center" title="Qtd./batch × batches">Qtd. Total</th>
                          <th className="right">Total Pago</th>
                          <th className="right" title="Preço derivado: total ÷ qtd total">Preço Unit.</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(calculo?.detalhe || []).map(ing => (
                          <tr key={ing.id}>
                            <td className="ing-nome">{nameMap[ing.id] || ing.id}</td>
                            <td className="center">{ing.qtdNecessaria}</td>
                            <td>
                              <input
                                className="compras-preco-input"
                                type="number" min="0" step="1"
                                placeholder="0"
                                value={ingredientesPrecos[ing.id] || ''}
                                onChange={e => setIngredientesPrecos(prev => ({
                                  ...prev,
                                  [ing.id]: parseFloat(e.target.value) || 0,
                                }))}
                              />
                            </td>
                            <td className="right text-secondary">{formatSilver(Math.round(ing.precoUnit))}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </section>

                  {/* ── Seção: Gastos Extras ── */}
                  <section className="compras-section">
                    <h4 className="compras-section-title">Gastos Extras</h4>

                    {gastos.length > 0 && (
                      <table className="compras-gastos-table">
                        <thead>
                          <tr>
                            <th>Descrição</th>
                            <th className="right">Valor</th>
                            <th></th>
                          </tr>
                        </thead>
                        <tbody>
                          {gastos.map(g => (
                            <tr key={g.id}>
                              <td>{g.descricao}</td>
                              <td className="right">{formatSilver(g.valor)}</td>
                              <td>
                                <button className="gasto-del-btn" onClick={() =>
                                  setGastos(prev => prev.filter(x => x.id !== g.id))
                                } title="Remover gasto">✕</button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}

                    <div className="compras-gasto-add">
                      <input
                        className="compras-gasto-desc"
                        placeholder="Descrição (ex: Foco, Transporte...)"
                        value={novoGastoDesc}
                        onChange={e => setNovoGastoDesc(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && adicionarGasto()}
                      />
                      <input
                        className="compras-gasto-val"
                        type="number" min="0" step="1"
                        placeholder="Valor"
                        value={novoGastoValor}
                        onChange={e => setNovoGastoValor(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && adicionarGasto()}
                      />
                      <button className="btn-gasto-add" onClick={adicionarGasto}>+ Adicionar</button>
                    </div>
                  </section>

                  {/* ── Seção: Resumo ── */}
                  {calculo && (
                    <section className="compras-section compras-resumo">
                      <h4 className="compras-section-title">Resumo de Custos</h4>
                      <div className="resumo-grid">

                        <div className="resumo-bloco">
                          <div className="resumo-title">Produção com Retorno</div>
                          <div className="resumo-row">
                            <span>Batches comprados</span>
                            <span>{quantidade}</span>
                          </div>
                          <div className="resumo-row">
                            <span>Retorno de craft</span>
                            <span>{taxaRetorno}%</span>
                          </div>
                          <div className="resumo-row">
                            <span className="text-secondary" title="Batches extras gerados pelo retorno">+ Batches extras</span>
                            <span className="preco-5">+{calculo.batchesExtras.toFixed(2)}</span>
                          </div>
                          <div className="resumo-row resumo-total">
                            <span>Batches reais</span>
                            <span>{calculo.batchesEfetivos.toFixed(2)}</span>
                          </div>
                          <div className="resumo-row resumo-total">
                            <span>Unidades produzidas</span>
                            <span>{calculo.totalUnidades}</span>
                          </div>
                        </div>

                        <div className="resumo-bloco">
                          <div className="resumo-title">Investimento</div>
                          <div className="resumo-row">
                            <span>Ingredientes</span>
                            <span>{formatSilver(Math.round(calculo.custoIngTotal))}</span>
                          </div>
                          {calculo.custoGastos > 0 && gastos.map(g => (
                            <div key={g.id} className="resumo-row">
                              <span>{g.descricao}</span>
                              <span>{formatSilver(g.valor)}</span>
                            </div>
                          ))}
                          <div className="resumo-row resumo-total">
                            <span>Total Geral</span>
                            <span>{formatSilver(Math.round(calculo.custoTotalGeral))}</span>
                          </div>
                        </div>

                        <div className="resumo-bloco resumo-precos">
                          <div className="resumo-title">Preço Mínimo de Venda (por unidade)</div>
                          <div className="resumo-row">
                            <span>Break-even</span>
                            <span className="preco-be">{formatSilver(Math.round(calculo.precoMinBE))}</span>
                          </div>
                          <div className="resumo-row">
                            <span>+5% de margem</span>
                            <span className="preco-5">{formatSilver(Math.round(calculo.precoMin5))}</span>
                          </div>
                          <div className="resumo-row">
                            <span>+10% de margem</span>
                            <span className="preco-10">{formatSilver(Math.round(calculo.precoMin10))}</span>
                          </div>
                          <div className="resumo-row">
                            <span>+15% de margem</span>
                            <span className="preco-15">{formatSilver(Math.round(calculo.precoMin15))}</span>
                          </div>
                        </div>
                      </div>
                    </section>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
