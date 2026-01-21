"use client";

import React, { useRef, useState, useMemo } from "react";
import { useAnnotation, Highlight } from "./AnnotationProvider";

interface HighlightableProps {
  children: React.ReactNode;
  pageId: string;
  className?: string;
}

const HIGHLIGHT_COLORS = [
  { name: "Yellow", value: "#fef08a" },
  { name: "Green", value: "#bbf7d0" },
  { name: "Blue", value: "#bfdbfe" },
  { name: "Pink", value: "#fbcfe8" },
  { name: "Orange", value: "#fed7aa" },
];

// Function to highlight text in a string
const highlightTextInContent = (text: string, highlights: Highlight[]): React.ReactNode => {
  if (!highlights.length) return text;

  let result: React.ReactNode[] = [];
  let lastIndex = 0;
  let textLower = text.toLowerCase();

  // Sort highlights by position in text
  const sortedHighlights = [...highlights].sort((a, b) => {
    const posA = textLower.indexOf(a.text.toLowerCase());
    const posB = textLower.indexOf(b.text.toLowerCase());
    return posA - posB;
  });

  sortedHighlights.forEach((highlight, idx) => {
    const highlightTextLower = highlight.text.toLowerCase();
    const index = textLower.indexOf(highlightTextLower, lastIndex);

    if (index !== -1) {
      // Add text before highlight
      if (index > lastIndex) {
        result.push(text.substring(lastIndex, index));
      }

      // Add highlighted text
      result.push(
        <mark
          key={highlight.id}
          style={{
            backgroundColor: highlight.color,
            padding: "2px 4px",
            borderRadius: "4px",
          }}
        >
          {text.substring(index, index + highlight.text.length)}
        </mark>
      );

      lastIndex = index + highlight.text.length;
    }
  });

  // Add remaining text
  if (lastIndex < text.length) {
    result.push(text.substring(lastIndex));
  }

  return result.length > 0 ? result : text;
};

// Recursive function to process React children and apply highlights
const processChildren = (children: React.ReactNode, highlights: Highlight[]): React.ReactNode => {
  return React.Children.map(children, (child) => {
    if (typeof child === "string") {
      return highlightTextInContent(child, highlights);
    }

    if (React.isValidElement(child)) {
      const childProps = child.props as { children?: React.ReactNode };
      if (childProps.children) {
        return React.cloneElement(child, {
          ...child.props,
          children: processChildren(childProps.children, highlights),
        } as React.Attributes);
      }
    }

    return child;
  });
};

export const Highlightable: React.FC<HighlightableProps> = ({
  children,
  pageId,
  className = "",
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { isLoggedIn, user, addHighlight, removeHighlight, getHighlightsForPage } = useAnnotation();
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [selectedText, setSelectedText] = useState("");
  const [pickerPosition, setPickerPosition] = useState({ x: 0, y: 0 });

  const highlights = getHighlightsForPage(pageId);

  // Process children with highlights
  const highlightedContent = useMemo(() => {
    if (!isLoggedIn || highlights.length === 0) {
      return children;
    }
    return processChildren(children, highlights);
  }, [children, highlights, isLoggedIn]);

  const handleTextSelection = () => {
    if (!isLoggedIn) return;

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      return;
    }

    const text = selection.toString().trim();
    if (!text || text.length < 2) {
      setShowColorPicker(false);
      setSelectedText("");
      return;
    }

    const range = selection.getRangeAt(0);
    const container = containerRef.current;

    if (!container || !container.contains(range.commonAncestorContainer)) {
      return;
    }

    // Get position for color picker
    const rect = range.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();

    setSelectedText(text);
    setPickerPosition({
      x: Math.max(100, rect.left - containerRect.left + rect.width / 2),
      y: Math.max(70, rect.top - containerRect.top),
    });
    setShowColorPicker(true);
  };

  const saveHighlight = (color: string) => {
    if (!selectedText || !user) return;

    addHighlight({
      text: selectedText,
      startOffset: 0,
      endOffset: selectedText.length,
      color,
      pageId,
    });

    // Clear everything
    window.getSelection()?.removeAllRanges();
    setShowColorPicker(false);
    setSelectedText("");
  };

  const closeColorPicker = () => {
    setShowColorPicker(false);
    setSelectedText("");
    window.getSelection()?.removeAllRanges();
  };

  return (
    <div
      ref={containerRef}
      onMouseUp={handleTextSelection}
      onTouchEnd={handleTextSelection}
      className={`relative ${className}`}
    >
      {highlightedContent}

      {/* Saved Highlights List */}
      {isLoggedIn && highlights.length > 0 && (
        <div className="mt-6 border-t border-gray-200 pt-4">
          <p className="text-xs font-medium text-gray-600 mb-3">
            Your highlights ({highlights.length}):
          </p>
          <div className="space-y-2">
            {highlights.map((highlight) => (
              <div
                key={highlight.id}
                className="flex items-start gap-2 p-3 rounded-lg text-sm"
                style={{ backgroundColor: highlight.color }}
              >
                <span className="flex-1 text-gray-800">&ldquo;{highlight.text}&rdquo;</span>
                <button
                  type="button"
                  onClick={() => removeHighlight(highlight.id)}
                  className="text-gray-500 hover:text-red-600 flex-shrink-0 p-1"
                  title="Remove highlight"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Color Picker Popup */}
      {showColorPicker && isLoggedIn && selectedText && (
        <>
          {/* Backdrop to close picker */}
          <div
            className="fixed inset-0 z-[99]"
            onClick={closeColorPicker}
          />

          {/* Color picker */}
          <div
            className="absolute z-[100] bg-white rounded-2xl shadow-2xl border border-gray-200 p-4"
            style={{
              left: pickerPosition.x,
              top: pickerPosition.y - 80,
              transform: "translateX(-50%)",
            }}
          >
            <p className="text-xs text-gray-500 mb-3 text-center font-medium">Select color</p>
            <div className="flex gap-3">
              {HIGHLIGHT_COLORS.map((color) => (
                <button
                  key={color.name}
                  type="button"
                  onClick={() => saveHighlight(color.value)}
                  className="w-10 h-10 rounded-full border-2 border-gray-200 hover:scale-110 hover:border-gray-400 transition-all cursor-pointer shadow-md"
                  style={{ backgroundColor: color.value }}
                  title={color.name}
                />
              ))}
            </div>
          </div>
        </>
      )}

      {/* Login prompt for non-logged-in users */}
      {!isLoggedIn && (
        <div className="mt-4 p-3 bg-purple-50 rounded-lg border border-purple-200">
          <p className="text-xs text-purple-600 text-center">
            Login to highlight and save annotations
          </p>
        </div>
      )}
    </div>
  );
};

export default Highlightable;
