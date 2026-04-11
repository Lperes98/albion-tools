import { useState, useEffect, useCallback, useMemo } from 'react'
import { consultarPrecos, CIDADES, CIDADES_API } from '../services/albionApi'

// ═══════════════════════════════════════════════════════════════════════════
// ESTRUTURA DE DADOS
// ═══════════════════════════════════════════════════════════════════════════

const STORAGE_KEY = 'albion_craft_data'
const HISTORICO_KEY = 'albion_craft_historico'
const CONFIG_KEY = 'albion_craft_config'

// Carrega dados do localStorage
function carregarDados() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      const data = JSON.parse(saved)
      return {
        bankroll: data.bankroll || 0,
        bankrollInicial: data.bankrollInicial || 0,
        compras: data.compras || [],
        crafts: data.crafts || [],
        taxaCraft: data.taxaCraft || 0
      }
    }
  } catch (e) {
    console.warn('Erro ao carregar dados de craft:', e)
  }
  return {
    bankroll: 0,
    bankrollInicial: 0,
    compras: [],
    crafts: [],
    taxaCraft: 0
  }
}

// Carrega histórico do localStorage
function carregarHistorico() {
  try {
    const saved = localStorage.getItem(HISTORICO_KEY)
    if (saved) {
      return JSON.parse(saved)
    }
  } catch (e) {
    console.warn('Erro ao carregar histórico:', e)
  }
  return []
}

// Carrega configurações
function carregarConfig() {
  try {
    const saved = localStorage.getItem(CONFIG_KEY)
    if (saved) {
      return JSON.parse(saved)
    }
  } catch (e) {
    console.warn('Erro ao carregar config:', e)
  }
  return {
    ultimaLimpeza: null,
    criadoEm: new Date().toISOString()
  }
}

// Salva dados no localStorage
function salvarDados(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch (e) {
    console.warn('Erro ao salvar dados de craft:', e)
  }
}

// Salva histórico
function salvarHistorico(historico) {
  try {
    localStorage.setItem(HISTORICO_KEY, JSON.stringify(historico))
  } catch (e) {
    console.warn('Erro ao salvar histórico:', e)
  }
}

// Salva config
function salvarConfig(config) {
  try {
    localStorage.setItem(CONFIG_KEY, JSON.stringify(config))
  } catch (e) {
    console.warn('Erro ao salvar config:', e)
  }
}

// Calcula tamanho do localStorage
function calcularTamanhoStorage() {
  let total = 0
  for (const key in localStorage) {
    if (localStorage.hasOwnProperty(key)) {
      total += localStorage[key].length * 2 // UTF-16 = 2 bytes por char
    }
  }
  return total
}

