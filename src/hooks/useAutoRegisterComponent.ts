import { useEffect, useMemo } from 'react';
import { useToolContext } from '../contexts/ToolContext';

// Interface for auto-registration configuration
interface AutoRegisterConfig {
  name: string;
  description?: string;
  category?: string;
  methods: Record<string, Function>;
}

/**
 * Hook that automatically registers a component with the tool context
 * This enables automatic discovery of components and their methods for tools
 */
export const useAutoRegisterComponent = (config: AutoRegisterConfig) => {
  const { registerComponent, unregisterComponent } = useToolContext();
  
  // Memoize the registration to avoid unnecessary re-registrations
  const registration = useMemo(() => ({
    name: config.name,
    description: config.description || `${config.name} component methods`,
    category: config.category || 'ui',
    methods: config.methods,
  }), [config.name, config.description, config.category]); // Don't include methods in deps to avoid re-registration
  
  // Register on mount, unregister on unmount
  useEffect(() => {
    registerComponent(registration);
    
    return () => {
      unregisterComponent(registration.name);
    };
  }, []); // Empty dependency array - only register once on mount
  
  // Return empty object since we don't need to return anything
  return {};
};

/**
 * Utility function to create method descriptors for better documentation
 */
export const createMethodDescriptor = (
  func: Function,
  description: string,
  parameters?: Array<{ name: string; type: string; description: string; required?: boolean }>
) => {
  // Attach metadata to the function for documentation purposes
  (func as any).__toolMetadata = {
    description,
    parameters: parameters || [],
  };
  
  return func;
};

/**
 * Helper to extract method documentation from registered components
 */
export const getMethodDocumentation = (method: Function): {
  description?: string;
  parameters?: Array<{ name: string; type: string; description: string; required?: boolean }>;
} => {
  return (method as any).__toolMetadata || {};
};
