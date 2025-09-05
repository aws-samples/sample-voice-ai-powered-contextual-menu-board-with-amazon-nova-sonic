interface ChatMessage {
  role: string;
  message: string;
  timestamp?: string;
  messageId?: string;
  createdAt?: number;
  endOfResponse?: boolean;
  endOfConversation?: boolean;
  isContinuation?: boolean;
  originalTimestamp?: string;
  endTimestamp?: string;
  endCreatedAt?: number;
}

interface ChatHistory {
  history: Array<ChatMessage>;
}

interface ChatRef {
  current: ChatHistory;
}

interface StorageMessage {
  role: string;
  message: string;
  timestamp: string;
  messageId: string;
  createdAt: number;
  turnIndex: number;
  isContinuation: boolean;
}

export declare class ChatHistoryManager {
  static instance: ChatHistoryManager | null;
  
  constructor(chatRef: ChatRef, setChat: (chat: ChatHistory) => void);
  
  static getInstance(
    chatRef?: ChatRef, 
    setChat?: (chat: ChatHistory) => void
  ): ChatHistoryManager | null;
  
  addTextMessage(content: { role: string; message: string }): void;
  endTurn(): void;
  endConversation(): void;
  clearHistory(): void;
  addMessage(message: any): void;
  getHistory(): ChatMessage[];
  getMessagesForStorage(): StorageMessage[];
}
