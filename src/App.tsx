import React, { useState, useRef, useEffect, useCallback } from 'react';
import './style.css';
import { signOut, fetchAuthSession } from 'aws-amplify/auth';
import { SettingsManager } from './lib/util/SettingsManager';
import { ChatHistoryManager } from './lib/util/ChatHistoryManager';
import { AudioPlayer } from './lib/play/AudioPlayer';
import { target } from './lib/sdk/events_proxy';
import { POWERED_BY_TEXT } from './lib/sdk/consts';
import SettingsComponent from './components/SettingsComponent';
import AuthComponent from './components/AuthComponent';
import ChatContainer from './components/ChatContainer';
import StatusIndicator from './components/StatusIndicator';
import MicrophoneButton from './components/MicrophoneButton';
import ToastNotifications from './components/ToastNotifications';
import ShoppingCart from './components/ShoppingCart';
import MenuDisplay from './components/MenuDisplay';
import QuickStartDialog from './components/QuickStartDialog';
import { ToolProvider, useToolContext } from './contexts/ToolContext';
import { useAutoRegisterComponent, createMethodDescriptor } from './hooks/useAutoRegisterComponent';
import { toolExecutor } from './lib/tools/ToolExecutor';

interface ChatMessage {
  role: string;
  message: string;
  endOfResponse?: boolean;
  endOfConversation?: boolean;
}

interface ChatHistory {
  history: ChatMessage[];
}

// Notification interface for toast notifications
interface Notification {
  id: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  timestamp: number;
  autoDismiss?: boolean;
  duration?: number;
}

// Main App component wrapped with ToolProvider
const App: React.FC = () => {
  return (
    <ToolProvider>
      <AppContent />
    </ToolProvider>
  );
};

