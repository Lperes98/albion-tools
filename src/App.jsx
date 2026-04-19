import { useState, useEffect } from 'react'
import { Header } from './components/Header'
import { SearchBar } from './components/SearchBar'
import { FilterBar } from './components/FilterBar'
import { ItemList } from './components/ItemList'
import { PriceTable } from './components/PriceTable'
import { PriceHistory } from './components/PriceHistory'
import { Favoritos } from './components/Favoritos'
import { CraftTab } from './components/craft'
import { Calculadora } from './components/Calculadora'
import { RentabilidadeTab, RentabilidadeViagemTab, RentabilidadeBrokenMarketTab, RentabilidadeCidadeTab } from './components/rentabilidade'
import { ComprasTab } from './components/compras'
import { ComparativoTab } from './components/comparativo'
import { useFavoritos } from './hooks/useFavoritos'
import { useDarkMode } from './hooks/useDarkMode'
import { carregarItens, buscarItensPorNome, consultarPrecos, QUALIDADES } from './services/albionApi'
import { connectWebSocket, disconnectWebSocket, getWsStatus, subscribeWs, subscribeWsData } from './services/websocketClient'

function App() {
  // Aba ativa
  const [abaAtiva, setAbaAtiva] = useState('mercado') // 'mercado' | 'craft' | 'calculadora' | 'rentabilidade'

  // Estado principal
  const [todosItens, setTodosItens] = useState([])
  const [itensEncontrados, setItensEncontrados] = useState([])
  const [selectedItem, setSelectedItem] = useState(null)
  const [precos, setPrecos] = useState([])

  // Filtros
  const [servidor, setServidor] = useState('west')
  const [qualidade, setQualidade] = useState(1)

  // Loading states
  const [loadingItens, setLoadingItens] = useState(true)
  const [loadingBusca, setLoadingBusca] = useState(false)
  const [loadingPrecos, setLoadingPrecos] = useState(false)

  // WebSocket
  const [wsStatus, setWsStatus]         = useState(getWsStatus())
  const [wsDataVersion, setWsDataVersion] = useState(0)

  // Hooks customizados
  const { favoritos, isFavorito, toggleFavorito, removerFavorito } = useFavoritos()
  const { darkMode, toggleDarkMode } = useDarkMode()

  useEffect(() => subscribeWs(setWsStatus), [])
  useEffect(() => subscribeWsData(v => {
    setWsDataVersion(v)
    // Re-busca preços da API quando chega dado novo do WS com item selecionado
    if (selectedItem) handleSelectItem(selectedItem)
  }), [selectedItem])

  // Carrega lista de itens ao iniciar
  useEffect(() => {
    const init = async () => {
      try {
        const items = await carregarItens()
        setTodosItens(items)
      } catch (error) {
        console.error('Erro ao carregar itens:', error)
      }
      setLoadingItens(false)
    }
    init()
  }, [])

  // Busca itens por nome
  const handleSearch = (termo, tiers) => {
    setLoadingBusca(true)
    const resultados = buscarItensPorNome(todosItens, termo, tiers)
    setItensEncontrados(resultados)
    setSelectedItem(null)
    setPrecos([])
    setLoadingBusca(false)
  }

  // Seleciona item e busca preços
  const handleSelectItem = async (item) => {
    setSelectedItem(item)
    setLoadingPrecos(true)

    try {
      const dados = await consultarPrecos([item.uniqueName], servidor, qualidade)
      setPrecos(dados)
    } catch (error) {
      console.error('Erro ao consultar preços:', error)
      setPrecos([])
    }

    setLoadingPrecos(false)
  }

  // Atualiza preços quando muda servidor ou qualidade
  useEffect(() => {
    if (selectedItem) {
      handleSelectItem(selectedItem)
    }
  }, [servidor, qualidade])

  return (
    <div className="app">
      <Header darkMode={darkMode} toggleDarkMode={toggleDarkMode} />

      {/* Navegação por abas */}
      <nav className="tabs-nav">
        <button
          className={`tab-button ${abaAtiva === 'mercado' ? 'active' : ''}`}
          onClick={() => setAbaAtiva('mercado')}
        >
          <span className="tab-icon">📊</span>
          Mercado
        </button>
        <button
          className={`tab-button ${abaAtiva === 'craft' ? 'active' : ''}`}
          onClick={() => setAbaAtiva('craft')}
        >
          <span className="tab-icon">🔨</span>
          Craft
        </button>
        <button
          className={`tab-button ${abaAtiva === 'calculadora' ? 'active' : ''}`}
          onClick={() => setAbaAtiva('calculadora')}
        >
          <span className="tab-icon">🧪</span>
          Calculadora
        </button>
        <button
          className={`tab-button ${abaAtiva === 'rentabilidade' ? 'active' : ''}`}
          onClick={() => setAbaAtiva('rentabilidade')}
        >
          <span className="tab-icon">📈</span>
          Rentabilidade
        </button>
        <button
          className={`tab-button ${abaAtiva === 'viagem' ? 'active' : ''}`}
          onClick={() => setAbaAtiva('viagem')}
        >
          <span className="tab-icon">🚢</span>
          Rent. Viagem
        </button>
        <button
          className={`tab-button ${abaAtiva === 'brokenmarket' ? 'active' : ''}`}
          onClick={() => setAbaAtiva('brokenmarket')}
        >
          <span className="tab-icon">💹</span>
          Rent. Broken Market
        </button>
        <button
          className={`tab-button ${abaAtiva === 'cidade' ? 'active' : ''}`}
          onClick={() => setAbaAtiva('cidade')}
        >
          <span className="tab-icon">🏙️</span>
          Rent. por Cidade
        </button>
        <button
          className={`tab-button ${abaAtiva === 'compras' ? 'active' : ''}`}
          onClick={() => setAbaAtiva('compras')}
        >
          <span className="tab-icon">🛒</span>
          Compras
        </button>
        <button
          className={`tab-button ${abaAtiva === 'comparativo' ? 'active' : ''}`}
          onClick={() => setAbaAtiva('comparativo')}
        >
          <span className="tab-icon">🔎</span>
          Comparativo
        </button>
      </nav>

      <main className="main-content">
        {/* Aba Mercado */}
        {abaAtiva === 'mercado' && (
          <>
            <aside className="sidebar">
              <Favoritos
                favoritos={favoritos}
                onSelectItem={handleSelectItem}
                onRemoveFavorito={removerFavorito}
                selectedItem={selectedItem}
              />
            </aside>

            <div className="content">
              {loadingItens ? (
                <div className="loading-screen">
                  <div className="spinner"></div>
                  <p>Carregando lista de itens do Albion Online...</p>
                </div>
              ) : (
                <>
                  <SearchBar onSearch={handleSearch} loading={loadingBusca} />
                  <FilterBar
                    servidor={servidor}
                    setServidor={setServidor}
                    qualidade={qualidade}
                    setQualidade={setQualidade}
                    wsStatus={wsStatus}
                    onConnect={connectWebSocket}
                    onDisconnect={disconnectWebSocket}
                    onRefresh={() => selectedItem && handleSelectItem(selectedItem)}
                    canRefresh={!!selectedItem}
                    loadingPrecos={loadingPrecos}
                  />

                  <ItemList
                    itens={itensEncontrados}
                    onSelectItem={handleSelectItem}
                    selectedItem={selectedItem}
                    isFavorito={isFavorito}
                    onToggleFavorito={toggleFavorito}
                  />

                  {loadingPrecos ? (
                    <div className="loading">
                      <div className="spinner"></div>
                      <p>Consultando preços...</p>
                    </div>
                  ) : (
                    selectedItem && (
                      <div className="price-section">
                        <PriceTable
                          item={selectedItem}
                          dados={precos}
                          qualidade={QUALIDADES[qualidade]}
                          servidor={servidor}
                          wsDataVersion={wsDataVersion}
                        />
                        <PriceHistory
                          item={selectedItem}
                          servidor={servidor}
                          qualidade={qualidade}
                        />
                      </div>
                    )
                  )}
                </>
              )}
            </div>
          </>
        )}

        {/* Aba Craft */}
        {abaAtiva === 'craft' && (
          <div className="content content-full">
            {loadingItens ? (
              <div className="loading-screen">
                <div className="spinner"></div>
                <p>Carregando lista de itens do Albion Online...</p>
              </div>
            ) : (
              <CraftTab
                servidor={servidor}
                itensDisponiveis={todosItens}
              />
            )}
          </div>
        )}

        {/* Aba Compras */}
        {abaAtiva === 'compras' && (
          <div className="content content-full">
            {loadingItens ? (
              <div className="loading-screen">
                <div className="spinner"></div>
                <p>Carregando lista de itens...</p>
              </div>
            ) : (
              <ComprasTab itensDisponiveis={todosItens} />
            )}
          </div>
        )}

        {/* Aba Comparativo */}
        {abaAtiva === 'comparativo' && (
          <div className="content content-full">
            {loadingItens ? (
              <div className="loading-screen">
                <div className="spinner"></div>
                <p>Carregando lista de itens...</p>
              </div>
            ) : (
              <ComparativoTab itensDisponiveis={todosItens} servidor={servidor} setServidor={setServidor} />
            )}
          </div>
        )}

        {/* Aba Calculadora */}
        {abaAtiva === 'calculadora' && (
          <div className="content content-full">
            <Calculadora />
          </div>
        )}

        {/* Aba Rentabilidade de Viagem */}
        {abaAtiva === 'viagem' && (
          <div className="content content-full">
            {loadingItens ? (
              <div className="loading-screen">
                <div className="spinner"></div>
                <p>Carregando lista de itens...</p>
              </div>
            ) : (
              <RentabilidadeViagemTab servidor={servidor} setServidor={setServidor} itensDisponiveis={todosItens} />
            )}
          </div>
        )}

        {/* Aba Rentabilidade por Cidade */}
        {abaAtiva === 'cidade' && (
          <div className="content content-full">
            {loadingItens ? (
              <div className="loading-screen">
                <div className="spinner"></div>
                <p>Carregando lista de itens...</p>
              </div>
            ) : (
              <RentabilidadeCidadeTab servidor={servidor} setServidor={setServidor} itensDisponiveis={todosItens} />
            )}
          </div>
        )}

        {/* Aba Broken Market */}
        {abaAtiva === 'brokenmarket' && (
          <div className="content content-full">
            {loadingItens ? (
              <div className="loading-screen">
                <div className="spinner"></div>
                <p>Carregando lista de itens...</p>
              </div>
            ) : (
              <RentabilidadeBrokenMarketTab servidor={servidor} setServidor={setServidor} itensDisponiveis={todosItens} />
            )}
          </div>
        )}

        {/* Aba Rentabilidade */}
        {abaAtiva === 'rentabilidade' && (
          <div className="content content-full">
            {loadingItens ? (
              <div className="loading-screen">
                <div className="spinner"></div>
                <p>Carregando lista de itens...</p>
              </div>
            ) : (
              <RentabilidadeTab servidor={servidor} setServidor={setServidor} itensDisponiveis={todosItens} />
            )}
          </div>
        )}
      </main>

      <footer className="footer">
        <p>
          Dados fornecidos pelo{' '}
          <a href="https://www.albion-online-data.com/" target="_blank" rel="noopener noreferrer">
            Albion Online Data Project
          </a>
        </p>
      </footer>
    </div>
  )
}

export default App
