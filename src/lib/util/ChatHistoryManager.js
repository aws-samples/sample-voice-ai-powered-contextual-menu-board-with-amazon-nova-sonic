export class ChatHistoryManager {
  static instance = null;

  constructor(chatRef, setChat) {
    if (ChatHistoryManager.instance) {
      return;
    }

    this.chatRef = chatRef;
    this.setChat = setChat;
    ChatHistoryManager.instance = this;
  }

  static getInstance(chatRef, setChat) {
    if (!ChatHistoryManager.instance) {
      ChatHistoryManager.instance = new ChatHistoryManager(chatRef, setChat);
    } else if (chatRef && setChat) {
      // Update references if they're provided
      ChatHistoryManager.instance.chatRef = chatRef;
      ChatHistoryManager.instance.setChat = setChat;
    }
    return ChatHistoryManager.instance;
  }

  addTextMessage(content) {
    if (!this.chatRef || !this.setChat) {
      console.error(
        "ChatHistoryManager: chatRef or setChat is not initialized",
      );
      return;
    }

    const history = this.chatRef.current?.history || [];
    const updatedChatHistory = [...history];
    const lastTurn = updatedChatHistory[updatedChatHistory.length - 1];

    // Create message with timestamp, unique ID
    const messageWithTimestamp = {
      ...content,
      timestamp: new Date().toISOString(), // Millisecond precision: 2025-01-21T04:49:22.377Z
      messageId: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: Date.now(), // Unix timestamp in milliseconds for easy sorting
    };

    if (lastTurn !== undefined && lastTurn.role === content.role) {
      // Same role, append to the last turn but keep individual message tracking
      updatedChatHistory[updatedChatHistory.length - 1] = {
        ...messageWithTimestamp,
        message: `${lastTurn.message} ${content.message}`,
        // Keep original timestamp of the first message in this turn
        originalTimestamp: lastTurn.originalTimestamp || lastTurn.timestamp,
        // Track that this is a continuation
        isContinuation: true
      };
    } else {
      // Different role, add a new turn
      updatedChatHistory.push({
        role: content.role,
        message: content.message,
        timestamp: messageWithTimestamp.timestamp,
        messageId: messageWithTimestamp.messageId,
        createdAt: messageWithTimestamp.createdAt,
        isContinuation: false
      });
    }

    this.setChat({
      history: updatedChatHistory,
    });
  }

  endTurn() {
    if (!this.chatRef || !this.setChat) {
      console.error(
        "ChatHistoryManager: chatRef or setChat is not initialized",
      );
      return;
    }

    const history = this.chatRef.current?.history || [];
    const updatedChatHistory = history.map((item) => {
      return {
        ...item,
        endOfResponse: true,
        endTimestamp: new Date().toISOString(), // When the turn ended
        endCreatedAt: Date.now()
      };
    });

    this.setChat({
      history: updatedChatHistory,
    });
  }

  endConversation() {
    if (!this.chatRef || !this.setChat) {
      console.error(
        "ChatHistoryManager: chatRef or setChat is not initialized",
      );
      return;
    }

    const history = this.chatRef.current?.history || [];
    const updatedChatHistory = history.map((item) => {
      return {
        ...item,
        endOfResponse: true,
        endTimestamp: new Date().toISOString(),
        endCreatedAt: Date.now()
      };
    });

    updatedChatHistory.push({
      endOfConversation: true,
      timestamp: new Date().toISOString(),
      createdAt: Date.now()
    });

    this.setChat({
      history: updatedChatHistory,
    });
  }

  clearHistory() {
    if (!this.chatRef || !this.setChat) {
      console.error(
        "ChatHistoryManager: chatRef or setChat is not initialized",
      );
      return;
    }

    this.setChat({
      history: [],
    });
  }

  // Add missing methods for compatibility
  addMessage(message) {
    // Convert new message format to old format if needed
    if (message.content) {
      this.addTextMessage(message.content);
    } else if (typeof message === 'string') {
      this.addTextMessage({ role: 'system', message: message });
    }
  }

  getHistory() {
    // Return the actual chat history with timestamps
    if (!this.chatRef || !this.chatRef.current) {
      return [];
    }
    return this.chatRef.current.history || [];
  }

  // Enhanced method: Get messages formatted for DynamoDB storage
  getMessagesForStorage() {
    const history = this.getHistory();
    const messages = [];
    
    history.forEach((turn, index) => {
      if (turn.endOfConversation) {
        return; // Skip conversation end markers
      }
      
      const storageMessage = {
        role: turn.role,
        message: turn.message,
        timestamp: turn.timestamp,
        messageId: turn.messageId,
        createdAt: turn.createdAt,
        turnIndex: index,
        isContinuation: turn.isContinuation || false
      };

      messages.push(storageMessage);
    });
    
    // Sort by createdAt to ensure chronological order
    return messages.sort((a, b) => a.createdAt - b.createdAt);
  }
}

export default ChatHistoryManager;
