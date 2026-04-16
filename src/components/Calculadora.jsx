import { useState, useMemo } from 'react'

// ─── Dados de receitas ───────────────────────────────────────────────────────

const POCOES = [
  {
    id: 'cura',
    nome: 'Poção de Cura',
    icone: '🧪',
    tiers: [
      {
        tier: 3,
        nome: 'Poção de Cura Menor',
        produz: 5,
        ingredientes: [
          { nome: 'Cogumelo Arcano', qtd: 8 },
        ],
      },
      {
        tier: 4,
        nome: 'Poção de Cura',
        produz: 5,
        ingredientes: [
          { nome: 'Bardana Serrilhada', qtd: 24 },
          { nome: 'Ovos de Galinha', qtd: 6 },
        ],
      },
      {
        tier: 5,
        nome: 'Poção de Cura',
        produz: 5,
        ingredientes: [
          { nome: 'Cardo do Dragão', qtd: 24 },
          { nome: 'Bardana Serrilhada', qtd: 12 },
          { nome: 'Leite de Cabra', qtd: 6 },
        ],
      },
      {
        tier: 6,
        nome: 'Poção de Cura Maior',
        produz: 5,
        ingredientes: [
          { nome: 'Dedaleira Esquiva', qtd: 72 },
          { nome: 'Ovos de Ganso', qtd: 18 },
          { nome: 'Schnapps de Batata', qtd: 18 },
        ],
      },
      {
        tier: 7,
        nome: 'Poção de Cura Maior',
        produz: 5,
        ingredientes: [
          { nome: 'Ervas T7', qtd: 72 },
          { nome: 'Ingredientes Refinados', qtd: 36 },
        ],
      },
      {
        tier: 8,
        nome: 'Poção de Cura Excelente',
        produz: 5,
        ingredientes: [
          { nome: 'Ervas T8', qtd: 144 },
          { nome: 'Ingredientes Refinados', qtd: 72 },
        ],
      },
    ],
  },
  {
    id: 'energia',
    nome: 'Poção de Energia',
    icone: '🔵',
    tiers: [
      {
        tier: 3,
        nome: 'Poção de Energia Menor',
        produz: 5,
        ingredientes: [
          { nome: 'Cogumelo Arcano', qtd: 8 },
        ],
      },
      {
        tier: 4,
        nome: 'Poção de Energia',
        produz: 5,
        ingredientes: [
          { nome: 'Bardana Serrilhada', qtd: 24 },
          { nome: 'Leite de Cabra', qtd: 6 },
        ],
      },
      {
        tier: 5,
        nome: 'Poção de Energia',
        produz: 5,
        ingredientes: [
          { nome: 'Cardo do Dragão', qtd: 24 },
          { nome: 'Bardana Serrilhada', qtd: 12 },
          { nome: 'Leite de Ovelha', qtd: 6 },
        ],
      },
      {
        tier: 6,
        nome: 'Poção de Energia Maior',
        produz: 5,
        ingredientes: [
          { nome: 'Dedaleira Esquiva', qtd: 72 },
          { nome: 'Leite de Ovelha', qtd: 18 },
          { nome: 'Schnapps de Batata', qtd: 18 },
        ],
      },
      {
        tier: 7,
        nome: 'Poção de Energia Maior',
        produz: 5,
        ingredientes: [
          { nome: 'Ervas T7', qtd: 72 },
          { nome: 'Ingredientes Refinados', qtd: 36 },
        ],
      },
      {
        tier: 8,
        nome: 'Poção de Energia Excelente',
        produz: 5,
        ingredientes: [
          { nome: 'Ervas T8', qtd: 144 },
        ],
      },
    ],
  },
  {
    id: 'resistencia',
    nome: 'Poção de Resistência',
    icone: '🛡️',
    tiers: [
      {
        tier: 3,
        nome: 'Poção de Resistência Menor',
        produz: 5,
        ingredientes: [
          { nome: 'Confrei Luminoso', qtd: 8 },
        ],
      },
      {
        tier: 4,
        nome: 'Poção de Resistência',
        produz: 5,
        ingredientes: [
          { nome: 'Bardana Serrilhada', qtd: 24 },
          { nome: 'Leite de Cabra', qtd: 6 },
        ],
      },
      {
        tier: 5,
        nome: 'Poção de Resistência',
        produz: 5,
        ingredientes: [
          { nome: 'Cardo do Dragão', qtd: 24 },
          { nome: 'Bardana Serrilhada', qtd: 12 },
          { nome: 'Leite de Cabra', qtd: 6 },
        ],
      },
      {
        tier: 6,
        nome: 'Poção de Resistência Maior',
        produz: 5,
        ingredientes: [
          { nome: 'Dedaleira Esquiva', qtd: 72 },
          { nome: 'Leite', qtd: 18 },
        ],
      },
      {
        tier: 7,
        nome: 'Poção de Resistência Maior',
        produz: 5,
        ingredientes: [
          { nome: 'Ervas T7', qtd: 72 },
        ],
      },
      {
        tier: 8,
        nome: 'Poção de Resistência Excelente',
        produz: 5,
        ingredientes: [
          { nome: 'Ervas T8', qtd: 144 },
        ],
      },
    ],
  },
  {
    id: 'venenosa',
    nome: 'Poção Venenosa',
    icone: '☠️',
    tiers: [
      {
        tier: 4,
        nome: 'Poção Venenosa Menor',
        produz: 5,
        ingredientes: [
          { nome: 'Bardana Serrilhada', qtd: 8 },
          { nome: 'Confrei Luminoso', qtd: 4 },
        ],
      },
      {
        tier: 5,
        nome: 'Poção Venenosa',
        produz: 5,
        ingredientes: [
          { nome: 'Cardo do Dragão', qtd: 24 },
          { nome: 'Confrei Luminoso', qtd: 12 },
          { nome: 'Leite', qtd: 6 },
        ],
      },
      {
        tier: 6,
        nome: 'Poção Venenosa',
        produz: 5,
        ingredientes: [
          { nome: 'Dedaleira Esquiva', qtd: 24 },
          { nome: 'Cardo do Dragão', qtd: 12 },
          { nome: 'Confrei Luminoso', qtd: 12 },
          { nome: 'Leite de Ovelha', qtd: 6 },
        ],
      },
      {
        tier: 7,
        nome: 'Poção Venenosa Maior',
        produz: 5,
        ingredientes: [
          { nome: 'Ervas T7', qtd: 72 },
        ],
      },
      {
        tier: 8,
        nome: 'Poção Venenosa Excelente',
        produz: 5,
        ingredientes: [
          { nome: 'Ervas T8', qtd: 144 },
        ],
      },
    ],
  },
  {
    id: 'crescimento',
    nome: 'Poção de Crescimento',
    icone: '🟣',
    tiers: [
      {
        tier: 3,
        nome: 'Poção de Crescimento Menor',
        produz: 5,
        ingredientes: [
          { nome: 'Confrei Luminoso', qtd: 8 },
        ],
      },
      {
        tier: 5,
        nome: 'Poção de Crescimento',
        produz: 5,
        ingredientes: [
          { nome: 'Cardo do Dragão', qtd: 24 },
          { nome: 'Bardana Serrilhada', qtd: 12 },
          { nome: 'Ovos de Ganso', qtd: 6 },
        ],
      },
      {
        tier: 7,
        nome: 'Poção de Crescimento Maior',
        produz: 5,
        ingredientes: [
          { nome: 'Ervas T7', qtd: 72 },
        ],
      },
    ],
  },
  {
    id: 'pegajosa',
    nome: 'Poção Pegajosa',
    icone: '🟡',
    tiers: [
      {
        tier: 3,
        nome: 'Poção Pegajosa Menor',
        produz: 5,
        ingredientes: [
          { nome: 'Confrei Luminoso', qtd: 8 },
        ],
      },
      {
        tier: 5,
        nome: 'Poção Pegajosa',
        produz: 5,
        ingredientes: [
          { nome: 'Cardo do Dragão', qtd: 24 },
          { nome: 'Bardana Serrilhada', qtd: 12 },
          { nome: 'Ovos de Ganso', qtd: 6 },
        ],
      },
      {
        tier: 7,
        nome: 'Poção Pegajosa Maior',
        produz: 5,
        ingredientes: [
          { nome: 'Ervas T7', qtd: 72 },
        ],
      },
    ],
  },
  {
    id: 'invisibilidade',
    nome: 'Poção de Invisibilidade',
    icone: '👁️',
    tiers: [
      {
        tier: 8,
        nome: 'Poção de Invisibilidade',
        produz: 5,
        ingredientes: [
          { nome: 'Ervas T8', qtd: 144 },
          { nome: 'Componentes Raros', qtd: 1 },
        ],
      },
    ],
  },
]

