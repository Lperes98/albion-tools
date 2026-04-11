import { Bankroll } from './Bankroll'
import { ComprasTable } from './ComprasTable'
import { CraftTable } from './CraftTable'
import { DashboardROI } from './DashboardROI'
import { DataManager } from './DataManager'
import { useCraft } from '../../hooks/useCraft'

export function CraftTab({ servidor, itensDisponiveis }) {
  const {
    bankroll,
    bankrollInicial,
    compras,
    crafts,
    taxaCraft,
    loading,
    calculos,
    historico,
    storageInfo,
    definirBankroll,
    ajustarBankroll,
    adicionarCompra,
    removerCompra,
    adicionarCraft,
    removerCraft,
    atualizarPrecosCraft,
    atualizarTodosPrecos,
    marcarVendido,
    desmarcarVendido,
    setTaxaCraft,
    finalizarOperacao,
    removerDoHistorico,
    exportarJSON,
    importarJSON,
    resetarOperacao,
    limparTudo
  } = useCraft(servidor)

  const temDadosParaFinalizar = compras.length > 0 || crafts.length > 0

  return (
    <div className="craft-tab">
      {/* Gerenciador de dados */}
      <DataManager
        storageInfo={storageInfo}
        historico={historico}
        onExportar={exportarJSON}
        onImportar={importarJSON}
        onLimparTudo={limparTudo}
        onFinalizarOperacao={finalizarOperacao}
        onRemoverDoHistorico={removerDoHistorico}
        temDadosParaFinalizar={temDadosParaFinalizar}
      />

      {/* Topo: Bankroll + Dashboard ROI */}
      <div className="craft-top-section">
        <Bankroll
          bankroll={bankroll}
          bankrollInicial={bankrollInicial}
          onDefinirBankroll={definirBankroll}
          onAjustar={ajustarBankroll}
        />

        <DashboardROI
          calculos={calculos}
          taxaCraft={taxaCraft}
          onSetTaxaCraft={setTaxaCraft}
          onReset={resetarOperacao}
        />
      </div>

      {/* Seções de registro */}
      <div className="craft-main-section">
        <ComprasTable
          compras={compras}
          onAdicionar={adicionarCompra}
          onRemover={removerCompra}
          itensDisponiveis={itensDisponiveis}
        />

        <CraftTable
          crafts={crafts}
          onAdicionar={adicionarCraft}
          onRemover={removerCraft}
          onAtualizar={atualizarPrecosCraft}
          onAtualizarTodos={atualizarTodosPrecos}
          onMarcarVendido={marcarVendido}
          onDesmarcarVendido={desmarcarVendido}
          loading={loading}
          itensDisponiveis={itensDisponiveis}
        />
      </div>
    </div>
  )
}
