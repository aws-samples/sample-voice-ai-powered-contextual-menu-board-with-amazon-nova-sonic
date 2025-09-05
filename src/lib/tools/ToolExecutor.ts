import { SettingsManager } from '../util/SettingsManager';

// Interface for tool configuration from settings
interface ToolConfig {
  tool_name: string;
  description: string;
  inputSchema: {
    json: string;
  };
  script: string;
  run_after_app_init: boolean;
  order: number;
}

// Interface for tool execution context
interface ToolExecutionContext {
  axios: any;
  components: Record<string, any>;
  utils: Record<string, any>;
  auth: Record<string, any>;
  React: any;
}

// Interface for processed tool ready for registration
export interface ProcessedTool {
  toolname: string;
  definition: {
    name: string;
    description: string;
    inputSchema: any;
  };
  action: (sessionId: string, inputFromNovaSonic: string, agentTriggered?: boolean) => Promise<string>;
}

/**
 * ToolExecutor class that processes user-defined tools and creates executable functions
 * Integrates with existing client.ts tool registration system
 */
export class ToolExecutor {
  private executionContext: ToolExecutionContext | null = null;
  
  constructor() {
    console.log('🔧 ToolExecutor initialized');
  }
  
  /**
   * Set the execution context for tools
   * This should be called with the current tool context from the provider
   */
  public setExecutionContext(context: ToolExecutionContext): void {
    this.executionContext = context;
    console.log('🔧 ToolExecutor context updated with components:', Object.keys(context.components));
  }
  
  /**
   * Load tools from configuration and process them for registration
   * Returns an array of ProcessedTool objects ready for client.ts registration
   */
  public async loadToolsFromConfig(): Promise<ProcessedTool[]> {
    try {
      const agentConfig = SettingsManager.getAgentConfig();
      const tools = agentConfig?.tools || [];
      
      console.log(`🔧 Loading ${tools.length} tools from configuration`);
      
      const processedTools: ProcessedTool[] = [];
      
      for (const tool of tools) {
        try {
          const processedTool = await this.processTool(tool);
          processedTools.push(processedTool);
          console.log(`✅ Processed tool: ${tool.tool_name}`);
        } catch (error) {
          console.error(`❌ Failed to process tool ${tool.tool_name}:`, error);
          // Continue processing other tools even if one fails
        }
      }
      
      // Sort by order
      processedTools.sort((a, b) => {
        const toolA = tools.find(t => t.tool_name === a.toolname);
        const toolB = tools.find(t => t.tool_name === b.toolname);
        return (toolA?.order || 0) - (toolB?.order || 0);
      });
      
      console.log(`🔧 Successfully processed ${processedTools.length} tools`);
      return processedTools;
      
    } catch (error) {
      console.error('❌ Failed to load tools from configuration:', error);
      return [];
    }
  }
  
  /**
   * Process a single tool configuration into a ProcessedTool
   */
  private async processTool(toolConfig: ToolConfig): Promise<ProcessedTool> {
    // Validate the input schema JSON
    let parsedSchema: any;
    try {
      parsedSchema = JSON.parse(toolConfig.inputSchema.json);
    } catch (error) {
      console.error(`Invalid JSON schema for tool ${toolConfig.tool_name}:`, error);
      // Provide a default schema
      parsedSchema = {
        type: "object",
        properties: {},
        required: []
      };
    }
    
    // Create the tool specification for AWS Bedrock
    // The inputSchema should have a 'json' property with the schema as a string
    const toolSpecification = {
      name: toolConfig.tool_name,
      description: toolConfig.description,
      inputSchema: {
        json: JSON.stringify(parsedSchema) // Keep as JSON string, not parsed object
      }
    };
    
    // Create the action function that will be executed when the tool is called
    const action = this.createToolAction(toolConfig.script, toolConfig.tool_name);
    
    const processedTool = {
      toolname: toolConfig.tool_name,
      definition: toolSpecification,
      action: action
    };
    
    // Debug logging to verify the format
    console.log(`ToolExecutor::processTool::Processed tool ${toolConfig.tool_name}:`, {
      toolname: processedTool.toolname,
      definition: processedTool.definition
    });
    
    return processedTool;
  }
  
