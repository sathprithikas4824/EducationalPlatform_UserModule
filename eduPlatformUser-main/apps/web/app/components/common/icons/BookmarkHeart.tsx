import React from "react";

interface BookmarkHeartProps {
  filled?: boolean;
  size?: number;
  className?: string;
}

/**
 * Streamline Flex Duo — Bookmark Heart icon.
 * Two-tone style: lighter bookmark ribbon layer + heart layer.
 * filled=true → gradient bookmark + white heart (saved state)
 * filled=false → translucent bookmark outline + faint heart (default/hover)
 */
export const BookmarkHeart: React.FC<BookmarkHeartProps> = ({
  filled = false,
  size = 20,
  className = "",
}) => {
  const uid = `bm_${size}_${filled ? "f" : "u"}`;

  if (filled) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        className={className}
        aria-label="Bookmarked"
      >
        <defs>
          <linearGradient id={`${uid}_g`} x1="5" y1="2" x2="19" y2="22" gradientUnits="userSpaceOnUse">
            <stop stopColor="#7a12fa" />
            <stop offset="1" stopColor="#b614ef" />
          </linearGradient>
        </defs>
        {/* Duo background layer — lighter fill */}
        <path
          d="M6.5 2C5.67 2 5 2.67 5 3.5V21l7-3.5 7 3.5V3.5C19 2.67 18.33 2 17.5 2H6.5z"
          fill="rgba(122,18,250,0.18)"
        />
        {/* Foreground bookmark — gradient fill */}
        <path
          d="M6.5 2C5.67 2 5 2.67 5 3.5V21l7-3.5 7 3.5V3.5C19 2.67 18.33 2 17.5 2H6.5z"
          fill={`url(#${uid}_g)`}
        />
        {/* Heart — white */}
        <path
          d="M12 15C12 15 7.5 12 7.5 9C7.5 7.07 8.84 5.5 10.5 5.5C11.2 5.5 11.66 5.75 12 6.2C12.34 5.75 12.8 5.5 13.5 5.5C15.16 5.5 16.5 7.07 16.5 9C16.5 12 12 15 12 15Z"
          fill="white"
        />
      </svg>
    );
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-label="Bookmark"
    >
      {/* Duo background layer — very light fill */}
      <path
        d="M6.5 2C5.67 2 5 2.67 5 3.5V21l7-3.5 7 3.5V3.5C19 2.67 18.33 2 17.5 2H6.5z"
        fill="rgba(122,18,250,0.07)"
        stroke="rgba(122,18,250,0.45)"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      {/* Heart — faint purple */}
      <path
        d="M12 15C12 15 7.5 12 7.5 9C7.5 7.07 8.84 5.5 10.5 5.5C11.2 5.5 11.66 5.75 12 6.2C12.34 5.75 12.8 5.5 13.5 5.5C15.16 5.5 16.5 7.07 16.5 9C16.5 12 12 15 12 15Z"
        fill="rgba(122,18,250,0.25)"
        stroke="rgba(122,18,250,0.5)"
        strokeWidth="1"
        strokeLinejoin="round"
      />
    </svg>
  );
};

export default BookmarkHeart;
