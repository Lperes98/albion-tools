import { useState } from 'react'

export function SearchBar({ onSearch, loading }) {
  const [termo, setTermo] = useState('')
  const [tiers, setTiers] = useState([4, 5, 6, 7, 8])

  const handleSubmit = (e) => {
    e.preventDefault()
    if (termo.trim()) {
      onSearch(termo, tiers)
    }
  }

  const toggleTier = (tier) => {
    setTiers(prev =>
      prev.includes(tier)
        ? prev.filter(t => t !== tier)
        : [...prev, tier].sort()
    )
  }

  return (
    <form onSubmit={handleSubmit} className="search-bar">
      <div className="search-input-wrapper">
        <input
          type="text"
          value={termo}
          onChange={(e) => setTermo(e.target.value)}
          placeholder="Nome do item (ex: garras sombrias)"
          className="search-input"
          disabled={loading}
        />
        <button type="submit" className="search-button" disabled={loading || !termo.trim()}>
          {loading ? 'Buscando...' : 'Buscar'}
        </button>
      </div>

      <div className="tier-filters">
        <span className="tier-label">Tiers:</span>
        {[1, 2, 3, 4, 5, 6, 7, 8].map(tier => (
          <button
            key={tier}
            type="button"
            className={`tier-button ${tiers.includes(tier) ? 'active' : ''}`}
            onClick={() => toggleTier(tier)}
          >
            T{tier}
          </button>
        ))}
      </div>
    </form>
  )
}
