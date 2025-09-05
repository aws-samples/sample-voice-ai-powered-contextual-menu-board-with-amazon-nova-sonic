import React, { useEffect, useRef } from 'react';
import ThinkingIndicator from './ThinkingIndicator';

interface ChatHistory {
  history: Array<{
    role: string;
    message: string;
    endOfResponse?: boolean;
    endOfConversation?: boolean;
  }>;
}

interface ChatContainerProps {
  chat: ChatHistory;
  waitingForUserTranscription: boolean;
  waitingForAssistantResponse: boolean;
}

const ChatContainer: React.FC<ChatContainerProps> = ({ 
  chat, 
  waitingForUserTranscription, 
  waitingForAssistantResponse 
}) => {
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages are added
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chat, waitingForUserTranscription, waitingForAssistantResponse]);

  return (
    <div id="chat-container" ref={chatContainerRef}>
      <div className="chat-content">
        {chat.history.map((item, index) => {
          if (item.endOfConversation) {
            return (
              <div key={index} className="message system">
                Conversation ended
              </div>
            );
          }

          if (item.role) {
            const roleLowerCase = item.role.toLowerCase();
            return (
              <div key={index} className={`message ${roleLowerCase}`}>
                <div className="role-label">{item.role}</div>
                <div>{item.message || "No content"}</div>
              </div>
            );
          }

          return null;
        })}

        {waitingForUserTranscription && (
          <ThinkingIndicator role="USER" text="Listening" />
        )}

        {waitingForAssistantResponse && (
          <ThinkingIndicator role="ASSISTANT" text="Thinking" />
        )}
      </div>
    </div>
  );
};

export default ChatContainer;
