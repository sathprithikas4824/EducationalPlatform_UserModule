import React from "react";
import Image from "next/image";
import { Icon, IconProps } from "./Icon";

import VisiblePng from "./svg/HeroSection/Visible.png";
import PenEditPng from "./svg/HeroSection/PenEdit.png";
/**
 * Icon Registry - All Streamline icons organized by category
 *
 * After downloading icons from Streamline:
 * 1. Open the SVG file
 * 2. Copy the path/content between <svg> tags
 * 3. Add to the appropriate category below
 */

// ==================== EDUCATION ICONS ====================

export const BookIcon: React.FC<IconProps> = (props) => (
  <Icon {...props}>
    {/* Replace with Streamline book icon path */}
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
  </Icon>
);

export const GraduationCapIcon: React.FC<IconProps> = (props) => (
  <Icon {...props}>
    {/* Replace with Streamline graduation cap icon path */}
    <path d="M22 10l-10-5-10 5 10 5 10-5z" />
    <path d="M6 12v5c0 3 4 5 6 5s6-2 6-5v-5" />
  </Icon>
);

export const CertificateIcon: React.FC<IconProps> = (props) => (
  <Icon {...props}>
    {/* Replace with Streamline certificate icon path */}
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <path d="M9 17v-6l3 2 3-2v6" />
  </Icon>
);

// ==================== MATHEMATICS ICONS ====================

export const CalculatorIcon: React.FC<IconProps> = (props) => (
  <Icon {...props}>
    {/* Placeholder - replace with Streamline calculator icon */}
    <rect x="4" y="2" width="16" height="20" rx="2" />
    <rect x="8" y="6" width="8" height="4" rx="1" />
    <circle cx="8" cy="14" r="1" />
    <circle cx="12" cy="14" r="1" />
    <circle cx="16" cy="14" r="1" />
  </Icon>
);

export const MathIcon: React.FC<IconProps> = (props) => (
  <Icon {...props}>
    {/* Current custom math icon */}
    <path d="M3 3h18v18H3z" />
    <path d="M3 9h18M9 3v18" />
    <path d="M7 7l10 10M17 7L7 17" />
  </Icon>
);

// ==================== SCIENCE ICONS ====================

export const ScienceIcon: React.FC<IconProps> = (props) => (
  <Icon {...props}>
    {/* Current custom science icon */}
    <path d="M9 3v12.07A7 7 0 1 1 7 8.8V3h10v5.8a7 7 0 1 1-2 6.27V3" />
    <circle cx="12" cy="17" r="1" />
  </Icon>
);

export const AtomIcon: React.FC<IconProps> = (props) => (
  <Icon {...props}>
    {/* Replace with Streamline atom icon path */}
    <circle cx="12" cy="12" r="1" />
    <path d="M12 3a9 9 0 0 1 0 18 9 9 0 0 1 0-18" />
  </Icon>
);

// ==================== PROGRAMMING ICONS ====================

export const CodeIcon: React.FC<IconProps> = (props) => (
  <Icon {...props}>
    {/* Current custom code icon */}
    <path d="M16 18L22 12L16 6" />
    <path d="M8 6L2 12L8 18" />
  </Icon>
);

export const TerminalIcon: React.FC<IconProps> = (props) => (
  <Icon {...props}>
    {/* Replace with Streamline terminal icon path */}
    <polyline points="4 17 10 11 4 5" />
    <line x1="12" y1="19" x2="20" y2="19" />
  </Icon>
);

// ==================== LANGUAGE ICONS ====================

export const LanguageIcon: React.FC<IconProps> = (props) => (
  <Icon {...props}>
    {/* Current custom language icon */}
    <path d="M5 8h14M5 8a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1M5 8v8a1 1 0 0 0 1 1h4" />
    <path d="m16 14-2 4-2-4M18 11h-4" />
    <path d="M17.5 11.5A2.5 2.5 0 1 1 15 14" />
  </Icon>
);

// ==================== BUSINESS ICONS ====================

export const BriefcaseIcon: React.FC<IconProps> = (props) => (
  <Icon {...props}>
    {/* Current custom business icon */}
    <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
    <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
  </Icon>
);

// ==================== UI ICONS ====================

