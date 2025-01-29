const { ipcRenderer } = require('electron');
const path = require('path');
const settings = require('./settings');

class FilePromptApp {
    constructor() {
        this.setupVariables();
        this.setupEventListeners();
        this.setupWindowControls();
        this.setupContextMenuListener();
        this.setupTabSystem();
        this.initializeUI(); // New method to handle initial UI state
    }

    setupVariables() {
        this.currentFolder = '';
        this.files = new Map();
        this.checkedItems = new Set();
        this.expandedFolders = new Set();
        this.contextMenu = null;
        this.lastFocusedElement = null;
    }
    initializeUI() {
        // Hide all UI elements initially
        const elements = [
            '.checkbox-area',
            '.tabs',
            '.prompt-area'
        ];

        elements.forEach(selector => {
            const element = document.querySelector(selector);
            if (element) {
                element.classList.remove('visible');
            }
        });

        // Hide copy button
        const copyBtn = document.getElementById('copyBtn');
        if (copyBtn) {
            copyBtn.classList.remove('visible');
        }

        this.showEmptyState();
    }
    showEmptyState() {
        const treeContainer = document.querySelector('.tree-container');
        const fileTree = document.getElementById('fileTree');

        treeContainer.classList.add('empty');
        fileTree.innerHTML = `
        <div class="empty-state-button" onclick="document.getElementById('selectFolderBtn').click()">
            <div class="empty-state-icon">
                <i class="fas fa-folder"></i>
            </div>
            <div class="empty-state-text">
                Select a folder to get started
            </div>
        </div>
    `;
    }


    setupTabSystem() {
        const tabButtons = document.querySelectorAll('.tab-button');

        // Initialize the checked count
        this.updateCheckedCount();

        tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                tabButtons.forEach(btn => btn.classList.remove('active'));
                document.querySelectorAll('.tab-panel').forEach(panel => panel.classList.remove('active'));

                button.classList.add('active');
                const tabId = button.getAttribute('data-tab');
                const panel = document.getElementById(tabId + 'Tab');
                panel.classList.add('active');

                if (tabId === 'checkedFiles') {
                    this.updateCheckedFilesTab();
                }
            });
        });
    }

    updateCheckedFilesTab() {
        const checkedFilesTab = document.getElementById('checkedFilesTab');
        if (this.checkedItems.size === 0) {
            checkedFilesTab.innerHTML = '<div class="empty-state">No files selected</div>';
            return;
        }

        const container = document.createElement('div');

        Array.from(this.checkedItems).forEach(filePath => {
            const fileName = this.files.get(filePath) || path.basename(filePath);
            const itemDiv = document.createElement('div');
            itemDiv.className = 'checked-file-item';

            const nameSpan = document.createElement('span');
            nameSpan.className = 'checked-file-name';
            nameSpan.title = filePath;
            nameSpan.textContent = fileName;

            const removeButton = document.createElement('span');
            removeButton.className = 'remove-file';
            removeButton.title = 'Remove file';
            removeButton.innerHTML = '<i class="fas fa-times"></i>';
            removeButton.onclick = () => {
                this.uncheckFile(filePath);
                // Refresh the file tree to reflect changes
                this.refreshTree();
            };

            itemDiv.appendChild(nameSpan);
            itemDiv.appendChild(removeButton);
            container.appendChild(itemDiv);
        });

        checkedFilesTab.innerHTML = '';
        checkedFilesTab.appendChild(container);
    }
    uncheckFile(filePath) {
        // Remove from the checked items set
        this.checkedItems.delete(filePath);

        // Find all checkboxes for this file path and uncheck them
        const checkboxes = document.querySelectorAll(`input[type="checkbox"][data-path="${filePath}"]`);
        checkboxes.forEach(checkbox => {
            checkbox.checked = false;
        });

        // Update both the checked count and the checked files tab
        this.updateCheckedCount();
        this.updateCheckedFilesTab();
    }


    updateCheckedCount() {
        const countElement = document.querySelector('[data-tab="checkedFiles"]');
        if (countElement) {
            countElement.textContent = `Checked Files ${this.checkedItems.size}`;
        }
    }

    // Modify the handleCheckboxChange method
    handleCheckboxChange(checkbox, filePath) {
        if (checkbox.checked) {
            this.checkedItems.add(filePath);
        } else {
            this.checkedItems.delete(filePath);
        }
        this.updateCheckedCount();
        this.updateCheckedFilesTab();
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
        if (!folderPath) {
            this.showEmptyState();
            return;
        }
        this.currentFolder = folderPath;
        document.querySelector('.search-area').classList.remove('hidden');
        document.querySelector('.checkbox-area').classList.add('visible');
        document.querySelector('.tabs').classList.add('visible');
        document.querySelector('.prompt-area').classList.add('visible');
        document.getElementById('copyBtn').classList.add('visible'); // Add this line
        await this.refreshTree();
    }

    async refreshTree() {
        const tree = document.getElementById('fileTree');
        const treeContainer = document.querySelector('.tree-container');
        tree.innerHTML = '';
        this.files.clear();
        this.expandedFolders.clear();

        // Remove empty state styling
        treeContainer.classList.remove('empty');

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
                    const checkbox = itemElement.querySelector('input[type="checkbox"]');
                    checkbox.checked = this.checkedItems.has(itemPath);
                    checkbox.addEventListener('change', () => {
                        if (checkbox.checked) {
                            this.checkedItems.add(itemPath);
                        } else {
                            this.checkedItems.delete(itemPath);
                        }
                        this.updateCheckedCount();
                        this.updateCheckedFilesTab();
                    });
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
            subContainer.innerHTML = '';
            await this.buildTree(folderPath, subContainer, parseInt(element.style.paddingLeft) / 20 + 1);
            subContainer.style.display = 'block';
        } else {
            this.expandedFolders.delete(folderPath);
            subContainer.style.display = 'none';
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
                const checkbox = fileElement.querySelector('input[type="checkbox"]');
                checkbox.checked = this.checkedItems.has(filePath);
                checkbox.addEventListener('change', () => {
                    if (checkbox.checked) {
                        this.checkedItems.add(filePath);
                    } else {
                        this.checkedItems.delete(filePath);
                    }
                });
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