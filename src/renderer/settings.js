const themes = require('./themes');

class Settings {
    constructor() {
        const defaultSettings = { theme: 'solarized' };
        const savedSettings = localStorage.getItem('settings');
        const settings = savedSettings ? JSON.parse(savedSettings) : defaultSettings;

        this.currentTheme = settings.theme;
        this.applyTheme(this.currentTheme);
    }

    applyTheme(themeName) {
        document.body.className = `theme-${themeName}`;
        this.currentTheme = themeName;
        localStorage.setItem('settings', JSON.stringify({ theme: themeName }));

        const theme = themes[themeName];
        if (theme) {
            const root = document.documentElement;
            root.style.setProperty('--theme-bg', theme.colors.background);
            root.style.setProperty('--theme-text', theme.colors.text);
            root.style.setProperty('--theme-border', theme.colors.border);
            root.style.setProperty('--theme-highlight', theme.colors.highlight);
            root.style.setProperty('--theme-button-text', theme.colors.buttonText);
            root.style.setProperty('--theme-input-bg', theme.colors.inputBg);
            root.style.setProperty('--theme-tree-hover', theme.colors.treeHover);
            root.style.setProperty('--theme-titlebar-bg', theme.colors.titlebarBg);
            root.style.setProperty('--theme-modal-bg', theme.colors.modalBg);
        }
    }

    showSettings() {
        const modal = document.createElement('div');
        modal.className = 'settings-modal';
        modal.innerHTML = `
            <div class="settings-content">
                <button class="close-btn">&times;</button>
                <h2 style="color: var(--text); margin-top: 0; margin-bottom: 15px;">Theme Settings</h2>
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