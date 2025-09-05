import React, { createContext, useContext, useRef, useCallback, useState, useEffect, useMemo } from 'react';
import axios, { AxiosInstance } from 'axios';
import { SettingsManager } from '../lib/util/SettingsManager';
import { StorageManager } from '../lib/util/StorageManager';

// Interface for component registration
interface ComponentRegistration {
  name: string;
  methods: Record<string, Function>;
  description?: string;
  category?: string;
}

// Tool execution context interface
interface ToolExecutionContext {
  // HTTP Client
  axios: AxiosInstance;
  
  // Component access
  components: Record<string, any>;
  
  // Utility functions
  utils: {
    generateId: () => string;
    formatDate: (date: Date | string, options?: Intl.DateTimeFormatOptions) => string;
    sleep: (ms: number) => Promise<void>;
    parseJSON: (str: string) => any;
    stringifyJSON: (obj: any) => string;
    getDeviceId: () => string;
    storage: {
      setData: (key: string, data: any, expirationInMinutes: number) => void;
      getData: (key: string) => any | null;
      removeData: (key: string) => void;
      hasValidData: (key: string) => boolean;
      getRemainingTTL: (key: string) => number | null;
      clearExpired: (keyPrefix?: string) => number;
      getStorageStats: (keyPrefix?: string) => {
        totalItems: number;
        validItems: number;
        expiredItems: number;
        totalSize: number;
      };
    };
  };
  
  // Authentication context
  auth: {
    getCredentials: () => any;
    getTokens: () => Promise<{ idToken: string | null; accessToken: string | null; refreshToken: string | null }>;
    getJWT: () => Promise<string | null>;
    getUserInfo: () => any;
  };
  
  // React utilities (for advanced users)
  React: typeof React;
}

// Context for tool execution
interface ToolContextValue {
  // Register a component for tool access
  registerComponent: (registration: ComponentRegistration) => void;
  
  // Unregister a component
  unregisterComponent: (name: string) => void;
  
  // Get current execution context
  getExecutionContext: () => ToolExecutionContext;
  
  // Get component registry for documentation
  getComponentRegistry: () => ComponentRegistration[];
  
  // Execute tool code with context
  executeToolCode: (code: string, params?: any) => Promise<any>;
  
  // Check if all expected components are registered
  areComponentsReady: () => boolean;
  
  // Wait for components to be ready
  waitForComponentsReady: () => Promise<void>;
}

const ToolContext = createContext<ToolContextValue | null>(null);

// Custom hook to use tool context
export const useToolContext = () => {
  const context = useContext(ToolContext);
  if (!context) {
    throw new Error('useToolContext must be used within a ToolProvider');
  }
  return context;
};

// Custom hook for components to register themselves
export const useComponentRegistration = (registration: ComponentRegistration) => {
  const { registerComponent, unregisterComponent } = useToolContext();
  
  useEffect(() => {
    registerComponent(registration);
    return () => unregisterComponent(registration.name);
  }, [registration.name, registerComponent, unregisterComponent]);
};