export function useCraft(servidor = 'west') {
  // Estado principal
  const [bankroll, setBankroll] = useState(0)
  const [bankrollInicial, setBankrollInicial] = useState(0)
  const [compras, setCompras] = useState([])
  const [crafts, setCrafts] = useState([])
  const [taxaCraft, setTaxaCraft] = useState(0)
  const [loading, setLoading] = useState(false)

  // Histórico de operações finalizadas
  const [historico, setHistorico] = useState([])

  // Configurações
  const [config, setConfig] = useState({ ultimaLimpeza: null, criadoEm: null })

  // Carrega dados salvos ao iniciar
  useEffect(() => {
    const data = carregarDados()
    setBankroll(data.bankroll)
    setBankrollInicial(data.bankrollInicial)
    setCompras(data.compras)
    setCrafts(data.crafts)
    setTaxaCraft(data.taxaCraft)

    setHistorico(carregarHistorico())
    setConfig(carregarConfig())
  }, [])

  // Salva dados quando mudam
  useEffect(() => {
    salvarDados({ bankroll, bankrollInicial, compras, crafts, taxaCraft })
  }, [bankroll, bankrollInicial, compras, crafts, taxaCraft])

  // Salva histórico quando muda
  useEffect(() => {
    if (historico.length > 0) {
      salvarHistorico(historico)
    }
  }, [historico])

  // ═══════════════════════════════════════════════════════════════════════════
  // FUNÇÕES DE BANKROLL
  // ═══════════════════════════════════════════════════════════════════════════

  const definirBankroll = useCallback((valor) => {
    const valorNumerico = parseFloat(valor) || 0
    setBankroll(valorNumerico)
    setBankrollInicial(valorNumerico)
  }, [])

  const ajustarBankroll = useCallback((valor) => {
    setBankroll(prev => prev + valor)
  }, [])

  // ═══════════════════════════════════════════════════════════════════════════
  // FUNÇÕES DE COMPRAS
  // ═══════════════════════════════════════════════════════════════════════════

  const adicionarCompra = useCallback((compra) => {
    const novaCompra = {
      id: `compra_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      itemId: compra.itemId || '',
      itemNome: compra.itemNome,
      quantidade: parseFloat(compra.quantidade) || 0,
      valorUnitario: parseFloat(compra.valorUnitario) || 0,
      cidade: compra.cidade,
      timestamp: new Date().toISOString()
    }

    const custoTotal = novaCompra.quantidade * novaCompra.valorUnitario

    setCompras(prev => [...prev, novaCompra])
    setBankroll(prev => prev - custoTotal)
  }, [])

  const removerCompra = useCallback((id) => {
    setCompras(prev => {
      const compra = prev.find(c => c.id === id)
      if (compra) {
        const custoTotal = compra.quantidade * compra.valorUnitario
        setBankroll(b => b + custoTotal)
      }
      return prev.filter(c => c.id !== id)
    })
  }, [])

  const editarCompra = useCallback((id, novosDados) => {
    setCompras(prev => {
      const index = prev.findIndex(c => c.id === id)
      if (index === -1) return prev

      const compraAntiga = prev[index]
      const custoAntigo = compraAntiga.quantidade * compraAntiga.valorUnitario

      const compraAtualizada = {
        ...compraAntiga,
        ...novosDados,
        quantidade: parseFloat(novosDados.quantidade) || compraAntiga.quantidade,
        valorUnitario: parseFloat(novosDados.valorUnitario) || compraAntiga.valorUnitario
      }
      const custoNovo = compraAtualizada.quantidade * compraAtualizada.valorUnitario

      setBankroll(b => b + custoAntigo - custoNovo)

      const novaLista = [...prev]
      novaLista[index] = compraAtualizada
      return novaLista
    })
  }, [])

  // ═══════════════════════════════════════════════════════════════════════════
  // FUNÇÕES DE CRAFT
  // ═══════════════════════════════════════════════════════════════════════════

  const buscarMelhorPreco = useCallback(async (itemId) => {
    try {
      const dados = await consultarPrecos([itemId], servidor, 1)

      if (!dados || dados.length === 0) {
        return { melhorPreco: 0, melhorCidade: 'N/A', precosPorCidade: [] }
      }

      const precosPorCidade = []
      let melhorPreco = 0
      let melhorCidade = 'N/A'

      for (const registro of dados) {
        const cidadeIndex = CIDADES_API.indexOf(registro.city)
        const cidadeNome = cidadeIndex >= 0 ? CIDADES[cidadeIndex] : registro.city

        const preco = registro.sell_price_min || 0

        precosPorCidade.push({
          cidade: cidadeNome,
          preco,
          precoCompra: registro.buy_price_max || 0
        })

        if (preco > melhorPreco) {
          melhorPreco = preco
          melhorCidade = cidadeNome
        }
      }

      precosPorCidade.sort((a, b) => b.preco - a.preco)

      return { melhorPreco, melhorCidade, precosPorCidade }
    } catch (error) {
      console.error('Erro ao buscar preços:', error)
      return { melhorPreco: 0, melhorCidade: 'Erro', precosPorCidade: [] }
    }
  }, [servidor])

  const adicionarCraft = useCallback(async (craft) => {
    setLoading(true)

    try {
      const { melhorPreco, melhorCidade, precosPorCidade } = await buscarMelhorPreco(craft.itemId)

      const custoCraft = parseFloat(craft.custoCraft) || 0

      const novoCraft = {
        id: `craft_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        itemId: craft.itemId,
        itemNome: craft.itemNome,
        quantidade: parseFloat(craft.quantidade) || 0,
        custoCraft,
        melhorPreco,
        melhorCidade,
        precosPorCidade,
        timestamp: new Date().toISOString()
      }

      setCrafts(prev => [...prev, novoCraft])

      // Deduz custo do craft do bankroll
      if (custoCraft > 0) {
        setBankroll(prev => prev - custoCraft)
      }
    } catch (error) {
      console.error('Erro ao adicionar craft:', error)
    }

    setLoading(false)
  }, [buscarMelhorPreco])

  const removerCraft = useCallback((id) => {
    setCrafts(prev => {
      const craft = prev.find(c => c.id === id)
      // Devolve o custo do craft ao bankroll (só se não foi vendido)
      if (craft && craft.custoCraft > 0 && !craft.vendido) {
        setBankroll(b => b + craft.custoCraft)
      }
      return prev.filter(c => c.id !== id)
    })
  }, [])

  // Marca craft como vendido
  const marcarVendido = useCallback((id, valorVenda) => {
    setCrafts(prev => prev.map(craft => {
      if (craft.id !== id) return craft

      const valorTotal = parseFloat(valorVenda) || (craft.quantidade * craft.melhorPreco)

      // Adiciona o valor da venda ao bankroll
      setBankroll(b => b + valorTotal)

      return {
        ...craft,
        vendido: true,
        valorVendido: valorTotal,
        dataVenda: new Date().toISOString()
      }
    }))
  }, [])

  // Desmarcar vendido (caso erro)
  const desmarcarVendido = useCallback((id) => {
    setCrafts(prev => prev.map(craft => {
      if (craft.id !== id || !craft.vendido) return craft

      // Remove o valor da venda do bankroll
      setBankroll(b => b - (craft.valorVendido || 0))

      return {
        ...craft,
        vendido: false,
        valorVendido: 0,
        dataVenda: null
      }
    }))
  }, [])

  const atualizarPrecosCraft = useCallback(async (id) => {
    const craft = crafts.find(c => c.id === id)
    if (!craft) return

    setLoading(true)

    try {
      const { melhorPreco, melhorCidade, precosPorCidade } = await buscarMelhorPreco(craft.itemId)

      setCrafts(prev => prev.map(c =>
        c.id === id
          ? { ...c, melhorPreco, melhorCidade, precosPorCidade, timestamp: new Date().toISOString() }
          : c
      ))
    } catch (error) {
      console.error('Erro ao atualizar preços:', error)
    }

    setLoading(false)
  }, [crafts, buscarMelhorPreco])

  const atualizarTodosPrecos = useCallback(async () => {
    setLoading(true)

    for (const craft of crafts) {
      try {
        const { melhorPreco, melhorCidade, precosPorCidade } = await buscarMelhorPreco(craft.itemId)

        setCrafts(prev => prev.map(c =>
          c.id === craft.id
            ? { ...c, melhorPreco, melhorCidade, precosPorCidade, timestamp: new Date().toISOString() }
            : c
        ))
      } catch (error) {
        console.error(`Erro ao atualizar ${craft.itemNome}:`, error)
      }
    }

    setLoading(false)
  }, [crafts, buscarMelhorPreco])

  // ═══════════════════════════════════════════════════════════════════════════
  // CÁLCULOS DE ROI
  // ═══════════════════════════════════════════════════════════════════════════

  const calculos = useMemo(() => {
    const gastoMateriais = compras.reduce((total, compra) => {
      return total + (compra.quantidade * compra.valorUnitario)
    }, 0)

    // Soma dos custos de craft individuais
    const gastoCraftTotal = crafts.reduce((total, craft) => {
      return total + (craft.custoCraft || 0)
    }, 0)

    // Separa crafts vendidos e não vendidos
    const craftsVendidos = crafts.filter(c => c.vendido)
    const craftsNaoVendidos = crafts.filter(c => !c.vendido)

    // Receita real (já vendidos)
    const receitaReal = craftsVendidos.reduce((total, craft) => {
      return total + (craft.valorVendido || 0)
    }, 0)

    // Receita projetada (ainda não vendidos)
    const receitaProjetada = craftsNaoVendidos.reduce((total, craft) => {
      return total + (craft.quantidade * craft.melhorPreco)
    }, 0)

    // Investimento = gastos com crafts não vendidos
    const investimentoMateriais = compras.reduce((total, compra) => {
      return total + (compra.quantidade * compra.valorUnitario)
    }, 0)

    const investimentoCraft = craftsNaoVendidos.reduce((total, craft) => {
      return total + (craft.custoCraft || 0)
    }, 0)

    const investimentoTotal = investimentoMateriais + investimentoCraft + taxaCraft

    // Gasto total histórico (tudo que foi gasto)
    const gastoTotal = gastoMateriais + gastoCraftTotal + taxaCraft

    // Lucro realizado (apenas dos vendidos)
    const custoVendidos = craftsVendidos.reduce((total, craft) => {
      return total + (craft.custoCraft || 0)
    }, 0)
    const lucroRealizado = receitaReal - custoVendidos

    // Lucro projetado (se vender tudo)
    const lucroProjetado = receitaProjetada - investimentoTotal

    const variacaoBankroll = bankroll - bankrollInicial

    // Melhor cidade para venda (apenas não vendidos)
    const cidadesPorReceita = {}
    for (const craft of craftsNaoVendidos) {
      for (const { cidade, preco } of craft.precosPorCidade || []) {
        if (!cidadesPorReceita[cidade]) cidadesPorReceita[cidade] = 0
        cidadesPorReceita[cidade] += craft.quantidade * preco
      }
    }

    let melhorCidadeGeral = 'N/A'
    let maiorReceitaCidade = 0
    for (const [cidade, receita] of Object.entries(cidadesPorReceita)) {
      if (receita > maiorReceitaCidade) {
        maiorReceitaCidade = receita
        melhorCidadeGeral = cidade
      }
    }

    return {
      gastoMateriais,
      gastoCraftTotal,
      taxaCraft,
      gastoTotal,
      investimentoTotal,
      receitaReal,
      receitaProjetada,
      lucroRealizado,
      lucroProjetado,
      variacaoBankroll,
      melhorCidadeGeral,
      maiorReceitaCidade,
      totalCompras: compras.length,
      totalCrafts: crafts.length,
      totalVendidos: craftsVendidos.length,
      totalNaoVendidos: craftsNaoVendidos.length,
      quantidadeItensProdzidos: crafts.reduce((t, c) => t + c.quantidade, 0),
      quantidadeVendidos: craftsVendidos.reduce((t, c) => t + c.quantidade, 0),
      quantidadeNaoVendidos: craftsNaoVendidos.reduce((t, c) => t + c.quantidade, 0)
    }
  }, [compras, crafts, taxaCraft, bankroll, bankrollInicial])

  // ═══════════════════════════════════════════════════════════════════════════
  // EXPORTAR / IMPORTAR JSON
  // ═══════════════════════════════════════════════════════════════════════════

  const exportarJSON = useCallback(() => {
    const dados = {
      versao: '1.0',
      exportadoEm: new Date().toISOString(),
      operacaoAtual: {
        bankroll,
        bankrollInicial,
        compras,
        crafts,
        taxaCraft,
        calculos
      },
      historico
    }

    const blob = new Blob([JSON.stringify(dados, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')

    const dataAtual = new Date().toISOString().split('T')[0]
    link.download = `albion-craft-${dataAtual}.json`
    link.href = url
    link.click()

    URL.revokeObjectURL(url)
  }, [bankroll, bankrollInicial, compras, crafts, taxaCraft, calculos, historico])

  const importarJSON = useCallback((arquivo) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()

      reader.onload = (e) => {
        try {
          const dados = JSON.parse(e.target.result)

          // Importa operação atual se existir
          if (dados.operacaoAtual) {
            const op = dados.operacaoAtual
            setBankroll(op.bankroll || 0)
            setBankrollInicial(op.bankrollInicial || 0)
            setCompras(op.compras || [])
            setCrafts(op.crafts || [])
            setTaxaCraft(op.taxaCraft || 0)
          }

          // Importa histórico se existir (merge com existente)
          if (dados.historico && Array.isArray(dados.historico)) {
            setHistorico(prev => {
              const idsExistentes = new Set(prev.map(h => h.id))
              const novos = dados.historico.filter(h => !idsExistentes.has(h.id))
              return [...prev, ...novos].sort((a, b) =>
                new Date(b.finalizadoEm) - new Date(a.finalizadoEm)
              )
            })
          }

          resolve({ success: true, message: 'Dados importados com sucesso!' })
        } catch (error) {
          reject({ success: false, message: 'Erro ao ler arquivo JSON' })
        }
      }

      reader.onerror = () => {
        reject({ success: false, message: 'Erro ao ler arquivo' })
      }

      reader.readAsText(arquivo)
    })
  }, [])

  // ═══════════════════════════════════════════════════════════════════════════
  // HISTÓRICO DE OPERAÇÕES
  // ═══════════════════════════════════════════════════════════════════════════

  const finalizarOperacao = useCallback(() => {
    if (compras.length === 0 && crafts.length === 0) return

    const operacaoFinalizada = {
      id: `op_${Date.now()}`,
      finalizadoEm: new Date().toISOString(),
      bankrollInicial,
      bankrollFinal: bankroll,
      compras: [...compras],
      crafts: [...crafts],
      taxaCraft,
      calculos: { ...calculos }
    }

    setHistorico(prev => [operacaoFinalizada, ...prev])

    // Limpa operação atual
    setBankroll(0)
    setBankrollInicial(0)
    setCompras([])
    setCrafts([])
    setTaxaCraft(0)
  }, [bankroll, bankrollInicial, compras, crafts, taxaCraft, calculos])

  const removerDoHistorico = useCallback((id) => {
    setHistorico(prev => prev.filter(h => h.id !== id))
  }, [])

  // ═══════════════════════════════════════════════════════════════════════════
  // LIMPEZA DE DADOS
  // ═══════════════════════════════════════════════════════════════════════════

  const limparTudo = useCallback(() => {
    // Limpa operação atual
    setBankroll(0)
    setBankrollInicial(0)
    setCompras([])
    setCrafts([])
    setTaxaCraft(0)

    // Limpa histórico
    setHistorico([])

    // Atualiza config
    const novaConfig = {
      ultimaLimpeza: new Date().toISOString(),
      criadoEm: new Date().toISOString()
    }
    setConfig(novaConfig)
    salvarConfig(novaConfig)

    // Remove do localStorage
    localStorage.removeItem(STORAGE_KEY)
    localStorage.removeItem(HISTORICO_KEY)
  }, [])

  const resetarOperacao = useCallback(() => {
    setBankroll(0)
    setBankrollInicial(0)
    setCompras([])
    setCrafts([])
    setTaxaCraft(0)
    localStorage.removeItem(STORAGE_KEY)
  }, [])

  // ═══════════════════════════════════════════════════════════════════════════
  // INFORMAÇÕES DE STORAGE
  // ═══════════════════════════════════════════════════════════════════════════

  const storageInfo = useMemo(() => {
    const tamanhoBytes = calcularTamanhoStorage()
    const tamanhoKB = (tamanhoBytes / 1024).toFixed(2)
    const tamanhoDB = tamanhoBytes

    // Calcula dias desde última limpeza
    let diasDesdeUltimaLimpeza = null
    if (config.ultimaLimpeza) {
      const diff = Date.now() - new Date(config.ultimaLimpeza).getTime()
      diasDesdeUltimaLimpeza = Math.floor(diff / (1000 * 60 * 60 * 24))
    } else if (config.criadoEm) {
      const diff = Date.now() - new Date(config.criadoEm).getTime()
      diasDesdeUltimaLimpeza = Math.floor(diff / (1000 * 60 * 60 * 24))
    }

    return {
      tamanhoBytes,
      tamanhoKB,
      ultimaLimpeza: config.ultimaLimpeza,
      diasDesdeUltimaLimpeza,
      totalOperacoesHistorico: historico.length,
      alertaLimpeza: diasDesdeUltimaLimpeza !== null && diasDesdeUltimaLimpeza >= 15
    }
  }, [config, historico])

  return {
    // Estado
    bankroll,
    bankrollInicial,
    compras,
    crafts,
    taxaCraft,
    loading,
    calculos,
    historico,
    storageInfo,

    // Ações Bankroll
    definirBankroll,
    ajustarBankroll,

    // Ações Compras
    adicionarCompra,
    removerCompra,
    editarCompra,

    // Ações Craft
    adicionarCraft,
    removerCraft,
    atualizarPrecosCraft,
    atualizarTodosPrecos,
    marcarVendido,
    desmarcarVendido,

    // Ações Taxa
    setTaxaCraft,

    // Ações Histórico
    finalizarOperacao,
    removerDoHistorico,

    // Export/Import
    exportarJSON,
    importarJSON,

    // Limpeza
    resetarOperacao,
    limparTudo
  }
}
