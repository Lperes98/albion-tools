import { QUALIDADES } from '../services/albionApi'

export function FilterBar({
  servidor, setServidor,
  qualidade, setQualidade,
  wsStatus, onConnect, onDisconnect, onRefresh, canRefresh, loadingPrecos,
}) {
  return (
    <div className="filter-bar">
      <div className="filter-group">
        <label>Servidor:</label>
        <select value={servidor} onChange={(e) => setServidor(e.target.value)}>
          <option value="west">Americas (West)</option>
          <option value="europe">Europe</option>
          <option value="east">Asia (East)</option>
        </select>
      </div>

      <div className="filter-group">
        <label>Qualidade:</label>
        <select value={qualidade} onChange={(e) => setQualidade(Number(e.target.value))}>
          {Object.entries(QUALIDADES).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </div>

      {wsStatus !== undefined && (
        <>
          <div className={`ws-badge ws-${wsStatus}`} title={`WebSocket: ${wsStatus}`}>
            <span className="ws-dot" />
            {wsStatus === 'connected' ? 'Live' : wsStatus === 'connecting' ? 'Conectando...' : 'Offline'}
          </div>

          {wsStatus === 'disconnected' || wsStatus === 'error' ? (
            <button className="btn-ws-connect" onClick={onConnect}>
              Conectar WS
            </button>
          ) : (
            <button className="btn-ws-connect btn-ws-disconnect" onClick={onDisconnect}>
              Desconectar
            </button>
          )}

          <button
            className="btn-refresh-rent"
            onClick={onRefresh}
            disabled={!canRefresh || loadingPrecos}
            title={canRefresh ? 'Atualizar preços' : 'Selecione um item'}
          >
            {loadingPrecos ? '...' : '↻'} Atualizar
          </button>
        </>
      )}
    </div>
  )
}
