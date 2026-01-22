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

// Function to highlight text at specific positions
const highlightTextAtPositions = (
  text: string,
  highlights: Highlight[],
  currentOffset: { value: number },
): React.ReactNode => {
  if (!highlights.length) {
    const textLength = text.length;
    currentOffset.value += textLength;
    return text;
  }

  const textStart = currentOffset.value;
  const textEnd = textStart + text.length;

  // Find highlights that fall within this text segment
  const relevantHighlights = highlights.filter((h) => {
    const hStart = h.startOffset;
    const hEnd = h.endOffset;
    return hStart < textEnd && hEnd > textStart;
  });

  if (relevantHighlights.length === 0) {
    currentOffset.value += text.length;
    return text;
  }

  // Sort by start position
  const sortedHighlights = [...relevantHighlights].sort(
    (a, b) => a.startOffset - b.startOffset
  );

  const result: React.ReactNode[] = [];
  let lastIndex = 0;

  sortedHighlights.forEach((highlight) => {
    // Calculate positions relative to this text segment
    const highlightStartInText = Math.max(0, highlight.startOffset - textStart);
    const highlightEndInText = Math.min(text.length, highlight.endOffset - textStart);

    if (highlightStartInText >= text.length || highlightEndInText <= 0) {
      return;
    }

    // Add text before highlight
    if (highlightStartInText > lastIndex) {
      result.push(text.substring(lastIndex, highlightStartInText));
    }

    // Add highlighted text
    result.push(
      <mark
        key={highlight.id}
        data-highlight-id={highlight.id}
        style={{
          backgroundColor: highlight.color,
          padding: "2px 4px",
          borderRadius: "4px",
        }}
      >
        {text.substring(highlightStartInText, highlightEndInText)}
      </mark>
    );

    lastIndex = highlightEndInText;
  });

  // Add remaining text
  if (lastIndex < text.length) {
    result.push(text.substring(lastIndex));
  }

  currentOffset.value += text.length;
  return result.length > 0 ? result : text;
};

// Recursive function to process React children and apply highlights
const processChildren = (
  children: React.ReactNode,
  highlights: Highlight[],
  currentOffset: { value: number },
): React.ReactNode => {
  return React.Children.map(children, (child) => {
    // If plain text
    if (typeof child === "string") {
      return highlightTextAtPositions(child, highlights, currentOffset);
    }

    // If React element
    if (React.isValidElement(child)) {
      const element = child as React.ReactElement<any>;

      if (element.props?.children) {
        return React.cloneElement(element, {
          children: processChildren(element.props.children, highlights, currentOffset),
        });
      }

      return element;
    }

    return child;
  });
};

// Helper function to get text content offset
const getTextOffset = (container: Node, targetNode: Node, targetOffset: number): number => {
  let offset = 0;
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, null);

  let node = walker.nextNode();
  while (node) {
    if (node === targetNode) {
      return offset + targetOffset;
    }
    offset += node.textContent?.length || 0;
    node = walker.nextNode();
  }
  return offset;
};


export const Highlightable: React.FC<HighlightableProps> = ({
  children,
  pageId,
  className = "",
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const {
    isLoggedIn,
    user,
    addHighlight,
    removeHighlight,
    getHighlightsForPage,
  } = useAnnotation();

  const [showColorPicker, setShowColorPicker] = useState(false);
  const [selectedText, setSelectedText] = useState("");
  const [pickerPosition, setPickerPosition] = useState({ x: 0, y: 0 });

  const highlights = getHighlightsForPage(pageId);
  const [selectedStartOffset, setSelectedStartOffset] = useState(0);
  const [selectedEndOffset, setSelectedEndOffset] = useState(0);

  const highlightedContent = useMemo(() => {
    if (!isLoggedIn || highlights.length === 0) {
      return children;
    }
    const currentOffset = { value: 0 };
    return processChildren(children, highlights, currentOffset);
  }, [children, highlights, isLoggedIn]);

  const handleTextSelection = () => {
    if (!isLoggedIn) return;

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

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

    // Calculate the start and end offsets within the container's text content
    const startOffset = getTextOffset(container, range.startContainer, range.startOffset);
    const endOffset = getTextOffset(container, range.endContainer, range.endOffset);

    // Check if clicking on an existing highlight (check if selection falls within any highlight)
    const existingHighlight = highlights.find(
      (h) => startOffset >= h.startOffset && endOffset <= h.endOffset
    );

    if (existingHighlight) {
      // Remove the existing highlight
      removeHighlight(existingHighlight.id);
      window.getSelection()?.removeAllRanges();
      setShowColorPicker(false);
      setSelectedText("");
      return;
    }

    const rect = range.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();

    setSelectedText(text);
    setSelectedStartOffset(startOffset);
    setSelectedEndOffset(endOffset);
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
      startOffset: selectedStartOffset,
      endOffset: selectedEndOffset,
      color,
      pageId,
    });

    window.getSelection()?.removeAllRanges();
    setShowColorPicker(false);
    setSelectedText("");
    setSelectedStartOffset(0);
    setSelectedEndOffset(0);
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

      {showColorPicker && isLoggedIn && selectedText && (
        <>
          <div className="fixed inset-0 z-[99]" onClick={closeColorPicker} />

          <div
            className="absolute z-[100] bg-white rounded-2xl shadow-2xl border border-gray-200 p-4"
            style={{
              left: pickerPosition.x,
              top: pickerPosition.y - 80,
              transform: "translateX(-50%)",
            }}
          >
            <p className="text-xs text-gray-500 mb-3 text-center font-medium">
              Select color
            </p>
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
