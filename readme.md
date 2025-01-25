# Prompt Copy

A desktop utility for copying file contents with custom prompts. Easily select files, add prompts, and copy formatted content to clipboard.

## Features

- File tree navigation
- Custom prompts
- Theme customization (Default, Neon, Cyberpunk)
- Show in Explorer context menu
- Search functionality
- Multiple file selection

## Installation

### Development
```bash
git clone https://github.com/yourusername/prompt-copy.git
cd prompt-copy
npm install
npm start


Production Build
bash npm run build
Installer will be created in dist folder.
Usage

Click "Select Folder" to choose directory
Enter prompt text (optional)
Select files from tree
Click "Copy" to copy formatted content

Dependencies

electron
@electron/remote
chokidar
electron-builder (dev)

License
MIT