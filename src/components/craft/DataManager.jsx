import { useState, useRef } from 'react'
import { formatarPrata } from '../../services/albionApi'

export function DataManager({
  storageInfo,
  historico,
  onExportar,
  onImportar,
  onLimparTudo,
  onFinalizarOperacao,
  onRemoverDoHistorico,
  temDadosParaFinalizar
}) {
  const [confirmandoLimpeza, setConfirmandoLimpeza] = useState(false)
  const [mensagem, setMensagem] = useState(null)
  const [historicoExpandido, setHistoricoExpandido] = useState(false)
  const fileInputRef = useRef(null)

  const handleImportar = async (e) => {
    const arquivo = e.target.files[0]
    if (!arquivo) return

    try {
      const resultado = await onImportar(arquivo)
      setMensagem({ tipo: 'sucesso', texto: resultado.message })
    } catch (error) {
      setMensagem({ tipo: 'erro', texto: error.message })
    }

    // Limpa input para permitir reimportar mesmo arquivo
    e.target.value = ''

    // Remove mensagem após 3 segundos
    setTimeout(() => setMensagem(null), 3000)
  }

  const handleLimpar = () => {
    if (confirmandoLimpeza) {
      onLimparTudo()
      setConfirmandoLimpeza(false)
      setMensagem({ tipo: 'sucesso', texto: 'Todos os dados foram excluídos!' })
      setTimeout(() => setMensagem(null), 3000)
    } else {
      setConfirmandoLimpeza(true)
      setTimeout(() => setConfirmandoLimpeza(false), 5000)
    }
  }

  const formatarData = (dataStr) => {
    if (!dataStr) return '—'
    return new Date(dataStr).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className="data-manager">
      {/* Alerta de limpeza */}
      {storageInfo.alertaLimpeza && (
        <div className="alerta-limpeza">
          <span className="alerta-icon">!</span>
          <span>
            Já se passaram <strong>{storageInfo.diasDesdeUltimaLimpeza} dias</strong> desde a última limpeza.
            Considere exportar e limpar os dados.
          </span>
        </div>
      )}

      {/* Mensagem de feedback */}
      {mensagem && (
        <div className={`mensagem ${mensagem.tipo}`}>
          {mensagem.texto}
        </div>
      )}

      {/* Info do Storage */}
      <div className="storage-info">
        <div className="info-item">
          <span className="info-label">Tamanho do DB</span>
          <span className="info-value">{storageInfo.tamanhoKB} KB</span>
        </div>
        <div className="info-item">
          <span className="info-label">Última limpeza</span>
          <span className="info-value">
            {storageInfo.ultimaLimpeza
              ? formatarData(storageInfo.ultimaLimpeza)
              : 'Nunca'
            }
          </span>
        </div>
        <div className="info-item">
          <span className="info-label">Operações salvas</span>
          <span className="info-value">{storageInfo.totalOperacoesHistorico}</span>
        </div>
        {storageInfo.diasDesdeUltimaLimpeza !== null && (
          <div className="info-item">
            <span className="info-label">Dias desde limpeza</span>
            <span className={`info-value ${storageInfo.alertaLimpeza ? 'alerta' : ''}`}>
              {storageInfo.diasDesdeUltimaLimpeza} dias
            </span>
          </div>
        )}
      </div>

      {/* Ações */}
      <div className="data-actions">
        <button
          className="btn-action btn-finalizar"
          onClick={onFinalizarOperacao}
          disabled={!temDadosParaFinalizar}
          title="Salva a operação atual no histórico e limpa para nova operação"
        >
          Finalizar Operação
        </button>

        <button className="btn-action btn-exportar" onClick={onExportar}>
          Exportar JSON
        </button>

        <input
          type="file"
          ref={fileInputRef}
          accept=".json"
          onChange={handleImportar}
          style={{ display: 'none' }}
        />
        <button
          className="btn-action btn-importar"
          onClick={() => fileInputRef.current?.click()}
        >
          Importar JSON
        </button>

        <button
          className={`btn-action btn-limpar ${confirmandoLimpeza ? 'confirmando' : ''}`}
          onClick={handleLimpar}
        >
          {confirmandoLimpeza ? 'Confirmar Exclusão?' : 'Excluir Tudo'}
        </button>
      </div>

      {/* Histórico de operações */}
      {historico.length > 0 && (
        <div className="historico-section">
          <button
            className="historico-toggle"
            onClick={() => setHistoricoExpandido(!historicoExpandido)}
          >
            <span>Histórico de Operações ({historico.length})</span>
            <span className="toggle-icon">{historicoExpandido ? '▲' : '▼'}</span>
          </button>

          {historicoExpandido && (
            <div className="historico-lista">
              {historico.map((op) => (
                <div key={op.id} className="historico-item">
                  <div className="historico-header">
                    <span className="historico-data">{formatarData(op.finalizadoEm)}</span>
                    <button
                      className="btn-remover-historico"
                      onClick={() => onRemoverDoHistorico(op.id)}
                      title="Remover do histórico"
                    >
                      ×
                    </button>
                  </div>

                  <div className="historico-resumo">
                    <div className="resumo-item">
                      <span className="label">Compras:</span>
                      <span>{op.compras?.length || 0}</span>
                    </div>
                    <div className="resumo-item">
                      <span className="label">Crafts:</span>
                      <span>{op.crafts?.length || 0}</span>
                    </div>
                    <div className="resumo-item">
                      <span className="label">Gasto:</span>
                      <span className="valor-negativo">
                        {formatarPrata(op.calculos?.gastoTotal || 0)}
                      </span>
                    </div>
                    <div className="resumo-item">
                      <span className="label">Receita:</span>
                      <span className="valor-positivo">
                        {formatarPrata(op.calculos?.receitaBruta || 0)}
                      </span>
                    </div>
                    <div className="resumo-item destaque">
                      <span className="label">Lucro:</span>
                      <span className={op.calculos?.lucroLiquido >= 0 ? 'valor-positivo' : 'valor-negativo'}>
                        {formatarPrata(op.calculos?.lucroLiquido || 0)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