// Provider component
export const ToolProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [componentRegistry, setComponentRegistry] = useState<Map<string, ComponentRegistration>>(new Map());
  const axiosInstanceRef = useRef<AxiosInstance>();
  
  // Initialize axios instance
  useEffect(() => {
    axiosInstanceRef.current = axios.create({
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }, []);
  
  // Register a component
  const registerComponent = useCallback((registration: ComponentRegistration) => {
    console.log(`🔧 Registering component: ${registration.name}`);
    setComponentRegistry(prev => {
      const newRegistry = new Map(prev);
      newRegistry.set(registration.name, registration);
      return newRegistry;
    });
  }, []);
  
  // Unregister a component
  const unregisterComponent = useCallback((name: string) => {
    console.log(`🗑️ Unregistering component: ${name}`);
    setComponentRegistry(prev => {
      const newRegistry = new Map(prev);
      newRegistry.delete(name);
      return newRegistry;
    });
  }, []);
  
  // Get component registry
  const getComponentRegistry = useCallback(() => {
    return Array.from(componentRegistry.values());
  }, [componentRegistry]);
  
  // Create execution context
  const getExecutionContext = useCallback((): ToolExecutionContext => {
    // Build components object from registry
    const components: Record<string, any> = {};
    componentRegistry.forEach((registration, name) => {
      components[name] = registration.methods;
    });
    
    return {
      // HTTP Client
      axios: axiosInstanceRef.current!,
      
      // Component access
      components,
      
      // Utility functions
      utils: {
        generateId: () => Math.random().toString(36).substr(2, 9),
        formatDate: (date: Date | string, options?: Intl.DateTimeFormatOptions) => {
          const dateObj = typeof date === 'string' ? new Date(date) : date;
          return dateObj.toLocaleDateString('en-US', options);
        },
        sleep: (ms: number) => new Promise(resolve => setTimeout(resolve, ms)),
        parseJSON: (str: string) => {
          try {
            return JSON.parse(str);
          } catch (error) {
            throw new Error(`Invalid JSON: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        },
        stringifyJSON: (obj: any) => JSON.stringify(obj, null, 2),
        getDeviceId: () => SettingsManager.getDeviceId(),
        storage: {
          setData: StorageManager.setData.bind(StorageManager),
          getData: StorageManager.getData.bind(StorageManager),
          removeData: StorageManager.removeData.bind(StorageManager),
          hasValidData: StorageManager.hasValidData.bind(StorageManager),
          getRemainingTTL: StorageManager.getRemainingTTL.bind(StorageManager),
          clearExpired: StorageManager.clearExpired.bind(StorageManager),
          getStorageStats: StorageManager.getStorageStats.bind(StorageManager)
        }
      },
      
      // Authentication context (will be populated by auth component)
      auth: {
        getCredentials: () => {
          // This will be populated by the auth component registration
          const authComponent = components.auth;
          return authComponent?.getCredentials?.() || null;
        },
        getTokens: async () => {
          const authComponent = components.auth;
          if (authComponent?.getTokens) {
            return await authComponent.getTokens();
          }
          return { idToken: null, accessToken: null, refreshToken: null };
        },
        getJWT: async () => {
          const authComponent = components.auth;
          if (authComponent?.getJWT) {
            return await authComponent.getJWT();
          }
          return null;
        },
        getUserInfo: () => {
          const authComponent = components.auth;
          return authComponent?.getUserInfo?.() || null;
        },
      },
      
      // React utilities for advanced users
      React,
    };
  }, [componentRegistry]);
  
  // Execute tool code with context
  const executeToolCode = useCallback(async (code: string, params: any = {}) => {
    const context = getExecutionContext();
    
    // Combine context with additional parameters
    const fullContext = {
      ...context,
      ...params,
    };
    
    // Extract parameter names and values
    const paramNames = Object.keys(fullContext);
    const paramValues = Object.values(fullContext);
    
    try {
      // Create function with strict mode and async support
      const asyncCode = `
        "use strict";
        return (async function() {
          ${code}
        })();
      `;
      
      const func = new Function(...paramNames, asyncCode);
      const result = await func(...paramValues);
      
      return result;
    } catch (error) {
      console.error('Tool execution error:', error);
      throw new Error(`Tool execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }, [getExecutionContext]);
  
  // Define expected core components that should be registered
  const expectedComponents = ['app', 'chat', 'ui', 'auth', 'menu', 'cart'];
  
  // Check if all expected components are registered
  const areComponentsReady = useCallback(() => {
    return expectedComponents.every(componentName => componentRegistry.has(componentName));
  }, [componentRegistry]);
  
  // Wait for components to be ready with timeout
  const waitForComponentsReady = useCallback((): Promise<void> => {
    return new Promise((resolve) => {
      if (areComponentsReady()) {
        console.log('🎉 All components are ready for tool execution');
        resolve();
        return;
      }
      
      console.log('⏳ Waiting for components to be ready...', {
        expected: expectedComponents,
        registered: Array.from(componentRegistry.keys())
      });
      
      let attempts = 0;
      const maxAttempts = 50; // 5 seconds with 100ms intervals
      
      const checkInterval = setInterval(() => {
        attempts++;
        
        if (areComponentsReady()) {
          clearInterval(checkInterval);
          console.log('🎉 All components are now ready for tool execution');
          resolve();
        } else if (attempts >= maxAttempts) {
          clearInterval(checkInterval);
          const registered = Array.from(componentRegistry.keys());
          const missing = expectedComponents.filter(name => !registered.includes(name));
          console.warn('⚠️ Timeout waiting for components. Missing:', missing);
          // Resolve anyway to prevent blocking, but log the issue
          resolve();
        }
      }, 100);
    });
  }, [areComponentsReady, componentRegistry]);
  
  const value: ToolContextValue = useMemo(() => ({
    registerComponent,
    unregisterComponent,
    getExecutionContext,
    getComponentRegistry,
    executeToolCode,
    areComponentsReady,
    waitForComponentsReady,
  }), [registerComponent, unregisterComponent, getExecutionContext, getComponentRegistry, executeToolCode, areComponentsReady, waitForComponentsReady]);
  
  return (
    <ToolContext.Provider value={value}>
      {children}
    </ToolContext.Provider>
  );
};

export default ToolContext;