  /**
   * Create an executable action function from tool script
   * This function will be called by client.ts when the AI invokes the tool
   */
  private createToolAction(script: string, toolName: string): (sessionId: string, inputFromNovaSonic: string, agentTriggered?: boolean) => Promise<string> {
    return async (sessionId: string, inputFromNovaSonic: string, agentTriggered: boolean = true): Promise<string> => {
      if (!this.executionContext) {
        throw new Error('Tool execution context not set. Make sure ToolExecutor.setExecutionContext() is called.');
      }
      
      try {
        console.log(`🔧 Executing tool: ${toolName} for session: ${sessionId} (agentTriggered: ${agentTriggered})`);
        
        // Parse input from Nova Sonic
        let parsedInput: any = {};
        try {
          parsedInput = JSON.parse(JSON.parse(inputFromNovaSonic).content);
        } catch (error) {
          console.warn(`Failed to parse tool input as JSON: ${inputFromNovaSonic}`);
          parsedInput = { rawInput: inputFromNovaSonic };
        }
        
        // Get global parameters from settings
        const agentConfig = SettingsManager.getAgentConfig();
        const globalParameters = agentConfig?.globalParameters || [];
        
        // Convert global parameters to key-value object
        const globals: Record<string, string> = {};
        globalParameters.forEach(param => {
          if (param.key && param.value !== undefined) {
            globals[param.key] = param.value;
          }
        });
        
        // Prepare execution context with tool-specific parameters
        const toolContext = {
          ...this.executionContext,
          // Tool-specific parameters
          sessionId,
          input: parsedInput,
          toolName,
          agentTriggered, // NEW PARAMETER
          globals, // NEW: Global parameters
        };
        
        // Execute the tool script
        console.log(`🔧 ToolExecutor::Executing tool ${toolName} with input:`, toolContext);
        const result = await this.executeScript(script, toolContext);
        
        // Ensure result is a string (as expected by client.ts)
        const stringResult = typeof result === 'string' ? result : JSON.stringify(result);
        
        console.log(`✅ Tool ${toolName} executed successfully with result:`, stringResult);
        return stringResult;
        
      } catch (error) {
        console.error(`❌ Tool ${toolName} execution failed:`, error);
        
        // Return error as JSON string
        const errorResult = {
          error: true,
          message: error instanceof Error ? error.message : 'Unknown error',
          toolName,
          sessionId
        };
        
        return JSON.stringify(errorResult);
      }
    };
  }
  