// ─── Dados de comidas ────────────────────────────────────────────────────────

const COMIDAS = [
  {
    id: 'basicos',
    nome: 'Básicos',
    icone: '🐟',
    tiers: [
      { tier: 1, label: 'Peixe', nome: 'Peixe Grelhado', produz: 10,
        ingredientes: [{ nome: 'Peixe', qtd: 10 }] },
      { tier: 1, label: 'Alga', nome: 'Salada de Alga', produz: 10,
        ingredientes: [{ nome: 'Alga Marinha', qtd: 10 }] },
      { tier: 2, nome: 'Molho de Peixe', produz: 1,
        ingredientes: [{ nome: 'Peixe Picado', qtd: 10 }] },
      { tier: 3, nome: 'Pão', produz: 1,
        ingredientes: [{ nome: 'Farinha', qtd: 3 }] },
    ],
  },
  {
    id: 'sopas',
    nome: 'Sopas',
    icone: '🥣',
    tiers: [
      { tier: 4, nome: 'Sopa de Trigo', produz: 10,
        ingredientes: [{ nome: 'Trigo', qtd: 48 }] },
      { tier: 5, nome: 'Sopa de Cenoura', produz: 10,
        ingredientes: [{ nome: 'Cenoura', qtd: 16 }] },
      { tier: 6, nome: 'Sopa de Repolho', produz: 10,
        ingredientes: [{ nome: 'Repolho', qtd: 144 }] },
      { tier: 0, label: 'Marisco', nome: 'Sopa de Marisco', produz: 1,
        ingredientes: [{ nome: 'Cenoura', qtd: 2 }, { nome: 'Marisco', qtd: 1 }] },
    ],
  },
  {
    id: 'saladas',
    nome: 'Saladas',
    icone: '🥗',
    tiers: [
      { tier: 5, nome: 'Salada de Feijão', produz: 10,
        ingredientes: [{ nome: 'Cenoura', qtd: 8 }, { nome: 'Feijão', qtd: 8 }] },
      { tier: 6, nome: 'Salada de Nabo', produz: 10,
        ingredientes: [{ nome: 'Trigo', qtd: 24 }, { nome: 'Nabo', qtd: 24 }] },
      { tier: 7, nome: 'Salada de Batata', produz: 10,
        ingredientes: [{ nome: 'Batata', qtd: 24 }, { nome: 'Repolho', qtd: 24 }] },
      { tier: 0, label: 'Kraken', nome: 'Salada de Kraken', produz: 1,
        ingredientes: [{ nome: 'Batata', qtd: 2 }, { nome: 'Kraken', qtd: 1 }] },
    ],
  },
  {
    id: 'omeletes',
    nome: 'Omeletes',
    icone: '🍳',
    tiers: [
      { tier: 5, nome: 'Omelete de Galinha', produz: 10,
        ingredientes: [{ nome: 'Trigo', qtd: 4 }, { nome: 'Frango', qtd: 8 }, { nome: 'Ovo', qtd: 2 }] },
      { tier: 6, nome: 'Omelete de Ganso', produz: 10,
        ingredientes: [{ nome: 'Repolho', qtd: 12 }, { nome: 'Ganso', qtd: 24 }, { nome: 'Ovo', qtd: 6 }] },
      { tier: 7, nome: 'Omelete de Porco', produz: 10,
        ingredientes: [{ nome: 'Milho', qtd: 36 }, { nome: 'Porco', qtd: 72 }, { nome: 'Ovo', qtd: 18 }] },
      { tier: 0, label: 'Caranguejo', nome: 'Omelete de Caranguejo', produz: 1,
        ingredientes: [{ nome: 'Caranguejo', qtd: 1 }, { nome: 'Ovo', qtd: 1 }] },
    ],
  },
  {
    id: 'tortas',
    nome: 'Tortas',
    icone: '🥧',
    tiers: [
      { tier: 5, nome: 'Torta de Frango', produz: 10,
        ingredientes: [{ nome: 'Trigo', qtd: 2 }, { nome: 'Frango', qtd: 8 }, { nome: 'Farinha', qtd: 4 }] },
      { tier: 6, nome: 'Torta de Ganso', produz: 10,
        ingredientes: [{ nome: 'Repolho', qtd: 6 }, { nome: 'Ganso', qtd: 24 }, { nome: 'Leite', qtd: 6 }, { nome: 'Farinha', qtd: 12 }] },
      { tier: 7, nome: 'Torta de Porco', produz: 10,
        ingredientes: [{ nome: 'Milho', qtd: 18 }, { nome: 'Porco', qtd: 72 }, { nome: 'Farinha', qtd: 36 }, { nome: 'Leite', qtd: 18 }] },
      { tier: 0, label: 'Blindeye', nome: 'Torta Blindeye', produz: 1,
        ingredientes: [{ nome: 'Ingredientes Raros', qtd: 1 }] },
    ],
  },
  {
    id: 'assados',
    nome: 'Assados',
    icone: '🍖',
    tiers: [
      { tier: 5, nome: 'Frango Assado', produz: 10,
        ingredientes: [{ nome: 'Frango Cru', qtd: 10 }] },
      { tier: 6, nome: 'Ganso Assado', produz: 10,
        ingredientes: [{ nome: 'Ganso Cru', qtd: 10 }] },
      { tier: 7, nome: 'Porco Assado', produz: 10,
        ingredientes: [{ nome: 'Porco Cru', qtd: 10 }] },
    ],
  },
  {
    id: 'ensopados',
    nome: 'Ensopados',
    icone: '🍲',
    tiers: [
      { tier: 5, nome: 'Ensopado de Cabra', produz: 10,
        ingredientes: [{ nome: 'Nabo', qtd: 4 }, { nome: 'Pão', qtd: 4 }, { nome: 'Carne de Cabra', qtd: 8 }] },
      { tier: 6, nome: 'Ensopado de Carneiro', produz: 10,
        ingredientes: [{ nome: 'Batata', qtd: 12 }, { nome: 'Pão', qtd: 12 }, { nome: 'Carneiro', qtd: 24 }] },
      { tier: 8, nome: 'Ensopado de Carne', produz: 10,
        ingredientes: [{ nome: 'Abóbora', qtd: 36 }, { nome: 'Pão', qtd: 36 }, { nome: 'Carne', qtd: 72 }] },
      { tier: 0, label: 'Enguia', nome: 'Ensopado de Enguia', produz: 1,
        ingredientes: [{ nome: 'Enguia', qtd: 1 }, { nome: 'Planta Rara', qtd: 1 }] },
    ],
  },
  {
    id: 'sanduiches',
    nome: 'Sanduíches',
    icone: '🥪',
    tiers: [
      { tier: 5, nome: 'Sanduíche de Cabra', produz: 10,
        ingredientes: [{ nome: 'Pão', qtd: 4 }, { nome: 'Manteiga', qtd: 2 }, { nome: 'Cabra', qtd: 8 }] },
      { tier: 6, nome: 'Sanduíche de Carneiro', produz: 10,
        ingredientes: [{ nome: 'Pão', qtd: 12 }, { nome: 'Carneiro', qtd: 24 }, { nome: 'Manteiga', qtd: 6 }] },
      { tier: 8, nome: 'Sanduíche de Carne', produz: 10,
        ingredientes: [{ nome: 'Pão', qtd: 36 }, { nome: 'Carne', qtd: 72 }, { nome: 'Manteiga', qtd: 18 }] },
      { tier: 0, label: 'Lurcher', nome: 'Sanduíche Lurcher', produz: 1,
        ingredientes: [{ nome: 'Peixe Raro', qtd: 1 }, { nome: 'Vegetal', qtd: 1 }] },
    ],
  },
  {
    id: 'especiais',
    nome: 'Especiais',
    icone: '⭐',
    tiers: [
      { tier: 0, label: 'Lula', nome: 'Salada de Lula', produz: 1,
        ingredientes: [{ nome: 'Feijão', qtd: 1 }, { nome: 'Cogumelo', qtd: 1 }, { nome: 'Lula', qtd: 1 }] },
      { tier: 0, label: 'Caranguejo', nome: 'Omelete de Caranguejo', produz: 1,
        ingredientes: [{ nome: 'Caranguejo', qtd: 1 }, { nome: 'Ovo', qtd: 1 }] },
      { tier: 0, label: 'Enguia', nome: 'Ensopado de Enguia', produz: 1,
        ingredientes: [{ nome: 'Enguia', qtd: 1 }, { nome: 'Planta Rara', qtd: 1 }] },
      { tier: 0, label: 'Lurcher', nome: 'Sanduíche Lurcher', produz: 1,
        ingredientes: [{ nome: 'Peixe Raro', qtd: 1 }, { nome: 'Vegetal', qtd: 1 }] },
    ],
  },
]

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatNum(n) {
  if (!n && n !== 0) return '—'
  return n.toLocaleString('pt-BR')
}