export const SearchIcon: React.FC<IconProps> = (props) => (
  <Icon strokeWidth={props.strokeWidth || 2} {...props}>
    <circle cx="11" cy="11" r="8" />
    <path d="M21 21l-4.35-4.35" />
  </Icon>
);

export const SearchDuotoneIcon: React.FC<IconProps> = (props) => (
  <svg
    width={props.size || 24}
    height={props.size || 24}
    viewBox="0 0 24 24"
    fill="none"
    className={props.className}
    {...props}
  >
    {/* Background circle - light gray */}
    <circle cx="11" cy="11" r="8" fill="#E5E7EB" stroke="none" />
    {/* Foreground elements - dark gray */}
    <circle
      cx="11"
      cy="11"
      r="8"
      fill="none"
      stroke="#4B5563"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M21 21l-4.35-4.35"
      stroke="#4B5563"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

// ==================== DUOTONE CATEGORY ICONS ====================

export const MathDuotoneIcon: React.FC<IconProps> = (props) => (
  <svg
    width={props.size || 24}
    height={props.size || 24}
    viewBox="0 0 14 14"
    fill="none"
    className={props.className}
    {...props}
  >
    <g>
      <path
        d="M3.63527 12.9031c-0.96212 -0.0703 -1.71669 -0.8453 -1.77217 -1.8084 -0.106 -1.83984 -0.14145 -3.63359 -0.10635 -5.4426H12.2434c0.0351 1.80901 -0.0003 3.60276 -0.1063 5.4426 -0.0555 0.9631 -0.8101 1.7382 -1.7722 1.8084 -2.29063 0.1671 -4.43898 0.1671 -6.72963 0Z"
        fill="#d1fae5"
        strokeWidth="0.7"
      />
      <path
        d="M1.86319 2.90542c-0.05327 0.92458 -0.08872 1.83753 -0.10635 2.74662H12.2435c-0.0176 -0.90909 -0.0531 -1.82204 -0.1063 -2.74662 -0.0555 -0.96308 -0.8101 -1.73815 -1.7722 -1.80837 -2.29064 -0.167161 -4.43899 -0.167162 -6.72964 0 -0.96212 0.07022 -1.71669 0.84529 -1.77217 1.80837Z"
        fill="#ffffff"
        strokeWidth="0.7"
      />
      <path
        stroke="#059669"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M8.31396 3.31177h1.37342"
        strokeWidth="0.7"
      />
      <path
        stroke="#059669"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M4.3042 10.4333h0.28162"
        strokeWidth="0.7"
      />
      <path
        stroke="#059669"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M6.85938 10.4333h0.28161"
        strokeWidth="0.7"
      />
      <path
        stroke="#059669"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9.45312 10.4333h0.28162"
        strokeWidth="0.7"
      />
      <path
        stroke="#059669"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M4.3042 8.18335h0.28162"
        strokeWidth="0.7"
      />
      <path
        stroke="#059669"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M6.85938 8.18335h0.28161"
        strokeWidth="0.7"
      />
      <path
        stroke="#059669"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9.45312 8.18335h0.28162"
        strokeWidth="0.7"
      />
      <path
        stroke="#059669"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M1.8631 11.0946c0.05548 0.9631 0.81005 1.7382 1.77217 1.8084 2.29065 0.1672 4.439 0.1672 6.72963 0 0.9621 -0.0702 1.7167 -0.8453 1.7722 -1.8084 0.1593 -2.76439 0.1593 -5.42476 0 -8.18918 -0.0555 -0.96308 -0.8101 -1.73815 -1.7722 -1.80837 -2.29063 -0.167161 -4.43898 -0.167162 -6.72963 0 -0.96212 0.07022 -1.71669 0.84529 -1.77217 1.80837 -0.15926 2.76442 -0.15926 5.42479 0 8.18918Z"
        strokeWidth="0.7"
      />
      <path
        stroke="#059669"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12.2435 5.65204H1.75684c0.01763 -0.90909 0.05308 -1.82204 0.10635 -2.74662 0.05548 -0.96308 0.81005 -1.73815 1.77217 -1.80837 2.29065 -0.167162 4.439 -0.167161 6.72964 0 0.9621 0.07022 1.7167 0.84529 1.7722 1.80837 0.0532 0.92458 0.0887 1.83753 0.1063 2.74662Z"
        strokeWidth="0.7"
      />
    </g>
  </svg>
);

export const ScienceDuotoneIcon: React.FC<IconProps> = (props) => (
  <svg
    width={props.size || 24}
    height={props.size || 24}
    viewBox="0 0 14 14"
    fill="none"
    className={props.className}
    {...props}
  >
    <g>
      <path
        d="m10.2174 6.19494 2.2118 3.79484c0.4222 0.72442 0.0903 1.65442 -0.6951 1.94792 -3.05288 1.1407 -6.41494 1.1407 -9.46778 0 -0.78541 -0.2935 -1.11729 -1.2235 -0.6951 -1.94792l2.25191 -3.8638c2.34077 0.33681 4.28333 0.35462 6.39427 0.06896Z"
        fill="#dbeafe"
        strokeWidth="0.7"
      />
      <path
        d="M9.43656 4.85575c-0.17817 -0.30572 -0.27205 -0.65323 -0.27205 -1.00708V1.20654H4.83513v2.64213c0 0.35385 -0.09388 0.70137 -0.27206 1.00708l-0.74032 1.27023c2.34076 0.33681 4.28335 0.35462 6.39435 0.06897l-0.78054 -1.3392Z"
        fill="#ffffff"
        strokeWidth="0.7"
      />
      <path
        stroke="#2563eb"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="m10.2174 6.19494 2.2118 3.79484c0.4222 0.72442 0.0903 1.65442 -0.6951 1.94792 -3.05288 1.1407 -6.41494 1.1407 -9.46778 0 -0.78541 -0.2935 -1.11729 -1.2235 -0.6951 -1.94792l2.25191 -3.8638c2.34077 0.33681 4.28333 0.35462 6.39427 0.06896Z"
        strokeWidth="0.7"
      />
      <path
        stroke="#2563eb"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9.43656 4.85575c-0.17817 -0.30572 -0.27205 -0.65323 -0.27205 -1.00708V1.20654H4.83513v2.64213c0 0.35385 -0.09388 0.70137 -0.27206 1.00708l-0.74032 1.27023c2.34076 0.33681 4.28335 0.35462 6.39435 0.06897l-0.78054 -1.3392Z"
        strokeWidth="0.7"
      />
      <path
        stroke="#2563eb"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3.49121 1.20654h7.01759"
        strokeWidth="0.7"
      />
      <path
        stroke="#2563eb"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M10.2176 6.19494c-2.11102 0.28566 -4.05359 0.26785 -6.39436 -0.06896"
        strokeWidth="0.7"
      />
    </g>
  </svg>
);

export const CodeDuotoneIcon: React.FC<IconProps> = (props) => (
  <svg
    width={props.size || 24}
    height={props.size || 24}
    viewBox="0 0 14 14"
    fill="none"
    className={props.className}
    {...props}
  >
    <g>
      <path
        d="M1.114 9.31c0.074 0.444 0.42 0.8 0.865 0.852 1.593 0.19 3.29 0.258 5.021 0.258 1.735 0 3.403 -0.068 5.018 -0.259 0.447 -0.053 0.794 -0.409 0.867 -0.853 0.165 -1.005 0.365 -1.987 0.365 -3.662 0 -1.731 -0.087 -2.746 -0.316 -3.775a0.941 0.941 0 0 0 -0.816 -0.725A44.348 44.348 0 0 0 7 0.872c-1.771 0 -3.506 0.062 -5.13 0.268a0.942 0.942 0 0 0 -0.803 0.72C0.828 2.902 0.75 3.833 0.75 5.646c0 1.737 0.2 2.68 0.364 3.665Z"
        fill="#fed7aa"
        strokeWidth="0.7"
      />
      <path
        d="M5.639 10.42H8.36l0.75 2.708H4.889l0.75 -2.708Z"
        fill="#ffffff"
        strokeWidth="0.7"
      />
      <path
        stroke="#ea580c"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="m4.25 4.396 -1.5 1.5 1.5 1.5"
        strokeWidth="0.7"
      />
      <path
        stroke="#ea580c"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="m9.75 4.396 1.5 1.5 -1.5 1.5"
        strokeWidth="0.7"
      />
      <path
        stroke="#ea580c"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="m6.25 7.896 1.5 -4.5"
        strokeWidth="0.7"
      />
      <path
        stroke="#ea580c"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="m8.471 10.42 0.64 2.708H4.889l0.639 -2.708"
        strokeWidth="0.7"
      />
      <path
        stroke="#ea580c"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3.258 13.128h7.485"
        strokeWidth="0.7"
      />
      <path
        stroke="#ea580c"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M1.114 9.31c0.074 0.444 0.42 0.8 0.865 0.852 1.593 0.19 3.29 0.258 5.021 0.258 1.735 0 3.403 -0.068 5.018 -0.259 0.447 -0.053 0.794 -0.409 0.867 -0.853 0.165 -1.005 0.365 -1.987 0.365 -3.662 0 -1.731 -0.087 -2.746 -0.316 -3.775a0.941 0.941 0 0 0 -0.816 -0.725A44.348 44.348 0 0 0 7 0.872c-1.771 0 -3.506 0.062 -5.13 0.268a0.942 0.942 0 0 0 -0.803 0.72C0.828 2.902 0.75 3.833 0.75 5.646c0 1.737 0.2 2.68 0.364 3.665Z"
        strokeWidth="0.7"
      />
    </g>
  </svg>
);

export const LanguageDuotoneIcon: React.FC<IconProps> = (props) => (
  <svg
    width={props.size || 24}
    height={props.size || 24}
    viewBox="0 0 14 14"
    fill="none"
    className={props.className}
    {...props}
  >
    <g>
      <path
        fillRule="evenodd"
        d="M12.0606 10.2845c-0.6182 0.2408 -1.0917 0.7137 -1.0917 1.4736s0.4735 1.2328 1.0918 1.4736c-0.2186 0.1149 -0.4762 0.1847 -0.7465 0.1948 -2.63933 0.098 -5.24691 0.098 -7.88629 0 -0.95962 -0.0357 -1.4948 -0.7671 -1.4948 -1.6684 0 -0.9012 0.53518 -1.6327 1.4948 -1.6683 2.63938 -0.09804 5.24696 -0.09804 7.88629 0 0.2703 0.01 0.5279 0.0798 0.7464 0.1947Z"
        clipRule="evenodd"
        fill="#ffffff"
        strokeWidth="0.7"
      />
      <path
        fillRule="evenodd"
        d="M1.93502 11.6691c0.03413 -0.8601 0.56519 -1.545 1.49306 -1.5795 2.63938 -0.09802 5.24695 -0.09802 7.88632 0 0.2682 0.01 0.5239 0.0788 0.7413 0.1921 0.2151 -2.54564 0.1435 -5.03816 -0.0848 -7.58142C11.8805 1.693 11.0973 0.870855 10.0962 0.726829c-2.10204 -0.302439 -4.08184 -0.302439 -6.18391 0 -1.00103 0.144025 -1.7843 0.966171 -1.8747 1.973451 -0.26909 2.9983 -0.28229 5.96357 -0.10257 8.96882Z"
        clipRule="evenodd"
        fill="#fce7f3"
        strokeWidth="0.7"
      />
      <path
        stroke="#db2777"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12.0606 10.2845c-0.6182 0.2408 -1.0917 0.7137 -1.0917 1.4736s0.4735 1.2328 1.0918 1.4736c-0.2186 0.1149 -0.4762 0.1847 -0.7465 0.1948 -2.63933 0.098 -5.24691 0.098 -7.88629 0 -0.95962 -0.0357 -1.4948 -0.7671 -1.4948 -1.6684 0 -0.9012 0.53518 -1.6327 1.4948 -1.6683 2.63938 -0.09804 5.24696 -0.09804 7.88629 0 0.2703 0.01 0.5279 0.0798 0.7464 0.1947Z"
        strokeWidth="0.7"
      />
      <path
        stroke="#db2777"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12.0557 10.2817c-0.2174 -0.1133 -0.4731 -0.1821 -0.7413 -0.1921 -2.63937 -0.09802 -5.24694 -0.09802 -7.88632 0 -0.92787 0.0345 -1.45893 0.7194 -1.49306 1.5795 -0.17972 -3.00524 -0.16652 -5.97052 0.10257 -8.96882 0.0904 -1.00728 0.87367 -1.829426 1.8747 -1.973451 2.10207 -0.302439 4.08187 -0.302439 6.18391 0 1.0011 0.144026 1.7843 0.966171 1.8747 1.973451 0.2283 2.54326 0.2999 5.03581 0.0848 7.58142Zm0 0s0 0 0 0Z"
        strokeWidth="0.7"
      />
      <path
        stroke="#db2777"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M8.03071 4.63507h2.26889L7.8889 8.03841h2.5525"
        strokeWidth="0.7"
      />
      <path
        stroke="#db2777"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="m3.58142 5.95171 1.04476 -3.13428c0.05356 -0.16068 0.20393 -0.26906 0.3733 -0.26906v0c0.16937 0 0.31974 0.10838 0.3733 0.26906l1.04476 3.13428M3.95957 4.81726h2.07982"
        strokeWidth="0.7"
      />
    </g>
  </svg>
);

export const BriefcaseDuotoneIcon: React.FC<IconProps> = (props) => (
  <svg
    width={props.size || 24}
    height={props.size || 24}
    viewBox="0 0 14 14"
    fill="none"
    className={props.className}
    {...props}
  >
    <g>
      <path
        d="M7 3.64c-1.475 0 -3.017 0 -4.31 0.231a1.546 1.546 0 0 0 -1.24 1.2c-0.21 0.969 -0.21 1.873 -0.21 3.25 0 1.375 0 2.28 0.21 3.25a1.547 1.547 0 0 0 1.24 1.198C3.984 13 5.526 13 7 13c1.475 0 3.017 0 4.31 -0.23a1.547 1.547 0 0 0 1.24 -1.2c0.21 -0.97 0.21 -1.874 0.21 -3.25s0 -2.28 -0.21 -3.25a1.547 1.547 0 0 0 -1.24 -1.199c-1.293 -0.23 -2.835 -0.23 -4.31 -0.23Z"
        fill="#f3e8ff"
        strokeWidth="0.7"
      />
      <path
        stroke="#9333ea"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M7 3.64c-1.475 0 -3.017 0 -4.31 0.231a1.546 1.546 0 0 0 -1.24 1.2c-0.21 0.969 -0.21 1.873 -0.21 3.25 0 1.375 0 2.28 0.21 3.25a1.547 1.547 0 0 0 1.24 1.198C3.984 13 5.526 13 7 13c1.475 0 3.017 0 4.31 -0.23a1.547 1.547 0 0 0 1.24 -1.2c0.21 -0.97 0.21 -1.874 0.21 -3.25s0 -2.28 -0.21 -3.25a1.547 1.547 0 0 0 -1.24 -1.199c-1.293 -0.23 -2.835 -0.23 -4.31 -0.23Z"
        strokeWidth="0.7"
      />
      <path
        stroke="#9333ea"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M4.6 3.64V3a2 2 0 0 1 2 -2h0.8a2 2 0 0 1 2 2v0.64"
        strokeWidth="0.7"
      />
      <path
        stroke="#9333ea"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M1.247 7 6.37 8.71a2 2 0 0 0 1.267 0L12.76 7"
        strokeWidth="0.7"
      />
    </g>
  </svg>
);

export const ArrowRightIcon: React.FC<IconProps> = (props) => (
  <Icon strokeWidth={props.strokeWidth || 2.5} {...props}>
    <path d="M5 12h14M12 5l7 7-7 7" />
  </Icon>
);

export const ArrowLeftIcon: React.FC<IconProps> = (props) => (
  <Icon strokeWidth={props.strokeWidth || 2.5} {...props}>
    <path d="M19 12H5M12 19l-7-7 7-7" />
  </Icon>
);

export const HomeIcon: React.FC<IconProps> = (props) => (
  <Icon {...props}>
    {/* Replace with Streamline home icon path */}
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    <polyline points="9 22 9 12 15 12 15 22" />
  </Icon>
);

export const UserIcon: React.FC<IconProps> = (props) => (
  <Icon {...props}>
    {/* Replace with Streamline user icon path */}
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </Icon>
);

export const BellIcon: React.FC<IconProps> = (props) => (
  <Icon {...props}>
    {/* Replace with Streamline bell icon path */}
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
  </Icon>
);

export const SettingsIcon: React.FC<IconProps> = (props) => (
  <Icon {...props}>
    {/* Replace with Streamline settings icon path */}
    <circle cx="12" cy="12" r="3" />
    <path d="M12 1v6m0 6v6M5.64 5.64l4.24 4.24m4.24 4.24l4.24 4.24M1 12h6m6 0h6M5.64 18.36l4.24-4.24m4.24-4.24l4.24-4.24" />
  </Icon>
);

// ==================== FINANCIAL ICONS (Like your screenshot) ====================

export const WalletIcon: React.FC<IconProps> = (props) => (
  <Icon {...props}>
    {/* Replace with Streamline wallet icon path */}
    <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
    <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
    <path d="M18 12a2 2 0 0 0 0 4h4v-4Z" />
  </Icon>
);

export const CreditCardIcon: React.FC<IconProps> = (props) => (
  <Icon {...props}>
    {/* Replace with Streamline credit card icon path */}
    <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
    <line x1="1" y1="10" x2="23" y2="10" />
  </Icon>
);

export const PiggyBankIcon: React.FC<IconProps> = (props) => (
  <Icon {...props}>
    {/* Replace with Streamline piggy bank icon path */}
    <path d="M19 5c-1.5 0-2.8 1.4-3 2-3.5-1.5-11-.3-11 5 0 1.8 0 3 2 4.5V20h4v-2h3v2h4v-4c1-.5 1.7-1 2-2h2v-4h-2c0-1-.5-1.5-1-2V5z" />
  </Icon>
);

export const ChartIcon: React.FC<IconProps> = (props) => (
  <Icon {...props}>
    {/* Replace with Streamline chart icon path */}
    <line x1="18" y1="20" x2="18" y2="10" />
    <line x1="12" y1="20" x2="12" y2="4" />
    <line x1="6" y1="20" x2="6" y2="14" />
  </Icon>
);

// ==================== IMAGE ICONS (OPTIMIZED) ====================

export const VisibleIcon: React.FC<IconProps> = (props) => {
  const size = props.size || 24;

  return (
    <div 
      className={props.className}
      style={{ 
        width: size, 
        height: size, 
        position: 'relative', // Required for layout="fill" or fill
        display: 'inline-block',
        filter: 'grayscale(100%)', 
        opacity: 0.6
      }}
    >
      <Image
        src={VisiblePng}
        alt="Visible Icon"
        fill
        sizes={`${size}px`}
        style={{ objectFit: 'contain' }}
        priority={false} // Set to true if this icon is "above the fold"
      />
    </div>
  );
};

export const PenEditIcon: React.FC<IconProps> = (props) => {
  const size = props.size || 24;

  return (
    <div 
      className={props.className}
      style={{ 
        width: size, 
        height: size, 
        position: 'relative',
        display: 'inline-block',
        filter: 'grayscale(100%)',
        opacity: props.opacity || 1
      }}
    >
      <Image
        src={PenEditPng}
        alt="Pen Edit Icon"
        fill
        sizes={`${size}px`}
        style={{ objectFit: 'contain' }}
        priority={false}
      />
    </div>
  );
};


// ==================== EXPORT ALL ====================

export const Icons = {
  // Education
  Book: BookIcon,
  GraduationCap: GraduationCapIcon,
  Certificate: CertificateIcon,

  // Mathematics
  Calculator: CalculatorIcon,
  Math: MathIcon,

  // Science
  Science: ScienceIcon,
  Atom: AtomIcon,

  // Programming
  Code: CodeIcon,
  Terminal: TerminalIcon,

  // Language
  Language: LanguageIcon,

  // Business
  Briefcase: BriefcaseIcon,

  // UI
  Search: SearchIcon,
  ArrowRight: ArrowRightIcon,
  ArrowLeft: ArrowLeftIcon,
  Home: HomeIcon,
  User: UserIcon,
  Bell: BellIcon,
  Settings: SettingsIcon,
  Visible: VisibleIcon,
  PenEdit: PenEditIcon,

  // Financial
  Wallet: WalletIcon,
  CreditCard: CreditCardIcon,
  PiggyBank: PiggyBankIcon,
  Chart: ChartIcon,
};

export default Icons;
