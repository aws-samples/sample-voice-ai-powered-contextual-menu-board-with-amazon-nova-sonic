import React, { useState, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import { GlobalParameter } from '../lib/util/SettingsManager';

interface GlobalParameterEditorProps {
  parameter: GlobalParameter;
  onUpdate: (parameter: GlobalParameter) => void;
  onRemove: () => void;
  errors: string[];
}

export const GlobalParameterEditor: React.FC<GlobalParameterEditorProps> = ({ 
  parameter, 
  onUpdate, 
  onRemove, 
  errors 
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isValueExpanded, setIsValueExpanded] = useState(false);
  const [localParameter, setLocalParameter] = useState<GlobalParameter>(parameter);

  // Update local state when prop changes
  useEffect(() => {
    setLocalParameter(parameter);
  }, [parameter]);

  const handleFieldChange = (field: keyof GlobalParameter, value: any) => {
    const updatedParameter = { ...localParameter, [field]: value };
    setLocalParameter(updatedParameter);
    onUpdate(updatedParameter);
  };

  const handleKeyChange = (value: string) => {
    // Convert to valid parameter key format (alphanumeric + underscore, preserve case)
    const cleanKey = value.replace(/[^a-zA-Z0-9_]/g, '_');
    handleFieldChange('key', cleanKey);
  };

  const hasErrors = errors.length > 0;

  return (
    <div className={`global-parameter-editor ${hasErrors ? 'has-errors' : ''}`}>
      <div className="parameter-header" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="parameter-title">
          <span className="parameter-icon">📋</span>
          <span className="parameter-name">
            {localParameter.key || 'Unnamed Parameter'}
          </span>
          <span className="parameter-order">#{localParameter.order}</span>
        </div>
        
        {!isExpanded && localParameter.value && (
          <div className="parameter-preview">
            {localParameter.value.length > 50 
              ? `${localParameter.value.substring(0, 50)}...` 
              : localParameter.value
            }
          </div>
        )}
        
        <div className="parameter-actions">
          <button
            type="button"
            className="expand-btn"
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
          >
            {isExpanded ? '▼' : '▶'}
          </button>
          <button
            type="button"
            className="remove-btn"
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            title="Remove parameter"
          >
            🗑️
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="parameter-content">
          {hasErrors && (
            <div className="parameter-errors">
              {errors.map((error, index) => (
                <div key={index} className="error-message">
                  ⚠️ {error}
                </div>
              ))}
            </div>
          )}

          <div className="form-group">
            <label>Parameter Key *</label>
            <input
              type="text"
              value={localParameter.key}
              onChange={(e) => handleKeyChange(e.target.value)}
              placeholder="apiEndpoint, API_KEY, base_url"
              className={errors.some(e => e.includes('key')) ? 'error' : ''}
            />
            <small className="field-hint">
              Use any naming style (e.g., apiEndpoint, API_KEY, base_url)
            </small>
          </div>

          <div className="form-group">
            <label>Description</label>
            <input
              type="text"
              value={localParameter.description || ''}
              onChange={(e) => handleFieldChange('description', e.target.value)}
              placeholder="Brief description of this parameter"
            />
          </div>

          <div className="form-group">
            <div className="editor-header">
              <label>Parameter Value *</label>
              <button
                type="button"
                className="code-expand-btn"
                onClick={() => setIsValueExpanded(!isValueExpanded)}
                title={isValueExpanded ? "Collapse editor" : "Expand editor"}
              >
                {isValueExpanded ? '🗗' : '🗖'}
              </button>
            </div>
            <div className={`code-editor-container ${isValueExpanded ? 'expanded' : ''}`}>
              <Editor
                height={isValueExpanded ? "300px" : "100px"}
                defaultLanguage="plaintext"
                value={localParameter.value}
                onChange={(value) => handleFieldChange('value', value || '')}
                theme="vs-dark"
                options={{
                  minimap: { enabled: false },
                  scrollBeyondLastLine: false,
                  fontSize: 14,
                  lineNumbers: 'off',
                  wordWrap: 'on',
                  scrollbar: {
                    vertical: 'auto',
                    horizontal: 'auto'
                  }
                }}
              />
            </div>
            {errors.some(e => e.includes('value')) && (
              <div className="field-error">Parameter value is required</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
