import React from 'react';
import { X } from 'lucide-react';

const CheckedFilesTab = ({ checkedFiles, onUncheck }) => {
  if (checkedFiles.length === 0) {
    return (
      <div className="p-4 text-center text-sm opacity-50">
        No files selected
      </div>
    );
  }

  const handleUncheck = (filePath) => {
    // Find the checkbox in the file tree
    const checkbox = document.querySelector(`input[data-path="${filePath}"]`);
    if (checkbox) {
      // Update the checkbox state
      checkbox.checked = false;
      
      // Create and dispatch a change event
      const event = new Event('change', { bubbles: true });
      checkbox.dispatchEvent(event);
    }
    
    // Call the onUncheck handler
    onUncheck(filePath);
  };

  return (
    <div className="flex flex-col w-full">
      {checkedFiles.map((file) => (
        <div 
          key={file.path}
          className="flex items-center justify-between p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
        >
          <span className="text-sm truncate flex-1" title={file.path}>
            {file.name}
          </span>
          <button
            onClick={() => handleUncheck(file.path)}
            className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full"
            title="Remove file"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
};

export default CheckedFilesTab;