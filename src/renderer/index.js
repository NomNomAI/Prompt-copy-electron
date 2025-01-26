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
        this.lastFocusedElement = null;
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

        document.addEventListener('focusin', (e) => {
            this.lastFocusedElement = e.target;
        });
    }

    showNotification(message, isError = false) {
        const notification = document.createElement('div');
        notification.className = `notification ${isError ? 'error' : 'success'}`;
        notification.textContent = message;
        document.body.appendChild(notification);

        setTimeout(() => {
            notification.classList.add('fade-out');
            setTimeout(() => notification.remove(), 300);
        }, 2000);
    }

    getDisplayName(fullName, maxLength = 30) {
        const parts = fullName.split('\\');
        const fileName = parts[parts.length - 1];
        return fileName.length > maxLength ? fileName.substring(0, maxLength - 3) + '...' : fileName;
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
                    const displayName = this.getDisplayName(entry.name);
                    itemElement.innerHTML = `<span class="folder" title="${entry.name}">${displayName}</span>`;
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
                    const displayName = this.getDisplayName(entry.name);
                    itemElement.innerHTML = `
                        <label title="${itemPath}">
                            <input type="checkbox" data-path="${itemPath}">
                            <span class="file-name">${displayName}</span>
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
                this.showNotification('Path copied to clipboard!');
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
        if (!searchTerm.trim()) {
            this.refreshTree();
            return;
        }

        const tree = document.getElementById('fileTree');
        tree.innerHTML = '';

        const searchResults = this.searchFiles(this.currentFolder, searchTerm.toLowerCase());
        const groupedResults = new Map();

        searchResults.forEach(filePath => {
            const dir = path.dirname(filePath);
            if (!groupedResults.has(dir)) {
                groupedResults.set(dir, []);
            }
            groupedResults.get(dir).push(filePath);
        });

        groupedResults.forEach((files, dir) => {
            const relativeDirPath = path.relative(this.currentFolder, dir);
            const dirElement = document.createElement('div');
            dirElement.style.paddingLeft = '10px';

            const dirName = this.getDisplayName(relativeDirPath || 'root');
            dirElement.innerHTML = `<span class="folder">${dirName}</span>`;

            const filesContainer = document.createElement('div');
            filesContainer.style.paddingLeft = '20px';

            files.forEach(filePath => {
                const fileName = this.getDisplayName(path.basename(filePath));
                const fileElement = document.createElement('div');
                fileElement.innerHTML = `
                    <label title="${filePath}">
                        <input type="checkbox" data-path="${filePath}">
                        <span class="file-name">${fileName}</span>
                    </label>
                `;
                filesContainer.appendChild(fileElement);
            });

            dirElement.appendChild(filesContainer);
            tree.appendChild(dirElement);
        });
    }

    searchFiles(dir, searchTerm) {
        const results = [];

        try {
            const items = window.require('fs').readdirSync(dir, { withFileTypes: true });

            for (const item of items) {
                const fullPath = path.join(dir, item.name);

                if (item.isDirectory()) {
                    results.push(...this.searchFiles(fullPath, searchTerm));
                } else if (item.name.toLowerCase().includes(searchTerm)) {
                    results.push(fullPath);
                }
            }
        } catch (error) {
            console.error('Error searching files:', error);
        }

        return results;
    }

    async copyToClipboard() {
        const checkedFiles = Array.from(document.querySelectorAll('input[type="checkbox"]:checked'))
            .map(cb => cb.dataset.path);

        if (checkedFiles.length === 0) {
            this.showNotification('Please select at least one file.', true);
            return;
        }

        try {
            const content = await this.buildClipboardContent(checkedFiles);
            await navigator.clipboard.writeText(content);
            this.showNotification('Content copied to clipboard!');
        } catch (error) {
            console.error('Error copying to clipboard:', error);
            this.showNotification('Failed to copy content to clipboard.', true);
        }
    }

    async buildClipboardContent(filePaths) {
        const content = [];
        const promptTextArea = document.getElementById('promptText');
        const promptText = promptTextArea.value;
        const selectionStart = promptTextArea.selectionStart;
        const selectionEnd = promptTextArea.selectionEnd;

        if (promptText) {
            let finalPrompt = promptText;
            if (document.getElementById('scriptFixCheck').checked) {
                finalPrompt += ' send full script with fix';
            }
            content.push(`Prompt: ${finalPrompt}\n`);
        }

        for (const filePath of filePaths) {
            try {
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