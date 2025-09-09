import React, { useState, useEffect, useRef } from 'react';
import { Amplify } from 'aws-amplify';
import Editor from '@monaco-editor/react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  restrictToVerticalAxis,
  restrictToParentElement,
} from '@dnd-kit/modifiers';
import { SettingsManager, type AppSettings, type CognitoConfig, type AgentConfig, type Tool, type GlobalParameter } from '../lib/util/SettingsManager';
import { SortableToolEditor } from './SortableToolEditor';
import { SortableGlobalParameterEditor } from './SortableGlobalParameterEditor';
import ComponentDocumentation from './ComponentDocumentation';
import ImportExport from './ImportExport';
import { POWERED_BY_TEXT } from '../lib/sdk/consts';

interface SettingsComponentProps {
  onConfigSet: () => void;
  onConfigSaveOnly?: () => void; // New optional callback for save-only
  isEditingConfig: boolean;
  setEditingConfig: (editing: boolean) => void;
  incompleteSettings?: string[];
}

export const SettingsComponent: React.FC<SettingsComponentProps> = ({
  onConfigSet,
  onConfigSaveOnly,
  isEditingConfig,
  setEditingConfig,
  incompleteSettings = []
}) => {
  const [activeTab, setActiveTab] = useState<'cognito' | 'agent' | 'backup' | 'docs'>('cognito');
  const [settings, setSettings] = useState<AppSettings>({
    cognito: {
      userPoolId: '',
      userPoolClientId: '',
      region: 'us-east-1',
      identityPoolId: ''
    },
    agent: {
      system_prompt: "You are a friend. The user and you will engage in a spoken dialog exchanging the transcripts of a natural real-time conversation. Keep your responses short, generally two or three sentences for chatty scenarios.",
      globalParameters: [],
      tools: []
    }
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [toolErrors, setToolErrors] = useState<Record<number, string[]>>({});
  const [parameterErrors, setParameterErrors] = useState<Record<number, string[]>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [showResetWarning, setShowResetWarning] = useState(false);
  const [isLoadingDefaults, setIsLoadingDefaults] = useState(false);
  const [isUsingDefaults, setIsUsingDefaults] = useState(false);

  // Audio recording state
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioDuration, setAudioDuration] = useState<number>(0);

  // Company name editing state
  const [isEditingCompanyName, setIsEditingCompanyName] = useState(false);
  const [tempCompanyName, setTempCompanyName] = useState('');

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    const storedSettings = SettingsManager.getSettings();
    if (storedSettings) {
      setSettings(storedSettings);
      setIsUsingDefaults(SettingsManager.isUsingDefaultConfiguration());
      if (!isEditingConfig) {
        configureAmplify(storedSettings);
      }
      
      // Initialize audio blob if initiation audio exists
      if (storedSettings.agent.initiationAudio) {
        try {
          const base64Audio = storedSettings.agent.initiationAudio;
          const audioData = base64Audio.includes(',') ? base64Audio.split(',')[1] : base64Audio;
          const binaryString = atob(audioData);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          const blob = new Blob([bytes], { type: 'audio/webm' });
          setAudioBlob(blob);
          
          // Estimate duration (rough calculation)
          setAudioDuration(blob.size / 16000); // Rough estimate
        } catch (error) {
          console.error('Error loading existing audio:', error);
        }
      }
    }
  }, [isEditingConfig]);

  // Close reset warning when clicking elsewhere
  useEffect(() => {
    const handleClickOutside = () => {
      if (showResetWarning) {
        setShowResetWarning(false);
      }
    };

    if (showResetWarning) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [showResetWarning]);

  const configureAmplify = (config: AppSettings) => {
    try {
      Amplify.configure({
        Auth: {
          Cognito: {
            userPoolId: config.cognito.userPoolId,
            userPoolClientId: config.cognito.userPoolClientId,
            identityPoolId: config.cognito.identityPoolId
          },
        }
      });
    } catch (error) {
      console.error('Error configuring Amplify:', error);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    console.log('Validating form, settings:', settings);
    
    // Validate Cognito fields
    const cognitoErrors = SettingsManager.validateCognitoConfig(settings.cognito);
    cognitoErrors.forEach((error, index) => {
      const fieldMap = ['userPoolId', 'userPoolClientId', 'identityPoolId', 'region'];
      if (fieldMap[index]) {
        newErrors[fieldMap[index]] = error;
      }
    });

    // Validate auto-initiate configuration
    if (settings.agent.autoInitiateConversation && !settings.agent.initiationAudio) {
      newErrors.autoInitiate = 'Please record an initiation audio or disable auto-initiate conversation before saving.';
    }

    setErrors(newErrors);
    
    // Validate agent config
    const agentValid = validateAgentConfig();
    
    return Object.keys(newErrors).length === 0 && agentValid;
  };

  const handleCancel = () => {
    if (isEditingConfig) {
      setEditingConfig(false);
    }
  };

  // New save-only function (doesn't close settings)
  const handleSaveOnly = async () => {
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    try {
      // Save settings to localStorage
      SettingsManager.saveSettings(settings);
      
      // Configure Amplify with new settings
      configureAmplify(settings);
      
      console.log('Settings saved successfully (staying open)');
      
      // Dispatch custom event to update App title
      window.dispatchEvent(new CustomEvent('settingsUpdated'));
      
      // Use the save-only callback if provided, otherwise just save without refresh
      if (onConfigSaveOnly) {
        onConfigSaveOnly();
      }
      // Don't call onConfigSet() - that would close settings and trigger full refresh
      // Don't call setEditingConfig(false) - keep settings open
    } catch (error) {
      console.error('Error saving settings:', error);
      setErrors({ general: 'Failed to save settings. Please try again.' });
    } finally {
      setIsLoading(false);
    }
  };

  // Enhanced save and exit function (original behavior)
  const handleSaveAndExit = async () => {
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    try {
      // Save settings to localStorage
      SettingsManager.saveSettings(settings);
      
      // Configure Amplify with new settings
      configureAmplify(settings);
      
      console.log('Settings saved successfully (closing)');
      
      // Dispatch custom event to update App title
      window.dispatchEvent(new CustomEvent('settingsUpdated'));
      
      onConfigSet();
      setEditingConfig(false); // Close settings
    } catch (error) {
      console.error('Error saving settings:', error);
      setErrors({ general: 'Failed to save settings. Please try again.' });
    } finally {
      setIsLoading(false);
    }
  };

  // Load default configuration
  const handleLoadDefaults = async () => {
    setIsLoadingDefaults(true);
    try {
      const result = await SettingsManager.loadDefaultsPreservingCognito();
      
      if (result.success) {
        // Reload settings from storage
        const updatedSettings = SettingsManager.getSettings();
        if (updatedSettings) {
          setSettings(updatedSettings);
          setIsUsingDefaults(true);
        }
        
        // Show success message (you can add a notification here)
        console.log('✅ Default configuration loaded successfully');
      } else {
        console.error('Failed to load defaults:', result.errors);
        setErrors({ general: `Failed to load defaults: ${result.errors.join(', ')}` });
      }
    } catch (error) {
      console.error('Error loading defaults:', error);
      setErrors({ general: 'Failed to load default configuration. Please try again.' });
    } finally {
      setIsLoadingDefaults(false);
    }
  };

  const handleCognitoChange = (field: keyof CognitoConfig, value: string) => {
    setSettings(prev => ({
      ...prev,
      cognito: {
        ...prev.cognito,
        [field]: value
      }
    }));
    
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleAgentChange = (field: keyof AgentConfig, value: any) => {
    setSettings(prev => ({
      ...prev,
      agent: {
        ...prev.agent,
        [field]: value
      }
    }));
  };

  const handleSystemPromptChange = (value: string | undefined) => {
    handleAgentChange('system_prompt', value || '');
  };

  // Audio recording handlers
  const handleAutoInitiateChange = (enabled: boolean) => {
    handleAgentChange('autoInitiateConversation', enabled);
    if (!enabled) {
      // Clear audio when disabled
      handleAgentChange('initiationAudio', '');
      setAudioBlob(null);
      setAudioDuration(0);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        }
      });
      
      const recorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];
      let startTime = Date.now();
      
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };
      
      recorder.onstop = async () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        const duration = (Date.now() - startTime) / 1000;
        
        // Convert to base64
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64 = reader.result as string;
          handleAgentChange('initiationAudio', base64);
          setAudioBlob(blob);
          setAudioDuration(duration);
        };
        reader.readAsDataURL(blob);
        
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
      };
      
      setMediaRecorder(recorder);
      recorder.start();
      setIsRecording(true);
      
      // Auto-stop after 5 seconds
      setTimeout(() => {
        if (recorder.state === 'recording') {
          recorder.stop();
          setIsRecording(false);
        }
      }, 5000);
      
    } catch (error) {
      console.error('Error starting recording:', error);
      alert('Could not access microphone. Please check permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      mediaRecorder.stop();
      setIsRecording(false);
    }
  };

  const playAudio = () => {
    if (audioBlob) {
      const audio = new Audio(URL.createObjectURL(audioBlob));
      audio.play();
    }
  };

  const clearAudio = () => {
    handleAgentChange('initiationAudio', '');
    setAudioBlob(null);
    setAudioDuration(0);
  };

  // Company name editing handlers
  const startEditingCompanyName = () => {
    setTempCompanyName(settings.agent.companyName || 'Your Drive-thru company');
    setIsEditingCompanyName(true);
  };

  const saveCompanyName = () => {
    handleAgentChange('companyName', tempCompanyName.trim() || 'Your Drive-thru company');
    setIsEditingCompanyName(false);
    
    // Dispatch event to update App title immediately
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('settingsUpdated'));
    }, 100);
  };

  const cancelEditingCompanyName = () => {
    setIsEditingCompanyName(false);
    setTempCompanyName('');
  };

  const addNewTool = () => {
    const newOrder = Math.max(0, ...settings.agent.tools.map(t => t.order)) + 1;
    const newTool: Tool = {
      tool_name: '',
      description: '',
      inputSchema: { json: '{}' },
      script: '// Tool Execution Context - All Available Variables:\n// =====================================================\n\n// CORE PARAMETERS (always available):\n// - input: Object containing the input from the AI model or auto-execution\n// - sessionId: String with current session ID\n// - toolName: String with the name of this tool\n// - agentTriggered: Boolean - true if called by AI, false if auto-executed\n\n// HTTP CLIENT:\n// - axios: Full Axios HTTP client for making API requests\n//   Example: const response = await axios.get("https://api.example.com/data");\n\n// UI COMPONENTS (interact with the application):\n// - components.app: App-level controls\n//   - setStatus(message): Update status bar\n//   - startStreaming(): Start voice streaming\n//   - stopStreaming(): Stop voice streaming\n//   - showSettingsPanel(): Show settings\n//   - hideSettingsPanel(): Hide settings\n\n// - components.chat: Chat management\n//   - addMessage(message, role): Add message to chat\n//   - clearMessages(): Clear all messages\n//   - getMessages(): Get all messages\n//   - getLastMessage(): Get last message\n\n// - components.ui: User interface controls\n//   - showNotification(message, type, options): Show toast notification (returns ID)\n//   - removeNotification(id): Remove specific notification\n//   - clearAllNotifications(): Clear all notifications\n//   - updateTitle(title): Update browser tab title\n\n// - components.auth: Authentication information\n//   - getCredentials(): Get AWS credentials\n//   - getTokens(): Get Cognito tokens (idToken, accessToken, refreshToken)\n//   - getJWT(): Get JWT token (ID token)\n//   - getUserInfo(): Get user information\n\n// UTILITY FUNCTIONS:\n// - utils.generateId(): Generate unique ID\n// - utils.formatDate(date, options): Format date string\n// - utils.sleep(ms): Async sleep function\n// - utils.parseJSON(str): Safe JSON parsing\n// - utils.stringifyJSON(obj): JSON stringify with formatting\n\n// REACT LIBRARY (for advanced users):\n// - React: Full React library for advanced component manipulation\n\n// =====================================================\n// YOUR TOOL CODE STARTS HERE:\n\nasync function execute({...args}) {\n  console.log("Tool executed with arguments:", args);\n  const { input, sessionId, toolName, agentTriggered, ...restContext } = args;\n  \n  // Log core parameters\n  console.log("Tool input:", input);\n  console.log("Session ID:", sessionId);\n  console.log("Tool name:", toolName);\n  console.log("Agent triggered:", agentTriggered);\n  \n  // Example: Show a notification\n  const notificationId = components.ui.showNotification(\n    `Tool ${toolName} executed successfully!`, \n    "success"\n  );\n  \n  // Example: Add message to chat\n  components.chat.addMessage(\n    `Tool ${toolName} completed its task`, \n    "system"\n  );\n  \n  // Example: Make HTTP request\n  // const response = await axios.get("https://api.example.com/data");\n  \n  // Your tool logic here...\n  \n  // Always return a JSON string\n  return JSON.stringify({ \n    result: "success",\n    message: "Tool executed successfully",\n    notificationId: notificationId\n  });\n}',
      run_after_app_init: false,
      order: newOrder
    };

    handleAgentChange('tools', [...settings.agent.tools, newTool]);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      const activeId = active.id as string;
      const overId = over?.id as string;
      
      if (activeId.startsWith('tool-') && overId.startsWith('tool-')) {
        // Handle tool reordering
        const oldIndex = settings.agent.tools.findIndex(tool => `tool-${tool.order}` === activeId);
        const newIndex = settings.agent.tools.findIndex(tool => `tool-${tool.order}` === overId);

        const reorderedTools = arrayMove(settings.agent.tools, oldIndex, newIndex);
        
        // Update order numbers based on new positions
        const toolsWithNewOrder = reorderedTools.map((tool, index) => ({
          ...tool,
          order: index + 1
        }));

        handleAgentChange('tools', toolsWithNewOrder);
      } else if (activeId.startsWith('param-') && overId.startsWith('param-')) {
        // Handle parameter reordering
        const oldIndex = settings.agent.globalParameters.findIndex(param => `param-${param.order}` === activeId);
        const newIndex = settings.agent.globalParameters.findIndex(param => `param-${param.order}` === overId);

        const reorderedParameters = arrayMove(settings.agent.globalParameters, oldIndex, newIndex);
        
        // Update order numbers based on new positions
        const parametersWithNewOrder = reorderedParameters.map((param, index) => ({
          ...param,
          order: index + 1
        }));

        handleAgentChange('globalParameters', parametersWithNewOrder);
      }
    }
  };

  // Handle import success - refresh settings from storage
  const handleImportSuccess = () => {
    const importedSettings = SettingsManager.getSettings();
    if (importedSettings) {
      setSettings(importedSettings);
      setErrors({});
      console.log('Settings refreshed after import');
    }
  };

  // Handle import error - show error messages
  const handleImportError = (importErrors: string[]) => {
    setErrors({ 
      general: `Import failed: ${importErrors.join(', ')}` 
    });
  };

  const updateTool = (index: number, updatedTool: Tool) => {
    const newTools = [...settings.agent.tools];
    newTools[index] = updatedTool;
    handleAgentChange('tools', newTools);
    
    // Validate the updated tool
    const errors = SettingsManager.validateTool(updatedTool);
    setToolErrors(prev => ({
      ...prev,
      [index]: errors
    }));
  };

  const removeTool = (index: number) => {
    const newTools = settings.agent.tools.filter((_, i) => i !== index);
    const reorderedTools = SettingsManager.reorderTools(newTools);
    handleAgentChange('tools', reorderedTools);
    
    // Clear errors for removed tool
    setToolErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[index];
      return newErrors;
    });
  };

  const resetAgentConfig = () => {
    if (showResetWarning) {
      SettingsManager.resetAgentConfig();
      const defaultAgent = SettingsManager.getAgentConfig();
      setSettings(prev => ({
        ...prev,
        agent: defaultAgent
      }));
      setToolErrors({});
      setParameterErrors({});
      setShowResetWarning(false);
    } else {
      setShowResetWarning(true);
    }
  };

  // Global Parameter Management Functions
  const addNewParameter = () => {
    const newParameter: GlobalParameter = {
      id: SettingsManager.generateGlobalParameterId(),
      key: '',
      value: '',
      description: '',
      order: settings.agent.globalParameters.length + 1
    };
    
    const newParameters = [...settings.agent.globalParameters, newParameter];
    handleAgentChange('globalParameters', newParameters);
  };

  const updateParameter = (index: number, updatedParameter: GlobalParameter) => {
    const newParameters = [...settings.agent.globalParameters];
    newParameters[index] = updatedParameter;
    handleAgentChange('globalParameters', newParameters);
    
    // Validate the updated parameter
    const errors = SettingsManager.validateGlobalParameter(updatedParameter);
    setParameterErrors(prev => ({
      ...prev,
      [index]: errors
    }));
  };

  const removeParameter = (index: number) => {
    const newParameters = settings.agent.globalParameters.filter((_, i) => i !== index);
    const reorderedParameters = SettingsManager.reorderGlobalParameters(newParameters);
    handleAgentChange('globalParameters', reorderedParameters);
    
    // Clear errors for removed parameter
    setParameterErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[index];
      return newErrors;
    });
  };

  const validateAgentConfig = (): boolean => {
    const toolsErrors = SettingsManager.validateToolsArray(settings.agent.tools);
    const parametersErrors = SettingsManager.validateGlobalParametersArray(settings.agent.globalParameters);
    
    // Update tool errors
    const newToolErrors: Record<number, string[]> = {};
    settings.agent.tools.forEach((tool, index) => {
      const errors = SettingsManager.validateTool(tool);
      if (errors.length > 0) {
        newToolErrors[index] = errors;
      }
    });
    setToolErrors(newToolErrors);
    
    // Update parameter errors
    const newParameterErrors: Record<number, string[]> = {};
    settings.agent.globalParameters.forEach((param, index) => {
      const errors = SettingsManager.validateGlobalParameter(param);
      if (errors.length > 0) {
        newParameterErrors[index] = errors;
      }
    });
    setParameterErrors(newParameterErrors);
    
    return toolsErrors.length === 0 && 
           parametersErrors.length === 0 && 
           Object.keys(newToolErrors).length === 0 &&
           Object.keys(newParameterErrors).length === 0;
  };

  const isTabIncomplete = (tab: string) => {
    return incompleteSettings.includes(tab);
  };

  return (
    <div className="settings-container">
      <div className="settings-header">
        <div className="settings-header-content">
          <div className="settings-header-text">
            <div className="title-container">
              {isEditingCompanyName ? (
                <div className="title-edit-mode">
                  <input
                    type="text"
                    value={tempCompanyName}
                    onChange={(e) => setTempCompanyName(e.target.value)}
                    className="company-name-input"
                    placeholder="Enter company name"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') saveCompanyName();
                      if (e.key === 'Escape') cancelEditingCompanyName();
                    }}
                  />
                  <span className="title-suffix"> Studio</span>
                  <div className="title-edit-buttons">
                    <button onClick={saveCompanyName} className="save-title-btn">✓</button>
                    <button onClick={cancelEditingCompanyName} className="cancel-title-btn">✕</button>
                  </div>
                </div>
              ) : (
                <div className="title-display-mode">
                  <h1>
                    🚗 <span className="company-name">{settings.agent.companyName || 'Your Drive-thru company'}</span> <span className="studio-suffix">Studio</span>
                    <button onClick={startEditingCompanyName} className="edit-title-btn" title="Edit company name">✏️</button>
                  </h1>
                </div>
              )}
              <p className="powered-by">{POWERED_BY_TEXT}</p>
            </div>
            <p>Configure your AWS settings to enable real-time voice chat with AI</p>
            {isUsingDefaults && (
              <div className="default-config-indicator">
                <span className="indicator-icon">🎯</span>
                <span>Using sample configuration</span>
              </div>
            )}
          </div>
          
          <div className="settings-header-actions">
            <button
              type="button"
              onClick={handleLoadDefaults}
              disabled={isLoadingDefaults}
              className="header-btn load-defaults-btn"
              title="Load sample configuration"
            >
              {isLoadingDefaults ? '⏳' : '🔄'} Reset to Default
            </button>
            
            <button
              type="button"
              onClick={handleSaveOnly}
              disabled={isLoading}
              className="header-btn save-btn"
              title="Save changes and continue editing"
            >
              {isLoading ? '⏳' : '💾'} Save
            </button>
            
            <button
              type="button"
              onClick={handleSaveAndExit}
              disabled={isLoading}
              className="header-btn save-exit-btn"
              title="Save changes and close settings"
            >
              {isLoading ? '⏳' : '💾'} Save & Exit
            </button>
            
            <button
              type="button"
              onClick={handleCancel}
              className="header-btn exit-btn"
              title="Exit settings"
            >
              🚪 Exit
            </button>
          </div>
        </div>
      </div>

      <div className="settings-content">
        <div className="settings-tabs">
          <button
            className={`tab-button ${activeTab === 'cognito' ? 'active' : ''} ${isTabIncomplete('cognito') ? 'incomplete' : ''}`}
            onClick={() => setActiveTab('cognito')}
          >
            <span>🔐</span>
            Amazon Cognito
            {isTabIncomplete('cognito') && <span className="incomplete-indicator">!</span>}
          </button>
          <button
            className={`tab-button ${activeTab === 'agent' ? 'active' : ''}`}
            onClick={() => setActiveTab('agent')}
          >
            <span>🤖</span>
            Agent
          </button>
          <button
            className={`tab-button ${activeTab === 'backup' ? 'active' : ''}`}
            onClick={() => setActiveTab('backup')}
          >
            <span>💾</span>
            Backup & Restore
          </button>
          <button
            className={`tab-button ${activeTab === 'docs' ? 'active' : ''}`}
            onClick={() => setActiveTab('docs')}
          >
            <span>📚</span>
            Component Docs
          </button>
        </div>

        <div className="settings-form">
          {activeTab === 'cognito' && (
            <div className="form-section">
              <h3>Amazon Cognito Configuration</h3>
              <p className="section-description">
                Configure your Amazon Cognito settings for authentication. You can find these values in your Amazon Cognito console.
              </p>

              <div className="form-group">
                <label htmlFor="userPoolId">
                  User Pool ID *
                  <span className="field-help">Found in Cognito User Pool General Settings</span>
                </label>
                <input
                  id="userPoolId"
                  type="text"
                  value={settings.cognito.userPoolId}
                  onChange={(e) => handleCognitoChange('userPoolId', e.target.value)}
                  placeholder="us-east-1_xxxxxxxxx"
                  className={errors.userPoolId ? 'error' : ''}
                />
                {errors.userPoolId && <span className="error-message">{errors.userPoolId}</span>}
              </div>

              <div className="form-group">
                <label htmlFor="userPoolClientId">
                  User Pool Client ID *
                  <span className="field-help">Found in Cognito User Pool App Clients</span>
                </label>
                <input
                  id="userPoolClientId"
                  type="text"
                  value={settings.cognito.userPoolClientId}
                  onChange={(e) => handleCognitoChange('userPoolClientId', e.target.value)}
                  placeholder="xxxxxxxxxxxxxxxxxxxxxxxxxx"
                  className={errors.userPoolClientId ? 'error' : ''}
                />
                {errors.userPoolClientId && <span className="error-message">{errors.userPoolClientId}</span>}
              </div>

              <div className="form-group">
                <label htmlFor="identityPoolId">
                  Identity Pool ID *
                  <span className="field-help">Found in Cognito Identity Pool Dashboard</span>
                </label>
                <input
                  id="identityPoolId"
                  type="text"
                  value={settings.cognito.identityPoolId}
                  onChange={(e) => handleCognitoChange('identityPoolId', e.target.value)}
                  placeholder="us-east-1:xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                  className={errors.identityPoolId ? 'error' : ''}
                />
                {errors.identityPoolId && <span className="error-message">{errors.identityPoolId}</span>}
              </div>

              <div className="form-group">
                <label htmlFor="region">
                  AWS Region *
                  <span className="field-help">The AWS region where your resources are located</span>
                </label>
                <select
                  id="region"
                  value={settings.cognito.region}
                  onChange={(e) => handleCognitoChange('region', e.target.value)}
                  className={errors.region ? 'error' : ''}
                >
                  <option value="us-east-1">US East (N. Virginia) - us-east-1</option>
                  <option value="us-east-2">US East (Ohio) - us-east-2</option>
                  <option value="us-west-1">US West (N. California) - us-west-1</option>
                  <option value="us-west-2">US West (Oregon) - us-west-2</option>
                  <option value="eu-west-1">Europe (Ireland) - eu-west-1</option>
                  <option value="eu-central-1">Europe (Frankfurt) - eu-central-1</option>
                  <option value="ap-southeast-1">Asia Pacific (Singapore) - ap-southeast-1</option>
                  <option value="ap-northeast-1">Asia Pacific (Tokyo) - ap-northeast-1</option>
                </select>
                {errors.region && <span className="error-message">{errors.region}</span>}
              </div>
            </div>
          )}

          {activeTab === 'agent' && (
            <div className="form-section">
              <div className="section-header">
                <h3>Agent Configuration</h3>
                <button
                  type="button"
                  onClick={resetAgentConfig}
                  className={`reset-button ${showResetWarning ? 'warning' : ''}`}
                  title="Reset to default values"
                >
                  {showResetWarning ? 'Confirm Reset' : 'Reset to Defaults'}
                </button>
              </div>
              
              {showResetWarning && (
                <div className="warning-banner">
                  ⚠️ This will remove all custom system prompts and tools. Click "Confirm Reset" to proceed or click elsewhere to cancel.
                </div>
              )}
              
              <p className="section-description">
                Configure how the AI agent behaves and what tools it can use during conversations.
              </p>

              <div className="form-group">
                <label htmlFor="system-prompt">System Prompt</label>
                <p className="field-description">
                  Define how the AI should behave and respond during conversations.
                </p>
                <div className="code-editor-container">
                  <Editor
                    height="100%"
                    defaultLanguage="plaintext"
                    value={settings.agent.system_prompt}
                    onChange={handleSystemPromptChange}
                    onMount={(editor) => {
                      requestAnimationFrame(() => editor.layout()); // Fix initial layout timing
                      const container = editor.getDomNode()?.parentElement;
                      if (container) {
                        const resizeObserver = new ResizeObserver(() => {
                          editor.layout();
                        });
                        resizeObserver.observe(container);
                      }
                    }}
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
              </div>

              {/* Auto-Initiate Conversation Section */}
              <div className="auto-initiate-section">
                <div className="auto-initiate-header">
                  <h4 className="auto-initiate-title">Auto-Initiate Conversation</h4>
                  <label className="auto-initiate-checkbox">
                    <input
                      type="checkbox"
                      checked={settings.agent.autoInitiateConversation || false}
                      onChange={(e) => handleAutoInitiateChange(e.target.checked)}
                    />
                    <span className="checkmark"></span>
                    Enable auto-initiate
                  </label>
                </div>
                
                <p className="auto-initiate-description">
                  When enabled, a pre-recorded audio message will be sent immediately when streaming starts, 
                  triggering Nova Sonic to respond and initiate the conversation.
                </p>

                {errors.autoInitiate && (
                  <div className="error-message">
                    {errors.autoInitiate}
                  </div>
                )}

                {settings.agent.autoInitiateConversation && (
                  <div className="audio-recording-controls">
                    {!settings.agent.initiationAudio ? (
                      <div className="no-audio-state">
                        <p>No initiation audio recorded yet.</p>
                        <button
                          type="button"
                          onClick={startRecording}
                          disabled={isRecording}
                          className="record-btn"
                        >
                          {isRecording ? '🔴 Recording... (5s max)' : '🎤 Record Initiation Audio'}
                        </button>
                        {isRecording && (
                          <button
                            type="button"
                            onClick={stopRecording}
                            className="stop-btn"
                          >
                            ⏹️ Stop
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="audio-recorded-state">
                        <div className="audio-info">
                          <span className="audio-icon">🎵</span>
                          <span className="audio-duration">
                            Duration: {audioDuration.toFixed(1)}s
                          </span>
                        </div>
                        <div className="audio-controls">
                          {isRecording ? (
                            <button
                              type="button"
                              onClick={stopRecording}
                              className="stop-btn"
                            >
                              ⏹️ Stop Recording
                            </button>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={playAudio}
                                className="play-btn"
                              >
                                ▶️ Play
                              </button>
                              <button
                                type="button"
                                onClick={startRecording}
                                className="re-record-btn"
                              >
                                🎤 Re-record
                              </button>
                              <button
                                type="button"
                                onClick={clearAudio}
                                className="clear-btn"
                              >
                                🗑️ Clear
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="global-parameters-section">
                <div className="global-parameters-header">
                  <h4 className="global-parameters-title">Tools Global Parameters</h4>
                  <button
                    type="button"
                    onClick={addNewParameter}
                    className="add-parameter-btn"
                  >
                    + Add Parameter
                  </button>
                </div>
                
                <p className="global-parameters-description">
                  Define reusable key-value parameters that are automatically passed to all tools. 
                  Use these for common endpoints, API keys, configuration values, and other constants 
                  to avoid repetition across tools.
                </p>

                {settings.agent.globalParameters.length === 0 ? (
                  <div className="no-parameters">
                    <span className="no-parameters-icon">📋</span>
                    <p>No global parameters configured.</p>
                    <p>Click "Add Parameter" to create reusable constants for your tools.</p>
                  </div>
                ) : (
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                    modifiers={[restrictToVerticalAxis, restrictToParentElement]}
                  >
                    <SortableContext
                      items={settings.agent.globalParameters.map(param => `param-${param.order}`)}
                      strategy={verticalListSortingStrategy}
                    >
                      <div className="global-parameters-list">
                        {settings.agent.globalParameters
                          .sort((a, b) => a.order - b.order)
                          .map((parameter, index) => (
                            <SortableGlobalParameterEditor
                              key={`param-${parameter.order}`}
                              parameter={parameter}
                              onUpdate={(updatedParameter) => updateParameter(index, updatedParameter)}
                              onRemove={() => removeParameter(index)}
                              errors={parameterErrors[index] || []}
                            />
                          ))}
                      </div>
                    </SortableContext>
                  </DndContext>
                )}
              </div>

              <div className="tools-section">
                <div className="tools-header">
                  <h4>Tools Configuration</h4>
                  <div className="tools-actions">
                    <span className="tools-count">Tools: {settings.agent.tools.length}</span>
                    <button
                      type="button"
                      onClick={addNewTool}
                      className="add-tool-button"
                    >
                      + Add New Tool
                    </button>
                  </div>
                </div>
                
                <p className="field-description">
                  Define custom tools that the AI can use during conversations. Tools are JavaScript functions with access to:
                  <strong> axios</strong> (HTTP client), <strong>components</strong> (app, chat, ui, auth), 
                  <strong>utils</strong> (helper functions), and <strong>React</strong>. 
                  Each tool receives <strong>input</strong>, <strong>sessionId</strong>, <strong>toolName</strong>, and <strong>agentTriggered</strong> parameters.
                  Drag and drop to reorder execution priority.
                </p>

                {settings.agent.tools.length === 0 ? (
                  <div className="empty-tools">
                    <p>No tools configured. Click "Add New Tool" to create your first tool.</p>
                  </div>
                ) : (
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                    modifiers={[restrictToVerticalAxis, restrictToParentElement]}
                  >
                    <SortableContext
                      items={settings.agent.tools.map(tool => `tool-${tool.order}`)}
                      strategy={verticalListSortingStrategy}
                    >
                      <div className="tools-list">
                        {settings.agent.tools
                          .sort((a, b) => a.order - b.order)
                          .map((tool, index) => (
                            <SortableToolEditor
                              key={`tool-${tool.order}`}
                              tool={tool}
                              onUpdate={(updatedTool) => updateTool(index, updatedTool)}
                              onRemove={() => removeTool(index)}
                              errors={toolErrors[index] || []}
                            />
                          ))}
                      </div>
                    </SortableContext>
                  </DndContext>
                )}
              </div>
            </div>
          )}

          {activeTab === 'backup' && (
            <div className="form-section">
              <ImportExport 
                onImportSuccess={handleImportSuccess}
                onImportError={handleImportError}
              />
            </div>
          )}

          {activeTab === 'docs' && (
            <ComponentDocumentation />
          )}

          {errors.general && (
            <div className="error-banner">
              {errors.general}
            </div>
          )}

          {/* Remove the old form-actions section since buttons are now in header */}
        </div>
      </div>
    </div>
  );
};

export default SettingsComponent;
