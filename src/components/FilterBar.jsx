import { QUALIDADES } from '../services/albionApi'

export function FilterBar({ servidor, setServidor, qualidade, setQualidade }) {
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
    </div>
  )
}
