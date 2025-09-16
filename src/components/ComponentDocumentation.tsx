import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Editor from '@monaco-editor/react';
import { useToolContext } from '../contexts/ToolContext';
import { getMethodDocumentation } from '../hooks/useAutoRegisterComponent';

interface ComponentDoc {
  name: string;
  description: string;
  category: string;
  methods: Array<{
    name: string;
    description: string;
    parameters: Array<{
      name: string;
      type: string;
      description: string;
      required?: boolean;
    }>;
  }>;
}

const ComponentDocumentation: React.FC = () => {
  const { getComponentRegistry } = useToolContext();
  const [components, setComponents] = useState<ComponentDoc[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedComponents, setExpandedComponents] = useState<Set<string>>(new Set());
  const [copiedStates, setCopiedStates] = useState<Record<string, boolean>>({});

  // Copy to clipboard function
  const copyToClipboard = async (text: string, exampleId: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedStates(prev => ({ ...prev, [exampleId]: true }));
      setTimeout(() => {
        setCopiedStates(prev => ({ ...prev, [exampleId]: false }));
      }, 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  // CodeExample component with Monaco Editor and copy functionality
  interface CodeExampleProps {
    code: string;
    exampleId: string;
    height?: string;
    language?: string;
    copiedStates: Record<string, boolean>;
    onCopy: (code: string, exampleId: string) => void;
  }

  const CodeExample: React.FC<CodeExampleProps> = React.memo(({ 
    code, 
    exampleId, 
    height = "400px", 
    language = "javascript",
    copiedStates,
    onCopy 
  }) => {
    return (
      <div className="code-example-container">
        <button 
          className={`copy-button ${copiedStates[exampleId] ? 'copied' : ''}`}
          onClick={() => onCopy(code, exampleId)}
          title={copiedStates[exampleId] ? 'Copied!' : 'Copy to clipboard'}
        >
          {copiedStates[exampleId] ? '✓' : '📋'}
        </button>
        <Editor
          height={height}
          defaultLanguage={language}
          value={code}
          theme="vs-dark"
          options={{
            readOnly: true,
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            fontSize: 13,
            lineNumbers: 'on',
            wordWrap: 'on',
            scrollbar: {
              vertical: 'auto',
              horizontal: 'auto'
            },
            folding: true,
            renderLineHighlight: 'none'
          }}
        />
      </div>
    );
  });

  // Code example constants
  const quickReferenceCode = `// Tool script template
async function execute({...args}) {
  console.log("Tool executed with arguments:", args);
  
  // Extract all available variables from the execution context
  const { 
    input,           // Input from AI model or auto-execution
    sessionId,       // Current session ID
    toolName,        // Name of this tool
    agentTriggered,  // Boolean: true if AI-triggered, false if auto-executed
    globals,         // Global parameters: key-value pairs from Tools Global Parameters
    axios,           // HTTP client for API requests
    components,      // UI components: { app, chat, ui, auth }
    utils,           // Utility functions: { generateId, formatDate, sleep, parseJSON, stringifyJSON }
    auth,            // Authentication: { getCredentials, getTokens, getJWT, getUserInfo }
    React            // React library for advanced users
  } = args;
  
  // Your tool logic here
  // Now all variables are properly defined and available:
  
  // Use global parameters (if defined in Tools Global Parameters)
  if (globals.API_ENDPOINT) {
    console.log("Using API endpoint:", globals.API_ENDPOINT);
    // const response = await axios.get(\`\${globals.API_ENDPOINT}/data\`);
  }
  
  // Add a chat message
  components.chat.addMessage("Hello from tool!", "system");
  
  // UI Control Examples:
  
  // Example 1: Stop UI with custom actions
  components.app.stopUI(true, "Move to the next window for payment...", 10, () => {
    components.app.stopStreaming();
    components.chat.clearMessages();
    components.cart.clearCart();
  });
  
  // Example 2: Full app reload without auto-start
  components.app.startUI("Preparing system...", false);
  
  // Example 3: Full app reload with auto-start streaming
  components.app.startUI("Connecting to voice system...", true);
  
  // Example 4: Chained stop-then-restart
  components.app.stopUI(true, "Processing order...", 8, () => {
    components.app.stopStreaming();
    components.cart.clearCart();
    
    components.app.startUI("Starting fresh session...", true);
  });
  
  // Show notification (returns notification ID)
  const notificationId = components.ui.showNotification("Tool executed successfully", "success");
  
  // Make HTTP request (using global parameters if available)
  const endpoint = globals.API_ENDPOINT || "https://api.example.com";
  const response = await axios.get(\`\${endpoint}/data\`);
  
  // Use utilities
  const uniqueId = utils.generateId();
  const formattedDate = utils.formatDate(new Date());
  const deviceId = utils.getDeviceId();
  
  // Return result (always return JSON string)
  return JSON.stringify({ 
    success: true, 
    data: response.data,
    notificationId: notificationId,
    executedAt: formattedDate,
    uniqueId: uniqueId,
    deviceId: deviceId,
    usedGlobals: Object.keys(globals)
  });
}`;

  const example1Code = `async function execute({...args}) {
  const { 
    input, sessionId, toolName, agentTriggered,
    axios, components, utils, auth, React 
  } = args;
  
  try {
    // Get Cognito access token for API Gateway authentication
    const tokens = await auth.getTokens();
    if (!tokens.accessToken) {
      throw new Error("No access token available");
    }
    
    // Make authenticated API call to your API Gateway
    const response = await axios.get("https://your-api-gateway.amazonaws.com/prod/data", {
      headers: {
        "Authorization": \`Bearer \${tokens.accessToken}\`,
        "Content-Type": "application/json"
      }
    });
    
    // Display results in chat for user to see
    components.chat.addMessage(
      \`API Response: \${JSON.stringify(response.data, null, 2)}\`, 
      "system"
    );
    
    // Show success notification
    components.ui.showNotification("API call completed successfully", "success");
    
    // Return confirmation (user sees results in chat)
    return JSON.stringify({
      success: true,
      message: "API data displayed in chat",
      recordCount: response.data.length || 1
    });
    
  } catch (error) {
    // Handle errors gracefully
    const errorMessage = \`API call failed: \${error.message}\`;
    components.chat.addMessage(errorMessage, "system");
    components.ui.showNotification("API call failed", "error");
    
    return JSON.stringify({
      success: false,
      error: errorMessage
    });
  }
}`;

  const example2Code = `async function execute({...args}) {
  const { 
    input, sessionId, toolName, agentTriggered,
    axios, components, utils, auth, React 
  } = args;
  
  try {
    // Get Cognito access token for API Gateway authentication
    const tokens = await auth.getTokens();
    if (!tokens.accessToken) {
      throw new Error("No access token available");
    }
    
    // Make authenticated API call to your API Gateway
    const response = await axios.get("https://your-api-gateway.amazonaws.com/prod/users", {
      headers: {
        "Authorization": \`Bearer \${tokens.accessToken}\`,
        "Content-Type": "application/json"
      },
      params: {
        // Use input from AI agent (e.g., search criteria)
        search: input.query || "",
        limit: input.limit || 10
      }
    });
    
    // Optional: Show notification that API call was made
    components.ui.showNotification("Fetching data from API...", "info");
    
    // Return data as JSON string for AI agent to read and process
    return JSON.stringify({
      success: true,
      data: response.data,
      metadata: {
        totalRecords: response.data.length,
        query: input.query || "",
        timestamp: new Date().toISOString(),
        source: "API Gateway"
      },
      // AI can use this structured data to formulate a response
      summary: \`Found \${response.data.length} records matching the criteria\`
    });
    
  } catch (error) {
    // Return error information for AI agent to handle
    return JSON.stringify({
      success: false,
      error: {
        message: error.message,
        type: "API_ERROR",
        timestamp: new Date().toISOString()
      },
      // AI can use this to inform the user about the error
      userMessage: "I encountered an error while fetching the data. Please try again."
    });
  }
}`;

  // Memoize code examples to prevent unnecessary re-creation
  const memoizedQuickReferenceCode = useMemo(() => quickReferenceCode, []);
  const memoizedExample1Code = useMemo(() => example1Code, []);
  const memoizedExample2Code = useMemo(() => example2Code, []);

  // Memoize the generateExample function to prevent re-computation
  const memoizedGenerateExample = useCallback((componentName: string, methodName: string, parameters: any[]) => {
    return generateExample(componentName, methodName, parameters);
  }, []);

  // Update components when registry changes
  useEffect(() => {
    const updateComponents = () => {
      const registry = getComponentRegistry();
      const docs: ComponentDoc[] = registry.map(reg => ({
        name: reg.name,
        description: reg.description || `${reg.name} component methods`,
        category: reg.category || 'ui',
        methods: Object.entries(reg.methods).map(([methodName, method]) => {
          const metadata = getMethodDocumentation(method);
          return {
            name: methodName,
            description: metadata.description || 'No description available',
            parameters: metadata.parameters || []
          };
        })
      }));
      
      // Only update if the registry actually changed
      if (JSON.stringify(docs) !== JSON.stringify(components)) {
        setComponents(docs);
      }
    };

    updateComponents();
    
    // Reduce update frequency to every 5 seconds instead of every second
    const interval = setInterval(updateComponents, 5000);
    return () => clearInterval(interval);
  }, [getComponentRegistry, components]);

  // Get unique categories
  const categories = ['all', ...Array.from(new Set(components.map(c => c.category)))];

  // Filter components
  const filteredComponents = components.filter(comp => {
    const matchesCategory = selectedCategory === 'all' || comp.category === selectedCategory;
    const matchesSearch = searchTerm === '' || 
      comp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      comp.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      comp.methods.some(m => 
        m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    return matchesCategory && matchesSearch;
  });

  // Toggle component expansion
  const toggleExpanded = (componentName: string) => {
    const newExpanded = new Set(expandedComponents);
    if (newExpanded.has(componentName)) {
      newExpanded.delete(componentName);
    } else {
      newExpanded.add(componentName);
    }
    setExpandedComponents(newExpanded);
  };

  // Generate example code
  const generateExample = (componentName: string, methodName: string, parameters: any[]) => {
    const requiredParams = parameters.filter(p => p.required);
    const optionalParams = parameters.filter(p => !p.required);
    
    let example = `// Example usage in your tool script\n`;
    example += `components.${componentName}.${methodName}(`;
    
    if (requiredParams.length > 0) {
      const paramExamples = requiredParams.map(p => {
        switch (p.type) {
          case 'string': return `"${p.name}_value"`;
          case 'number': return '123';
          case 'boolean': return 'true';
          default: return `${p.name}_value`;
        }
      });
      example += paramExamples.join(', ');
    }
    
    if (optionalParams.length > 0) {
      if (requiredParams.length > 0) example += ', ';
      example += '/* optional: ';
      const optionalExamples = optionalParams.map(p => {
        switch (p.type) {
          case 'string': return `"${p.name}_value"`;
          case 'number': return '456';
          case 'boolean': return 'false';
          default: return `${p.name}_value`;
        }
      });
      example += optionalExamples.join(', ');
      example += ' */';
    }
    
    example += ');';
    return example;
  };

  return (
    <div className="component-documentation">
      <div className="doc-header">
        <h3>📚 Available Components & Methods</h3>
        <p>Use these components and methods in your tool scripts to interact with the application.</p>
      </div>

      <div className="doc-controls">
        <div className="search-container">
          <input
            type="text"
            placeholder="🔍 Search components or methods..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>
        
        <div className="category-filter">
          <label>Category:</label>
          <select 
            value={selectedCategory} 
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="category-select"
          >
            {categories.map(cat => (
              <option key={cat} value={cat}>
                {cat === 'all' ? 'All Categories' : cat.charAt(0).toUpperCase() + cat.slice(1)}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="components-list">
        {filteredComponents.length === 0 ? (
          <div className="no-components">
            <p>No components found matching your criteria.</p>
            {components.length === 0 && (
              <p><em>Components will appear here as they register with the tool system.</em></p>
            )}
          </div>
        ) : (
          filteredComponents.map(component => (
            <div key={component.name} className="component-card">
              <div 
                className="component-header"
                onClick={() => toggleExpanded(component.name)}
              >
                <div className="component-info">
                  <h4>
                    <span className="component-icon">🧩</span>
                    {component.name}
                    <span className="category-badge">{component.category}</span>
                  </h4>
                  <p>{component.description}</p>
                </div>
                <div className="expand-icon">
                  {expandedComponents.has(component.name) ? '▼' : '▶'}
                </div>
              </div>

              {expandedComponents.has(component.name) && (
                <div className="component-methods">
                  <h5>Methods ({component.methods.length}):</h5>
                  {component.methods.map(method => (
                    <div key={method.name} className="method-card">
                      <div className="method-header">
                        <code className="method-name">
                          components.{component.name}.{method.name}()
                        </code>
                      </div>
                      
                      <p className="method-description">{method.description}</p>
                      
                      {method.parameters.length > 0 && (
                        <div className="method-parameters">
                          <h6>Parameters:</h6>
                          <ul>
                            {method.parameters.map(param => (
                              <li key={param.name} className="parameter-item">
                                <code>{param.name}</code>
                                <span className="param-type">({param.type})</span>
                                {param.required && <span className="required">*</span>}
                                <span className="param-description">- {param.description}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      
                      <div className="method-example">
                        <h6>Example:</h6>
                        <CodeExample
                          code={memoizedGenerateExample(component.name, method.name, method.parameters)}
                          exampleId={`${component.name}-${method.name}`}
                          height="120px"
                          copiedStates={copiedStates}
                          onCopy={copyToClipboard}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      <div className="doc-footer">
        <div className="usage-tips">
          <h4>💡 Tool Execution Context:</h4>
          <ul>
            <li><strong>Core Parameters:</strong> <code>input</code> (AI/auto data), <code>sessionId</code>, <code>toolName</code>, <code>agentTriggered</code> (boolean)</li>
            <li><strong>Global Parameters:</strong> <code>globals</code> - Key-value pairs from Tools Global Parameters (e.g., <code>globals.API_ENDPOINT</code>)</li>
            <li><strong>HTTP Client:</strong> <code>axios</code> - Full Axios instance for API requests</li>
            <li><strong>UI Components:</strong> <code>components.app</code>, <code>components.chat</code>, <code>components.ui</code>, <code>components.auth</code></li>
            <li><strong>Utilities:</strong> <code>utils.generateId()</code>, <code>utils.formatDate()</code>, <code>utils.sleep()</code>, <code>utils.parseJSON()</code>, <code>utils.getDeviceId()</code></li>
            <li><strong>Authentication:</strong> <code>auth.getCredentials()</code>, <code>auth.getTokens()</code>, <code>auth.getJWT()</code></li>
            <li><strong>React Library:</strong> <code>React</code> - Full React library for advanced component manipulation</li>
          </ul>
        </div>
        
        <div className="quick-reference">
          <h4>🚀 Quick Reference:</h4>
          <CodeExample
            code={memoizedQuickReferenceCode}
            exampleId="quickReference"
            height="500px"
            copiedStates={copiedStates}
            onCopy={copyToClipboard}
          />
        </div>
        
        <div className="practical-examples">
          <h4>🔥 Practical Examples:</h4>
          
          <div className="example-section">
            <h5>Example 1: API Gateway Call with Chat Display</h5>
            <p>Make an authenticated API call and display results in chat:</p>
            <CodeExample
              code={memoizedExample1Code}
              exampleId="example1"
              height="600px"
              copiedStates={copiedStates}
              onCopy={copyToClipboard}
            />
          </div>
          
          <div className="example-section">
            <h5>Example 2: API Gateway Call with Agent Response</h5>
            <p>Make an authenticated API call and return data for the AI agent to process:</p>
            <CodeExample
              code={memoizedExample2Code}
              exampleId="example2"
              height="650px"
              copiedStates={copiedStates}
              onCopy={copyToClipboard}
            />
          </div>
          
          <div className="example-section">
            <h5>Example 3: Using Global Parameters - API Configuration</h5>
            <p>Demonstrate how to use global parameters for centralized configuration:</p>
            <CodeExample
              code={`// Global Parameters Setup (in Settings → Agent Behavior → Tools Global Parameters):
// API_ENDPOINT = "https://api.mycompany.com/v1"
// API_KEY = "sk-1234567890abcdef"
// DEFAULT_TIMEOUT = "5000"
// USER_AGENT = "DriveThru/1.0"

async function execute({...args}) {
  const { 
    input, sessionId, toolName, agentTriggered, globals,
    axios, components, utils, auth, React 
  } = args;
  
  try {
    // Use global parameters instead of hardcoding values
    const response = await axios.get(\`\${globals.API_ENDPOINT}/menu\`, {
      headers: {
        "Authorization": \`Bearer \${globals.API_KEY}\`,
        "User-Agent": globals.USER_AGENT,
        "Content-Type": "application/json"
      },
      timeout: parseInt(globals.DEFAULT_TIMEOUT)
    });
    
    // Show success notification
    components.ui.showNotification(
      \`Successfully fetched data from \${globals.API_ENDPOINT}\`, 
      "success"
    );
    
    // Display results in chat
    components.chat.addMessage(
      \`API Response: \${JSON.stringify(response.data, null, 2)}\`, 
      "system"
    );
    
    return JSON.stringify({
      success: true,
      data: response.data,
      endpoint: globals.API_ENDPOINT,
      timestamp: utils.formatDate(new Date())
    });
    
  } catch (error) {
    components.ui.showNotification("API call failed", "error");
    
    return JSON.stringify({
      success: false,
      error: error.message,
      endpoint: globals.API_ENDPOINT
    });
  }
}`}
              exampleId="example3"
              height="700px"
              copiedStates={copiedStates}
              onCopy={copyToClipboard}
            />
          </div>
          
          <div className="example-section">
            <h5>Example 4: Environment-Specific Global Parameters</h5>
            <p>Use global parameters for different environments (dev/staging/prod):</p>
            <CodeExample
              code={`// Development Environment Global Parameters:
// API_ENDPOINT = "https://dev-api.mycompany.com/v1"
// DEBUG_MODE = "true"
// CACHE_TTL = "60"
// LOG_LEVEL = "debug"

// Production Environment Global Parameters:
// API_ENDPOINT = "https://api.mycompany.com/v1"
// DEBUG_MODE = "false"
// CACHE_TTL = "3600"
// LOG_LEVEL = "error"

async function execute({...args}) {
  const { 
    input, sessionId, toolName, agentTriggered, globals,
    axios, components, utils, auth, React 
  } = args;
  
  // Environment-aware logging
  const isDebugMode = globals.DEBUG_MODE === "true";
  const logLevel = globals.LOG_LEVEL || "info";
  
  if (isDebugMode) {
    console.log(\`[DEBUG] Tool \${toolName} executing with input:\`, input);
    console.log(\`[DEBUG] Using endpoint: \${globals.API_ENDPOINT}\`);
  }
  
  try {
    // Environment-specific API call
    const response = await axios.post(\`\${globals.API_ENDPOINT}/orders\`, {
      ...input,
      metadata: {
        environment: globals.API_ENDPOINT.includes('dev') ? 'development' : 'production',
        debugMode: isDebugMode,
        sessionId: sessionId
      }
    }, {
      headers: {
        "Content-Type": "application/json"
      },
      timeout: parseInt(globals.CACHE_TTL) * 1000
    });
    
    // Environment-specific notifications
    const message = isDebugMode 
      ? \`[DEBUG] Order created: \${response.data.orderId}\`
      : \`Order created successfully\`;
      
    components.ui.showNotification(message, "success");
    
    // Conditional chat logging based on log level
    if (logLevel === "debug" || logLevel === "info") {
      components.chat.addMessage(
        \`Order processed via \${globals.API_ENDPOINT}\`, 
        "system"
      );
    }
    
    return JSON.stringify({
      success: true,
      orderId: response.data.orderId,
      environment: globals.API_ENDPOINT.includes('dev') ? 'dev' : 'prod',
      debugMode: isDebugMode,
      processingTime: response.headers['x-processing-time']
    });
    
  } catch (error) {
    // Environment-specific error handling
    const errorMessage = isDebugMode 
      ? \`[DEBUG] API Error: \${error.message} | Endpoint: \${globals.API_ENDPOINT}\`
      : "Order processing failed";
      
    components.ui.showNotification(errorMessage, "error");
    
    if (logLevel === "debug" || logLevel === "error") {
      components.chat.addMessage(\`Error: \${error.message}\`, "system");
    }
    
    return JSON.stringify({
      success: false,
      error: error.message,
      environment: globals.API_ENDPOINT.includes('dev') ? 'dev' : 'prod',
      debugMode: isDebugMode
    });
  }
}`}
              exampleId="example4"
              height="800px"
              copiedStates={copiedStates}
              onCopy={copyToClipboard}
            />
          </div>
          
          <div className="example-section">
            <h5>Example 5: Complex Global Parameters with JSON</h5>
            <p>Use global parameters for complex configuration objects:</p>
            <CodeExample
              code={`// Global Parameters with JSON values:
// API_CONFIG = "{\\"baseURL\\": \\"https://api.example.com\\", \\"version\\": \\"v2\\", \\"retries\\": 3}"
// NOTIFICATION_SETTINGS = "{\\"success\\": {\\"duration\\": 3000, \\"sound\\": true}, \\"error\\": {\\"duration\\": 5000, \\"sound\\": false}}"
// MENU_CATEGORIES = "[\\"appetizers\\", \\"mains\\", \\"desserts\\", \\"beverages\\"]"

async function execute({...args}) {
  const { 
    input, sessionId, toolName, agentTriggered, globals,
    axios, components, utils, auth, React 
  } = args;
  
  try {
    // Parse complex global parameters
    const apiConfig = JSON.parse(globals.API_CONFIG);
    const notificationSettings = JSON.parse(globals.NOTIFICATION_SETTINGS);
    const menuCategories = JSON.parse(globals.MENU_CATEGORIES);
    
    console.log("Parsed API config:", apiConfig);
    console.log("Available categories:", menuCategories);
    
    // Use parsed configuration
    const endpoint = \`\${apiConfig.baseURL}/\${apiConfig.version}/menu\`;
    
    // Retry logic based on global config
    let response;
    let attempts = 0;
    const maxRetries = apiConfig.retries;
    
    while (attempts < maxRetries) {
      try {
        response = await axios.get(endpoint, {
          params: {
            categories: menuCategories.join(','),
            ...input
          }
        });
        break; // Success, exit retry loop
      } catch (error) {
        attempts++;
        if (attempts >= maxRetries) throw error;
        
        // Wait before retry
        await utils.sleep(1000 * attempts);
        console.log(\`Retry attempt \${attempts}/\${maxRetries}\`);
      }
    }
    
    // Use notification settings from global parameters
    const successSettings = notificationSettings.success;
    components.ui.showNotification(
      "Menu data loaded successfully", 
      "success",
      { 
        duration: successSettings.duration,
        sound: successSettings.sound 
      }
    );
    
    // Filter results by categories
    const filteredMenu = response.data.filter(item => 
      menuCategories.includes(item.category)
    );
    
    components.chat.addMessage(
      \`Found \${filteredMenu.length} items in categories: \${menuCategories.join(', ')}\`, 
      "system"
    );
    
    return JSON.stringify({
      success: true,
      itemCount: filteredMenu.length,
      categories: menuCategories,
      apiVersion: apiConfig.version,
      retryAttempts: attempts,
      data: filteredMenu
    });
    
  } catch (error) {
    // Use error notification settings
    const errorSettings = JSON.parse(globals.NOTIFICATION_SETTINGS).error;
    components.ui.showNotification(
      "Failed to load menu data", 
      "error",
      { 
        duration: errorSettings.duration,
        sound: errorSettings.sound 
      }
    );
    
    return JSON.stringify({
      success: false,
      error: error.message,
      globalParametersUsed: Object.keys(globals)
    });
  }
}`}
              exampleId="example5"
              height="900px"
              copiedStates={copiedStates}
              onCopy={copyToClipboard}
            />
          </div>
          
          <div className="example-section">
            <h5>Example 6: Device ID for Tracking and Analytics</h5>
            <p>Use the device ID for device-specific tracking, analytics, and API calls:</p>
            <CodeExample
              code={`async function execute({...args}) {
  const { 
    input, sessionId, toolName, agentTriggered, globals,
    axios, components, utils, auth, React 
  } = args;
  
  try {
    // Get unique device ID (persistent across sessions)
    const deviceId = utils.getDeviceId();
    console.log('Device ID:', deviceId);
    
    // Use device ID in API calls for tracking
    const response = await axios.post(\`\${globals.API_ENDPOINT}/analytics\`, {
      deviceId: deviceId,
      sessionId: sessionId,
      toolName: toolName,
      timestamp: new Date().toISOString(),
      userAction: input.action || 'unknown',
      metadata: {
        agentTriggered: agentTriggered,
        userAgent: navigator.userAgent,
        screenResolution: \`\${screen.width}x\${screen.height}\`
      }
    }, {
      headers: {
        "Authorization": \`Bearer \${globals.API_KEY}\`,
        "X-Device-ID": deviceId,
        "Content-Type": "application/json"
      }
    });
    
    // Store device-specific data locally
    const deviceDataKey = \`device_data_\${deviceId}\`;
    const existingData = JSON.parse(localStorage.getItem(deviceDataKey) || '{}');
    const updatedData = {
      ...existingData,
      lastActivity: new Date().toISOString(),
      totalActions: (existingData.totalActions || 0) + 1,
      toolUsage: {
        ...existingData.toolUsage,
        [toolName]: (existingData.toolUsage?.[toolName] || 0) + 1
      }
    };
    localStorage.setItem(deviceDataKey, JSON.stringify(updatedData));
    
    // Show device-specific notification
    components.ui.showNotification(
      \`Action tracked for device \${deviceId.substring(0, 8)}...\`, 
      "success"
    );
    
    // Add device info to chat
    components.chat.addMessage(
      \`Device \${deviceId.substring(0, 8)}: \${input.action || 'Action'} completed\`, 
      "system"
    );
    
    return JSON.stringify({
      success: true,
      deviceId: deviceId,
      sessionId: sessionId,
      trackingId: response.data.trackingId,
      deviceStats: {
        totalActions: updatedData.totalActions,
        toolUsage: updatedData.toolUsage
      },
      apiResponse: response.data
    });
    
  } catch (error) {
    const deviceId = utils.getDeviceId();
    
    // Log error with device context
    console.error(\`Device \${deviceId}: Tool execution failed:\`, error);
    
    components.ui.showNotification(
      "Device tracking failed", 
      "error"
    );
    
    return JSON.stringify({
      success: false,
      deviceId: deviceId,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
}`}
              exampleId="example6"
              height="800px"
              copiedStates={copiedStates}
              onCopy={copyToClipboard}
            />
          </div>
          
          <div className="example-tips">
            <h5>🆔 Device ID Best Practices:</h5>
            <ul>
              <li><strong>Persistent Tracking:</strong> Device ID remains the same across browser sessions</li>
              <li><strong>API Integration:</strong> Include device ID in API calls for server-side tracking</li>
              <li><strong>Local Storage:</strong> Use device ID as key for device-specific data storage</li>
              <li><strong>Analytics:</strong> Track device-specific usage patterns and statistics</li>
              <li><strong>Privacy Compliant:</strong> ID is generated locally and contains no personal information</li>
              <li><strong>Debugging:</strong> Use device ID to track issues and support requests</li>
              <li><strong>Session Management:</strong> Combine with sessionId for comprehensive tracking</li>
              <li><strong>Partial Display:</strong> Show only first 8 characters in UI for brevity</li>
            </ul>
          </div>
          
          <div className="example-tips">
            <h5>🌟 Global Parameters Best Practices:</h5>
            <ul>
              <li><strong>Naming Convention:</strong> Use UPPERCASE_WITH_UNDERSCORES for parameter keys</li>
              <li><strong>Environment Switching:</strong> Change global parameters for dev/staging/prod environments</li>
              <li><strong>JSON Values:</strong> Store complex configuration as JSON strings in parameter values</li>
              <li><strong>Security:</strong> Keep API keys and sensitive data in global parameters, not in tool code</li>
              <li><strong>Documentation:</strong> Use the description field to document each parameter's purpose</li>
              <li><strong>Validation:</strong> Always validate and parse JSON global parameters with try-catch</li>
              <li><strong>Fallbacks:</strong> Provide default values when global parameters might be missing</li>
              <li><strong>Reusability:</strong> Design parameters to be reusable across multiple tools</li>
            </ul>
          </div>
          
          <div className="example-tips">
            <h5>💡 API Integration Tips:</h5>
            <ul>
              <li><strong>Global Parameters:</strong> Use <code>globals.API_ENDPOINT</code> and <code>globals.API_KEY</code> instead of hardcoding</li>
              <li><strong>Authentication:</strong> Always use <code>auth.getTokens()</code> for Cognito access tokens</li>
              <li><strong>Error Handling:</strong> Wrap API calls in try-catch blocks</li>
              <li><strong>Headers:</strong> Include <code>Authorization: Bearer &#123;accessToken&#125;</code> for API Gateway</li>
              <li><strong>Input Usage:</strong> Use <code>input</code> parameter for dynamic API parameters</li>
              <li><strong>Chat vs Return:</strong> Chat display for user visibility, JSON return for AI processing</li>
              <li><strong>Notifications:</strong> Use <code>components.ui.showNotification()</code> for user feedback</li>
              <li><strong>Environment Config:</strong> Switch global parameters for different environments</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ComponentDocumentation;
