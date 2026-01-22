"use client";

import React, { useRef, useState, useEffect, useCallback } from "react";
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

// Context length to store for matching
const CONTEXT_LENGTH = 30;

// Get text content from a container
const getTextContent = (container: Node): string => {
  let text = "";
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, null);
  let node = walker.nextNode();
  while (node) {
    text += node.textContent || "";
    node = walker.nextNode();
  }
  return text;
};

// Get the offset of a node within a container's text content
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

// Find and wrap text with highlight mark
const applyHighlightToDOM = (
  container: HTMLElement,
  highlight: Highlight
): void => {
  const fullText = getTextContent(container);

  // Try to find the exact position using context
  let targetIndex = -1;

  if (highlight.prefixContext && highlight.suffixContext) {
    // Search for text with matching context
    const searchPattern = highlight.prefixContext + highlight.text + highlight.suffixContext;
    const patternIndex = fullText.indexOf(searchPattern);
    if (patternIndex !== -1) {
      targetIndex = patternIndex + highlight.prefixContext.length;
    }
  }

  // If context search failed, try with just prefix
  if (targetIndex === -1 && highlight.prefixContext) {
    const searchPattern = highlight.prefixContext + highlight.text;
    const patternIndex = fullText.indexOf(searchPattern);
    if (patternIndex !== -1) {
      targetIndex = patternIndex + highlight.prefixContext.length;
    }
  }

  // If still not found, try with just suffix
  if (targetIndex === -1 && highlight.suffixContext) {
    const searchPattern = highlight.text + highlight.suffixContext;
    const patternIndex = fullText.indexOf(searchPattern);
    if (patternIndex !== -1) {
      targetIndex = patternIndex;
    }
  }

  // Last resort: use stored offset, but verify text matches
  if (targetIndex === -1) {
    const textAtOffset = fullText.substring(highlight.startOffset, highlight.endOffset);
    if (textAtOffset === highlight.text) {
      targetIndex = highlight.startOffset;
    }
  }

  // Final fallback: find first occurrence
  if (targetIndex === -1) {
    targetIndex = fullText.indexOf(highlight.text);
  }

  if (targetIndex === -1) return;

  // Now find the actual DOM nodes and create range
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, null);
  let currentOffset = 0;
  let startNode: Text | null = null;
  let startNodeOffset = 0;
  let endNode: Text | null = null;
  let endNodeOffset = 0;

  const targetEndIndex = targetIndex + highlight.text.length;

  let node = walker.nextNode() as Text | null;
  while (node) {
    const nodeLength = node.textContent?.length || 0;
    const nodeEnd = currentOffset + nodeLength;

    // Find start node
    if (!startNode && targetIndex >= currentOffset && targetIndex < nodeEnd) {
      startNode = node;
      startNodeOffset = targetIndex - currentOffset;
    }

    // Find end node
    if (!endNode && targetEndIndex > currentOffset && targetEndIndex <= nodeEnd) {
      endNode = node;
      endNodeOffset = targetEndIndex - currentOffset;
    }

    if (startNode && endNode) break;

    currentOffset = nodeEnd;
    node = walker.nextNode() as Text | null;
  }

  if (!startNode || !endNode) return;

  // Check if already highlighted
  const existingMark = startNode.parentElement?.closest(`[data-highlight-id="${highlight.id}"]`);
  if (existingMark) return;

  try {
    const range = document.createRange();
    range.setStart(startNode, startNodeOffset);
    range.setEnd(endNode, endNodeOffset);

    // Verify the range contains the correct text
    const rangeText = range.toString();
    if (rangeText !== highlight.text) {
      return;
    }

    const mark = document.createElement("mark");
    mark.setAttribute("data-highlight-id", highlight.id);
    mark.style.backgroundColor = highlight.color;
    mark.style.borderRadius = "2px";
    mark.style.cursor = "pointer";
    mark.style.padding = "0";
    mark.style.margin = "0";
    mark.style.display = "inline";
    mark.style.boxDecorationBreak = "clone";
    (mark.style as CSSStyleDeclaration & { webkitBoxDecorationBreak: string }).webkitBoxDecorationBreak = "clone";

    range.surroundContents(mark);
  } catch (e) {
    // surroundContents can fail if range crosses element boundaries
    // In that case, we skip this highlight
    console.warn("Could not apply highlight:", e);
  }
};

// Remove highlight from DOM
const removeHighlightFromDOM = (container: HTMLElement, highlightId: string): void => {
  const mark = container.querySelector(`[data-highlight-id="${highlightId}"]`);
  if (mark) {
    const parent = mark.parentNode;
    while (mark.firstChild) {
      parent?.insertBefore(mark.firstChild, mark);
    }
    mark.remove();
    // Normalize to merge adjacent text nodes
    parent?.normalize();
  }
};

