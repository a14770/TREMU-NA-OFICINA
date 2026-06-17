import './Menu.css'

export default function Menu({ onJogar, onTreinar, onBase, onConfig }) {
  return (
    <div className="menu-container">
      <div className="menu-card">
        <div className="menu-brand">
          <div className="menu-logo">✋</div>
          <div>
            <h1>TREMU OFICINA</h1>
            <p>Use gestos para jogar, aprender e treinar a língua gestual portuguesa.</p>
          </div>
        </div>

        <div className="menu-buttons">
          <button className="menu-button menu-button--primary" onClick={onJogar}>
            <span>Jogar</span>
            <small>Começar a descobrir a palavra</small>
          </button>
          <button className="menu-button menu-button--secondary" onClick={onTreinar}>
            <span>Treinar</span>
            <small>Guardar novos gestos e melhorar o modelo</small>
          </button>
          <button className="menu-button menu-button--tertiary" onClick={onBase}>
            <span>Base de Dados</span>
            <small>Gerir gestos guardados</small>
          </button>
          <button className="menu-button menu-button--ghost" onClick={onConfig}>
            <span>Configurações</span>
            <small>Ajustes do sistema</small>
          </button>
        </div>
      </div>
    </div>
  )
}
