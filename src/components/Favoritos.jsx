export function Favoritos({ favoritos, onSelectItem, onRemoveFavorito, selectedItem }) {
  if (favoritos.length === 0) {
    return (
      <div className="favoritos">
        <h3>Favoritos</h3>
        <p className="no-favorites">Nenhum item favoritado ainda.</p>
        <p className="hint">Clique na estrela de um item para salvá-lo aqui.</p>
      </div>
    )
  }

  return (
    <div className="favoritos">
      <h3>Favoritos ({favoritos.length})</h3>
      <div className="favoritos-list">
        {favoritos.map((item) => (
          <div
            key={item.uniqueName}
            className={`favorito-item ${selectedItem?.uniqueName === item.uniqueName ? 'selected' : ''}`}
            onClick={() => onSelectItem(item)}
          >
            <span className={`item-tier tier-${item.tier}`}>T{item.tier}</span>
            <span className="item-name">{item.nome}</span>
            <button
              className="remove-button"
              onClick={(e) => {
                e.stopPropagation()
                onRemoveFavorito(item.uniqueName)
              }}
              title="Remover dos favoritos"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
