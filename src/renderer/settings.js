const themes = {
  default: {
    name: 'Default',
    colors: {
      background: '#ffffff',
      text: '#000000',
      border: '#e1e1e1',
      highlight: '#007aff',
      button: '#007aff',
      buttonText: '#ffffff'
    }
  },
  neon: {
    name: 'Neon',
    colors: {
      background: '#0a0a0a',
      text: '#00ff00',
      border: '#00ff00',
      highlight: '#ff00ff',
      button: '#ff00ff',
      buttonText: '#000000'
    }
  },
  cyberpunk: {
    name: 'Cyberpunk',
    colors: {
      background: '#120458',
      text: '#00fff9',
      border: '#ff00a0',
      highlight: '#feff00',
      button: '#feff00',
      buttonText: '#000000'
    }
  }
};

class Settings {
  constructor() {
    this.currentTheme = localStorage.getItem('theme') || 'default';
    this.applyTheme(this.currentTheme);
  }

  applyTheme(themeName) {
    document.body.className = `theme-${themeName}`;
    this.currentTheme = themeName;
    localStorage.setItem('theme', themeName);

    // Apply theme colors to CSS variables
    const theme = themes[themeName];
    if (theme) {
      document.documentElement.style.setProperty('--app-bg', theme.colors.background);
      document.documentElement.style.setProperty('--text', theme.colors.text);
      document.documentElement.style.setProperty('--border', theme.colors.border);
      document.documentElement.style.setProperty('--button-bg', theme.colors.button);
      document.documentElement.style.setProperty('--button-text', theme.colors.buttonText);
      document.documentElement.style.setProperty('--input-bg', theme.colors.background);
    }
  }

  showSettings() {
    const modal = document.createElement('div');
    modal.className = 'settings-modal';
    modal.innerHTML = `
      <div class="settings-content">
        <button class="close-btn">&times;</button>
        <h3 style="color: var(--text); margin-top: 0;">Theme Settings</h3>
        <div class="theme-options">
          ${Object.entries(themes).map(([key, theme]) => `
            <button class="theme-button ${key === this.currentTheme ? 'active' : ''}"
                    data-theme="${key}">
              ${theme.name}
            </button>
          `).join('')}
        </div>
      </div>
    `;

    const closeModal = () => modal.remove();
    modal.querySelector('.close-btn').addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
      if (e.target.classList.contains('theme-button')) {
        this.applyTheme(e.target.dataset.theme);
        document.querySelectorAll('.theme-button').forEach(btn => 
          btn.classList.toggle('active', btn.dataset.theme === e.target.dataset.theme)
        );
      }
    });

    document.body.appendChild(modal);
  }
}

module.exports = new Settings();