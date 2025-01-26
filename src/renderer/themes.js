// themes.js
const themes = {
  light: {
    name: 'Light',
    colors: {
      background: '#ffffff',
      text: '#2c3e50',
      border: '#e0e0e0',
      highlight: '#3498db',
      button: '#3498db',
      buttonText: '#ffffff',
      titlebarBg: '#f8f9fa',
      inputBg: '#ffffff',
      treeHover: '#f5f6fa',
      modalBg: 'rgba(0, 0, 0, 0.2)'
    }
  },
  dark: {
    name: 'Dark',
    colors: {
      background: '#1a1b1e',
      text: '#e0e0e0',
      border: '#2d2d2d',
      highlight: '#4a90e2',
      button: '#4a90e2',
      buttonText: '#ffffff',
      titlebarBg: '#141517',
      inputBg: '#222427',
      treeHover: '#25262b',
      modalBg: 'rgba(0, 0, 0, 0.4)'
    }
  },
  midnight: {
    name: 'Midnight',
    colors: {
      background: '#0f1419',
      text: '#c9d1d9',
      border: '#30363d',
      highlight: '#58a6ff',
      button: '#58a6ff',
      buttonText: '#ffffff',
      titlebarBg: '#090c10',
      inputBg: '#161b22',
      treeHover: '#1c2128',
      modalBg: 'rgba(0, 0, 0, 0.4)'
    }
  },
  solarized: {
    name: 'Solarized',
    colors: {
      background: '#002b36',
      text: '#839496',
      border: '#073642',
      highlight: '#2aa198',
      button: '#2aa198',
      buttonText: '#fdf6e3',
      titlebarBg: '#001f27',
      inputBg: '#073642',
      treeHover: '#003b4c',
      modalBg: 'rgba(0, 0, 0, 0.3)'
    }
  }
};

module.exports = themes;