// App content component that uses tool context
const AppContent: React.FC = () => {
  // Configuration state
  const [isConfigured, setIsConfigured] = useState(false);
  const [isEditingConfig, setIsEditingConfig] = useState(false);
  const [incompleteSettings, setIncompleteSettings] = useState<string[]>([]);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const isAuthenticatedRef = useRef(false); // Prevent double authentication handling

  // Quick Start dialog state
  const [showQuickStart, setShowQuickStart] = useState(false);
  const [hasCheckedForDefaults, setHasCheckedForDefaults] = useState(false);

  // Tool execution state
  const [toolsSkippedDuringConfig, setToolsSkippedDuringConfig] = useState(false);

  // Chat state management
  const [chat, setChat] = useState<ChatHistory>({ history: [] });
  const [isStreaming, setIsStreaming] = useState(false);
  const [status, setStatus] = useState({ text: "Disconnected", className: "disconnected" });
  const [waitingForUserTranscription, setWaitingForUserTranscription] = useState(false);
  const [waitingForAssistantResponse, setWaitingForAssistantResponse] = useState(false);
  const [appTitle, setAppTitle] = useState('Your Drive-thru company');
  const [restartOverlay, setRestartOverlay] = useState({ visible: false, message: '', countdown: 0 });

  // Notification state management
  const [notifications, setNotifications] = useState<Notification[]>([]);

  // Refs for audio processing
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const audioPlayerRef = useRef<AudioPlayer>(new AudioPlayer());
  const sessionInitializedRef = useRef(false);
  const chatRef = useRef(chat);
  const transcriptionReceivedRef = useRef(false);
  const displayAssistantTextRef = useRef(false);
  const roleRef = useRef("");
  const autoInitiateFirstMessageRef = useRef(false); // Track if we should skip first user message
  const isStreamingRef = useRef(false);

  // Audio processing constants
  const samplingRatioRef = useRef(1);
  const TARGET_SAMPLE_RATE = 16000;
  const isFirefox = navigator.userAgent.toLowerCase().includes("firefox");
  const autoStartProcessedRef = useRef(false); // Track if autoStart was already processed

  // Refs for accessing child component methods
  const menuDisplayRef = useRef<any>(null);
  const shoppingCartRef = useRef<any>(null);

  // Menu state for combo detection
  const [menuItems, setMenuItems] = useState<any[]>([]);

  // Update menu items when menu changes
  useEffect(() => {
    const updateMenuItems = () => {
      if (menuDisplayRef.current?.getMenuItems) {
        const items = menuDisplayRef.current.getMenuItems();
        setMenuItems(items || []);
      }
    };

    // Update menu items periodically
    const interval = setInterval(updateMenuItems, 2000);

    // Initial update
    setTimeout(updateMenuItems, 1000);

    return () => clearInterval(interval);
  }, []);

  // Chat history manager
  const chatHistoryManagerRef = useRef<ChatHistoryManager | null>(null);

  // Tool context
  const { getExecutionContext, waitForComponentsReady, getComponentRegistry } = useToolContext();

  // Monitor component registry changes and update tool context dynamically
  useEffect(() => {
    if (isAuthenticated) {
      const registry = getComponentRegistry();
      const componentNames = registry.map(comp => comp.name);

      // Check if we have the essential components
      const hasMenu = componentNames.includes('menu');
      const hasCart = componentNames.includes('cart');

      console.log("🔧 App: Component registry check - Components:", componentNames, "HasMenu:", hasMenu, "HasCart:", hasCart);

      if (hasMenu && hasCart) {
        const context = getExecutionContext();
        console.log("🔧 App: All essential components available, updating tool context with:", Object.keys(context.components));
        toolExecutor.setExecutionContext(context);
      }
    }
  }, [getExecutionContext, getComponentRegistry, isAuthenticated]);

  // stopUI function - Display overlay with countdown, then execute callback
  const stopUI = useCallback((displayMessage = true, messageText = "Processing...", countDownTimer = 10, callback?: () => void) => {
    console.log("🛑 App: stopUI called with:", { displayMessage, messageText, countDownTimer });

    if (displayMessage) {
      setRestartOverlay({
        visible: true,
        message: messageText,
        countdown: countDownTimer
      });

      const timer = setInterval(() => {
        setRestartOverlay(prev => {
          if (prev.countdown <= 1) {
            clearInterval(timer);
            // Execute callback after timer ends
            if (callback) {
              try {
                callback();
              } catch (error) {
                console.error("stopUI callback error:", error);
              }
            }
            // Hide overlay
            setRestartOverlay({ visible: false, message: '', countdown: 0 });
            return prev;
          }
          return { ...prev, countdown: prev.countdown - 1 };
        });
      }, 1000);
    } else {
      // Still wait for timer even without overlay
      setTimeout(() => {
        if (callback) {
          try {
            callback();
          } catch (error) {
            console.error("stopUI callback error:", error);
          }
        }
      }, countDownTimer * 1000);
    }
  }, []);

  // startUI function - Full app reload with optional auto-start streaming
  const startUI = useCallback((message: string, autoStartStreaming: boolean = false) => {
    console.log("🚀 App: startUI - Full app reload requested with:", { message, autoStartStreaming });

    // Show loading message briefly
    setRestartOverlay({
      visible: true,
      message: message,
      countdown: 0
    });

    // Always force reload by adding timestamp to ensure URL changes
    const currentUrl = new URL(window.location.href);
    if (autoStartStreaming) {
      currentUrl.hash = `#autoStart&t=${Date.now()}`;
    } else {
      currentUrl.hash = `#t=${Date.now()}`;
    }

    // Reload with guaranteed URL change
    setTimeout(() => {
      window.location.href = currentUrl.toString();
      window.location.reload();
    }, 1000);
  }, []);

  // Auto-register App component methods for tools
  useAutoRegisterComponent({
    name: 'app',
    description: 'Main application methods and state management',
    category: 'core',
    methods: {
      setStatus: createMethodDescriptor(
        (newStatus: string) => setStatus({ text: newStatus, className: 'ready' }),
        'Update the application status message',
        [{ name: 'newStatus', type: 'string', description: 'The new status message to display', required: true }]
      ),
      getStatus: createMethodDescriptor(
        () => status.text,
        'Get the current application status',
        []
      ),
      startStreaming: createMethodDescriptor(
        () => startStreaming(),
        'Start voice streaming session',
        []
      ),
      stopStreaming: createMethodDescriptor(
        () => stopStreaming(),
        'Stop voice streaming session',
        []
      ),
      isCurrentlyStreaming: createMethodDescriptor(
        () => isStreaming,
        'Check if currently streaming',
        []
      ),
      showSettingsPanel: createMethodDescriptor(
        () => setIsEditingConfig(true),
        'Show the settings panel',
        []
      ),
      hideSettingsPanel: createMethodDescriptor(
        () => setIsEditingConfig(false),
        'Hide the settings panel',
        []
      ),
      stopUI: createMethodDescriptor(
        (displayMessage = true, messageText = "Processing...", countDownTimer = 10, callback?: () => void) =>
          stopUI(displayMessage, messageText, countDownTimer, callback),
        'Display overlay with countdown, then execute callback for stopping operations',
        [
          { name: 'displayMessage', type: 'boolean', description: 'Whether to show the overlay (default: true)', required: false },
          { name: 'messageText', type: 'string', description: 'Message to display during countdown (default: "Processing...")', required: false },
          { name: 'countDownTimer', type: 'number', description: 'Countdown seconds (default: 10)', required: false },
          { name: 'callback', type: 'function', description: 'Function to execute after countdown', required: false }
        ]
      ),
      startUI: createMethodDescriptor(
        (message: string, autoStartStreaming: boolean = false) =>
          startUI(message, autoStartStreaming),
        'Reinitialize application with full reload and optionally start streaming',
        [
          { name: 'message', type: 'string', description: 'Message to display during initialization', required: true },
          { name: 'autoStartStreaming', type: 'boolean', description: 'Whether to start streaming after reload (default: false)', required: false }
        ]
      ),
    }
  });

  // Auto-register Chat component methods for tools
  useAutoRegisterComponent({
    name: 'chat',
    description: 'Chat history management and message operations',
    category: 'ui',
    methods: {
      addMessage: createMethodDescriptor(
        (message: string, role: string = 'system') => {
          const newMessage: ChatMessage = {
            role,
            message,
            endOfResponse: true
          };
          setChat(prev => ({
            history: [...prev.history, newMessage]
          }));
          if (chatHistoryManagerRef.current) {
            chatHistoryManagerRef.current.addTextMessage(newMessage);
          }
        },
        'Add a message to the chat history',
        [
          { name: 'message', type: 'string', description: 'The message content', required: true },
          { name: 'role', type: 'string', description: 'The message role (user, assistant, system)', required: false }
        ]
      ),
      clearMessages: createMethodDescriptor(
        () => {
          setChat({ history: [] });
          if (chatHistoryManagerRef.current) {
            (chatHistoryManagerRef.current as any).clearHistory();
          }
        },
        'Clear all chat messages',
        []
      ),
      getMessages: createMethodDescriptor(
        () => chat.history,
        'Get all chat messages',
        []
      ),
      getMessagesForStorage: createMethodDescriptor(
        () => {
          if (chatHistoryManagerRef.current && typeof chatHistoryManagerRef.current.getMessagesForStorage === 'function') {
            return chatHistoryManagerRef.current.getMessagesForStorage();
          }
          // Fallback to transforming existing chat history
          return chat.history.map((message: any, index: number) => ({
            role: message.role,
            message: message.message,
            timestamp: message.timestamp || new Date().toISOString(),
            messageId: message.messageId || `msg_${Date.now()}_${index}`,
            createdAt: message.createdAt || Date.now() + index
          }));
        },
        'Get chat messages formatted for storage',
        []
      ),
      getLastMessage: createMethodDescriptor(
        () => chat.history[chat.history.length - 1] || null,
        'Get the last chat message',
        []
      ),
    }
  });

  // Auto-register UI component methods for tools
  useAutoRegisterComponent({
    name: 'ui',
    description: 'User interface manipulation and notifications',
    category: 'ui',
    methods: {
      showNotification: createMethodDescriptor(
        (message: string, type: string = 'info', options: any = {}) => {
          return showNotification(message, type as 'info' | 'success' | 'warning' | 'error', options);
        },
        'Show a toast notification and return its ID',
        [
          { name: 'message', type: 'string', description: 'The notification message', required: true },
          { name: 'type', type: 'string', description: 'Notification type: info, success, warning, error', required: false },
          { name: 'options', type: 'object', description: 'Options: { autoDismiss: boolean, duration: number }', required: false }
        ]
      ),
      removeNotification: createMethodDescriptor(
        (id: string) => {
          removeNotification(id);
        },
        'Remove a specific notification by ID',
        [
          { name: 'id', type: 'string', description: 'The notification ID returned by showNotification', required: true }
        ]
      ),
      clearAllNotifications: createMethodDescriptor(
        () => {
          clearAllNotifications();
        },
        'Clear all notifications',
        []
      ),
      updateTitle: createMethodDescriptor(
        (title: string) => {
          document.title = title;
        },
        'Update the browser tab title',
        [{ name: 'title', type: 'string', description: 'The new title', required: true }]
      ),
    }
  });

  // Auto-register Auth component methods for tools
  useAutoRegisterComponent({
    name: 'auth',
    description: 'Authentication and user management',
    category: 'auth',
    methods: {
      getCredentials: createMethodDescriptor(
        () => SettingsManager.getCredentials(),
        'Get current AWS credentials',
        []
      ),
      getTokens: createMethodDescriptor(
        async () => {
          try {
            const session = await fetchAuthSession();
            if (session.tokens) {
              return {
                idToken: session.tokens.idToken?.toString() || null,
                accessToken: session.tokens.accessToken?.toString() || null,
                refreshToken: (session.tokens as any).refreshToken?.toString() || null
              };
            }
            return { idToken: null, accessToken: null, refreshToken: null };
          } catch (error) {
            console.error('Error fetching tokens:', error);
            return { idToken: null, accessToken: null, refreshToken: null };
          }
        },
        'Get current Cognito tokens (idToken, accessToken, refreshToken)',
        []
      ),
      getJWT: createMethodDescriptor(
        async () => {
          try {
            const session = await fetchAuthSession();
            return session.tokens?.idToken?.toString() || null;
          } catch (error) {
            console.error('Error fetching JWT token:', error);
            return null;
          }
        },
        'Get current JWT token (ID token from Cognito)',
        []
      ),
      getUserInfo: createMethodDescriptor(
        () => {
          return { authenticated: isAuthenticated };
        },
        'Get current user information',
        []
      ),
    }
  });

  // Auto-register Menu component methods for tools
  useAutoRegisterComponent({
    name: 'menu',
    description: 'Menu dashboard management with dynamic population and category creation',
    category: 'ui',
    methods: {
      // Menu Population
      addItems: createMethodDescriptor(
        (items: any[]) => {
          return menuDisplayRef.current?.addItems?.(items);
        },
        'Add multiple items to the menu (auto-creates categories)',
        [
          { name: 'items', type: 'array', description: 'Array of menu items to add', required: true }
        ]
      ),
      addItem: createMethodDescriptor(
        (item: any) => {
          return menuDisplayRef.current?.addItem?.(item);
        },
        'Add a single item to the menu (auto-creates category)',
        [
          { name: 'item', type: 'object', description: 'Menu item object to add', required: true }
        ]
      ),
      clearMenu: createMethodDescriptor(
        () => {
          return menuDisplayRef.current?.clearMenu?.();
        },
        'Clear all menu items and categories',
        []
      ),
      // Category Management
      getAllCategories: createMethodDescriptor(
        () => {
          return menuDisplayRef.current?.getAllCategories?.() || [];
        },
        'Get all menu categories',
        []
      ),
      showCategory: createMethodDescriptor(
        (categoryId: string) => {
          return menuDisplayRef.current?.showCategory?.(categoryId);
        },
        'Navigate to a specific menu category',
        [
          { name: 'categoryId', type: 'string', description: 'The category ID to show', required: true }
        ]
      ),
      setActiveCategory: createMethodDescriptor(
        (categoryId: string) => {
          return menuDisplayRef.current?.setActiveCategory?.(categoryId);
        },
        'Set the active category (same as clicking a category button)',
        [
          { name: 'categoryId', type: 'string', description: 'The category ID to set as active', required: true }
        ]
      ),
      // Menu Items
      getMenuItems: createMethodDescriptor(
        (category?: string) => {
          return menuDisplayRef.current?.getMenuItems?.(category) || [];
        },
        'Get menu items, optionally filtered by category',
        [
          { name: 'category', type: 'string', description: 'Optional category to filter by', required: false }
        ]
      ),
      searchItems: createMethodDescriptor(
        (query: string) => {
          return menuDisplayRef.current?.searchItems?.(query) || [];
        },
        'Search menu items by name or description',
        [
          { name: 'query', type: 'string', description: 'Search query', required: true }
        ]
      ),
      getItemById: createMethodDescriptor(
        (itemId: string) => {
          return menuDisplayRef.current?.getItemById?.(itemId) || [];
        },
        'Search menu items by name or description',
        [
          { name: 'query', type: 'string', description: 'Search query', required: true }
        ]
      ),
      highlightItem: createMethodDescriptor(
        (itemId: string, duration: number = 3000) => {
          return menuDisplayRef.current?.highlightItem?.(itemId, duration);
        },
        'Highlight a menu item temporarily',
        [
          { name: 'itemId', type: 'string', description: 'The item ID to highlight', required: true },
          { name: 'duration', type: 'number', description: 'Duration in milliseconds', required: false }
        ]
      ),
    }
  });

  // Auto-register Cart component methods for tools
  useAutoRegisterComponent({
    name: 'cart',
    description: 'Shopping cart management for drive-thru orders',
    category: 'ui',
    methods: {
      addToCart: createMethodDescriptor(
        (menuItemId: string, name: string, basePrice: number, quantity: number = 1, customizations: any[] = []) => {
          console.log("🔧 App: addToCart tool called with:", { menuItemId, name, basePrice, quantity, customizations });
          const result = shoppingCartRef.current?.addToCart?.(menuItemId, name, basePrice, quantity, customizations);
          console.log("🔧 App: addToCart tool returning to Nova:", result);
          return result;
        },
        'Add an item to the shopping cart',
        [
          { name: 'menuItemId', type: 'string', description: 'The menu item ID', required: true },
          { name: 'name', type: 'string', description: 'The item name', required: true },
          { name: 'basePrice', type: 'number', description: 'The base price of the item', required: true },
          { name: 'quantity', type: 'number', description: 'Quantity to add', required: false },
          { name: 'customizations', type: 'array', description: 'Array of customizations', required: false }
        ]
      ),
      bulkAddToCart: createMethodDescriptor(
        (items: any[]) => {
          console.log("🔧 App: bulkAddToCart tool called with items:", items);
          const result = shoppingCartRef.current?.bulkAddToCart?.(items);
          console.log("🔧 App: bulkAddToCart tool returning to Nova:", result);
          return result;
        },
        'Add multiple items to the cart in a single operation',
        [
          {
            name: 'items',
            type: 'array',
            description: 'Array of items to add. Each item should have: menuItemId, name, price, quantity (optional), customizations (optional)',
            required: true
          }
        ]
      ),
      addCustomizationToCartItem: createMethodDescriptor(
        (cartItemId: string, customization: any) => {
          return shoppingCartRef.current?.addCustomization?.(cartItemId, customization)
        },
        'Add a single customization to a specific item in the cart',
        [
          { name: 'cartItemId', type: 'string', description: 'The unique id of the item in the cart', required: true },
          { name: 'customization', type: 'object', description: 'The customization object to add (must have id, name, price, type)', required: true }
        ]
      ),
      removeCustomizationFromCartItem: createMethodDescriptor(
        (cartItemId: string, customizationId: string) => {
          return shoppingCartRef.current?.removeCustomization?.(cartItemId, customizationId)
        },
        'Removes a specific customization applied to an item in the cart',
        [
          { name: 'cartItemId', type: 'string', description: 'The unique id of the item in the cart', required: true },
          { name: 'customizationId', type: 'string', description: 'The id of the customization to be removed from the item in the cart', required: true }
        ]
      ),
      removeFromCart: createMethodDescriptor(
        (cartItemId: string) => {
          return shoppingCartRef.current?.removeFromCart?.(cartItemId);
        },
        'Remove an item from the cart',
        [
          { name: 'cartItemId', type: 'string', description: 'The cart item ID to remove', required: true }
        ]
      ),
      bulkRemoveFromCart: createMethodDescriptor(
        (cartItemIds: string[]) => {
          return shoppingCartRef.current?.bulkRemoveFromCart?.(cartItemIds);
        },
        'Remove multiple items from the cart in a single operation',
        [
          {
            name: 'cartItemIds',
            type: 'array',
            description: 'Array of cart item IDs to remove',
            required: true
          }
        ]
      ),
      getCartItem: createMethodDescriptor(
        (cartItemId: string) => {
          return shoppingCartRef.current?.getCartItem?.(cartItemId);
        },
        'Get a single cart item by its cart item ID',
        [
          {
            name: 'cartItemId',
            type: 'string',
            description: 'The unique cart item ID to retrieve',
            required: true
          }
        ]
      ),
      getCartTotal: createMethodDescriptor(
        () => {
          return shoppingCartRef.current?.getCartTotal?.() || 0;
        },
        'Get the total cart amount',
        []
      ),
      getCartCount: createMethodDescriptor(
        () => {
          return shoppingCartRef.current?.getCartCount?.() || 0;
        },
        'Get the total number of items in cart',
        []
      ),
      getOrderSummary: createMethodDescriptor(
        () => {
          return shoppingCartRef.current?.getOrderSummary?.() || { items: [], itemCount: 0, totalQuantity: 0, subtotal: 0, tax: 0, total: 0 };
        },
        'Get complete order summary with items, totals, and tax',
        []
      ),
      clearCart: createMethodDescriptor(
        () => {
          return shoppingCartRef.current?.clearCart?.();
        },
        'Clear all items from the cart',
        []
      ),
      updateQuantity: createMethodDescriptor(
        (cartItemId: string, quantity: number) => {
          return shoppingCartRef.current?.updateQuantity?.(cartItemId, quantity);
        },
        'Update the quantity of an existing cart item',
        [
          { name: 'cartItemId', type: 'string', description: 'The cart item ID to update', required: true },
          { name: 'quantity', type: 'number', description: 'New quantity for the item (if 0 or negative, item will be removed)', required: true }
        ]
      ),
      updateCartItem: createMethodDescriptor(
        (cartItemId: string, updatedItem: any) => {
          return shoppingCartRef.current?.updateCartItem?.(cartItemId, updatedItem);
        },
        'Update an entire cart item (for combo modifications)',
        [
          { name: 'cartItemId', type: 'string', description: 'The cart item ID to update', required: true },
          { name: 'updatedItem', type: 'object', description: 'The updated item data', required: true }
        ]
      ),
    }
  });

  // Update chatRef when chat state changes
  useEffect(() => {
    chatRef.current = chat;
  }, [chat]);

  // Update isStreamingRef when isStreaming state changes
  useEffect(() => {
    isStreamingRef.current = isStreaming;
  }, [isStreaming]);

  // Set initial document title
  useEffect(() => {
    const settings = SettingsManager.getSettings();
    const companyName = settings?.agent?.companyName || 'Your Drive-thru company';
    document.title = `${companyName} - ${POWERED_BY_TEXT}`;
    setAppTitle(companyName);
  }, []);

  // Update title when settings change
  useEffect(() => {
    const updateTitle = () => {
      const settings = SettingsManager.getSettings();
      const companyName = settings?.agent?.companyName || 'Your Drive-thru company';
      document.title = `${companyName} - ${POWERED_BY_TEXT}`;
      setAppTitle(companyName);
    };

    // Update title when storage changes (from other tabs)
    const handleStorageChange = () => {
      updateTitle();
    };

    // Update title when settings are saved in this tab
    const handleSettingsUpdate = () => {
      updateTitle();
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('settingsUpdated', handleSettingsUpdate);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('settingsUpdated', handleSettingsUpdate);
    };
  }, []);

  // Check configuration on app load and handle Quick Start
  useEffect(() => {
    const checkConfiguration = async () => {
      const configured = SettingsManager.isConfigured();
      const incomplete = SettingsManager.getIncompleteSettings();
      const existingSettings = SettingsManager.getSettings();

      console.log('🔍 App configuration check:', {
        configured,
        incomplete,
        isEditingConfig,
        hasCheckedForDefaults,
        existingSettings: existingSettings ? 'exists' : 'null',
        cognitoSettings: existingSettings?.cognito
      });

      // Only set isConfigured to false if configuration is actually incomplete
      // Don't change isConfigured just because we're editing settings
      setIsConfigured(configured);
      setIncompleteSettings(incomplete);

      // Check for first-time setup and show Quick Start dialog
      if (!configured && !hasCheckedForDefaults && !isEditingConfig) {
        console.log('🚀 First-time setup detected, showing Quick Start dialog');
        setHasCheckedForDefaults(true);
        setShowQuickStart(true);
      } else {
        console.log('❌ Quick Start dialog NOT shown because:', {
          configured: configured ? 'app is configured' : 'app not configured ✓',
          hasCheckedForDefaults: hasCheckedForDefaults ? 'already checked' : 'not checked yet ✓',
          isEditingConfig: isEditingConfig ? 'currently editing config' : 'not editing ✓'
        });
      }
    };

    checkConfiguration();
  }, [isEditingConfig, hasCheckedForDefaults]);

  // Initialize chat history manager
  useEffect(() => {
    const chatHistoryManagerInstance = ChatHistoryManager.getInstance(
      chatRef,
      (newChat: ChatHistory) => {
        console.log("Chat updated:", newChat);
        setChat(newChat);
      },
    );

    if (!chatHistoryManagerInstance) {
      throw new Error("Failed to initialize ChatHistoryManager");
    }

    chatHistoryManagerRef.current = chatHistoryManagerInstance;
  }, []);

  // Configuration handlers
  const handleConfigSet = useCallback(async () => {
    console.log("⚙️ App: Configuration saved, refreshing app state and running initialization");

    try {
      // Set configuration state first
      setIsConfigured(true);
      setIsEditingConfig(false);

      // Show status that we're refreshing
      setStatus({ text: "Refreshing application state...", className: "connecting" });

      // Reset component states before initialization
      console.log("🔄 App: Resetting component states (chat, cart, menu)");

      // Clear chat messages
      setChat({ history: [] });
      if (chatHistoryManagerRef.current) {
        (chatHistoryManagerRef.current as any).clearHistory();
      }

      // Clear cart items
      if (shoppingCartRef.current?.clearCart) {
        shoppingCartRef.current.clearCart();
      }

      // Clear menu items
      if (menuDisplayRef.current?.clearMenu) {
        menuDisplayRef.current.clearMenu();
      }

      // Clear notifications
      setNotifications([]);

      console.log("✅ App: Component states reset successfully");

      // Update tool executor context with fresh settings
      setStatus({ text: "Updating tool configurations...", className: "connecting" });
      const context = getExecutionContext();
      toolExecutor.setExecutionContext(context);

      // Add a small delay to allow React to process the state resets
      console.log("⏳ App: Waiting for React to process state resets...");
      await new Promise(resolve => setTimeout(resolve, 300));

      // Wait for components to be ready
      setStatus({ text: "Initializing components...", className: "connecting" });
      await waitForComponentsReady();

      // Update tool executor context with all registered components
      const updatedContext = getExecutionContext();
      toolExecutor.setExecutionContext(updatedContext);
      console.log("🔧 App: Updated tool context with refreshed components:", Object.keys(updatedContext.components));

      // Execute initialization tools after refresh
      setStatus({ text: "Running initialization tools...", className: "connecting" });
      const toolResult = await toolExecutor.executeInitializationTools();

      if (toolResult.executed) {
        setStatus({ text: "Application refreshed successfully", className: "ready" });
        setToolsSkippedDuringConfig(false);
        console.log("🎉 App: Configuration refresh and initialization complete");
      } else {
        setStatus({ text: "Configuration saved - login required for full initialization", className: "ready" });
        setToolsSkippedDuringConfig(true);
        console.log(`⚠️ App: Configuration saved but tools skipped - ${toolResult.reason}`);
      }

    } catch (error) {
      console.error("❌ App: Failed to refresh application after configuration change:", error);
      setStatus({ text: "Application refresh failed", className: "error" });
    }
  }, [getExecutionContext, waitForComponentsReady, setChat, setNotifications]);

  const handleEditConfig = () => {
    setIsEditingConfig(true);
  };

  const handleEditSettings = () => {
    setIsEditingConfig(true);
  };

  const handleQuickStartSkip = () => {
    setShowQuickStart(false);
    setIsEditingConfig(true); // Open settings for manual configuration
  };

  const handleQuickStartLoadSample = async (sampleId: string) => {
    try {
      console.log('🚀 Quick Start: Loading sample configuration:', sampleId);

      // Load sample settings from the samples directory
      const response = await fetch(`/samples/${sampleId}/settings.json`);
      if (!response.ok) {
        throw new Error(`Failed to load sample: ${response.statusText}`);
      }

      const sampleSettings = await response.json();

      // Load the sample configuration using SettingsManager
      const result = await SettingsManager.initializeWithSettings(sampleSettings.settings);

      if (result.loaded) {
        setShowQuickStart(false);
        setIsEditingConfig(true); // Open settings for Cognito configuration
        showNotification(
          `${sampleId} sample loaded! Please configure your AWS Cognito settings to continue.`,
          "success",
          { duration: 8000 }
        );
      } else {
        setShowQuickStart(false);
        setIsEditingConfig(true);
      }
    } catch (error) {
      console.error('Error loading sample from Quick Start:', error);
      showNotification(
        `Error loading ${sampleId} sample. Please try manual setup.`,
        "error"
      );
    }
  };

  // Handle sign out
  const handleSignOut = async () => {
    try {
      console.log('Signing out...');

      // Stop streaming if active
      if (isStreaming) {
        stopStreaming();
      }

      // Clear credentials and reset state
      SettingsManager.clearCredentials();
      setIsAuthenticated(false);
      isAuthenticatedRef.current = false; // Reset authentication ref

      // Sign out from AWS Cognito
      await signOut();

      console.log('Successfully signed out');
    } catch (error) {
      console.error('Error signing out:', error);
      // Even if signOut fails, clear local state
      SettingsManager.clearCredentials();
      setIsAuthenticated(false);
      isAuthenticatedRef.current = false; // Reset authentication ref
    }
  };

  // Handle authentication success
  const handleAuthenticationSuccess = useCallback(async (isAuthenticated: boolean) => {
    if (isAuthenticated && !isAuthenticatedRef.current) {
      console.log("🔐 App: Authentication successful, running initialization");
      setIsAuthenticated(true);
      isAuthenticatedRef.current = true; // Prevent double execution

      // Initial tool executor context setup
      const context = getExecutionContext();
      toolExecutor.setExecutionContext(context);

      // Wait for all components to be registered before executing initialization tools
      try {
        setStatus({ text: "Initializing components...", className: "connecting" });

        // Add a small delay to allow React to render the MenuDisplay and ShoppingCart components
        // These components are rendered after authentication, so we need to wait for them
        console.log("🔐 App: Waiting for React to render authenticated components...");
        await new Promise(resolve => setTimeout(resolve, 500)); // 500ms delay

        // Wait for components to be ready (including menu, cart, and any others)
        await waitForComponentsReady();

        // Update tool executor context with all registered components
        const updatedContext = getExecutionContext();
        toolExecutor.setExecutionContext(updatedContext);
        console.log("🔧 App: Updated tool context with all components:", Object.keys(updatedContext.components));

        // Execute initialization tools after all components are ready
        // This includes retrying tools that were skipped during configuration save
        if (toolsSkippedDuringConfig) {
          console.log("🔄 App: Retrying initialization tools that were skipped during configuration");
          setStatus({ text: "Retrying initialization tools...", className: "connecting" });
        } else {
          setStatus({ text: "Running initialization tools...", className: "connecting" });
        }

        const toolResult = await toolExecutor.executeInitializationTools();

        if (toolResult.executed) {
          setStatus({ text: "Initialization complete", className: "ready" });
          setToolsSkippedDuringConfig(false); // Clear the flag since tools ran successfully
          console.log("🎉 App: Authentication initialization complete");
        } else {
          setStatus({ text: "Authentication complete - tools require valid session", className: "warning" });
          console.log(`⚠️ App: Authentication complete but tools skipped - ${toolResult.reason}`);
        }
      } catch (error) {
        console.error("Failed to execute initialization tools:", error);
        setStatus({ text: "Initialization tools failed", className: "error" });
      }
    } else if (isAuthenticated) {
      console.log("🔐 App: Authentication callback called again, ignoring to prevent double execution");
    }
  }, [getExecutionContext, waitForComponentsReady, getComponentRegistry]);

  // Notification management functions
  const showNotification = useCallback((
    message: string,
    type: 'info' | 'success' | 'warning' | 'error' = 'info',
    options: { autoDismiss?: boolean; duration?: number } = {}
  ): string => {
    const id = `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const { autoDismiss = true, duration = 5000 } = options;

    const notification: Notification = {
      id,
      message,
      type,
      timestamp: Date.now(),
      autoDismiss,
      duration
    };

    setNotifications(prev => [...prev, notification]);

    // Auto-dismiss if enabled
    if (autoDismiss) {
      setTimeout(() => {
        removeNotification(id);
      }, duration);
    }

    console.log(`📢 Notification shown: ${type.toUpperCase()} - ${message} (ID: ${id})`);
    return id;
  }, []);

  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
    console.log(`🗑️ Notification removed: ${id}`);
  }, []);

  const clearAllNotifications = useCallback(() => {
    setNotifications([]);
    console.log('🧹 All notifications cleared');
  }, []);

  // Save-only callback (doesn't close settings or trigger full refresh)
  const handleConfigSaveOnly = useCallback(() => {
    console.log("💾 App: Configuration saved (staying in settings)");

    // Just update the configuration state without closing settings
    setIsConfigured(true);

    // Show a brief success status
    setStatus({ text: "Settings saved successfully", className: "ready" });

    // Show success notification
    showNotification("Settings saved successfully", "success", { duration: 3000 });
  }, [showNotification]);

  // Initialize audio
  const initAudio = useCallback(async () => {
    try {
      setStatus({ text: "Requesting microphone access...", className: "connecting" });

      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      audioStreamRef.current = stream;

      let audioContext: AudioContext;
      if (isFirefox) {
        audioContext = new AudioContext();
      } else {
        audioContext = new AudioContext({
          sampleRate: TARGET_SAMPLE_RATE,
        });
      }

      audioContextRef.current = audioContext;
      samplingRatioRef.current = audioContext.sampleRate / TARGET_SAMPLE_RATE;

      console.log(
        `Debug AudioContext- sampleRate: ${audioContext.sampleRate} samplingRatio: ${samplingRatioRef.current}`,
      );

      await audioPlayerRef.current.start();

      setStatus({ text: "Microphone ready. Click Start to begin.", className: "ready" });
    } catch (error: any) {
      console.error("Error accessing microphone:", error);
      setStatus({ text: `Error: ${error.message}`, className: "error" });
    }
  }, [isFirefox, TARGET_SAMPLE_RATE]);

  // Initialize session
  const initializeSession = useCallback((): Promise<void> => {
    console.log("App::initializeSession::Initializing session (sessionInitializedRef?)", sessionInitializedRef.current);
    if (sessionInitializedRef.current) return Promise.resolve();

    return new Promise((resolve, reject) => {
      const handleSessionCreated = async (e: Event) => {
        const data = (e as CustomEvent).detail;

        // Get tools from configuration and register them
        const loadAndRegisterTools = async () => {
          try {
            const processedTools = await toolExecutor.loadToolsFromConfig();

            const toolsForSession = processedTools.map(tool => ({
              toolname: tool.toolname,
              definition: tool.definition,
              action: tool.action
            }));

            console.log("App::initializeSession::Session created:", data);
            target.dispatchEvent(new CustomEvent("initiateSession", {
              detail: {
                sessionId: data,
                tools: toolsForSession
              }
            }));
          } catch (error) {
            console.error("Failed to load tools:", error);
            // Continue without tools
            target.dispatchEvent(new CustomEvent("initiateSession", {
              detail: {
                sessionId: data,
                tools: []
              }
            }));
          }
        };

        await loadAndRegisterTools();
      };

      const handleSessionInitiated = () => {
        try {
          console.log("App::initializeSession::Session initiated - dispatching sequence events");

          // Read current agent configuration for system prompt
          const agentConfig = SettingsManager.getAgentConfig();
          const systemPrompt = agentConfig.system_prompt;

          console.log("App::initializeSession::Using system prompt:", systemPrompt);

          target.dispatchEvent(new Event("promptStart"));
          target.dispatchEvent(
            new CustomEvent("systemPrompt", { detail: systemPrompt }),
          );
          target.dispatchEvent(new Event("audioStart"));

          sessionInitializedRef.current = true;
          setStatus({ text: "Session initialized successfully", className: "ready" });

          target.removeEventListener("sessionCreated", handleSessionCreated);
          target.removeEventListener("sessionInitiated", handleSessionInitiated);

          resolve();
        } catch (error) {
          console.error("Failed to initialize session:", error);
          setStatus({ text: "Error initializing session", className: "error" });

          target.removeEventListener("sessionCreated", handleSessionCreated);
          target.removeEventListener("sessionInitiated", handleSessionInitiated);

          reject(error);
        }
      };

      target.addEventListener("sessionCreated", handleSessionCreated);
      target.addEventListener("sessionInitiated", handleSessionInitiated);

      setStatus({ text: "Initializing session...", className: "connecting" });
      console.log("App::initializeSession::Dispatching createSession event");
      target.dispatchEvent(new Event("createSession"));
    });
  }, []);

  // Convert ArrayBuffer to base64 string
  const arrayBufferToBase64 = useCallback((buffer: ArrayBuffer): string => {
    const binary: string[] = [];
    const bytes = new Uint8Array(buffer);
    for (let i = 0; i < bytes.byteLength; i++) {
      binary.push(String.fromCharCode(bytes[i]));
    }
    return btoa(binary.join(""));
  }, []);

  // Start streaming
  const startStreaming = useCallback(async () => {
    console.log("App::startStreaming::Starting audio input (isStreamingRef?)", isStreamingRef.current);
    if (isStreamingRef.current) return;

    try {
      // Clear chat history for new session
      if (chatHistoryManagerRef.current) {
        (chatHistoryManagerRef.current as any).clearHistory();
        setChat({ history: [] });
      }

      console.log("App::startStreaming::Starting audio input (sessionInitializedRef?)", sessionInitializedRef.current)
      if (!sessionInitializedRef.current) {
        await initializeSession();
      }

      // Reinitialize AudioPlayer for new streaming session
      await audioPlayerRef.current.start();
      console.log("App::startStreaming::AudioPlayer reinitialized");

      if (!audioContextRef.current || !audioStreamRef.current) {
        throw new Error("Audio not initialized");
      }

      const sourceNode = audioContextRef.current.createMediaStreamSource(audioStreamRef.current);
      sourceNodeRef.current = sourceNode;

      if (audioContextRef.current.createScriptProcessor) {
        const processor = audioContextRef.current.createScriptProcessor(512, 1, 1);
        processorRef.current = processor;

        processor.onaudioprocess = (e) => {
          if (!isStreamingRef.current) return;

          const inputData = e.inputBuffer.getChannelData(0);
          const numSamples = Math.round(inputData.length / samplingRatioRef.current);
          const pcmData = isFirefox
            ? new Int16Array(numSamples)
            : new Int16Array(inputData.length);

          if (isFirefox) {
            for (let i = 0; i < inputData.length; i++) {
              pcmData[i] =
                Math.max(-1, Math.min(1, inputData[i * samplingRatioRef.current])) * 0x7fff;
            }
          } else {
            for (let i = 0; i < inputData.length; i++) {
              pcmData[i] = Math.max(-1, Math.min(1, inputData[i])) * 0x7fff;
            }
          }

          const base64Data = arrayBufferToBase64(pcmData.buffer);
          console.log("App::startStreaming::Dispatching audioInput event");
          target.dispatchEvent(
            new CustomEvent("audioInput", { detail: base64Data }),
          );
        };

        sourceNode.connect(processor);
        processor.connect(audioContextRef.current.destination);
      }

      setIsStreaming(true);
      setStatus({ text: "Listening... You may speak now", className: "recording" });
      transcriptionReceivedRef.current = false;
      setWaitingForUserTranscription(true);

      // Auto-initiate conversation if enabled
      const settings = SettingsManager.getSettings();
      if (settings?.agent?.autoInitiateConversation && settings?.agent?.initiationAudio) {
        console.log("App::startStreaming::Auto-initiating conversation with pre-recorded audio");

        // Set flag to skip first user message
        autoInitiateFirstMessageRef.current = true;

        // Small delay to ensure streaming is fully established
        setTimeout(async () => {
          try {
            // Decode base64 audio
            const base64Audio = settings.agent.initiationAudio!; // We know it exists from the condition above
            const audioData = base64Audio.includes(',') ? base64Audio.split(',')[1] : base64Audio;
            const binaryString = atob(audioData);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
              bytes[i] = binaryString.charCodeAt(i);
            }

            // Create a temporary audio context for decoding
            const tempAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
            const audioBuffer = await tempAudioContext.decodeAudioData(bytes.buffer);

            // Get PCM data and resample to 16kHz if needed
            const sampleRate = audioBuffer.sampleRate;
            const targetSampleRate = 16000;
            const pcmData = audioBuffer.getChannelData(0);

            let finalPcmData = pcmData;
            if (sampleRate !== targetSampleRate) {
              // Simple resampling
              const ratio = sampleRate / targetSampleRate;
              const newLength = Math.floor(pcmData.length / ratio);
              finalPcmData = new Float32Array(newLength);
              for (let i = 0; i < newLength; i++) {
                finalPcmData[i] = pcmData[Math.floor(i * ratio)];
              }
            }

            // Convert to Int16Array (same format as microphone input)
            const int16Data = new Int16Array(finalPcmData.length);
            for (let i = 0; i < finalPcmData.length; i++) {
              int16Data[i] = Math.max(-1, Math.min(1, finalPcmData[i])) * 0x7fff;
            }

            // Send to Nova Sonic
            const base64InitAudio = arrayBufferToBase64(int16Data.buffer);
            target.dispatchEvent(
              new CustomEvent("audioInput", { detail: base64InitAudio }),
            );

            console.log("App::startStreaming::Auto-initiation audio sent to Nova Sonic");
            tempAudioContext.close();

          } catch (error) {
            console.error("App::startStreaming::Error sending auto-initiation audio:", error);
          }
        }, 500); // 500ms delay to ensure streaming is ready
      }
    } catch (error: any) {
      console.error("Error starting audio input:", error);
      setStatus({ text: `Error: ${error.message}`, className: "error" });
    }
  }, [initializeSession, arrayBufferToBase64, isFirefox]);

  // Stop streaming
  const stopStreaming = useCallback(() => {
    if (!isStreamingRef.current) return;

    setIsStreaming(false);
    sessionInitializedRef.current = false; // Reset session state to allow new session creation
    console.log("App::stopStreaming::Reset sessionInitializedRef to false");

    // Reset auto-initiate flag
    autoInitiateFirstMessageRef.current = false;

    // Reset thinking indicators
    setWaitingForUserTranscription(false);
    setWaitingForAssistantResponse(false);

    if (processorRef.current && sourceNodeRef.current) {
      processorRef.current.disconnect();
      sourceNodeRef.current.disconnect();
    }

    setStatus({ text: "Processing...", className: "processing" });
    audioPlayerRef.current.stop();
    target.dispatchEvent(new Event("stopAudio"));

    if (chatHistoryManagerRef.current) {
      chatHistoryManagerRef.current.endTurn();
    }
  }, []);

  // Toggle streaming function
  const toggleStreaming = useCallback(() => {
    if (isStreaming) {
      stopStreaming();
    } else {
      startStreaming();
    }
  }, [isStreaming, startStreaming, stopStreaming]);

  // Base64 to Float32Array conversion
  const base64ToFloat32Array = useCallback((base64String: string): Float32Array => {
    try {
      const binaryString = window.atob(base64String);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      const int16Array = new Int16Array(bytes.buffer);
      const float32Array = new Float32Array(int16Array.length);
      for (let i = 0; i < int16Array.length; i++) {
        float32Array[i] = int16Array[i] / 32768.0;
      }

      return float32Array;
    } catch (error) {
      console.error("Error in base64ToFloat32Array:", error);
      throw error;
    }
  }, []);

  // Handle text output
  const processTextOutput = useCallback((data: { role: string; content: string }): void => {
    console.log("Processing text output:", data);

    // Skip first user message if auto-initiate is enabled
    if (data.role === "USER" && autoInitiateFirstMessageRef.current) {
      console.log("Skipping first user message due to auto-initiate");
      autoInitiateFirstMessageRef.current = false; // Reset flag after skipping
      return;
    }

    if (data.content && chatHistoryManagerRef.current) {
      const messageData = {
        role: data.role,
        message: data.content,
      };
      console.log("Adding message to chat history:", messageData);
      chatHistoryManagerRef.current.addTextMessage(messageData);
    }
  }, []);

  // Event handlers setup
  useEffect(() => {
    const handleContentStart = (e: Event) => {
      const data = (e as CustomEvent).detail;
      console.log("Content start received:", data);

      if (data.type === "TEXT") {
        roleRef.current = data.role;
        if (data.role === "USER") {
          setWaitingForUserTranscription(false);
        } else if (data.role === "ASSISTANT") {
          setWaitingForAssistantResponse(false);
          let isSpeculative = false;
          try {
            if (data.additionalModelFields) {
              const additionalFields = JSON.parse(data.additionalModelFields);
              isSpeculative = additionalFields.generationStage === "SPECULATIVE";
              if (isSpeculative) {
                console.log("Received speculative content");
                displayAssistantTextRef.current = true;
              } else {
                displayAssistantTextRef.current = false;
              }
            }
          } catch (e) {
            console.error("Error parsing additionalModelFields:", e);
          }
        }
      } else if (data.type === "AUDIO") {
        if (isStreamingRef.current) {
          setWaitingForUserTranscription(true);
        }
      }
    };

    const handleTextOutput = (e: Event) => {
      const data = (e as CustomEvent).detail;
      console.log("Received text output:", data);

      if (roleRef.current === "USER") {
        transcriptionReceivedRef.current = true;
        processTextOutput({
          role: data.role,
          content: data.content,
        });
        setWaitingForAssistantResponse(true);
      } else if (roleRef.current === "ASSISTANT") {
        if (displayAssistantTextRef.current) {
          processTextOutput({
            role: data.role,
            content: data.content
          });
        }
      }
    };

    const handleAudioOutput = (e: Event) => {
      const data = (e as CustomEvent).detail;
      if (data.content) {
        try {
          const audioData = base64ToFloat32Array(data.content);
          audioPlayerRef.current.playAudio(audioData);
        } catch (error) {
          console.error("Error processing audio data:", error);
        }
      }
    };

    const handleContentEnd = (e: Event) => {
      const data = (e as CustomEvent).detail;
      console.log("Content end received:", data);

      if (data.type === "TEXT") {
        if (roleRef.current === "USER") {
          setWaitingForUserTranscription(false);
          setWaitingForAssistantResponse(true);
        } else if (roleRef.current === "ASSISTANT") {
          setWaitingForAssistantResponse(false);
        }

        if (data.stopReason && data.stopReason.toUpperCase() === "END_TURN") {
          console.log("Assistant finished response, ready for next user input");
        } else if (
          data.stopReason &&
          data.stopReason.toUpperCase() === "INTERRUPTED"
        ) {
          console.log("Interrupted by user");
          audioPlayerRef.current.bargeIn();
        }
      } else if (data.type === "AUDIO") {
        if (isStreamingRef.current) {
          setWaitingForUserTranscription(true);
        }
      }
    };

    const handleStreamComplete = () => {
      if (isStreamingRef.current) {
        stopStreaming();
      }
      setStatus({ text: "Ready", className: "ready" });
    };

    const handleConnect = () => {
      setStatus({ text: "Connected to server", className: "connected" });
      sessionInitializedRef.current = false;
    };

    const handleDisconnect = () => {
      setStatus({ text: "Disconnected from server", className: "disconnected" });
      sessionInitializedRef.current = false;
      setWaitingForUserTranscription(false);
      setWaitingForAssistantResponse(false);
    };

    const handleError = (e: Event) => {
      const error = (e as CustomEvent).detail;
      console.error("Event proxy error:", error);
      setStatus({
        text: `Error: ${error.message || JSON.stringify(error).substring(0, 100)}`,
        className: "error"
      });
      setWaitingForUserTranscription(false);
      setWaitingForAssistantResponse(false);
    };

    // Add event listeners
    target.addEventListener("contentStart", handleContentStart);
    target.addEventListener("textOutput", handleTextOutput);
    target.addEventListener("audioOutput", handleAudioOutput);
    target.addEventListener("contentEnd", handleContentEnd);
    target.addEventListener("streamComplete", handleStreamComplete);
    target.addEventListener("connect", handleConnect);
    target.addEventListener("disconnect", handleDisconnect);
    target.addEventListener("error", handleError);

    // Cleanup
    return () => {
      target.removeEventListener("contentStart", handleContentStart);
      target.removeEventListener("textOutput", handleTextOutput);
      target.removeEventListener("audioOutput", handleAudioOutput);
      target.removeEventListener("contentEnd", handleContentEnd);
      target.removeEventListener("streamComplete", handleStreamComplete);
      target.removeEventListener("connect", handleConnect);
      target.removeEventListener("disconnect", handleDisconnect);
      target.removeEventListener("error", handleError);
    };
  }, [stopStreaming, base64ToFloat32Array, processTextOutput]);

  // Initialize audio on component mount (only when configured and authenticated)
  useEffect(() => {
    if (isConfigured && !isEditingConfig && isAuthenticated) {
      console.log("Initializing audio");
      initAudio();
    } else {
      console.log("Not initializing audio - configured:", isConfigured, "editing:", isEditingConfig, "authenticated:", isAuthenticated);
    }
  }, [initAudio, isConfigured, isEditingConfig, isAuthenticated]);

  // Auto-start streaming if #autoStart is in URL (only once per page load)
  useEffect(() => {
    if (isConfigured && !isEditingConfig && isAuthenticated && !isStreaming && !autoStartProcessedRef.current) {
      const hash = window.location.hash;
      if (hash.includes('autoStart')) {
        console.log("🚀 Auto-starting streaming due to #autoStart in URL");

        // Mark as processed to prevent re-triggering
        autoStartProcessedRef.current = true;

        // Clean the URL hash after detecting autoStart
        window.history.replaceState(null, '', window.location.pathname + window.location.search);

        setTimeout(() => {
          startStreaming();
        }, 1000);
      }
    }
  }, [isConfigured, isEditingConfig, isAuthenticated, isStreaming, startStreaming]);

  // Show Quick Start dialog for first-time users (before any other UI)
  if (showQuickStart) {
    return (
      <QuickStartDialog
        onLoadSample={handleQuickStartLoadSample}
        onSkip={handleQuickStartSkip}
      />
    );
  }

  // If not configured, show settings (initial setup)
  if (!isConfigured) {
    return (
      <SettingsComponent
        onConfigSet={handleConfigSet}
        onConfigSaveOnly={handleConfigSaveOnly}
        isEditingConfig={isEditingConfig}
        setEditingConfig={setIsEditingConfig}
        incompleteSettings={incompleteSettings}
      />
    );
  }

  // If configured, show the authenticated voice chat interface
  return (
    <div className="auth-container">
      {/* Settings overlay when editing configured settings - render outside AuthComponent */}
      {isEditingConfig && (
        <div className="settings-overlay">
          <SettingsComponent
            onConfigSet={handleConfigSet}
            onConfigSaveOnly={handleConfigSaveOnly}
            isEditingConfig={isEditingConfig}
            setEditingConfig={setIsEditingConfig}
            incompleteSettings={incompleteSettings}
          />
        </div>
      )}

      <AuthComponent
        onEditConfigClick={handleEditConfig}
        onAuthStatusChange={handleAuthenticationSuccess}
      >
        <div className="app-container">
          <ToastNotifications
            notifications={notifications}
            onRemove={removeNotification}
          />

          {/* Full-width header */}
          <div className="app-header">
            <div className="app-title">
              <h1>🚗 {appTitle}</h1>
              <p className="powered-by-subtext">{POWERED_BY_TEXT}</p>
            </div>
            <div className="app-controls">
              <button
                className="settings-btn"
                onClick={handleEditSettings}
                title="Edit settings"
              >
                ⚙️ Settings
              </button>
              <button
                className="logout-btn"
                onClick={handleSignOut}
                title="Sign out"
              >
                🚪 Sign Out
              </button>
            </div>
          </div>

          {/* Two-panel content area */}
          <div className="drive-thru-container">
            {/* Left panel: Chat + Cart */}
            <div className="left-panel">
              {/* Chat section with status and microphone button */}
              <div className="chat-section">
                <div className="status-controls-row">
                  <StatusIndicator status={status} />
                  <MicrophoneButton
                    isStreaming={isStreaming}
                    onToggleStreaming={toggleStreaming}
                    disabled={status.className === "disconnected" || status.className === "error"}
                  />
                </div>
                <ChatContainer
                  chat={chat}
                  waitingForUserTranscription={waitingForUserTranscription}
                  waitingForAssistantResponse={waitingForAssistantResponse}
                />
              </div>

              {/* Cart section */}
              <div className="cart-section">
                <ShoppingCart ref={shoppingCartRef} menuItems={menuItems} />
              </div>
            </div>

            {/* Right panel: Menu */}
            <div className="menu-panel">
              <div className="panel-header">
                <h2>🍴 Menu</h2>
              </div>
              <div className="panel-content">
                <MenuDisplay ref={menuDisplayRef} />
              </div>
            </div>
          </div>
        </div>

        {/* Restart Overlay */}
        {restartOverlay.visible && (
          <div className="restart-overlay">
            <div className="restart-message">
              <div className="restart-content">
                <h3>{restartOverlay.message}</h3>
                <div className="countdown-circle">
                  <span className="countdown-number">
                    {restartOverlay.countdown > 0 ? restartOverlay.countdown : ''}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </AuthComponent>
    </div>
  );
};

export default App;
