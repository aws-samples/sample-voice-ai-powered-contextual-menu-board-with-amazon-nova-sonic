import React, { useState, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import { Tool } from '../lib/util/SettingsManager';

interface ToolEditorProps {
  tool: Tool;
  onUpdate: (tool: Tool) => void;
  onRemove: () => void;
  errors: string[];
}

export const ToolEditor: React.FC<ToolEditorProps> = ({ 
  tool, 
  onUpdate, 
  onRemove, 
  errors 
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isCodeExpanded, setIsCodeExpanded] = useState(false);
  const [localTool, setLocalTool] = useState<Tool>(tool);

  // Update local state when prop changes
  useEffect(() => {
    setLocalTool(tool);
  }, [tool]);

  const handleFieldChange = (field: keyof Tool, value: any) => {
    const updatedTool = { ...localTool, [field]: value };
    setLocalTool(updatedTool);
    onUpdate(updatedTool);
  };

  const handleSchemaChange = (value: string | undefined) => {
    const updatedTool = {
      ...localTool,
      inputSchema: { json: value || '' }
    };
    setLocalTool(updatedTool);
    onUpdate(updatedTool);
  };

  const validateAndFormatJSON = () => {
    try {
      const parsed = JSON.parse(localTool.inputSchema.json);
      const formatted = JSON.stringify(parsed, null, 2);
      handleSchemaChange(formatted);
    } catch (error) {
      // Invalid JSON, keep as is
    }
  };

  const hasErrors = errors.length > 0;

  return (
    <div className={`tool-editor ${hasErrors ? 'has-errors' : ''}`}>
      <div className="tool-header" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="tool-title">
          <span className="tool-name">
            {localTool.tool_name || 'Unnamed Tool'}
          </span>
          <span className="tool-order">#{localTool.order}</span>
          {hasErrors && <span className="error-indicator">⚠️</span>}
        </div>
        <div className="tool-actions">
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
            title="Remove tool"
          >
            🗑️
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="tool-content">
          {hasErrors && (
            <div className="tool-errors">
              {errors.map((error, index) => (
                <div key={index} className="error-message">
                  {error}
                </div>
              ))}
            </div>
          )}

          <div className="tool-form">
            <div className="form-row">
              <div className="form-group">
                <label htmlFor={`tool-name-${tool.order}`}>Tool Name *</label>
                <input
                  id={`tool-name-${tool.order}`}
                  type="text"
                  value={localTool.tool_name}
                  onChange={(e) => handleFieldChange('tool_name', e.target.value)}
                  placeholder="Enter tool name"
                  className={errors.some(e => e.includes('Tool name')) ? 'error' : ''}
                />
              </div>
              <div className="form-group order-display">
                <label>Order</label>
                <div className="order-badge">
                  #{localTool.order}
                </div>
                <div className="order-help">
                  Drag to reorder
                </div>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor={`tool-description-${tool.order}`}>Description *</label>
              <textarea
                id={`tool-description-${tool.order}`}
                value={localTool.description}
                onChange={(e) => handleFieldChange('description', e.target.value)}
                placeholder="Describe what this tool does"
                rows={2}
                className={errors.some(e => e.includes('description')) ? 'error' : ''}
              />
            </div>

            <div className="form-group">
              <div className="form-label-with-actions">
                <label>Input Schema (JSON)</label>
                <button
                  type="button"
                  className="format-btn"
                  onClick={validateAndFormatJSON}
                  title="Format JSON"
                >
                  Format
                </button>
              </div>
              <div className="code-editor-container">
                <Editor
                  height="150px"
                  defaultLanguage="json"
                  value={localTool.inputSchema.json}
                  onChange={handleSchemaChange}
                  theme="vs-dark"
                  options={{
                    minimap: { enabled: false },
                    scrollBeyondLastLine: false,
                    fontSize: 14,
                    lineNumbers: 'on',
                    roundedSelection: false,
                    scrollbar: {
                      vertical: 'auto',
                      horizontal: 'auto'
                    },
                    wordWrap: 'on'
                  }}
                />
              </div>
              {errors.some(e => e.includes('schema')) && (
                <div className="field-error">Invalid JSON format</div>
              )}
            </div>

            <div className="form-group">
              <div className="editor-header">
                <label>JavaScript Script *</label>
                <button
                  type="button"
                  className="code-expand-btn"
                  onClick={() => setIsCodeExpanded(!isCodeExpanded)}
                  title={isCodeExpanded ? "Collapse editor" : "Expand editor"}
                >
                  {isCodeExpanded ? '🗗' : '🗖'}
                </button>
              </div>
              <div className={`code-editor-container ${isCodeExpanded ? 'expanded' : ''}`}>
                <Editor
                  height={isCodeExpanded ? "500px" : "200px"}
                  defaultLanguage="javascript"
                  value={localTool.script}
                  onChange={(value) => handleFieldChange('script', value || '')}
                  theme="vs-dark"
                  options={{
                    minimap: { enabled: false },
                    scrollBeyondLastLine: false,
                    fontSize: 14,
                    lineNumbers: 'on',
                    roundedSelection: false,
                    scrollbar: {
                      vertical: 'auto',
                      horizontal: 'auto'
                    },
                    wordWrap: 'on'
                  }}
                />
              </div>
              {errors.some(e => e.includes('script')) && (
                <div className="field-error">Script is required</div>
              )}
            </div>

            <div className="form-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={localTool.run_after_app_init}
                  onChange={(e) => handleFieldChange('run_after_app_init', e.target.checked)}
                />
                Run after app initialization
              </label>
              <div className="help-text">
                If checked, this tool will be executed automatically when the app starts
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
