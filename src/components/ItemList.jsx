export function ItemList({ itens, onSelectItem, selectedItem, isFavorito, onToggleFavorito }) {
  if (itens.length === 0) {
    return null
  }

  return (
    <div className="item-list">
      <h3>Resultados ({itens.length} itens)</h3>
      <div className="items-grid">
        {itens.map((item) => (
          <div
            key={item.uniqueName}
            className={`item-card ${selectedItem?.uniqueName === item.uniqueName ? 'selected' : ''}`}
            onClick={() => onSelectItem(item)}
          >
            <div className="item-header">
              <span className={`item-tier tier-${item.tier}`}>T{item.tier}</span>
              <button
                className={`favorite-button ${isFavorito(item.uniqueName) ? 'active' : ''}`}
                onClick={(e) => {
                  e.stopPropagation()
                  onToggleFavorito(item)
                }}
                title={isFavorito(item.uniqueName) ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
              >
                {isFavorito(item.uniqueName) ? '★' : '☆'}
              </button>
            </div>
            <div className="item-name">{item.nome}</div>
            <div className="item-id">{item.uniqueName}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
