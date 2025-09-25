// Settings management utility for storing and retrieving application configuration
// Uses localStorage for persistent storage

export interface CognitoConfig {
  userPoolId: string;
  userPoolClientId: string;
  region: string;
  identityPoolId: string;
}

export interface Tool {
  tool_name: string;
  description: string;
  inputSchema: {
    json: string; // JSON string representation
  };
  script: string; // JavaScript code
  run_after_app_init: boolean;
  order: number;
}

export interface GlobalParameter {
  id: string;
  key: string;
  value: string;
  description?: string;
  order: number;
}

export interface AgentConfig {
  system_prompt: string;
  globalParameters: GlobalParameter[];
  tools: Tool[];
  autoInitiateConversation?: boolean;
  initiationAudio?: string; // base64 encoded audio
  companyName?: string;
}

export interface AppSettings {
  cognito: CognitoConfig;
  agent: AgentConfig;
}

export interface AppConfig {
  config: {
    cognito: CognitoConfig;
    agent: AgentConfig;
  };
}

// Default values
const DEFAULT_SYSTEM_PROMPT = "You are a friend. The user and you will engage in a spoken dialog exchanging the transcripts of a natural real-time conversation. Keep your responses short, generally two or three sentences for chatty scenarios.";
const DEFAULT_GLOBAL_PARAMETERS: GlobalParameter[] = [];
const DEFAULT_TOOLS: Tool[] = [];

export class SettingsManager {
  private static readonly SETTINGS_KEY = 'novaSonicChatConfig';
  private static readonly CREDENTIALS_KEY = 'novaSonicCredentials';

  /**
   * Get stored settings from localStorage
   */
  static getSettings(): AppSettings | null {
    try {
      const stored = localStorage.getItem(this.SETTINGS_KEY);
      if (!stored) return null;
      
      const config: AppConfig = JSON.parse(stored);
      
      // Ensure agent section exists with defaults
      if (!config.config.agent) {
        config.config.agent = {
          system_prompt: DEFAULT_SYSTEM_PROMPT,
          globalParameters: DEFAULT_GLOBAL_PARAMETERS,
          tools: DEFAULT_TOOLS
        };
        // Save the updated config back
        this.saveConfig(config);
      }
      
      // Ensure globalParameters exists (for backward compatibility)
      if (!config.config.agent.globalParameters) {
        config.config.agent.globalParameters = DEFAULT_GLOBAL_PARAMETERS;
        this.saveConfig(config);
      }
      
      // Return the settings in the expected format
      return {
        cognito: config.config.cognito,
        agent: config.config.agent
      };
    } catch (error) {
      console.error('Error retrieving settings:', error);
      return null;
    }
  }