  /**
   * Execute tool script with context using Function constructor (safer than eval)
   */
  private async executeScript(script: string, context: any): Promise<any> {
    // Extract parameter names and values from context
    const paramNames = Object.keys(context);
    const paramValues = Object.values(context);
    
    try {
      console.log(`🔧 ToolExecutor::executeScript::Executing script with input:`, context);
      
      // Wrap the script to define the execute function and then call it
      const asyncScript = `
        ${script} 
        // Call the execute function that should be defined in the script
        if (typeof execute === 'function') {
          console.log('🔧 ToolExecutor::executeScript::Calling execute function with input:', arguments.length);
          const params = {};
          for(let i = 0; i < paramNames.length; i++) {
            params[paramNames[i]] = arguments[i];
          }
          return execute(params);
        } else {
          throw new Error('Tool script must define an async function named "execute"');
        }
      `;
      
      // Create and execute the function, passing input as the last parameter
      const func = new Function(...paramNames, 'paramNames', asyncScript);
      const result = await func(...paramValues, paramNames);
      
      console.log(`✅ ToolExecutor::executeScript::Script executed with result:`, result);
      return result;
      
    } catch (error) {
      console.error('Script execution error:', error);
      throw new Error(`Script execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  /**
   * Get tools that should run after app initialization
   */
  public async getInitializationTools(): Promise<ProcessedTool[]> {
    const allTools = await this.loadToolsFromConfig();
    const agentConfig = SettingsManager.getAgentConfig();
    const toolConfigs = agentConfig?.tools || [];
    
    return allTools.filter(tool => {
      const config = toolConfigs.find(c => c.tool_name === tool.toolname);
      return config?.run_after_app_init === true;
    });
  }
  
  /**
   * Execute initialization tools in order
   */
  public async executeInitializationTools(): Promise<{ executed: boolean; reason?: string }> {
    // Check for valid Cognito session before executing tools
    const sessionValidation = await this.validateCognitoSession();
    if (!sessionValidation.isValid) {
      console.log(`⚠️ Skipping initialization tools - ${sessionValidation.reason}`);
      return { executed: false, reason: sessionValidation.reason };
    }

    const initTools = await this.getInitializationTools();
    
    if (initTools.length === 0) {
      console.log('🔧 No initialization tools to execute');
      return { executed: true, reason: 'No tools configured' };
    }
    
    // Get tool configs to access order information
    const agentConfig = SettingsManager.getAgentConfig();
    const toolConfigs = agentConfig?.tools || [];
    
    // Sort tools by order number
    const sortedTools = initTools.sort((a, b) => {
      const configA = toolConfigs.find(c => c.tool_name === a.toolname);
      const configB = toolConfigs.find(c => c.tool_name === b.toolname);
      const orderA = configA?.order || 0;
      const orderB = configB?.order || 0;
      return orderA - orderB;
    });
    
    console.log(`🔧 Executing ${sortedTools.length} initialization tools in order`);
    
    for (const tool of sortedTools) {
      try {
        const config = toolConfigs.find(c => c.tool_name === tool.toolname);
        const order = config?.order || 0;
        
        console.log(`🔧 Running initialization tool: ${tool.toolname} (order: ${order})`);
        
        // Execute with agentTriggered: false and empty input
        await tool.action('init', JSON.stringify({ content: '{}' }), false);
        
        console.log(`✅ Initialization tool ${tool.toolname} completed`);
      } catch (error) {
        console.error(`❌ Initialization tool ${tool.toolname} failed:`, error);
        // Continue with other tools even if one fails
      }
    }
    
    console.log('🎉 All initialization tools completed');
    return { executed: true, reason: 'All tools completed successfully' };
  }

  /**
   * Validate if there's a valid Cognito session for tool execution
   */
  private async validateCognitoSession(): Promise<{ isValid: boolean; reason: string }> {
    try {
      // Check for stored credentials first
      const credentials = SettingsManager.getCredentials();
      if (!credentials) {
        return { isValid: false, reason: 'No credentials found in session storage' };
      }
      
      // Check if credentials are expired
      if (credentials.expiration && new Date() >= new Date(credentials.expiration)) {
        return { isValid: false, reason: 'Stored credentials have expired' };
      }
      
      // Try to get fresh auth session from Amplify
      const { fetchAuthSession } = await import('aws-amplify/auth');
      const session = await fetchAuthSession();
      
      if (!session.credentials) {
        return { isValid: false, reason: 'No valid auth session available' };
      }
      
      if (!session.tokens?.idToken) {
        return { isValid: false, reason: 'No valid ID token available' };
      }
      
      console.log('✅ Valid Cognito session confirmed for tool execution');
      return { isValid: true, reason: 'Valid session confirmed' };
      
    } catch (error) {
      console.log('🔐 Session validation failed:', error);
      return { isValid: false, reason: `Session validation error: ${error instanceof Error ? error.message : 'Unknown error'}` };
    }
  }
}

// Export singleton instance
export const toolExecutor = new ToolExecutor();
