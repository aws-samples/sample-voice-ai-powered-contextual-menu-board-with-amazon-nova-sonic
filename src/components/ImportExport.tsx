import React, { useState, useRef } from 'react';
import { SettingsManager } from '../lib/util/SettingsManager';

interface ImportExportProps {
  onImportSuccess?: () => void;
  onImportError?: (errors: string[]) => void;
}

export const ImportExport: React.FC<ImportExportProps> = ({ 
  onImportSuccess, 
  onImportError 
}) => {
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importStatus, setImportStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Generate filename with timestamp
  const generateFilename = () => {
    const now = new Date();
    const timestamp = now.toISOString()
      .replace(/:/g, '-')
      .replace(/\..+/, '')
      .replace('T', '-');
    return `nova-sonic-settings-${timestamp}.json`;
  };

  // Handle export
  const handleExport = async () => {
    try {
      setIsExporting(true);
      console.log('📤 Starting export...');
      
      // Get export data
      const exportData = SettingsManager.exportSettings();
      
      // Create blob and download
      const blob = new Blob([exportData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      // Create download link
      const link = document.createElement('a');
      link.href = url;
      link.download = generateFilename();
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Cleanup
      URL.revokeObjectURL(url);
      
      console.log('✅ Export completed successfully');
    } catch (error) {
      console.error('Export failed:', error);
      alert(`Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsExporting(false);
    }
  };

  // Handle file selection
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleImport(file);
    }
  };

  // Handle drag and drop
  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const file = event.dataTransfer.files[0];
    if (file) {
      handleImport(file);
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  };

  // Handle import
  const handleImport = async (file: File) => {
    try {
      setIsImporting(true);
      setImportStatus('idle');
      setImportErrors([]);
      
      console.log('📥 Starting import...', file.name);
      
      // Validate file type
      if (!file.name.endsWith('.json')) {
        throw new Error('Please select a JSON file');
      }
      
      // Read file content
      const fileContent = await file.text();
      
      // Import settings
      const result = SettingsManager.importSettings(fileContent, { replaceAll: true });
      
      if (result.success) {
        setImportStatus('success');
        console.log('✅ Import completed successfully');
        onImportSuccess?.();
        
        // Show success message briefly
        setTimeout(() => {
          setImportStatus('idle');
        }, 3000);
      } else {
        setImportStatus('error');
        setImportErrors(result.errors);
        console.error('Import failed:', result.errors);
        onImportError?.(result.errors);
      }
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setImportStatus('error');
      setImportErrors([errorMessage]);
      console.error('Import failed:', error);
      onImportError?.([errorMessage]);
    } finally {
      setIsImporting(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="import-export-section">
      <h3>💾 Backup & Restore</h3>
      <p className="section-description">
        Export your complete application configuration to keep it safe, or import a previously saved backup. 
        This includes all settings: Amazon Cognito configuration, custom tools, system prompts, and preferences.
      </p>
      
      {/* Export Section */}
      <div className="export-section">
        <h4>📤 Export Settings</h4>
        <p>Download your complete application configuration including Amazon Cognito settings, custom tools, system prompts, and all preferences as a JSON file.</p>
        <button 
          className="export-btn"
          onClick={handleExport}
          disabled={isExporting}
        >
          {isExporting ? '⏳ Exporting...' : '📤 Export All Settings'}
        </button>
      </div>

      {/* Import Section */}
      <div className="import-section">
        <h4>📥 Import Settings</h4>
        <p>Upload a previously exported settings file to restore your complete application configuration. This will restore Amazon Cognito settings, custom tools, system prompts, and all preferences.</p>
        
        <div 
          className={`import-dropzone ${isImporting ? 'importing' : ''} ${importStatus}`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleFileSelect}
            style={{ display: 'none' }}
          />
          
          {isImporting ? (
            <div className="import-loading">
              <div className="spinner"></div>
              <p>⏳ Importing settings...</p>
            </div>
          ) : (
            <div className="import-content">
              <div className="import-icon">📁</div>
              <p><strong>Click to choose file</strong> or drag & drop here</p>
              <p className="file-info">Accepts .json files only</p>
            </div>
          )}
        </div>

        {/* Import Status */}
        {importStatus === 'success' && (
          <div className="import-success">
            <p>✅ Settings imported successfully!</p>
            <p className="success-note">Your configuration has been updated. You may need to refresh the page.</p>
          </div>
        )}

        {importStatus === 'error' && (
          <div className="import-error">
            <p>❌ Import failed:</p>
            <ul>
              {importErrors.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Warning */}
        <div className="import-warning">
          <p>⚠️ <strong>Warning:</strong> Importing will replace your current settings and tools. A backup will be created automatically.</p>
        </div>
      </div>
    </div>
  );
};

export default ImportExport;
