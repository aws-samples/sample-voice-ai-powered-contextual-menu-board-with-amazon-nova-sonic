import React from 'react';

interface ThinkingIndicatorProps {
  role: string;
  text: string;
}

const ThinkingIndicator: React.FC<ThinkingIndicatorProps> = ({ role, text }) => {
  const roleLowerCase = role.toLowerCase();

  return (
    <div className={`message ${roleLowerCase} thinking`}>
      <div className="role-label">{role}</div>
      <div className="thinking-text">{text}</div>
      <div className="thinking-dots">
        <span className="dot"></span>
        <span className="dot"></span>
        <span className="dot"></span>
      </div>
    </div>
  );
};

export default ThinkingIndicator;
