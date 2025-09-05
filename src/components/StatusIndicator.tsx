import React from 'react';

interface StatusIndicatorProps {
  status: {
    text: string;
    className: string;
  };
}

const StatusIndicator: React.FC<StatusIndicatorProps> = ({ status }) => {
  return (
    <div id="status" className={status.className}>
      {status.text}
    </div>
  );
};

export default StatusIndicator;
