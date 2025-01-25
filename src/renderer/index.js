const { ipcRenderer } = require('electron');
const path = require('path');
const settings = require('./settings');

class FilePromptApp {
    constructor() {
        this.setupVariables();
        this.setupEventListeners();
        this.setupWindowControls();
        this.setupContextMenuListener();
    }

    setupVariables() {
        this.currentFolder = '';
        this.files = new Map();
        this.checkedItems = new Set();
        this.expandedFolders = new Set();
        this.contextMenu = null;
    }

    setupWindowControls() {
        document.querySelector('.close').addEventListener('click', () => window.close());
        document.querySelector('.minimize').addEventListener('click', () => ipcRenderer.send('minimize'));
        document.querySelector('.maximize').addEventListener('click', () => ipcRenderer.send('maximize'));
        document.querySelector('.settings-icon').addEventListener('click', () => settings.showSettings());
    }

    setupContextMenuListener() {
        document.addEventListener('click', () => this.hideContextMenu());
        document.addEventListener('contextmenu', (e) => {
            if (!e.target.closest('.tree-container')) {
                this.hideContextMenu();
            }
        });
    }

    hideContextMenu() {
        if (this.contextMenu) {
            this.contextMenu.remove();
            this.contextMenu = null;
        }
    }

    setupEventListeners() {
        document.getElementById('selectFolderBtn').addEventListener('click', () => this.selectFolder());
        document.getElementById('copyBtn').addEventListener('click', () => this.copyToClipboard());
        document.getElementById('searchInput').addEventListener('input', (e) => this.filterTree(e.target.value));
    }

    async selectFolder() {
        const folderPath = await ipcRenderer.invoke('select-folder');
        if (!folderPath) return;

        this.currentFolder = folderPath;
        this.refreshTree();
    }

    async refreshTree() {
        const tree = document.getElementById('fileTree');
        tree.innerHTML = '';
        this.files.clear();
        this.checkedItems.clear();
        this.expandedFolders.clear();

        if (this.currentFolder) {
            await this.buildTree(this.currentFolder, tree, 0);
        }
    }

    async buildTree(folderPath, parentElement, level) {
        try {
            const entries = await window.require('fs').promises.readdir(folderPath, { withFileTypes: true });

            for (const entry of entries.sort((a, b) => {
                if (a.isDirectory() === b.isDirectory()) {
                    return a.name.localeCompare(b.name);
                }
                return a.isDirectory() ? -1 : 1;
            })) {
                const itemPath = path.join(folderPath, entry.name);
                const itemElement = document.createElement('div');
                itemElement.style.paddingLeft = `${level * 20}px`;

                if (entry.isDirectory()) {
                    itemElement.innerHTML = `<span class="folder">${entry.name}</span>`;
                    const folderSpan = itemElement.querySelector('.folder');
                    folderSpan.addEventListener('click', () => {
                        folderSpan.classList.toggle('expanded');
                        this.toggleFolder(itemPath, itemElement);
                    });

                    const subContainer = document.createElement('div');
                    subContainer.style.display = 'none';
                    itemElement.appendChild(subContainer);

                    if (this.expandedFolders.has(itemPath)) {
                        await this.buildTree(itemPath, subContainer, level + 1);
                        subContainer.style.display = 'block';
                        folderSpan.classList.add('expanded');
                    }
                } else {
                    itemElement.innerHTML = `
            <label>
              <input type="checkbox" data-path="${itemPath}">
              ${entry.name}
            </label>
          `;
                    this.files.set(itemPath, entry.name);
                }

                itemElement.addEventListener('contextmenu', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    this.showContextMenu(e, itemPath, entry.isDirectory());
                });

                parentElement.appendChild(itemElement);
            }
        } catch (error) {
            console.error('Error building tree:', error);
        }
    }

    showContextMenu(event, itemPath, isDirectory) {
        this.hideContextMenu();

        const menu = document.createElement('div');
        menu.className = 'context-menu';
        menu.innerHTML = `
      <div class="menu-item" data-action="show">Show in Explorer</div>
      ${!isDirectory ? `<div class="menu-item" data-action="copy">Copy Path</div>` : ''}
    `;

        menu.style.left = event.pageX + 'px';
        menu.style.top = event.pageY + 'px';

        menu.addEventListener('click', (e) => {
            const action = e.target.dataset.action;
            if (action === 'show') {
                ipcRenderer.send('show-in-explorer', itemPath);
            } else if (action === 'copy') {
                navigator.clipboard.writeText(itemPath);
            }
            this.hideContextMenu();
        });

        document.body.appendChild(menu);
        this.contextMenu = menu;
    }

    async toggleFolder(folderPath, element) {
        const subContainer = element.querySelector('div');
        if (subContainer.style.display === 'none') {
            this.expandedFolders.add(folderPath);
            await this.buildTree(folderPath, subContainer, parseInt(element.style.paddingLeft) / 20 + 1);
            subContainer.style.display = 'block';
        } else {
            this.expandedFolders.delete(folderPath);
            subContainer.style.display = 'none';
            subContainer.innerHTML = '';
        }
    }

    filterTree(searchTerm) {
        const tree = document.getElementById('fileTree');
        const items = tree.getElementsByTagName('label');

        for (const item of items) {
            const text = item.textContent.toLowerCase();
            const match = text.includes(searchTerm.toLowerCase());
            item.parentElement.style.display = match ? '' : 'none';
        }
    }

    async copyToClipboard() {
        const checkedFiles = Array.from(document.querySelectorAll('input[type="checkbox"]:checked'))
            .map(cb => cb.dataset.path);

        if (checkedFiles.length === 0) {
            alert('Please select at least one file.');
            return;
        }

        const content = await this.buildClipboardContent(checkedFiles);
        navigator.clipboard.writeText(content);
        alert('Content copied to clipboard!');
    }

    async buildClipboardContent(filePaths) {
        const content = [];
        const promptText = document.getElementById('promptText').value.trim();

        if (promptText) {
            let finalPrompt = promptText;
            if (document.getElementById('scriptFixCheck').checked) {
                finalPrompt += ' send full script with fix';
            }
            if (document.getElementById('notReactCheck').checked) {
                finalPrompt += ' This project is not React, fix code given';
            }
            content.push(`Prompt: ${finalPrompt}\n`);
        }

        for (const filePath of filePaths) {
            try {
                console.log('Reading file:', filePath); // Debug line
                if (!filePath) continue;

                const fileContent = await ipcRenderer.invoke('read-file', filePath);
                content.push(`Filename: ${path.basename(filePath)}\nContents:\n${fileContent}\n`);
            } catch (error) {
                console.error('Error reading file:', error);
                content.push(`Error reading ${filePath}: ${error.message}\n`);
            }
        }

        return content.join('\n');
    }
}

new FilePromptApp();