export const Highlightable: React.FC<HighlightableProps> = ({
  children,
  pageId,
  className = "",
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
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
  const [selectionInfo, setSelectionInfo] = useState<{
    startOffset: number;
    endOffset: number;
    prefixContext: string;
    suffixContext: string;
  } | null>(null);

  const highlights = getHighlightsForPage(pageId);
  const appliedHighlightsRef = useRef<Set<string>>(new Set());

  // Apply highlights to the DOM after render
  useEffect(() => {
    if (!isLoggedIn || !contentRef.current) return;

    const container = contentRef.current;

    // Remove highlights that are no longer in the list
    const currentHighlightIds = new Set(highlights.map(h => h.id));
    appliedHighlightsRef.current.forEach(id => {
      if (!currentHighlightIds.has(id)) {
        removeHighlightFromDOM(container, id);
        appliedHighlightsRef.current.delete(id);
      }
    });

    // Apply new highlights
    highlights.forEach(highlight => {
      if (!appliedHighlightsRef.current.has(highlight.id)) {
        applyHighlightToDOM(container, highlight);
        appliedHighlightsRef.current.add(highlight.id);
      }
    });
  }, [highlights, isLoggedIn]);

  // Re-apply highlights when children change
  useEffect(() => {
    if (!isLoggedIn || !contentRef.current) return;

    // Clear tracking and re-apply all
    appliedHighlightsRef.current.clear();

    const container = contentRef.current;
    highlights.forEach(highlight => {
      applyHighlightToDOM(container, highlight);
      appliedHighlightsRef.current.add(highlight.id);
    });
  }, [children, isLoggedIn]);

  const handleTextSelection = useCallback(() => {
    if (!isLoggedIn) return;

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const text = selection.toString().trim();
    if (!text || text.length < 2) {
      setShowColorPicker(false);
      setSelectedText("");
      setSelectionInfo(null);
      return;
    }

    const range = selection.getRangeAt(0);
    const container = contentRef.current;

    if (!container || !container.contains(range.commonAncestorContainer)) {
      return;
    }

    // Calculate offsets and get context
    const fullText = getTextContent(container);
    const startOffset = getTextOffset(container, range.startContainer, range.startOffset);
    const endOffset = getTextOffset(container, range.endContainer, range.endOffset);

    // Get surrounding context for accurate matching later
    const prefixStart = Math.max(0, startOffset - CONTEXT_LENGTH);
    const suffixEnd = Math.min(fullText.length, endOffset + CONTEXT_LENGTH);
    const prefixContext = fullText.substring(prefixStart, startOffset);
    const suffixContext = fullText.substring(endOffset, suffixEnd);

    // Check if clicking on an existing highlight
    const clickedMark = (range.startContainer.parentElement?.closest('[data-highlight-id]') ||
                        range.endContainer.parentElement?.closest('[data-highlight-id]')) as HTMLElement | null;

    if (clickedMark) {
      const highlightId = clickedMark.getAttribute('data-highlight-id');
      if (highlightId) {
        removeHighlight(highlightId);
        removeHighlightFromDOM(container, highlightId);
        appliedHighlightsRef.current.delete(highlightId);
        window.getSelection()?.removeAllRanges();
        setShowColorPicker(false);
        setSelectedText("");
        setSelectionInfo(null);
        return;
      }
    }

    const rect = range.getBoundingClientRect();
    const containerRect = containerRef.current?.getBoundingClientRect();

    if (!containerRect) return;

    setSelectedText(text);
    setSelectionInfo({
      startOffset,
      endOffset,
      prefixContext,
      suffixContext,
    });
    setPickerPosition({
      x: Math.max(100, rect.left - containerRect.left + rect.width / 2),
      y: Math.max(70, rect.top - containerRect.top),
    });
    setShowColorPicker(true);
  }, [isLoggedIn, removeHighlight]);

  const saveHighlight = useCallback((color: string) => {
    if (!selectedText || !user || !selectionInfo) return;

    addHighlight({
      text: selectedText,
      startOffset: selectionInfo.startOffset,
      endOffset: selectionInfo.endOffset,
      color,
      pageId,
      prefixContext: selectionInfo.prefixContext,
      suffixContext: selectionInfo.suffixContext,
    });

    window.getSelection()?.removeAllRanges();
    setShowColorPicker(false);
    setSelectedText("");
    setSelectionInfo(null);
  }, [selectedText, user, selectionInfo, addHighlight, pageId]);

  const closeColorPicker = useCallback(() => {
    setShowColorPicker(false);
    setSelectedText("");
    setSelectionInfo(null);
    window.getSelection()?.removeAllRanges();
  }, []);

  return (
    <div
      ref={containerRef}
      className={`relative ${className}`}
    >
      <div
        ref={contentRef}
        onMouseUp={handleTextSelection}
        onTouchEnd={handleTextSelection}
      >
        {children}
      </div>

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