const TIER_COLORS = {
  0: '#6366f1',
  1: '#64748b',
  2: '#78716c',
  3: '#94a3b8',
  4: '#22c55e',
  5: '#3b82f6',
  6: '#a855f7',
  7: '#eab308',
  8: '#ef4444',
}

// ─── Componente principal ────────────────────────────────────────────────────

export function Calculadora() {
  const [categoria, setCategoria] = useState('pocao') // 'pocao' | 'comida'
  const [itemId, setItemId] = useState(POCOES[0].id)
  const [tierIdx, setTierIdx] = useState(0)
  const [quantidade, setQuantidade] = useState(1)
  const [precoVenda, setPrecoVenda] = useState('')
  const [precosIngredientes, setPrecosIngredientes] = useState({})
  const [usarValorLoja, setUsarValorLoja] = useState(false)
  const [valorLoja, setValorLoja] = useState('')
  const [usarTaxaRetorno, setUsarTaxaRetorno] = useState(false)
  const [taxaRetorno, setTaxaRetorno] = useState('')

  const LISTA_ATIVA = categoria === 'pocao' ? POCOES : COMIDAS

  const pocao = LISTA_ATIVA.find(p => p.id === itemId)
  const receita = pocao?.tiers[tierIdx]

  // Trocar categoria (poção ↔ comida)
  const handleCategoriaChange = (nova) => {
    setCategoria(nova)
    setItemId(nova === 'pocao' ? POCOES[0].id : COMIDAS[0].id)
    setTierIdx(0)
    setPrecoVenda('')
  }

  // Resetar tier ao trocar item
  const handlePocaoChange = (id) => {
    setItemId(id)
    setTierIdx(0)
    setPrecoVenda('')
  }

  // Resetar preço de venda ao trocar tier
  const handleTierChange = (idx) => {
    setTierIdx(idx)
    setPrecoVenda('')
  }

  const getPrecoKey = (nome) =>
    `${categoria}-${itemId}-${receita?.tier}-${receita?.nome}-${nome}`

  const getPreco = (nome) =>
    precosIngredientes[getPrecoKey(nome)] ?? ''

  const setPreco = (nome, valor) => {
    setPrecosIngredientes(prev => ({
      ...prev,
      [getPrecoKey(nome)]: valor,
    }))
  }

  const qtdCrafts = Math.max(1, parseInt(quantidade) || 1)

  const linhas = useMemo(() => {
    if (!receita) return []
    return receita.ingredientes.map(ing => {
      const totalQtd = ing.qtd * qtdCrafts
      const preco = parseFloat(getPreco(ing.nome)) || 0
      const totalCusto = totalQtd * preco
      return { ...ing, totalQtd, preco, totalCusto }
    })
  }, [receita, qtdCrafts, precosIngredientes, itemId, categoria])

  const TAXA_COMPRA = 0.025  // 2.5% sobre o custo dos ingredientes
  const TAXA_VENDA  = 0.065  // 6.5% sobre o valor de venda

  // ── Taxa de retorno: calcula crafts extras em cascata ──────────────────────
  const taxaRetornoNum = usarTaxaRetorno ? Math.min(parseFloat(taxaRetorno) || 0, 60) : 0

  const { totalCraftsEstimado, detalheLotes } = useMemo(() => {
    if (!usarTaxaRetorno || taxaRetornoNum <= 0) {
      return { totalCraftsEstimado: qtdCrafts, detalheLotes: [] }
    }
    const lotes = []
    let lote = qtdCrafts
    let total = qtdCrafts
    while (true) {
      const extra = Math.floor(lote * (taxaRetornoNum / 100))
      if (extra === 0) break
      lotes.push(extra)
      total += extra
      lote = extra
    }
    return { totalCraftsEstimado: total, detalheLotes: lotes }
  }, [usarTaxaRetorno, taxaRetornoNum, qtdCrafts])

  const estimado = usarTaxaRetorno && taxaRetornoNum > 0

  const totalItens        = receita ? receita.produz * totalCraftsEstimado : 0
  const totalCusto        = linhas.reduce((s, l) => s + l.totalCusto, 0)
  const taxaCompraValor   = totalCusto * TAXA_COMPRA
  const totalCustoComTaxa = totalCusto + taxaCompraValor

  // Loja é cobrada para TODOS os crafts (incluindo os extras do retorno)
  const custoLoja       = usarValorLoja ? (parseFloat(valorLoja) || 0) * totalCraftsEstimado : 0
  const custoTotalFinal = totalCustoComTaxa + custoLoja

  const valorVendaBruto = (parseFloat(precoVenda) || 0) * totalItens
  const taxaVendaValor  = valorVendaBruto * TAXA_VENDA
  const valorVendaLiq   = valorVendaBruto - taxaVendaValor

  const lucro     = valorVendaLiq - custoTotalFinal
  const lucrativo = lucro >= 0

  return (
    <div className="calc-container">
      {/* ── Seleção ───────────────────────────────────────── */}
      <div className="calc-selecao">

        {/* Toggle poção / comida */}
        <div className="calc-categoria-toggle">
          <button
            className={`calc-categoria-btn ${categoria === 'pocao' ? 'active' : ''}`}
            onClick={() => handleCategoriaChange('pocao')}
          >
            🧪 Poção
          </button>
          <button
            className={`calc-categoria-btn ${categoria === 'comida' ? 'active' : ''}`}
            onClick={() => handleCategoriaChange('comida')}
          >
            🍖 Comida
          </button>
        </div>

        <div className="calc-selecao-grid">
          {/* Tipo de poção / comida */}
          <div className="form-group">
            <label>{categoria === 'pocao' ? 'Tipo de Poção' : 'Tipo de Comida'}</label>
            <select
              value={itemId}
              onChange={e => handlePocaoChange(e.target.value)}
            >
              {LISTA_ATIVA.map(p => (
                <option key={p.id} value={p.id}>
                  {p.icone} {p.nome}
                </option>
              ))}
            </select>
          </div>

          {/* Tier */}
          <div className="form-group">
            <label>Tier</label>
            <div className="calc-tier-buttons">
              {pocao?.tiers.map((t, i) => (
                <button
                  key={i}
                  className={`calc-tier-btn ${i === tierIdx ? 'active' : ''}`}
                  style={{ '--tier-color': TIER_COLORS[t.tier] ?? '#6366f1' }}
                  onClick={() => handleTierChange(i)}
                >
                  {t.label ?? `T${t.tier}`}
                </button>
              ))}
            </div>
          </div>

          {/* Quantidade de crafts */}
          <div className="form-group form-group-sm">
            <label>Quantidade de Crafts</label>
            <input
              type="number"
              min="1"
              value={quantidade}
              onChange={e => setQuantidade(e.target.value)}
            />
          </div>
        </div>

        {/* Título da receita */}
        {receita && (
          <div className="calc-receita-titulo">
            <span className="calc-pocao-icone">{pocao.icone}</span>
            <span className="calc-pocao-nome">{receita.nome}</span>
            <span
              className="calc-tier-badge"
              style={{ background: TIER_COLORS[receita.tier] ?? '#6366f1' }}
            >
              {receita.label ?? `T${receita.tier}`}
            </span>
            <span className="calc-produz-info">
              Produz <strong>{receita.produz}</strong> por craft
              → <strong>{totalItens}</strong> no total
              {estimado && <span className="calc-estimado-tag">* Estimado</span>}
            </span>
          </div>
        )}
      </div>

      {/* ── Tabela de ingredientes ────────────────────────── */}
      {receita && (
        <div className="calc-section">
          <h3 className="calc-section-title">Ingredientes</h3>
          <div className="calc-table-wrapper">
            <table className="calc-table">
              <thead>
                <tr>
                  <th>Ingrediente</th>
                  <th className="text-right">Qtd / Craft</th>
                  <th className="text-right">Total Necessário</th>
                  <th className="text-right">Preço Unitário</th>
                  <th className="text-right">Custo Total</th>
                </tr>
              </thead>
              <tbody>
                {linhas.map(l => (
                  <tr key={l.nome}>
                    <td className="calc-ing-nome">{l.nome}</td>
                    <td className="text-right calc-mono">{formatNum(l.qtd)}</td>
                    <td className="text-right calc-mono calc-bold">{formatNum(l.totalQtd)}</td>
                    <td className="text-right">
                      <input
                        className="calc-price-input"
                        type="number"
                        min="0"
                        placeholder="0"
                        value={getPreco(l.nome)}
                        onChange={e => setPreco(l.nome, e.target.value)}
                      />
                    </td>
                    <td className="text-right calc-mono calc-custo">
                      {l.totalCusto > 0 ? formatNum(l.totalCusto) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="calc-total-row">
                  <td colSpan={4} className="calc-total-label">Subtotal dos Ingredientes</td>
                  <td className="text-right calc-mono calc-custo calc-bold">
                    {totalCusto > 0 ? formatNum(totalCusto) : '—'}
                  </td>
                </tr>
                <tr className="calc-taxa-row">
                  <td colSpan={4} className="calc-total-label calc-taxa-label">
                    Taxa de Compra (2,5%)
                  </td>
                  <td className="text-right calc-mono calc-taxa-val">
                    {taxaCompraValor > 0 ? `+ ${formatNum(Math.round(taxaCompraValor))}` : '—'}
                  </td>
                </tr>
                <tr className="calc-total-row calc-total-final">
                  <td colSpan={4} className="calc-total-label">Custo Total com Taxas</td>
                  <td className="text-right calc-mono calc-custo calc-bold">
                    {totalCustoComTaxa > 0 ? formatNum(Math.round(totalCustoComTaxa)) : '—'}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* ── Valor da loja ────────────────────────────────── */}
      {receita && (
        <div className="calc-section calc-loja-section">
          <label className="calc-loja-checkbox-label">
            <input
              type="checkbox"
              checked={usarValorLoja}
              onChange={e => {
                setUsarValorLoja(e.target.checked)
                if (!e.target.checked) setValorLoja('')
              }}
            />
            Informar valor da loja?
          </label>
          {usarValorLoja && (
            <div className="calc-loja-input-wrap">
              <input
                className="calc-venda-input"
                type="number"
                min="0"
                placeholder="Valor por craft..."
                value={valorLoja}
                onChange={e => setValorLoja(e.target.value)}
              />
              {custoLoja > 0 && (
                <span className="calc-loja-total">
                  Total loja: <strong>{formatNum(Math.round(custoLoja))}</strong>
                  <span className="calc-loja-detalhe">({formatNum(parseFloat(valorLoja))} × {qtdCrafts} craft{qtdCrafts > 1 ? 's' : ''})</span>
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Taxa de retorno ──────────────────────────────── */}
      {receita && (
        <div className="calc-section calc-loja-section">
          <label className="calc-loja-checkbox-label">
            <input
              type="checkbox"
              checked={usarTaxaRetorno}
              onChange={e => {
                setUsarTaxaRetorno(e.target.checked)
                if (!e.target.checked) setTaxaRetorno('')
              }}
            />
            Informar taxa de retorno?
          </label>
          {usarTaxaRetorno && (
            <div className="calc-loja-input-wrap">
              <div className="calc-retorno-input-group">
                <input
                  className="calc-venda-input calc-retorno-input"
                  type="number"
                  min="0"
                  max="60"
                  placeholder="% de retorno (máx. 60)..."
                  value={taxaRetorno}
                  onChange={e => {
                    const v = parseFloat(e.target.value)
                    if (e.target.value === '' || v <= 60) setTaxaRetorno(e.target.value)
                  }}
                />
                <span className="calc-retorno-pct">%</span>
              </div>
              {taxaRetornoNum > 0 && detalheLotes.length > 0 && (
                <div className="calc-retorno-detalhe">
                  <span className="calc-retorno-lotes">
                    {qtdCrafts}
                    {detalheLotes.map((l, i) => (
                      <span key={i}> + {l}</span>
                    ))}
                    {' '}= <strong>{totalCraftsEstimado} crafts estimados</strong>
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Resumo financeiro ────────────────────────────── */}
      {receita && (
        <div className="calc-section">
          <h3 className="calc-section-title">Resumo</h3>
          <div className="calc-resumo-grid">

            {/* Produção */}
            <div className="calc-resumo-card calc-card-prod">
              <span className="calc-card-icon">⚗️</span>
              <span className="calc-card-label">
                Itens Produzidos{estimado && <span className="calc-estimado-badge">*</span>}
              </span>
              <span className="calc-card-valor">{formatNum(totalItens)}</span>
              <div className="calc-taxa-detalhe">
                <span>{totalCraftsEstimado}× craft × {receita.produz} por craft</span>
                {estimado && (
                  <span className="calc-estimado-nota">
                    * Estimado — base: {qtdCrafts} + retorno {taxaRetornoNum}%
                  </span>
                )}
              </div>
            </div>

            {/* Custo total */}
            <div className="calc-resumo-card calc-card-custo">
              <span className="calc-card-icon">💸</span>
              <span className="calc-card-label">Custo Total (c/ taxas)</span>
              <span className="calc-card-valor calc-red">
                {custoTotalFinal > 0 ? formatNum(Math.round(custoTotalFinal)) : '—'}
              </span>
              <div className="calc-taxa-detalhe">
                <span>Ingredientes: {totalCusto > 0 ? formatNum(totalCusto) : '—'}</span>
                <span className="calc-taxa-chip">
                  + Taxa compra 2,5%: {taxaCompraValor > 0 ? formatNum(Math.round(taxaCompraValor)) : '—'}
                </span>
                {custoLoja > 0 && (
                  <span className="calc-taxa-chip">
                    + Loja: {formatNum(Math.round(custoLoja))}
                  </span>
                )}
              </div>
            </div>

            {/* Valor de venda */}
            <div className="calc-resumo-card calc-card-venda">
              <span className="calc-card-icon">🏷️</span>
              <span className="calc-card-label">Preço de Venda (por unidade)</span>
              <input
                className="calc-venda-input"
                type="number"
                min="0"
                placeholder="Digite o preço..."
                value={precoVenda}
                onChange={e => setPrecoVenda(e.target.value)}
              />
              <div className="calc-taxa-detalhe">
                <span>Bruto: {valorVendaBruto > 0 ? formatNum(Math.round(valorVendaBruto)) : '—'}</span>
                {taxaVendaValor > 0 && (
                  <span className="calc-taxa-chip">
                    − Taxa venda 6,5%: {formatNum(Math.round(taxaVendaValor))}
                  </span>
                )}
                {valorVendaLiq > 0 && (
                  <span className="calc-taxa-liq">
                    Líquido: {formatNum(Math.round(valorVendaLiq))}
                  </span>
                )}
              </div>
            </div>

            {/* Lucro */}
            <div className={`calc-resumo-card calc-card-lucro ${precoVenda ? (lucrativo ? 'lucrativo' : 'prejuizo') : ''}`}>
              <span className="calc-card-icon">{precoVenda ? (lucrativo ? '📈' : '📉') : '💰'}</span>
              <span className="calc-card-label">
                {lucrativo ? 'Lucro Líquido' : 'Prejuízo'}
                {estimado && <span className="calc-estimado-badge">*</span>}
              </span>
              <span className={`calc-card-valor ${precoVenda ? (lucrativo ? 'calc-green' : 'calc-red') : ''}`}>
                {precoVenda && (custoTotalFinal > 0 || valorVendaBruto > 0)
                  ? `${lucrativo ? '+' : ''}${formatNum(Math.round(lucro))}`
                  : '—'}
              </span>
              {precoVenda && custoTotalFinal > 0 && (
                <div className="calc-taxa-detalhe">
                  <span>Venda liq.: {formatNum(Math.round(valorVendaLiq))}</span>
                  <span>− Custo total: {formatNum(Math.round(custoTotalFinal))}</span>
                  {estimado && (
                    <span className="calc-estimado-nota">* Estimado</span>
                  )}
                </div>
              )}
            </div>

          </div>
        </div>
      )}
    </div>
  )
}
