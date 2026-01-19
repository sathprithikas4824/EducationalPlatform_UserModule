import React from 'react';

export interface IconProps extends React.SVGProps<SVGSVGElement> {
  name?: string;
  size?: number | string;
  color?: string;
  className?: string;
  strokeWidth?: number | string;
  children?: React.ReactNode;
  grayscale?: boolean;    // <-- ADD THIS
  opacity?: number;  
}

/**
 * Reusable Icon wrapper component
 *
 * Usage:
 * 1. For Streamline SVG icons: Place SVG content as children
 * 2. For inline SVGs: Use with custom SVG paths
 *
 * @example
 * // With Streamline icon
 * <Icon size={24} color="#7a12fa">
 *   <path d="..." />
 * </Icon>
 *
 * @example
 * // With custom size and color
 * <Icon size={32} color="currentColor" strokeWidth={2}>
 *   <path d="..." />
 * </Icon>
 */
export const Icon: React.FC<IconProps> = ({
  name,
  size = 24,
  color = 'currentColor',
  className = '',
  strokeWidth,
  children,
  ...props
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      {children}
    </svg>
  );
};

export default Icon;