  /**
   * Save settings to localStorage
   */
  static saveSettings(settings: AppSettings): void {
    try {
      const config: AppConfig = {
        config: {
          cognito: settings.cognito,
          agent: settings.agent
        }
      };
      localStorage.setItem(this.SETTINGS_KEY, JSON.stringify(config));
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  }

  /**
   * Get full configuration object
   */
  static getConfig(): AppConfig | null {
    try {
      const stored = localStorage.getItem(this.SETTINGS_KEY);
      if (!stored) return null;
      
      const config: AppConfig = JSON.parse(stored);
      
      // Ensure agent section exists with defaults
      if (!config.config.agent) {
        config.config.agent = {
          system_prompt: DEFAULT_SYSTEM_PROMPT,
          globalParameters: DEFAULT_GLOBAL_PARAMETERS,
          tools: DEFAULT_TOOLS
        };
        // Save the updated config back
        this.saveConfig(config);
      }
      
      // Ensure globalParameters exists (for backward compatibility)
      if (!config.config.agent.globalParameters) {
        config.config.agent.globalParameters = DEFAULT_GLOBAL_PARAMETERS;
        this.saveConfig(config);
      }
      
      return config;
    } catch (error) {
      console.error('Error retrieving config:', error);
      return null;
    }
  }

  /**
   * Save full configuration object
   */
  static saveConfig(config: AppConfig): void {
    try {
      localStorage.setItem(this.SETTINGS_KEY, JSON.stringify(config));
    } catch (error) {
      console.error('Error saving config:', error);
    }
  }

  /**
   * Get Agent configuration
   */
  static getAgentConfig(): AgentConfig {
    const settings = this.getSettings();
    return settings?.agent || {
      system_prompt: DEFAULT_SYSTEM_PROMPT,
      globalParameters: DEFAULT_GLOBAL_PARAMETERS,
      tools: DEFAULT_TOOLS
    };
  }

  /**
   * Save Agent configuration
   */
  static saveAgentConfig(agentConfig: AgentConfig): void {
    const settings = this.getSettings() || {
      cognito: { userPoolId: '', userPoolClientId: '', identityPoolId: '', region: '' },
      agent: agentConfig
    };
    
    settings.agent = agentConfig;
    this.saveSettings(settings);
  }

  /**
   * Reset Agent configuration to defaults
   */
  static resetAgentConfig(): void {
    const agentConfig: AgentConfig = {
      system_prompt: DEFAULT_SYSTEM_PROMPT,
      globalParameters: DEFAULT_GLOBAL_PARAMETERS,
      tools: DEFAULT_TOOLS
    };
    this.saveAgentConfig(agentConfig);
  }

  /**
   * Validate tool configuration
   */
  static validateTool(tool: Partial<Tool>): string[] {
    const errors: string[] = [];
    
    if (!tool.tool_name?.trim()) {
      errors.push('Tool name is required');
    }
    
    if (!tool.description?.trim()) {
      errors.push('Tool description is required');
    }
    
    if (!tool.script?.trim()) {
      errors.push('Tool script is required');
    }
    
    // Validate JSON schema
    if (tool.inputSchema?.json) {
      try {
        JSON.parse(tool.inputSchema.json);
      } catch {
        errors.push('Input schema must be valid JSON');
      }
    }
    
    return errors;
  }

  /**
   * Validate tools array for uniqueness
   */
  static validateToolsArray(tools: Tool[]): string[] {
    const errors: string[] = [];
    const names = new Set<string>();
    
    tools.forEach((tool, index) => {
      // Check for duplicate names
      if (names.has(tool.tool_name)) {
        errors.push(`Duplicate tool name: ${tool.tool_name}`);
      } else {
        names.add(tool.tool_name);
      }
      
      // Validate individual tool
      const toolErrors = this.validateTool(tool);
      toolErrors.forEach(error => {
        errors.push(`Tool ${index + 1}: ${error}`);
      });
    });
    
    return errors;
  }

  /**
   * Reorder tools after removal
   */
  static reorderTools(tools: Tool[]): Tool[] {
    return tools
      .sort((a, b) => a.order - b.order)
      .map((tool, index) => ({
        ...tool,
        order: index + 1
      }));
  }

  /**
   * Validate global parameter configuration
   */
  static validateGlobalParameter(param: Partial<GlobalParameter>): string[] {
    const errors: string[] = [];
    
    if (!param.key?.trim()) {
      errors.push('Parameter key is required');
    }
    
    if (param.value === undefined || param.value === null) {
      errors.push('Parameter value is required');
    }
    
    return errors;
  }

  /**
   * Validate global parameters array for uniqueness
   */
  static validateGlobalParametersArray(params: GlobalParameter[]): string[] {
    const errors: string[] = [];
    const keys = new Set<string>();
    
    params.forEach((param, index) => {
      // Check for duplicate keys (case-insensitive)
      const lowerKey = param.key.toLowerCase();
      if (keys.has(lowerKey)) {
        errors.push(`Duplicate parameter key: ${param.key} (case-insensitive match)`);
      } else {
        keys.add(lowerKey);
      }
      
      // Validate individual parameter
      const paramErrors = this.validateGlobalParameter(param);
      paramErrors.forEach(error => {
        errors.push(`Parameter ${index + 1}: ${error}`);
      });
    });
    
    return errors;
  }

  /**
   * Reorder global parameters after removal
   */
  static reorderGlobalParameters(params: GlobalParameter[]): GlobalParameter[] {
    return params
      .sort((a, b) => a.order - b.order)
      .map((param, index) => ({
        ...param,
        order: index + 1
      }));
  }

  /**
   * Generate unique ID for global parameters
   */
  static generateGlobalParameterId(): string {
    return `param_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Clear all stored settings
   */
  static clearSettings(): void {
    try {
      localStorage.removeItem(this.SETTINGS_KEY);
      sessionStorage.removeItem(this.CREDENTIALS_KEY);
    } catch (error) {
      console.error('Error clearing settings:', error);
    }
  }

  /**
   * Store AWS credentials from Cognito authentication
   */
  static saveCredentials(credentials: any): void {
    try {
      // Validate credentials structure
      if (!credentials || typeof credentials !== 'object') {
        console.error('Invalid credentials: must be an object');
        return;
      }

      const requiredFields = ['accessKeyId', 'secretAccessKey', 'sessionToken'];
      for (const field of requiredFields) {
        if (!credentials[field] || typeof credentials[field] !== 'string') {
          console.error(`Invalid credentials: missing or invalid ${field}`);
          return;
        }
      }

      sessionStorage.setItem(this.CREDENTIALS_KEY, JSON.stringify({
        accessKeyId: credentials.accessKeyId,
        secretAccessKey: credentials.secretAccessKey,
        sessionToken: credentials.sessionToken,
        expiration: credentials.expiration
      }));
    } catch (error) {
      console.error('Error saving credentials:', error);
    }
  }

  /**
   * Get stored AWS credentials
   */
  static getCredentials(): any | null {
    try {
      const stored = sessionStorage.getItem(this.CREDENTIALS_KEY);
      if (!stored) return null;
      
      const credentials = JSON.parse(stored);
      
      // Check if credentials are expired
      if (credentials.expiration && new Date(credentials.expiration) <= new Date()) {
        console.log('Credentials expired, clearing...');
        sessionStorage.removeItem(this.CREDENTIALS_KEY);
        return null;
      }
      
      return credentials;
    } catch (error) {
      console.error('Error retrieving credentials:', error);
      return null;
    }
  }

  /**
   * Check if settings are configured and complete
   */
  static isConfigured(): boolean {
    const settings = this.getSettings();
    return !!(settings?.cognito?.userPoolId && 
              settings?.cognito?.userPoolClientId && 
              settings?.cognito?.identityPoolId && 
              settings?.cognito?.region);
  }

  /**
   * Validate if required Cognito settings are complete
   */
  static validateCognitoConfig(cognito: CognitoConfig): string[] {
    const errors: string[] = [];
    
    if (!cognito.userPoolId?.trim()) {
      errors.push('User Pool ID is required');
    }
    if (!cognito.userPoolClientId?.trim()) {
      errors.push('User Pool Client ID is required');
    }
    if (!cognito.identityPoolId?.trim()) {
      errors.push('Identity Pool ID is required');
    }
    if (!cognito.region?.trim()) {
      errors.push('AWS Region is required');
    }
    
    return errors;
  }

  /**
   * Get incomplete configuration sections
   */
  static getIncompleteSettings(): string[] {
    const settings = this.getSettings();
    const incomplete: string[] = [];
    
    if (!settings) {
      return ['cognito'];
    }
    
    const cognitoErrors = this.validateCognitoConfig(settings.cognito);
    if (cognitoErrors.length > 0) {
      incomplete.push('cognito');
    }
    
    // Agent section is optional, so we don't mark it as incomplete
    
    return incomplete;
  }

  /**
   * Clear stored credentials
   */
  static clearCredentials(): void {
    try {
      sessionStorage.removeItem(this.CREDENTIALS_KEY);
      console.log('Credentials cleared from session storage');
    } catch (error) {
      console.error('Failed to clear credentials:', error);
    }
  }

  /**
   * Export all settings as JSON string
   */
  static exportSettings(): string {
    try {
      const settings = this.getSettings();
      const exportData = {
        exportVersion: "1.0",
        exportDate: new Date().toISOString(),
        appVersion: "1.0.0",
        settings: settings || {
          cognito: {
            userPoolId: '',
            userPoolClientId: '',
            region: '',
            identityPoolId: ''
          },
          agent: {
            system_prompt: DEFAULT_SYSTEM_PROMPT,
            globalParameters: DEFAULT_GLOBAL_PARAMETERS,
            tools: DEFAULT_TOOLS
          }
        }
      };
      
      console.log('📤 Exporting settings:', exportData);
      return JSON.stringify(exportData, null, 2);
    } catch (error) {
      console.error('Error exporting settings:', error);
      throw new Error(`Failed to export settings: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Validate import data structure
   */
  static validateImportData(data: any): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    try {
      // Check if data is an object
      if (!data || typeof data !== 'object') {
        errors.push('Invalid file format: not a valid JSON object');
        return { valid: false, errors };
      }
      
      // Check export version
      if (!data.exportVersion) {
        errors.push('Missing export version');
      } else if (data.exportVersion !== "1.0") {
        errors.push(`Unsupported export version: ${data.exportVersion}`);
      }
      
      // Check settings structure
      if (!data.settings) {
        errors.push('Missing settings data');
        return { valid: false, errors };
      }
      
      // Validate cognito config
      if (data.settings.cognito) {
        const cognito = data.settings.cognito;
        if (typeof cognito.userPoolId !== 'string') errors.push('Invalid Cognito userPoolId');
        if (typeof cognito.userPoolClientId !== 'string') errors.push('Invalid Cognito userPoolClientId');
        if (typeof cognito.region !== 'string') errors.push('Invalid Cognito region');
      }
      
      // Validate agent config
      if (data.settings.agent) {
        const agent = data.settings.agent;
        if (typeof agent.system_prompt !== 'string') errors.push('Invalid system prompt');
        if (!Array.isArray(agent.tools)) {
          errors.push('Invalid tools array');
        } else {
          // Validate each tool
          agent.tools.forEach((tool: any, index: number) => {
            if (!tool.tool_name || typeof tool.tool_name !== 'string') {
              errors.push(`Tool ${index + 1}: Missing or invalid tool name`);
            }
            if (!tool.description || typeof tool.description !== 'string') {
              errors.push(`Tool ${index + 1}: Missing or invalid description`);
            }
            if (!tool.script || typeof tool.script !== 'string') {
              errors.push(`Tool ${index + 1}: Missing or invalid script`);
            }
            if (!tool.inputSchema || !tool.inputSchema.json) {
              errors.push(`Tool ${index + 1}: Missing or invalid input schema`);
            } else {
              try {
                JSON.parse(tool.inputSchema.json);
              } catch {
                errors.push(`Tool ${index + 1}: Invalid JSON in input schema`);
              }
            }
          });
        }
        
        // Validate global parameters (optional for backward compatibility)
        if (agent.globalParameters) {
          if (!Array.isArray(agent.globalParameters)) {
            errors.push('Invalid global parameters array');
          } else {
            agent.globalParameters.forEach((param: any, index: number) => {
              if (!param.key || typeof param.key !== 'string') {
                errors.push(`Global Parameter ${index + 1}: Missing or invalid key`);
              }
              if (typeof param.value !== 'string') {
                errors.push(`Global Parameter ${index + 1}: Invalid value (must be string)`);
              }
              if (param.description && typeof param.description !== 'string') {
                errors.push(`Global Parameter ${index + 1}: Invalid description`);
              }
              if (typeof param.order !== 'number') {
                errors.push(`Global Parameter ${index + 1}: Invalid order`);
              }
            });
          }
        }
      }
      
      return { valid: errors.length === 0, errors };
    } catch (error) {
      errors.push(`Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return { valid: false, errors };
    }
  }

  /**
   * Import settings from JSON string
   */
  static importSettings(jsonData: string, options: { replaceAll?: boolean } = { replaceAll: true }): { success: boolean; errors: string[]; imported: any } {
    try {
      console.log('📥 Starting import process...');
      
      // Parse JSON
      let importData: any;
      try {
        importData = JSON.parse(jsonData);
      } catch (error) {
        return { 
          success: false, 
          errors: ['Invalid JSON file format'], 
          imported: null 
        };
      }
      
      // Validate import data
      const validation = this.validateImportData(importData);
      if (!validation.valid) {
        return { 
          success: false, 
          errors: validation.errors, 
          imported: null 
        };
      }
      
      // Create backup of current settings
      const currentSettings = this.getSettings();
      const backupKey = `${this.SETTINGS_KEY}_backup_${Date.now()}`;
      if (currentSettings) {
        localStorage.setItem(backupKey, JSON.stringify(currentSettings));
        console.log('💾 Created backup:', backupKey);
      }
      
      // Import settings
      const settingsToImport = importData.settings;
      
      if (options.replaceAll) {
        // Replace all settings
        this.saveSettings(settingsToImport);
        console.log('✅ Settings imported successfully (replace all)');
      } else {
        // Merge with existing settings
        const existingSettings = this.getSettings() || {
          cognito: { userPoolId: '', userPoolClientId: '', region: '', identityPoolId: '' },
          agent: { 
            system_prompt: DEFAULT_SYSTEM_PROMPT, 
            globalParameters: DEFAULT_GLOBAL_PARAMETERS,
            tools: DEFAULT_TOOLS 
          }
        };
        
        const mergedSettings = {
          ...existingSettings,
          ...settingsToImport,
          agent: {
            ...existingSettings.agent,
            ...settingsToImport.agent,
            globalParameters: settingsToImport.agent?.globalParameters || existingSettings.agent.globalParameters,
            tools: settingsToImport.agent?.tools || existingSettings.agent.tools
          }
        };
        
        this.saveSettings(mergedSettings);
        console.log('✅ Settings imported successfully (merged)');
      }
      
      return { 
        success: true, 
        errors: [], 
        imported: settingsToImport 
      };
      
    } catch (error) {
      console.error('Error importing settings:', error);
      return { 
        success: false, 
        errors: [`Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`], 
        imported: null 
      };
    }
  }

  /**
   * Device ID management for unique device identification
   */
  private static readonly DEVICE_ID_KEY = 'amazon_nova_device_id';

  /**
   * Generate a UUID-style device ID
   */
  private static generateDeviceId(): string {
    // Generate UUID v4 style ID: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  /**
   * Get or create persistent device ID
   * Returns the same ID for the same browser/device combination
   */
  static getDeviceId(): string {
    try {
      // Try to get existing device ID from localStorage
      let deviceId = localStorage.getItem(this.DEVICE_ID_KEY);
      
      if (!deviceId) {
        // Generate new UUID-style device ID
        deviceId = this.generateDeviceId();
        localStorage.setItem(this.DEVICE_ID_KEY, deviceId);
        console.log('🆔 Generated new device ID:', deviceId);
      }
      
      return deviceId;
    } catch (error) {
      console.error('Error managing device ID:', error);
      // Fallback: generate temporary ID for this session
      return this.generateDeviceId();
    }
  }

  /**
   * Reset device ID (generates a new one)
   * Useful for testing or if ID needs to be regenerated
   */
  static resetDeviceId(): string {
    try {
      localStorage.removeItem(this.DEVICE_ID_KEY);
      const newDeviceId = this.getDeviceId(); // This will generate a new one
      console.log('🔄 Device ID reset to:', newDeviceId);
      return newDeviceId;
    } catch (error) {
      console.error('Error resetting device ID:', error);
      return this.generateDeviceId();
    }
  }

  /**
   * Load default configuration from JSON file
   */
  static async loadDefaultConfiguration(): Promise<AppSettings | null> {
    try {
      console.log('🔄 Loading default configuration from /config/default-settings.json');
      const response = await fetch('/config/default-settings.json');
      
      if (!response.ok) {
        console.warn('Default configuration file not found or not accessible');
        return null;
      }
      
      const defaultConfig = await response.json();
      
      // Validate the structure matches expected format
      const validation = this.validateImportData(defaultConfig);
      if (!validation.valid) {
        console.error('Invalid default configuration:', validation.errors);
        return null;
      }
      
      if (defaultConfig.settings) {
        console.log('✅ Default configuration loaded successfully');
        return defaultConfig.settings;
      }
      
      return null;
    } catch (error) {
      console.warn('Could not load default configuration:', error);
      return null;
    }
  }

  /**
   * Initialize app with default configuration if no settings exist
   * Preserves existing Cognito settings if they exist
   */
  static async initializeWithDefaults(): Promise<{ loaded: boolean; hadExistingSettings: boolean }> {
    try {
      const existingSettings = this.getSettings();
      
      if (existingSettings) {
        console.log('🔧 Existing settings found, skipping default initialization');
        return { loaded: false, hadExistingSettings: true };
      }
      
      const defaultConfig = await this.loadDefaultConfiguration();
      if (!defaultConfig) {
        console.log('⚠️ No default configuration available');
        return { loaded: false, hadExistingSettings: false };
      }
      
      // Clear Cognito settings from defaults (user must configure these)
      const configToSave = {
        ...defaultConfig,
        cognito: {
          userPoolId: '',
          userPoolClientId: '',
          identityPoolId: '',
          region: 'us-east-1'
        }
      };
      
      this.saveSettings(configToSave);
      console.log('✅ Default configuration initialized successfully');
      return { loaded: true, hadExistingSettings: false };
      
    } catch (error) {
      console.error('Error initializing with defaults:', error);
      return { loaded: false, hadExistingSettings: false };
    }
  }

  /**
   * Initialize app with provided sample configuration
   * Preserves existing Cognito settings if they exist
   */
  static async initializeWithSettings(sampleSettings: any): Promise<{ loaded: boolean; hadExistingSettings: boolean }> {
    try {
      const existingSettings = this.getSettings();
      let existingCognito = null;
      
      // Preserve existing Cognito settings if they exist and are configured
      if (existingSettings?.cognito) {
        const cognito = existingSettings.cognito;
        if (cognito.userPoolId && cognito.userPoolClientId && cognito.identityPoolId) {
          existingCognito = cognito;
          console.log('🔧 Preserving existing Cognito configuration');
        }
      }
      
      // Use existing Cognito settings or clear them for user configuration
      const configToSave = {
        ...sampleSettings,
        cognito: existingCognito || {
          userPoolId: '',
          userPoolClientId: '',
          identityPoolId: '',
          region: sampleSettings.cognito?.region || 'us-east-1'
        }
      };
      
      this.saveSettings(configToSave);
      console.log('✅ Sample configuration initialized successfully');
      return { loaded: true, hadExistingSettings: !!existingSettings };
      
    } catch (error) {
      console.error('Error initializing with sample settings:', error);
      return { loaded: false, hadExistingSettings: false };
    }
  }

  /**
   * Load default configuration and merge with existing settings
   * Preserves existing Cognito settings
   */
  static async loadDefaultsPreservingCognito(): Promise<{ success: boolean; errors: string[] }> {
    try {
      const existingSettings = this.getSettings();
      const defaultConfig = await this.loadDefaultConfiguration();
      
      if (!defaultConfig) {
        return { 
          success: false, 
          errors: ['Default configuration not available'] 
        };
      }
      
      // Preserve existing Cognito settings if they exist
      const configToSave = {
        ...defaultConfig,
        cognito: existingSettings?.cognito || {
          userPoolId: '',
          userPoolClientId: '',
          identityPoolId: '',
          region: 'us-east-1'
        }
      };
      
      this.saveSettings(configToSave);
      console.log('✅ Default configuration loaded, Cognito settings preserved');
      return { success: true, errors: [] };
      
    } catch (error) {
      console.error('Error loading defaults:', error);
      return { 
        success: false, 
        errors: [`Failed to load defaults: ${error instanceof Error ? error.message : 'Unknown error'}`] 
      };
    }
  }

  /**
   * Check if current configuration appears to be using defaults
   */
  static isUsingDefaultConfiguration(): boolean {
    try {
      const settings = this.getSettings();
      if (!settings) return false;
      
      // Check if system prompt matches default drive-thru prompt
      const hasDefaultPrompt = settings.agent?.system_prompt?.includes('Nova Drive-Thru');
      
      // Check if has default tools (GetMenuItems, AddToCart, etc.)
      const hasDefaultTools = settings.agent?.tools?.some(tool => 
        tool.tool_name === 'GetMenuItems' || tool.tool_name === 'AddToCart'
      );
      
      // Check if has default global parameters (API URLs)
      const hasDefaultParams = settings.agent?.globalParameters?.some(param => 
        param.key === 'MENU_API_URL' || param.key === 'CART_API_URL'
      );
      
      return hasDefaultPrompt || hasDefaultTools || hasDefaultParams;
    } catch (error) {
      console.error('Error checking default configuration:', error);
      return false;
    }
  }
}
