import React from 'react';

interface BlocksSpinnerProps {
  size?: number;
  className?: string;
}

export const BlocksSpinner: React.FC<BlocksSpinnerProps> = ({
  size = 16,
  className = ''
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <rect x="1" y="1" width="6" height="6" fill="#3b82f6">
        <animate
          attributeName="opacity"
          values="1;0;1"
          dur="1s"
          repeatCount="indefinite"
          begin="0s"
        />
      </rect>
      <rect x="9" y="1" width="6" height="6" fill="#3b82f6">
        <animate
          attributeName="opacity"
          values="1;0;1"
          dur="1s"
          repeatCount="indefinite"
          begin="0.2s"
        />
      </rect>
      <rect x="17" y="1" width="6" height="6" fill="#3b82f6">
        <animate
          attributeName="opacity"
          values="1;0;1"
          dur="1s"
          repeatCount="indefinite"
          begin="0.4s"
        />
      </rect>
      <rect x="1" y="9" width="6" height="6" fill="#1d4ed8">
        <animate
          attributeName="opacity"
          values="1;0;1"
          dur="1s"
          repeatCount="indefinite"
          begin="0.6s"
        />
      </rect>
      <rect x="9" y="9" width="6" height="6" fill="#1d4ed8">
        <animate
          attributeName="opacity"
          values="1;0;1"
          dur="1s"
          repeatCount="indefinite"
          begin="0.8s"
        />
      </rect>
      <rect x="17" y="9" width="6" height="6" fill="#1d4ed8">
        <animate
          attributeName="opacity"
          values="1;0;1"
          dur="1s"
          repeatCount="indefinite"
          begin="1s"
        />
      </rect>
      <rect x="1" y="17" width="6" height="6" fill="#2563eb">
        <animate
          attributeName="opacity"
          values="1;0;1"
          dur="1s"
          repeatCount="indefinite"
          begin="0.4s"
        />
      </rect>
      <rect x="9" y="17" width="6" height="6" fill="#2563eb">
        <animate
          attributeName="opacity"
          values="1;0;1"
          dur="1s"
          repeatCount="indefinite"
          begin="0.2s"
        />
      </rect>
      <rect x="17" y="17" width="6" height="6" fill="#2563eb">
        <animate
          attributeName="opacity"
          values="1;0;1"
          dur="1s"
          repeatCount="indefinite"
          begin="0s"
        />
      </rect>
    </svg>
  );
};

export default BlocksSpinner;
