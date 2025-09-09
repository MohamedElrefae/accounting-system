import React from 'react';

const GoogleIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="currentColor"
      {...props}
      style={{ 
        display: 'inline-block', 
        fontSize: 'inherit',
        ...props.style 
      }}
    >
      <circle cx="12" cy="12" r="8" fillOpacity="0.3" />
      <text 
        x="12" 
        y="16" 
        textAnchor="middle" 
        fontSize="8" 
        fill="currentColor"
      >
        G
      </text>
    </svg>
  );
};

export default GoogleIcon;
