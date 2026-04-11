export function Header({ darkMode, toggleDarkMode }) {
  return (
    <header className="header">
      <div className="header-content">
        <div className="logo">
          <span className="logo-icon">A</span>
          <div className="logo-text">
            <h1>Albion Market</h1>
            <span className="subtitle">Consultor de Preços</span>
          </div>
        </div>

        <button
          className="theme-toggle"
          onClick={toggleDarkMode}
          title={darkMode ? 'Modo claro' : 'Modo escuro'}
        >
          {darkMode ? '☀️' : '🌙'}
        </button>
      </div>
    </header>
  )
}
