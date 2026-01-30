"use client";

import React, { useRef, useState, useEffect, useCallback } from "react";
import { useAnnotation, Highlight } from "./AnnotationProvider";

interface HighlightableProps {
  children: React.ReactNode;
  pageId: string;
  className?: string;
}

// Detect if touch device
const isTouchDevice = (): boolean => {
  if (typeof window === "undefined") return false;
  return "ontouchstart" in window || navigator.maxTouchPoints > 0;
};

// Detect if mobile viewport
const isMobileViewport = (): boolean => {
  if (typeof window === "undefined") return false;
  return window.innerWidth < 640;
};

// Detect iOS (iPhone, iPad, iPod)
const isIOS = (): boolean => {
  if (typeof window === "undefined" || typeof navigator === "undefined") return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
};

// Get character offset at a specific point using document.caretPositionFromPoint or caretRangeFromPoint
const getCharacterOffsetAtPoint = (container: HTMLElement, x: number, y: number): number | null => {
  try {
    let range: Range | null = null;

    // Try caretRangeFromPoint (WebKit/Blink - works on iOS Safari)
    if (document.caretRangeFromPoint) {
      range = document.caretRangeFromPoint(x, y);
    }
    // Fallback to caretPositionFromPoint (Firefox)
    else if ((document as Document & { caretPositionFromPoint?: (x: number, y: number) => { offsetNode: Node; offset: number } | null }).caretPositionFromPoint) {
      const pos = (document as Document & { caretPositionFromPoint: (x: number, y: number) => { offsetNode: Node; offset: number } | null }).caretPositionFromPoint(x, y);
      if (pos) {
        range = document.createRange();
        range.setStart(pos.offsetNode, pos.offset);
        range.setEnd(pos.offsetNode, pos.offset);
      }
    }

    if (!range) return null;

    // Check if the range is within our container
    if (!container.contains(range.startContainer)) return null;

    // Calculate the offset within the container's full text
    return getTextOffset(container, range.startContainer, range.startOffset);
  } catch (e) {
    return null;
  }
};


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

// Get text node boundaries within the container
// Returns array of { startOffset, endOffset, node } for each text node
const getTextNodeBoundaries = (container: Node): Array<{ startOffset: number; endOffset: number; node: Text }> => {
  const boundaries: Array<{ startOffset: number; endOffset: number; node: Text }> = [];
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, null);
  let currentOffset = 0;

  let node = walker.nextNode() as Text | null;
  while (node) {
    const nodeLength = node.textContent?.length || 0;
    boundaries.push({
      startOffset: currentOffset,
      endOffset: currentOffset + nodeLength,
      node
    });
    currentOffset += nodeLength;
    node = walker.nextNode() as Text | null;
  }

  return boundaries;
};

// Find the text node boundary that contains the given offset
const findTextNodeBoundaryAtOffset = (
  boundaries: Array<{ startOffset: number; endOffset: number; node: Text }>,
  offset: number
): { startOffset: number; endOffset: number; node: Text } | null => {
  for (const boundary of boundaries) {
    if (offset >= boundary.startOffset && offset < boundary.endOffset) {
      return boundary;
    }
  }
  // If offset is at the very end, return the last boundary
  if (boundaries.length > 0 && offset === boundaries[boundaries.length - 1].endOffset) {
    return boundaries[boundaries.length - 1];
  }
  return null;
};

// Create a styled mark element for highlighting
const createMarkElement = (highlightId: string, color: string): HTMLElement => {
  const mark = document.createElement("mark");
  mark.setAttribute("data-highlight-id", highlightId);
  mark.style.backgroundColor = color;
  mark.style.borderRadius = "2px";
  mark.style.cursor = "pointer";
  mark.style.padding = "0";
  mark.style.margin = "0";
  mark.style.display = "inline";
  mark.style.boxDecorationBreak = "clone";
  (mark.style as CSSStyleDeclaration & { webkitBoxDecorationBreak: string }).webkitBoxDecorationBreak = "clone";
  return mark;
};

// Create a temporary highlight mark (used to show selection before user picks color)
const createTempMarkElement = (): HTMLElement => {
  const mark = document.createElement("mark");
  mark.setAttribute("data-temp-highlight", "true");
  mark.style.backgroundColor = "rgba(147, 51, 234, 0.3)"; // Purple selection color
  mark.style.borderRadius = "2px";
  mark.style.padding = "0";
  mark.style.margin = "0";
  mark.style.display = "inline";
  mark.style.boxDecorationBreak = "clone";
  (mark.style as CSSStyleDeclaration & { webkitBoxDecorationBreak: string }).webkitBoxDecorationBreak = "clone";
  return mark;
};

// Apply temporary highlight to show what user selected (before they pick a color)
const applyTempHighlight = (container: HTMLElement, startOffset: number, endOffset: number): void => {
  const fullText = getTextContent(container);

  // Collect all text nodes that need to be highlighted
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, null);
  let currentOffset = 0;

  interface TextNodeInfo {
    node: Text;
    startOffset: number;
    endOffset: number;
  }
  const nodesToHighlight: TextNodeInfo[] = [];

  let node = walker.nextNode() as Text | null;
  while (node) {
    const nodeLength = node.textContent?.length || 0;
    const nodeEnd = currentOffset + nodeLength;

    // Check if this node overlaps with our target range
    if (nodeEnd > startOffset && currentOffset < endOffset) {
      const startInNode = Math.max(0, startOffset - currentOffset);
      const endInNode = Math.min(nodeLength, endOffset - currentOffset);

      nodesToHighlight.push({
        node,
        startOffset: startInNode,
        endOffset: endInNode,
      });
    }

    // Stop if we've passed the target end
    if (currentOffset >= endOffset) break;

    currentOffset = nodeEnd;
    node = walker.nextNode() as Text | null;
  }

  if (nodesToHighlight.length === 0) return;

  // Apply highlights to each text node (process in reverse to avoid offset issues)
  for (let i = nodesToHighlight.length - 1; i >= 0; i--) {
    const info = nodesToHighlight[i];
    const textNode = info.node;
    const text = textNode.textContent || "";

    try {
      const before = text.substring(0, info.startOffset);
      const highlighted = text.substring(info.startOffset, info.endOffset);
      const after = text.substring(info.endOffset);

      const mark = createTempMarkElement();
      mark.textContent = highlighted;

      const parent = textNode.parentNode;
      if (!parent) continue;

      if (after) {
        const afterNode = document.createTextNode(after);
        parent.insertBefore(afterNode, textNode.nextSibling);
      }

      parent.insertBefore(mark, textNode.nextSibling);

      if (before) {
        textNode.textContent = before;
      } else {
        parent.removeChild(textNode);
      }
    } catch (e) {
      console.warn("Could not apply temp highlight to node:", e);
    }
  }
};

// Remove all temporary highlights
const removeTempHighlights = (container: HTMLElement): void => {
  const marks = container.querySelectorAll('[data-temp-highlight="true"]');
  const parentsToNormalize = new Set<Node>();

  marks.forEach(mark => {
    const parent = mark.parentNode;
    if (parent) {
      parentsToNormalize.add(parent);
      while (mark.firstChild) {
        parent.insertBefore(mark.firstChild, mark);
      }
      mark.remove();
    }
  });

  // Normalize all affected parents to merge adjacent text nodes
  parentsToNormalize.forEach(parent => {
    parent.normalize();
  });
};

// Find and wrap text with highlight mark - handles cross-element selections
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

  // Collect all text nodes that need to be highlighted
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, null);
  let currentOffset = 0;
  const targetEndIndex = targetIndex + highlight.text.length;

  interface TextNodeInfo {
    node: Text;
    startOffset: number;
    endOffset: number;
  }
  const nodesToHighlight: TextNodeInfo[] = [];

  let node = walker.nextNode() as Text | null;
  while (node) {
    const nodeLength = node.textContent?.length || 0;
    const nodeEnd = currentOffset + nodeLength;

    // Check if this node overlaps with our target range
    if (nodeEnd > targetIndex && currentOffset < targetEndIndex) {
      const startInNode = Math.max(0, targetIndex - currentOffset);
      const endInNode = Math.min(nodeLength, targetEndIndex - currentOffset);

      nodesToHighlight.push({
        node,
        startOffset: startInNode,
        endOffset: endInNode,
      });
    }

    // Stop if we've passed the target end
    if (currentOffset >= targetEndIndex) break;

    currentOffset = nodeEnd;
    node = walker.nextNode() as Text | null;
  }

  if (nodesToHighlight.length === 0) return;

  // Check if already highlighted
  const existingMark = nodesToHighlight[0].node.parentElement?.closest(`[data-highlight-id="${highlight.id}"]`);
  if (existingMark) return;

  // Verify the collected text matches
  const collectedText = nodesToHighlight
    .map(info => info.node.textContent?.substring(info.startOffset, info.endOffset) || "")
    .join("");
  if (collectedText !== highlight.text) {
    return;
  }

  // Apply highlights to each text node (process in reverse to avoid offset issues)
  for (let i = nodesToHighlight.length - 1; i >= 0; i--) {
    const info = nodesToHighlight[i];
    const textNode = info.node;
    const text = textNode.textContent || "";

    try {
      // Split the text node and wrap the highlighted portion
      const before = text.substring(0, info.startOffset);
      const highlighted = text.substring(info.startOffset, info.endOffset);
      const after = text.substring(info.endOffset);

      const mark = createMarkElement(highlight.id, highlight.color);
      mark.textContent = highlighted;

      const parent = textNode.parentNode;
      if (!parent) continue;

      // Replace the text node with before + mark + after
      if (after) {
        const afterNode = document.createTextNode(after);
        parent.insertBefore(afterNode, textNode.nextSibling);
      }

      parent.insertBefore(mark, textNode.nextSibling);

      if (before) {
        textNode.textContent = before;
      } else {
        parent.removeChild(textNode);
      }
    } catch (e) {
      console.warn("Could not apply highlight to node:", e);
    }
  }
};

// Remove highlight from DOM - handles multiple marks with same ID (cross-element highlights)
// Instant removal for smooth user experience
const removeHighlightFromDOM = (container: HTMLElement, highlightId: string): void => {
  const marks = container.querySelectorAll(`[data-highlight-id="${highlightId}"]`);
  const parentsToNormalize = new Set<Node>();

  marks.forEach(mark => {
    const parent = mark.parentNode;
    if (parent) {
      parentsToNormalize.add(parent);
      while (mark.firstChild) {
        parent.insertBefore(mark.firstChild, mark);
      }
      mark.remove();
    }
  });

  // Normalize all affected parents to merge adjacent text nodes
  parentsToNormalize.forEach(parent => {
    parent.normalize();
  });
};

// Find word boundaries at a given character offset in text
// Used to determine which word was tapped for partial unhighlight
const getWordBoundariesAtOffset = (text: string, offset: number): { start: number; end: number } => {
  const clampedOffset = Math.max(0, Math.min(offset, text.length - 1));

  // Find word start - go backwards until we hit whitespace
  let start = clampedOffset;
  while (start > 0 && /\S/.test(text[start - 1])) {
    start--;
  }

  // Find word end - go forwards until we hit whitespace
  let end = clampedOffset;
  while (end < text.length && /\S/.test(text[end])) {
    end++;
  }

  // If tapped on whitespace, use single character
  if (start === end) {
    return { start: clampedOffset, end: Math.min(text.length, clampedOffset + 1) };
  }

  return { start, end };
};

// Find the actual position of a highlight in the container's full text
// Uses the same context-based matching logic as applyHighlightToDOM
const findHighlightPosition = (fullText: string, highlight: Highlight): { start: number; end: number } | null => {
  let targetIndex = -1;

  if (highlight.prefixContext && highlight.suffixContext) {
    const searchPattern = highlight.prefixContext + highlight.text + highlight.suffixContext;
    const patternIndex = fullText.indexOf(searchPattern);
    if (patternIndex !== -1) {
      targetIndex = patternIndex + highlight.prefixContext.length;
    }
  }

  if (targetIndex === -1 && highlight.prefixContext) {
    const searchPattern = highlight.prefixContext + highlight.text;
    const patternIndex = fullText.indexOf(searchPattern);
    if (patternIndex !== -1) {
      targetIndex = patternIndex + highlight.prefixContext.length;
    }
  }

  if (targetIndex === -1 && highlight.suffixContext) {
    const searchPattern = highlight.text + highlight.suffixContext;
    const patternIndex = fullText.indexOf(searchPattern);
    if (patternIndex !== -1) {
      targetIndex = patternIndex;
    }
  }

  if (targetIndex === -1) {
    const textAtOffset = fullText.substring(highlight.startOffset, highlight.endOffset);
    if (textAtOffset === highlight.text) {
      targetIndex = highlight.startOffset;
    }
  }

  if (targetIndex === -1) {
    targetIndex = fullText.indexOf(highlight.text);
  }

  if (targetIndex === -1) return null;

  return { start: targetIndex, end: targetIndex + highlight.text.length };
};

// Compute sub-highlights after partial unhighlight
// Given a highlight and a range to unhighlight, returns highlight definitions
// for the portions that should remain highlighted
const computeSubHighlights = (
  fullText: string,
  highlight: Highlight,
  unhighlightStart: number,
  unhighlightEnd: number,
): Array<{
  text: string;
  startOffset: number;
  endOffset: number;
  color: string;
  pageId: string;
  prefixContext: string;
  suffixContext: string;
}> => {
  const pos = findHighlightPosition(fullText, highlight);
  if (!pos) return [];

  const highlightStart = pos.start;
  const highlightEnd = pos.end;

  // Clamp unhighlight range to the highlight's range
  const clampedStart = Math.max(unhighlightStart, highlightStart);
  const clampedEnd = Math.min(unhighlightEnd, highlightEnd);

  // No overlap
  if (clampedStart >= clampedEnd) return [];

  // Unhighlight covers the entire highlight - no sub-highlights needed
  if (clampedStart <= highlightStart && clampedEnd >= highlightEnd) return [];

  const result: Array<{
    text: string;
    startOffset: number;
    endOffset: number;
    color: string;
    pageId: string;
    prefixContext: string;
    suffixContext: string;
  }> = [];

  // Before portion: from highlight start to unhighlight start
  if (clampedStart > highlightStart) {
    const beforeText = fullText.substring(highlightStart, clampedStart);
    if (beforeText.trim().length > 0) {
      const prefixStart = Math.max(0, highlightStart - CONTEXT_LENGTH);
      const suffixEnd = Math.min(fullText.length, clampedStart + CONTEXT_LENGTH);
      result.push({
        text: beforeText,
        startOffset: highlightStart,
        endOffset: clampedStart,
        color: highlight.color,
        pageId: highlight.pageId,
        prefixContext: fullText.substring(prefixStart, highlightStart),
        suffixContext: fullText.substring(clampedStart, suffixEnd),
      });
    }
  }

  // After portion: from unhighlight end to highlight end
  if (clampedEnd < highlightEnd) {
    const afterText = fullText.substring(clampedEnd, highlightEnd);
    if (afterText.trim().length > 0) {
      const prefixStart = Math.max(0, clampedEnd - CONTEXT_LENGTH);
      const suffixEnd = Math.min(fullText.length, highlightEnd + CONTEXT_LENGTH);
      result.push({
        text: afterText,
        startOffset: clampedEnd,
        endOffset: highlightEnd,
        color: highlight.color,
        pageId: highlight.pageId,
        prefixContext: fullText.substring(prefixStart, clampedEnd),
        suffixContext: fullText.substring(highlightEnd, suffixEnd),
      });
    }
  }

  return result;
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
    highlightModeEnabled,
  } = useAnnotation();

  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showMobileHighlightButton, setShowMobileHighlightButton] = useState(false);
  const [selectedText, setSelectedText] = useState("");
  const [pickerPosition, setPickerPosition] = useState({ x: 0, y: 0, showBelow: false });
  const [selectionInfo, setSelectionInfo] = useState<{
    startOffset: number;
    endOffset: number;
    prefixContext: string;
    suffixContext: string;
  } | null>(null);
  const [isMobileDevice, setIsMobileDevice] = useState(false);

  const highlights = getHighlightsForPage(pageId);
  const appliedHighlightsRef = useRef<Set<string>>(new Set());
  const touchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const touchStartPosRef = useRef<{ x: number; y: number } | null>(null);
  const selectionStableTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSelectionTextRef = useRef<string>("");
  const isSelectingRef = useRef<boolean>(false);
  const lastSelectionLengthRef = useRef<number>(0);
  const isHandleDraggingRef = useRef<boolean>(false);

  // iOS detection state
  const [isIOSDevice, setIsIOSDevice] = useState(false);

  // iOS touch tracking (uses native selection with handles)
  const iosTouchStartPosRef = useRef<{ x: number; y: number } | null>(null);

  // Scroll detection ref - to distinguish scrolling from selection
  const isScrollingRef = useRef<boolean>(false);
  const scrollStartYRef = useRef<number | null>(null);

  // Store pending selection for restoration after app resume (Android)
  const pendingSelectionRef = useRef<{
    startOffset: number;
    endOffset: number;
    text: string;
  } | null>(null);

  // Track when we just dehighlighted to prevent highlight button from showing
  const justDehighlightedRef = useRef<boolean>(false);

  // Track if button has been positioned for current selection session
  // This prevents the button from jumping when user adjusts selection
  const buttonPositionedRef = useRef<boolean>(false);

  // Detect mobile on client side to avoid hydration mismatch
  useEffect(() => {
    setIsMobileDevice(isTouchDevice());
    setIsIOSDevice(isIOS());
  }, []);

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

  // Process selection - handles both mobile and desktop
  // On mobile: applies temp highlight and clears native selection when showing highlight button
  // On desktop: applies temp highlight immediately and shows color picker
  const processSelection = useCallback(() => {
    if (!isLoggedIn || !highlightModeEnabled) return;

    // Skip if we just dehighlighted (prevents highlight button from appearing after dehighlight)
    if (justDehighlightedRef.current) {
      justDehighlightedRef.current = false;
      return;
    }

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    const container = contentRef.current;

    if (!container || !container.contains(range.commonAncestorContainer)) {
      return;
    }

    // Check if clicking on an existing highlight FIRST (before selection length check)
    // This allows tapping on highlights to remove them with animation on mobile
    const clickedMark = (range.startContainer.parentElement?.closest('[data-highlight-id]') ||
                        range.endContainer.parentElement?.closest('[data-highlight-id]')) as HTMLElement | null;

    if (clickedMark) {
      const highlightId = clickedMark.getAttribute('data-highlight-id');
      if (highlightId) {
        window.getSelection()?.removeAllRanges();
        // Remove any temp highlights that might be showing
        removeTempHighlights(container);
        setShowColorPicker(false);
        setShowMobileHighlightButton(false);
        setSelectedText("");
        setSelectionInfo(null);
        pendingSelectionRef.current = null;
        justDehighlightedRef.current = true;
        buttonPositionedRef.current = false;

        // Partial unhighlight: only remove the tapped word, keep the rest highlighted
        const highlight = highlights.find(h => h.id === highlightId);
        if (highlight) {
          const fullText = getTextContent(container);
          const clickOffset = getTextOffset(container, range.startContainer, range.startOffset);
          const wordBounds = getWordBoundariesAtOffset(fullText, clickOffset);
          const subHighlights = computeSubHighlights(fullText, highlight, wordBounds.start, wordBounds.end);

          removeHighlightFromDOM(container, highlightId);
          removeHighlight(highlightId);
          appliedHighlightsRef.current.delete(highlightId);

          // Re-highlight remaining portions
          subHighlights.forEach(sub => addHighlight(sub));
        } else {
          // Fallback: remove entire highlight if object not found
          removeHighlightFromDOM(container, highlightId);
          removeHighlight(highlightId);
          appliedHighlightsRef.current.delete(highlightId);
        }
        return;
      }
    }

    // Now check if there's enough selection for new highlight
    const selectionText = selection.toString().trim();
    if (!selectionText || selectionText.length < 2) {
      setShowColorPicker(false);
      setSelectedText("");
      setSelectionInfo(null);
      buttonPositionedRef.current = false;
      return;
    }

    // MOBILE ONLY: Check if the selected text overlaps with an existing highlight
    // If so, automatically dehighlight it (user-friendly toggle behavior)
    if (isTouchDevice()) {
      const fullText = getTextContent(container);
      const selStartOffset = getTextOffset(container, range.startContainer, range.startOffset);
      const selEndOffset = getTextOffset(container, range.endContainer, range.endOffset);

      // Find any existing highlight that significantly overlaps with the selection
      for (const highlight of highlights) {
        // Find the highlight's actual position in the text
        let highlightStart = -1;
        let highlightEnd = -1;

        // Try to find exact position using context (same logic as applyHighlightToDOM)
        if (highlight.prefixContext && highlight.suffixContext) {
          const searchPattern = highlight.prefixContext + highlight.text + highlight.suffixContext;
          const patternIndex = fullText.indexOf(searchPattern);
          if (patternIndex !== -1) {
            highlightStart = patternIndex + highlight.prefixContext.length;
            highlightEnd = highlightStart + highlight.text.length;
          }
        }

        if (highlightStart === -1 && highlight.prefixContext) {
          const searchPattern = highlight.prefixContext + highlight.text;
          const patternIndex = fullText.indexOf(searchPattern);
          if (patternIndex !== -1) {
            highlightStart = patternIndex + highlight.prefixContext.length;
            highlightEnd = highlightStart + highlight.text.length;
          }
        }

        if (highlightStart === -1) {
          // Fallback to stored offsets
          highlightStart = highlight.startOffset;
          highlightEnd = highlight.endOffset;
        }

        // Check for significant overlap
        const overlapStart = Math.max(selStartOffset, highlightStart);
        const overlapEnd = Math.min(selEndOffset, highlightEnd);
        const overlapLength = Math.max(0, overlapEnd - overlapStart);

        const selectionLength = selEndOffset - selStartOffset;
        const highlightLength = highlightEnd - highlightStart;

        // If selection overlaps with 50%+ of the highlight OR the highlight overlaps with 50%+ of selection
        // This makes it easy to dehighlight by just selecting the highlighted text
        const overlapRatioWithHighlight = highlightLength > 0 ? overlapLength / highlightLength : 0;
        const overlapRatioWithSelection = selectionLength > 0 ? overlapLength / selectionLength : 0;

        if (overlapRatioWithHighlight >= 0.5 || overlapRatioWithSelection >= 0.5) {
          // Partial dehighlight: only remove the selected portion, keep the rest
          window.getSelection()?.removeAllRanges();
          // Remove any temp highlights that might be showing
          removeTempHighlights(container);
          setShowColorPicker(false);
          setShowMobileHighlightButton(false);
          setSelectedText("");
          setSelectionInfo(null);
          pendingSelectionRef.current = null;
          justDehighlightedRef.current = true;
          buttonPositionedRef.current = false;

          // Compute sub-highlights for remaining portions
          const subHighlights = computeSubHighlights(fullText, highlight, selStartOffset, selEndOffset);

          // Remove original highlight
          removeHighlightFromDOM(container, highlight.id);
          removeHighlight(highlight.id);
          appliedHighlightsRef.current.delete(highlight.id);

          // Re-highlight remaining portions
          subHighlights.forEach(sub => addHighlight(sub));
          return;
        }
      }
    }

    // Calculate offsets and get context using TreeWalker-based text
    // This ensures consistency when highlighting across block elements
    const fullText = getTextContent(container);
    const startOffset = getTextOffset(container, range.startContainer, range.startOffset);
    const endOffset = getTextOffset(container, range.endContainer, range.endOffset);

    // Use the TreeWalker-based text instead of selection.toString()
    // This ensures the stored text matches what we'll find when re-applying highlights
    const text = fullText.substring(startOffset, endOffset);

    if (!text || text.length < 2) {
      setShowColorPicker(false);
      setSelectedText("");
      setSelectionInfo(null);
      return;
    }

    // Get surrounding context for accurate matching later
    const prefixStart = Math.max(0, startOffset - CONTEXT_LENGTH);
    const suffixEnd = Math.min(fullText.length, endOffset + CONTEXT_LENGTH);
    const prefixContext = fullText.substring(prefixStart, startOffset);
    const suffixContext = fullText.substring(endOffset, suffixEnd)

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

    // Always recalculate position based on the current selection rect
    // The button is hidden during handle dragging, so recalculating on each
    // processSelection call ensures it appears at the correct position
    {
      // Center the button above the selected text
      const centerX = rect.left + rect.width / 2 - containerRect.left;
      const topRelativeToContainer = rect.top - containerRect.top;

      // Color picker/button dimensions
      const isMobileView = window.innerWidth < 640;
      const pickerWidth = isMobileView ? 160 : 280;
      const pickerHalfWidth = pickerWidth / 2;

      // Horizontal boundary checks
      const containerWidth = containerRect.width;
      const minX = pickerHalfWidth + 10;
      const maxX = containerWidth - pickerHalfWidth - 10;
      const xPos = Math.max(minX, Math.min(maxX, centerX));

      // Always show ABOVE the selection
      setPickerPosition({
        x: xPos,
        y: topRelativeToContainer,
        showBelow: false,
      });

      buttonPositionedRef.current = true;
    }

    if (isTouchDevice()) {
      // Mobile: Show highlight button but KEEP native selection visible
      // This allows users to continue dragging selection handles (blue drag lines)
      // Native selection will be cleared when user taps the highlight button
      setShowMobileHighlightButton(true);
      setShowColorPicker(false);
    } else {
      // Desktop: Apply temp highlight immediately and show color picker
      applyTempHighlight(container, startOffset, endOffset);
      window.getSelection()?.removeAllRanges();
      setShowColorPicker(true);
      setShowMobileHighlightButton(false);
    }
  }, [isLoggedIn, highlightModeEnabled, removeHighlight, addHighlight, highlights]);

  // Handle mouse selection (desktop)
  const handleMouseUp = useCallback(() => {
    if (isTouchDevice()) return;
    processSelection();
  }, [processSelection]);

  // Android: Restore selection state when app resumes from being backgrounded/frozen
  // This ensures the blue drag handles can be used again after phone freezes
  useEffect(() => {
    if (isIOSDevice || !isTouchDevice() || !highlightModeEnabled || !isLoggedIn) return;

    const container = contentRef.current;
    if (!container) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // App has resumed - check if we had a pending selection
        const pending = pendingSelectionRef.current;
        if (pending && pending.text) {
          // Small delay to ensure DOM is ready
          setTimeout(() => {
            // Check if the text still exists in container
            const fullText = getTextContent(container);
            const textIndex = fullText.indexOf(pending.text);

            if (textIndex !== -1) {
              // Try to programmatically restore selection with native handles
              try {
                const boundaries = getTextNodeBoundaries(container);
                const startBoundary = findTextNodeBoundaryAtOffset(boundaries, pending.startOffset);
                const endBoundary = findTextNodeBoundaryAtOffset(boundaries, pending.endOffset);

                if (startBoundary && endBoundary) {
                  const range = document.createRange();
                  const startLocalOffset = pending.startOffset - startBoundary.startOffset;
                  const endLocalOffset = pending.endOffset - endBoundary.startOffset;

                  range.setStart(startBoundary.node, Math.min(startLocalOffset, startBoundary.node.length));
                  range.setEnd(endBoundary.node, Math.min(endLocalOffset, endBoundary.node.length));

                  const selection = window.getSelection();
                  if (selection) {
                    selection.removeAllRanges();
                    selection.addRange(range);

                    // Mark that user can continue dragging handles
                    isHandleDraggingRef.current = true;
                    lastSelectionTextRef.current = pending.text;

                    // Show highlight button after a short delay
                    setTimeout(() => {
                      const sel = window.getSelection();
                      if (sel && sel.toString().trim().length >= 2) {
                        processSelection();
                      }
                    }, 300);
                  }
                }
              } catch (e) {
                console.warn('Could not restore selection:', e);
              }
            }
          }, 100);
        }
      } else if (document.visibilityState === 'hidden') {
        // App is being backgrounded - store current selection
        const selection = window.getSelection();
        if (selection && selection.toString().trim().length >= 2) {
          const range = selection.getRangeAt(0);
          if (container.contains(range.commonAncestorContainer)) {
            const startOffset = getTextOffset(container, range.startContainer, range.startOffset);
            const endOffset = getTextOffset(container, range.endContainer, range.endOffset);
            pendingSelectionRef.current = {
              startOffset,
              endOffset,
              text: selection.toString().trim(),
            };
          }
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isIOSDevice, highlightModeEnabled, isLoggedIn, processSelection]);

  // Prevent native context menu and browser quick actions on desktop when highlight mode is enabled
  useEffect(() => {
    if (!highlightModeEnabled || !isLoggedIn) return;

    const container = contentRef.current;
    if (!container) return;

    // Prevent right-click context menu
    const handleContextMenu = (e: Event) => {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      return false;
    };

    // Prevent copy/cut keyboard shortcuts
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'c' || e.key === 'x' || e.key === 'a')) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
    };

    // Prevent copy event
    const handleCopy = (e: Event) => {
      e.preventDefault();
      e.stopPropagation();
      return false;
    };

    // Prevent cut event
    const handleCut = (e: Event) => {
      e.preventDefault();
      e.stopPropagation();
      return false;
    };

    // Prevent beforecopy (Chrome specific)
    const handleBeforeCopy = (e: Event) => {
      e.preventDefault();
      return false;
    };

    container.addEventListener('contextmenu', handleContextMenu, { capture: true });
    container.addEventListener('keydown', handleKeyDown);
    container.addEventListener('copy', handleCopy, { capture: true });
    container.addEventListener('cut', handleCut, { capture: true });
    container.addEventListener('beforecopy', handleBeforeCopy, { capture: true });

    // Also add to document to catch browser-level menus
    document.addEventListener('contextmenu', handleContextMenu, { capture: true });
    document.addEventListener('copy', handleCopy, { capture: true });
    document.addEventListener('cut', handleCut, { capture: true });

    return () => {
      container.removeEventListener('contextmenu', handleContextMenu, { capture: true });
      container.removeEventListener('keydown', handleKeyDown);
      container.removeEventListener('copy', handleCopy, { capture: true });
      container.removeEventListener('cut', handleCut, { capture: true });
      container.removeEventListener('beforecopy', handleBeforeCopy, { capture: true });
      document.removeEventListener('contextmenu', handleContextMenu, { capture: true });
      document.removeEventListener('copy', handleCopy, { capture: true });
      document.removeEventListener('cut', handleCut, { capture: true });
    };
  }, [highlightModeEnabled, isLoggedIn]);

  // Handle touch selection (mobile) using selectionchange event
  // Works on Android only - iOS uses custom programmatic selection
  // Key principle: Keep native selection visible until user is COMPLETELY DONE dragging handles
  // Selection handles appear and user can drag them to adjust selection
  // The highlight button only appears after user has stopped touching for 1 second
  useEffect(() => {
    // Skip for iOS - handled by custom programmatic selection
    if (isIOSDevice) return;
    if (!isTouchDevice() || !highlightModeEnabled || !isLoggedIn) return;

    const container = contentRef.current;

    // Track if user is actively touching the screen
    let isTouchActive = false;
    let lastProcessedSelection = "";
    let selectionCheckTimer: NodeJS.Timeout | null = null;
    let lastSelectionChangeTime = 0;
    let touchEndTime = 0;

    // When touch starts, ALWAYS clear pending timers - user is interacting
    const handleTouchStartForSelection = () => {
      isTouchActive = true;

      // Reset dehighlight flag - new touch gesture means user wants to interact again
      // This prevents the flag from blocking the next selection attempt
      justDehighlightedRef.current = false;

      // Clear ALL pending processing - user is touching again
      if (selectionStableTimeoutRef.current) {
        clearTimeout(selectionStableTimeoutRef.current);
        selectionStableTimeoutRef.current = null;
      }
      if (selectionCheckTimer) {
        clearTimeout(selectionCheckTimer);
        selectionCheckTimer = null;
      }

      // Mark that user might be dragging handles
      const sel = window.getSelection();
      if (sel && sel.toString().trim().length > 0) {
        isHandleDraggingRef.current = true;
      }
    };

    // When touch ends, start a LONG timer to wait for handle dragging to complete
    const handleTouchEndForSelection = () => {
      isTouchActive = false;
      touchEndTime = Date.now();

      // Don't process if color picker is showing (user is picking a color)
      if (showColorPicker) return;

      const sel = window.getSelection();
      const selText = sel?.toString().trim() || "";

      if (selText && selText.length >= 2) {
        // Clear any existing timer
        if (selectionStableTimeoutRef.current) {
          clearTimeout(selectionStableTimeoutRef.current);
        }

        // Short delay to allow user to drag handles if needed
        const delay = 300;

        selectionStableTimeoutRef.current = setTimeout(() => {
          // Check if user touched again during the wait
          if (isTouchActive) return;

          // Check if selection changed since touch ended
          const currentSel = window.getSelection();
          if (!currentSel || currentSel.rangeCount === 0) return;

          const currentText = currentSel.toString().trim();
          if (!currentText || currentText.length < 2) return;

          // Skip if already processed this exact selection
          if (currentText === lastProcessedSelection) return;

          const currentRange = currentSel.getRangeAt(0);
          if (!container || !container.contains(currentRange.commonAncestorContainer)) return;

          // Only process if selection hasn't changed in the last 150ms
          const timeSinceLastChange = Date.now() - lastSelectionChangeTime;
          if (timeSinceLastChange < 150) {
            // Selection is still changing, wait more
            return;
          }

          // Process selection but KEEP native selection visible
          isSelectingRef.current = false;
          isHandleDraggingRef.current = false;
          lastProcessedSelection = currentText;
          processSelection();
        }, delay);
      }
    };

    // Track selection changes - this fires when user drags handles
    const handleSelectionChange = () => {
      lastSelectionChangeTime = Date.now();

      // Skip if we just dehighlighted
      if (justDehighlightedRef.current) return;

      // Don't process if color picker is showing (user is picking a color)
      if (showColorPicker) return;

      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0) {
        lastSelectionTextRef.current = "";
        lastSelectionLengthRef.current = 0;
        isSelectingRef.current = false;
        buttonPositionedRef.current = false;
        return;
      }

      const selText = sel.toString().trim();

      // Check if selection is within our container
      const selRange = sel.getRangeAt(0);
      if (!container || !container.contains(selRange.commonAncestorContainer)) {
        return;
      }

      // Track selection changes
      const prevSelText = lastSelectionTextRef.current;
      lastSelectionTextRef.current = selText;
      isSelectingRef.current = selText.length > 0;
      lastSelectionLengthRef.current = selText.length;

      // Store selection for potential restoration after app resume
      if (selText && selText.length >= 2 && container) {
        try {
          const startOffset = getTextOffset(container, selRange.startContainer, selRange.startOffset);
          const endOffset = getTextOffset(container, selRange.endContainer, selRange.endOffset);
          pendingSelectionRef.current = {
            startOffset,
            endOffset,
            text: selText,
          };
        } catch (e) {
          // Ignore errors during selection tracking
        }
      }

      // If selection changed, user is dragging handles - RESET ALL TIMERS
      if (selText !== prevSelText) {
        isHandleDraggingRef.current = true;

        // Clear any pending processing timer - selection is changing
        if (selectionStableTimeoutRef.current) {
          clearTimeout(selectionStableTimeoutRef.current);
          selectionStableTimeoutRef.current = null;
        }
        if (selectionCheckTimer) {
          clearTimeout(selectionCheckTimer);
          selectionCheckTimer = null;
        }
      }

      // If touch is NOT active and selection exists, start a stability check
      // This handles the case where user drags handle and releases
      if (!isTouchActive && selText && selText.length >= 2) {
        if (selectionCheckTimer) {
          clearTimeout(selectionCheckTimer);
        }

        // Wait 300ms after last selection change before showing button
        selectionCheckTimer = setTimeout(() => {
          // Double-check user isn't touching
          if (isTouchActive) return;

          const currentSel = window.getSelection();
          if (!currentSel || currentSel.rangeCount === 0) return;

          const currentText = currentSel.toString().trim();
          if (!currentText || currentText.length < 2) return;
          if (currentText === lastProcessedSelection) return;
          // Only skip if color picker is showing (user is picking a color)
          // Don't skip for showMobileHighlightButton - we need to update selectionInfo when user adjusts selection
          if (showColorPicker) return;

          // Check selection hasn't changed recently
          const timeSinceLastChange = Date.now() - lastSelectionChangeTime;
          if (timeSinceLastChange < 200) return;

          const currentRange = currentSel.getRangeAt(0);
          if (!container || !container.contains(currentRange.commonAncestorContainer)) return;

          isSelectingRef.current = false;
          isHandleDraggingRef.current = false;
          lastProcessedSelection = currentText;
          processSelection();
        }, 300);
      }
    };

    // Add touch listeners
    document.addEventListener('touchstart', handleTouchStartForSelection, { passive: true });
    document.addEventListener('touchend', handleTouchEndForSelection, { passive: true });
    document.addEventListener('touchcancel', handleTouchEndForSelection, { passive: true });
    document.addEventListener('selectionchange', handleSelectionChange);

    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange);
      document.removeEventListener('touchstart', handleTouchStartForSelection);
      document.removeEventListener('touchend', handleTouchEndForSelection);
      document.removeEventListener('touchcancel', handleTouchEndForSelection);
      if (touchTimeoutRef.current) {
        clearTimeout(touchTimeoutRef.current);
      }
      if (selectionStableTimeoutRef.current) {
        clearTimeout(selectionStableTimeoutRef.current);
      }
      if (selectionCheckTimer) {
        clearTimeout(selectionCheckTimer);
      }
    };
  }, [isLoggedIn, highlightModeEnabled, processSelection, showColorPicker, showMobileHighlightButton, isIOSDevice]);

  // Touch handling for Android only (iOS has custom programmatic selection above)
  // Allows native drag selection for multi-word/sentence selection
  // Suppresses OS context menu (copy/paste/select all) completely
  // Includes scroll detection to prevent highlights when scrolling
  useEffect(() => {
    // Skip for iOS - handled by custom programmatic selection above
    if (isIOSDevice) return;
    if (!isTouchDevice() || !highlightModeEnabled || !isLoggedIn) return;

    const container = contentRef.current;
    if (!container) return;

    const isIOSBrowser = isIOS();

    // Prevent context menu (copy/paste/select all) on all mobile devices - VERY aggressive
    const handleContextMenu = (e: Event) => {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      return false;
    };

    // Prevent copy/cut actions
    const handleCopy = (e: Event) => {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      return false;
    };

    // iOS specific: Prevent native action menu by intercepting touch events
    const handleTouchStartIOS = (e: TouchEvent) => {
      if (!isIOSBrowser) return;
      // Don't interfere with the touch, just ensure callout is suppressed
      const target = e.target as HTMLElement;
      if (target) {
        (target.style as CSSStyleDeclaration & { webkitTouchCallout: string }).webkitTouchCallout = 'none';
      }
    };

    // Track when selection starts - DO NOT prevent native selection!
    // Native selection must work for drag-to-select functionality
    const handleSelectStart = (e: Event) => {
      const target = e.target as Node;
      // Just track selection state, don't prevent the event
      if (container.contains(target)) {
        isSelectingRef.current = true;
        isHandleDraggingRef.current = true;
      }
    };

    // Touch start - track position and mark selection start
    // CRITICAL: Don't interfere with native selection handle dragging
    const handleTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0];
      if (!touch) return;

      touchStartPosRef.current = { x: touch.clientX, y: touch.clientY };
      scrollStartYRef.current = touch.clientY;
      isScrollingRef.current = false; // Reset scroll detection

      // Reset dehighlight flag on new touch - ensures next selection works after dehighlight
      justDehighlightedRef.current = false;

      // Check if there's an existing selection - user might be about to drag handles
      const sel = window.getSelection();
      const hasExistingSelection = sel && sel.toString().trim().length > 0;

      if (hasExistingSelection) {
        // User might be about to drag selection handles - mark it
        isHandleDraggingRef.current = true;

        // If highlight button is showing and user touches (to drag handle), hide it
        // This allows user to continue adjusting selection
        if (showMobileHighlightButton) {
          setShowMobileHighlightButton(false);
        }
      } else {
        // Reset selection tracking only if no existing selection
        lastSelectionTextRef.current = "";
        lastSelectionLengthRef.current = 0;
        isHandleDraggingRef.current = false;
        buttonPositionedRef.current = false;
      }

      // Clear any pending timeout - user is interacting again
      if (selectionStableTimeoutRef.current) {
        clearTimeout(selectionStableTimeoutRef.current);
        selectionStableTimeoutRef.current = null;
      }

      // Check if tapping on an existing highlight (for de-highlighting)
      const target = e.target as HTMLElement;
      const highlightMark = target.closest('[data-highlight-id]') as HTMLElement | null;
      if (highlightMark) {
        // Store the highlight element for potential removal on tap
        (container as HTMLElement & { _pendingHighlightRemoval?: HTMLElement })._pendingHighlightRemoval = highlightMark;
      } else {
        (container as HTMLElement & { _pendingHighlightRemoval?: HTMLElement })._pendingHighlightRemoval = undefined;
      }
    };

    // Touch move - detect scrolling vs selection
    // If vertical movement > 30px, user is scrolling - clear any selection
    const handleTouchMove = (e: TouchEvent) => {
      const touch = e.touches[0];
      if (!touch) return;

      // Detect scrolling: if vertical movement is significant, user is scrolling
      const startY = scrollStartYRef.current;
      if (startY !== null && !isScrollingRef.current) {
        const deltaY = Math.abs(touch.clientY - startY);
        if (deltaY > 30) {
          // User is scrolling - mark it and clear any selection
          isScrollingRef.current = true;
          window.getSelection()?.removeAllRanges();
          setShowMobileHighlightButton(false);
          setShowColorPicker(false);
          buttonPositionedRef.current = false;
          return;
        }
      }

      // If scrolling, don't process selection
      if (isScrollingRef.current) return;

      // Clear any pending processing timeout - user is actively dragging
      if (selectionStableTimeoutRef.current) {
        clearTimeout(selectionStableTimeoutRef.current);
        selectionStableTimeoutRef.current = null;
      }

      // Check if there's an active selection - user is dragging handles
      const sel = window.getSelection();
      if (sel && sel.toString().trim().length > 0) {
        isHandleDraggingRef.current = true;

        // Hide highlight button if showing - user is still adjusting
        if (showMobileHighlightButton) {
          setShowMobileHighlightButton(false);
        }
      }
    };

    // Touch end - handle tap on existing highlights
    // Selection processing is handled by selectionchange event
    const handleTouchEnd = (e: TouchEvent) => {
      const startPos = touchStartPosRef.current;
      const wasScrolling = isScrollingRef.current;
      touchStartPosRef.current = null;
      scrollStartYRef.current = null;
      isScrollingRef.current = false;

      // If was scrolling, don't process anything
      if (wasScrolling) return;

      // Check if this was a tap on an existing highlight (for de-highlighting)
      // IMPORTANT: This must run BEFORE the showColorPicker/showMobileHighlightButton guard
      // because those are React state values that may be stale in this closure
      // (e.g. handleTouchStart called setShowMobileHighlightButton(false) but it hasn't re-rendered yet)
      const pendingRemoval = (container as HTMLElement & { _pendingHighlightRemoval?: HTMLElement })._pendingHighlightRemoval;
      if (pendingRemoval && startPos) {
        const touch = e.changedTouches[0];
        if (touch) {
          const moveDistance = Math.sqrt(
            Math.pow(touch.clientX - startPos.x, 2) +
            Math.pow(touch.clientY - startPos.y, 2)
          );
          // If it was a tap (not a drag), unhighlight the tapped word
          // Increased threshold to 15px for easier tapping on mobile
          if (moveDistance < 15) {
            const highlightId = pendingRemoval.getAttribute('data-highlight-id');
            if (highlightId) {
              // Clear any existing selection first
              window.getSelection()?.removeAllRanges();

              // Remove any temp highlights that might be showing
              removeTempHighlights(container);

              // Hide any visible UI
              setShowColorPicker(false);
              setShowMobileHighlightButton(false);
              setSelectedText("");
              setSelectionInfo(null);

              // Mark that we just dehighlighted to prevent UI from showing
              justDehighlightedRef.current = true;
              buttonPositionedRef.current = false;

              // Partial unhighlight: only remove the tapped word, keep the rest
              const highlight = highlights.find(h => h.id === highlightId);
              if (highlight) {
                const fullText = getTextContent(container);
                const tapOffset = getCharacterOffsetAtPoint(container, touch.clientX, touch.clientY);
                if (tapOffset !== null) {
                  const wordBounds = getWordBoundariesAtOffset(fullText, tapOffset);
                  const subHighlights = computeSubHighlights(fullText, highlight, wordBounds.start, wordBounds.end);

                  removeHighlightFromDOM(container, highlightId);
                  removeHighlight(highlightId);
                  appliedHighlightsRef.current.delete(highlightId);

                  // Re-highlight remaining portions
                  subHighlights.forEach(sub => addHighlight(sub));
                } else {
                  // Fallback: remove entire highlight if tap offset can't be determined
                  removeHighlightFromDOM(container, highlightId);
                  removeHighlight(highlightId);
                  appliedHighlightsRef.current.delete(highlightId);
                }
              } else {
                removeHighlightFromDOM(container, highlightId);
                removeHighlight(highlightId);
                appliedHighlightsRef.current.delete(highlightId);
              }

              (container as HTMLElement & { _pendingHighlightRemoval?: HTMLElement })._pendingHighlightRemoval = undefined;
              isSelectingRef.current = false;
              isHandleDraggingRef.current = false;
              // Clear pending selection since we're removing a highlight
              pendingSelectionRef.current = null;

              // Clear any pending timers to prevent highlight button from showing
              if (selectionStableTimeoutRef.current) {
                clearTimeout(selectionStableTimeoutRef.current);
                selectionStableTimeoutRef.current = null;
              }
              return;
            }
          }
        }
      }
      (container as HTMLElement & { _pendingHighlightRemoval?: HTMLElement })._pendingHighlightRemoval = undefined;

      if (showColorPicker || showMobileHighlightButton) return;

      // Selection processing is now handled by the selectionchange event listener
      // Just reset the handle dragging state after a short delay
      setTimeout(() => {
        if (!isTouchDevice()) return;
        const sel = window.getSelection();
        if (!sel || sel.toString().trim().length === 0) {
          isHandleDraggingRef.current = false;
        }
      }, 100);
    };

    // Touch cancel
    const handleTouchCancel = () => {
      touchStartPosRef.current = null;
      scrollStartYRef.current = null;
      isScrollingRef.current = false;
      isSelectingRef.current = false;
      isHandleDraggingRef.current = false;
      lastSelectionLengthRef.current = 0;
      buttonPositionedRef.current = false;
      if (selectionStableTimeoutRef.current) {
        clearTimeout(selectionStableTimeoutRef.current);
        selectionStableTimeoutRef.current = null;
      }
    };

    // Add event listeners - use capture phase for context menu to intercept early
    container.addEventListener('contextmenu', handleContextMenu, { capture: true });
    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    container.addEventListener('touchmove', handleTouchMove, { passive: true });
    container.addEventListener('touchend', handleTouchEnd, { passive: true });
    container.addEventListener('touchcancel', handleTouchCancel, { passive: true });
    container.addEventListener('copy', handleCopy, { capture: true });
    container.addEventListener('cut', handleCopy, { capture: true });

    // Track selection start on container only (don't prevent it!)
    container.addEventListener('selectstart', handleSelectStart, { passive: true });

    // Prevent context menu at document level for all mobile devices (iOS and Android)
    document.addEventListener('contextmenu', handleContextMenu, { capture: true });
    document.addEventListener('copy', handleCopy, { capture: true });
    document.addEventListener('cut', handleCopy, { capture: true });

    return () => {
      container.removeEventListener('contextmenu', handleContextMenu, { capture: true });
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
      container.removeEventListener('touchcancel', handleTouchCancel);
      container.removeEventListener('copy', handleCopy, { capture: true });
      container.removeEventListener('cut', handleCopy, { capture: true });
      container.removeEventListener('selectstart', handleSelectStart);
      document.removeEventListener('contextmenu', handleContextMenu, { capture: true });
      document.removeEventListener('copy', handleCopy, { capture: true });
      document.removeEventListener('cut', handleCopy, { capture: true });
    };
  }, [highlightModeEnabled, isLoggedIn, showColorPicker, showMobileHighlightButton, processSelection, removeHighlight, addHighlight, highlights, isIOSDevice]);

  // iOS: Restore selection state when app resumes from being backgrounded/frozen
  useEffect(() => {
    if (!isIOSDevice || !highlightModeEnabled || !isLoggedIn) return;

    const container = contentRef.current;
    if (!container) return;

    const handleIOSVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // App has resumed - check if we had a pending selection
        const pending = pendingSelectionRef.current;
        if (pending && pending.text) {
          setTimeout(() => {
            const fullText = getTextContent(container);
            const textIndex = fullText.indexOf(pending.text);

            if (textIndex !== -1) {
              try {
                const boundaries = getTextNodeBoundaries(container);
                const startBoundary = findTextNodeBoundaryAtOffset(boundaries, pending.startOffset);
                const endBoundary = findTextNodeBoundaryAtOffset(boundaries, pending.endOffset);

                if (startBoundary && endBoundary) {
                  const range = document.createRange();
                  const startLocalOffset = pending.startOffset - startBoundary.startOffset;
                  const endLocalOffset = pending.endOffset - endBoundary.startOffset;

                  range.setStart(startBoundary.node, Math.min(startLocalOffset, startBoundary.node.length));
                  range.setEnd(endBoundary.node, Math.min(endLocalOffset, endBoundary.node.length));

                  const selection = window.getSelection();
                  if (selection) {
                    selection.removeAllRanges();
                    selection.addRange(range);
                    isHandleDraggingRef.current = true;
                    lastSelectionTextRef.current = pending.text;
                  }
                }
              } catch (e) {
                console.warn('Could not restore iOS selection:', e);
              }
            }
          }, 150);
        }
      } else if (document.visibilityState === 'hidden') {
        // Store current selection
        const selection = window.getSelection();
        if (selection && selection.toString().trim().length >= 2) {
          const range = selection.getRangeAt(0);
          if (container.contains(range.commonAncestorContainer)) {
            const startOffset = getTextOffset(container, range.startContainer, range.startOffset);
            const endOffset = getTextOffset(container, range.endContainer, range.endOffset);
            pendingSelectionRef.current = {
              startOffset,
              endOffset,
              text: selection.toString().trim(),
            };
          }
        }
      }
    };

    document.addEventListener('visibilitychange', handleIOSVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleIOSVisibilityChange);
    };
  }, [isIOSDevice, highlightModeEnabled, isLoggedIn]);

  // iOS-specific: Allow native drag selection with blue handles
  // Aggressively suppress iOS context menu while allowing selection
  useEffect(() => {
    if (!isIOSDevice || !highlightModeEnabled || !isLoggedIn) return;

    const container = contentRef.current;
    if (!container) return;

    // Track touch state for iOS
    let isTouchActive = false;
    let lastProcessedSelection = "";
    let selectionCheckTimer: NodeJS.Timeout | null = null;
    let lastSelectionChangeTime = 0;

    // Aggressively prevent context menu and copy actions
    const preventContextMenu = (e: Event) => {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      return false;
    };

    // Process and show highlight button for current selection
    const processIOSSelection = () => {
      // Skip if we just dehighlighted (prevents highlight button from appearing)
      if (justDehighlightedRef.current) {
        justDehighlightedRef.current = false;
        return;
      }

      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0) return;

      const selText = sel.toString().trim();
      if (!selText || selText.length < 2) return;
      if (selText === lastProcessedSelection) return;

      const range = sel.getRangeAt(0);
      if (!container.contains(range.commonAncestorContainer)) return;

      const fullText = getTextContent(container);
      const startOffset = getTextOffset(container, range.startContainer, range.startOffset);
      const endOffset = getTextOffset(container, range.endContainer, range.endOffset);

      // iOS: Check if the selected text overlaps with an existing highlight
      // If so, automatically dehighlight it (user-friendly toggle behavior)
      for (const highlight of highlights) {
        // Find the highlight's actual position in the text
        let highlightStart = -1;
        let highlightEnd = -1;

        // Try to find exact position using context (same logic as applyHighlightToDOM)
        if (highlight.prefixContext && highlight.suffixContext) {
          const searchPattern = highlight.prefixContext + highlight.text + highlight.suffixContext;
          const patternIndex = fullText.indexOf(searchPattern);
          if (patternIndex !== -1) {
            highlightStart = patternIndex + highlight.prefixContext.length;
            highlightEnd = highlightStart + highlight.text.length;
          }
        }

        if (highlightStart === -1 && highlight.prefixContext) {
          const searchPattern = highlight.prefixContext + highlight.text;
          const patternIndex = fullText.indexOf(searchPattern);
          if (patternIndex !== -1) {
            highlightStart = patternIndex + highlight.prefixContext.length;
            highlightEnd = highlightStart + highlight.text.length;
          }
        }

        if (highlightStart === -1) {
          // Fallback to stored offsets
          highlightStart = highlight.startOffset;
          highlightEnd = highlight.endOffset;
        }

        // Check for significant overlap
        const overlapStart = Math.max(startOffset, highlightStart);
        const overlapEnd = Math.min(endOffset, highlightEnd);
        const overlapLength = Math.max(0, overlapEnd - overlapStart);

        const selectionLength = endOffset - startOffset;
        const highlightLength = highlightEnd - highlightStart;

        // If selection overlaps with 50%+ of the highlight OR the highlight overlaps with 50%+ of selection
        const overlapRatioWithHighlight = highlightLength > 0 ? overlapLength / highlightLength : 0;
        const overlapRatioWithSelection = selectionLength > 0 ? overlapLength / selectionLength : 0;

        if (overlapRatioWithHighlight >= 0.5 || overlapRatioWithSelection >= 0.5) {
          // Partial dehighlight: only remove the selected portion, keep the rest
          window.getSelection()?.removeAllRanges();
          // Remove any temp highlights that might be showing
          removeTempHighlights(container);
          setShowColorPicker(false);
          setShowMobileHighlightButton(false);
          setSelectedText("");
          setSelectionInfo(null);
          pendingSelectionRef.current = null;
          lastProcessedSelection = "";
          justDehighlightedRef.current = true;
          buttonPositionedRef.current = false;

          // Compute sub-highlights for remaining portions
          const subHighlights = computeSubHighlights(fullText, highlight, startOffset, endOffset);

          // Remove original highlight
          removeHighlightFromDOM(container, highlight.id);
          removeHighlight(highlight.id);
          appliedHighlightsRef.current.delete(highlight.id);

          // Re-highlight remaining portions
          subHighlights.forEach(sub => addHighlight(sub));
          return;
        }
      }

      lastProcessedSelection = selText;

      const text = fullText.substring(startOffset, endOffset);

      if (!text || text.length < 2) return;

      const prefixStart = Math.max(0, startOffset - CONTEXT_LENGTH);
      const suffixEnd = Math.min(fullText.length, endOffset + CONTEXT_LENGTH);
      const prefixContext = fullText.substring(prefixStart, startOffset);
      const suffixContext = fullText.substring(endOffset, suffixEnd);

      setSelectedText(text);
      setSelectionInfo({
        startOffset,
        endOffset,
        prefixContext,
        suffixContext,
      });

      // Always recalculate position based on the current selection rect
      {
        const rect = range.getBoundingClientRect();
        const containerRect = containerRef.current?.getBoundingClientRect();
        if (containerRect) {
          // Center the button above the selected text
          const centerX = rect.left + rect.width / 2 - containerRect.left;
          const topRelativeToContainer = rect.top - containerRect.top;

          const isMobileView = window.innerWidth < 640;
          const pickerWidth = isMobileView ? 160 : 280;
          const pickerHalfWidth = pickerWidth / 2;

          const containerWidth = containerRect.width;
          const minX = pickerHalfWidth + 10;
          const maxX = containerWidth - pickerHalfWidth - 10;
          const xPos = Math.max(minX, Math.min(maxX, centerX));

          setPickerPosition({
            x: xPos,
            y: topRelativeToContainer,
            showBelow: false,
          });
        }

        buttonPositionedRef.current = true;
      }

      // Keep native selection visible for handle dragging (blue drag lines)
      // Temp highlight will be applied when user taps the Highlight button
      setShowMobileHighlightButton(true);
      setShowColorPicker(false);
    };

    // Handle touch start - track position
    const handleIOSTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0];
      if (!touch) return;

      isTouchActive = true;
      iosTouchStartPosRef.current = { x: touch.clientX, y: touch.clientY };
      scrollStartYRef.current = touch.clientY;
      isScrollingRef.current = false;

      // Reset dehighlight flag on new touch - ensures next selection works after dehighlight
      justDehighlightedRef.current = false;

      // Clear any pending timers
      if (selectionStableTimeoutRef.current) {
        clearTimeout(selectionStableTimeoutRef.current);
        selectionStableTimeoutRef.current = null;
      }
      if (selectionCheckTimer) {
        clearTimeout(selectionCheckTimer);
        selectionCheckTimer = null;
      }

      // Check if there's an existing selection - user might be about to drag handles
      const sel = window.getSelection();
      const hasExistingSelection = sel && sel.toString().trim().length > 0;

      if (hasExistingSelection) {
        isHandleDraggingRef.current = true;
        // Hide highlight button if showing - user is adjusting selection
        if (showMobileHighlightButton) {
          setShowMobileHighlightButton(false);
        }
      } else {
        isHandleDraggingRef.current = false;
        lastSelectionTextRef.current = "";
      }

      // Check if tapping on an existing highlight (for removal)
      const target = e.target as HTMLElement;
      const highlightMark = target.closest('[data-highlight-id]') as HTMLElement | null;
      if (highlightMark) {
        const highlightId = highlightMark.getAttribute('data-highlight-id');
        if (highlightId) {
          (container as HTMLElement & { _pendingHighlightRemoval?: string })._pendingHighlightRemoval = highlightId;
        }
      } else {
        (container as HTMLElement & { _pendingHighlightRemoval?: string })._pendingHighlightRemoval = undefined;
      }

      // Hide highlight button and remove temp highlights if showing
      if (showMobileHighlightButton) {
        setShowMobileHighlightButton(false);
        removeTempHighlights(container);
      }
    };

    // Handle touch move - detect scrolling
    const handleIOSTouchMove = (e: TouchEvent) => {
      const touch = e.touches[0];
      if (!touch) return;

      const startY = scrollStartYRef.current;
      if (startY !== null && !isScrollingRef.current) {
        const deltaY = Math.abs(touch.clientY - startY);
        if (deltaY > 30) {
          isScrollingRef.current = true;
          // Clear selection if scrolling
          window.getSelection()?.removeAllRanges();
          setShowMobileHighlightButton(false);
          return;
        }
      }

      // If there's active selection, user is dragging handles
      const sel = window.getSelection();
      if (sel && sel.toString().trim().length > 0) {
        isHandleDraggingRef.current = true;
        if (showMobileHighlightButton) {
          setShowMobileHighlightButton(false);
        }
      }
    };

    // Handle touch end - process selection after delay
    const handleIOSTouchEnd = (e: TouchEvent) => {
      isTouchActive = false;
      const startPos = iosTouchStartPosRef.current;
      iosTouchStartPosRef.current = null;
      scrollStartYRef.current = null;

      // If scrolling, don't process
      if (isScrollingRef.current) {
        isScrollingRef.current = false;
        return;
      }

      // Only skip if color picker is showing (user is picking a color)
      // Don't skip for showMobileHighlightButton - we need to update selectionInfo when user adjusts selection
      if (showColorPicker) return;

      const touch = e.changedTouches[0];
      if (!touch) return;

      // Check if it was a tap on existing highlight (for removal with animation)
      if (startPos) {
        const moveDistance = Math.sqrt(
          Math.pow(touch.clientX - startPos.x, 2) +
          Math.pow(touch.clientY - startPos.y, 2)
        );

        // Use 15px threshold for easier tapping on mobile
        if (moveDistance < 15) {
          const pendingRemoval = (container as HTMLElement & { _pendingHighlightRemoval?: string })._pendingHighlightRemoval;
          if (pendingRemoval) {
            // Clear selection first
            window.getSelection()?.removeAllRanges();

            // Remove any temp highlights that might be showing
            removeTempHighlights(container);

            // Mark that we just dehighlighted to prevent UI from showing
            justDehighlightedRef.current = true;
            buttonPositionedRef.current = false;

            // Partial unhighlight: only remove the tapped word, keep the rest
            const highlight = highlights.find(h => h.id === pendingRemoval);
            if (highlight) {
              const fullText = getTextContent(container);
              const tapOffset = getCharacterOffsetAtPoint(container, touch.clientX, touch.clientY);
              if (tapOffset !== null) {
                const wordBounds = getWordBoundariesAtOffset(fullText, tapOffset);
                const subHighlights = computeSubHighlights(fullText, highlight, wordBounds.start, wordBounds.end);

                removeHighlightFromDOM(container, pendingRemoval);
                removeHighlight(pendingRemoval);
                appliedHighlightsRef.current.delete(pendingRemoval);

                // Re-highlight remaining portions
                subHighlights.forEach(sub => addHighlight(sub));
              } else {
                // Fallback: remove entire highlight if tap offset can't be determined
                removeHighlightFromDOM(container, pendingRemoval);
                removeHighlight(pendingRemoval);
                appliedHighlightsRef.current.delete(pendingRemoval);
              }
            } else {
              removeHighlightFromDOM(container, pendingRemoval);
              removeHighlight(pendingRemoval);
              appliedHighlightsRef.current.delete(pendingRemoval);
            }

            (container as HTMLElement & { _pendingHighlightRemoval?: string })._pendingHighlightRemoval = undefined;
            // Clear pending selection
            pendingSelectionRef.current = null;
            isHandleDraggingRef.current = false;

            // Clear any pending timers to prevent highlight button from showing
            if (selectionStableTimeoutRef.current) {
              clearTimeout(selectionStableTimeoutRef.current);
              selectionStableTimeoutRef.current = null;
            }
            return;
          }
        }
      }

      // Check if there's a selection to process
      const sel = window.getSelection();
      const selText = sel?.toString().trim() || "";

      if (selText && selText.length >= 2) {
        // Wait for user to finish adjusting selection (800ms delay)
        if (selectionStableTimeoutRef.current) {
          clearTimeout(selectionStableTimeoutRef.current);
        }

        selectionStableTimeoutRef.current = setTimeout(() => {
          // Check if user touched again
          if (isTouchActive) return;

          // Verify selection is still valid
          const currentSel = window.getSelection();
          if (!currentSel || currentSel.rangeCount === 0) return;

          const currentText = currentSel.toString().trim();
          if (!currentText || currentText.length < 2) return;

          const currentRange = currentSel.getRangeAt(0);
          if (!container.contains(currentRange.commonAncestorContainer)) return;

          // Check selection hasn't changed recently
          const timeSinceLastChange = Date.now() - lastSelectionChangeTime;
          if (timeSinceLastChange < 400) return;

          isHandleDraggingRef.current = false;
          processIOSSelection();
        }, 800);
      }
    };

    // Handle touch cancel
    const handleIOSTouchCancel = () => {
      isTouchActive = false;
      iosTouchStartPosRef.current = null;
      scrollStartYRef.current = null;
      isScrollingRef.current = false;
      isHandleDraggingRef.current = false;
      if (selectionStableTimeoutRef.current) {
        clearTimeout(selectionStableTimeoutRef.current);
        selectionStableTimeoutRef.current = null;
      }
      if (selectionCheckTimer) {
        clearTimeout(selectionCheckTimer);
        selectionCheckTimer = null;
      }
    };

    // Track selection changes - this fires when user drags handles on iOS
    const handleIOSSelectionChange = () => {
      lastSelectionChangeTime = Date.now();

      // Skip if we just dehighlighted
      if (justDehighlightedRef.current) return;

      // Only skip if color picker is showing (user is picking a color)
      // Don't skip for showMobileHighlightButton - we need to update selectionInfo when user adjusts selection
      if (showColorPicker) return;

      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0) {
        lastSelectionTextRef.current = "";
        isHandleDraggingRef.current = false;
        return;
      }

      const selText = sel.toString().trim();
      const selRange = sel.getRangeAt(0);

      // Check if selection is within our container
      if (!container.contains(selRange.commonAncestorContainer)) {
        return;
      }

      // Track selection changes
      const prevSelText = lastSelectionTextRef.current;
      lastSelectionTextRef.current = selText;

      // Store selection for potential restoration after app resume (iOS)
      if (selText && selText.length >= 2 && container) {
        try {
          const startOffset = getTextOffset(container, selRange.startContainer, selRange.startOffset);
          const endOffset = getTextOffset(container, selRange.endContainer, selRange.endOffset);
          pendingSelectionRef.current = {
            startOffset,
            endOffset,
            text: selText,
          };
        } catch (e) {
          // Ignore errors during selection tracking
        }
      }

      // If selection changed, user is dragging handles - reset timers
      if (selText !== prevSelText && selText.length > 0) {
        isHandleDraggingRef.current = true;

        // Clear any pending processing timer
        if (selectionStableTimeoutRef.current) {
          clearTimeout(selectionStableTimeoutRef.current);
          selectionStableTimeoutRef.current = null;
        }
        if (selectionCheckTimer) {
          clearTimeout(selectionCheckTimer);
          selectionCheckTimer = null;
        }
      }

      // If not touching and selection exists, start stability check
      if (!isTouchActive && selText && selText.length >= 2) {
        if (selectionCheckTimer) {
          clearTimeout(selectionCheckTimer);
        }

        // Wait 800ms after last selection change before showing button
        selectionCheckTimer = setTimeout(() => {
          if (isTouchActive) return;
          // Only skip if color picker is showing (user is picking a color)
          // Don't skip for showMobileHighlightButton - we need to update selectionInfo when user adjusts selection
          if (showColorPicker) return;

          const currentSel = window.getSelection();
          if (!currentSel || currentSel.rangeCount === 0) return;

          const currentText = currentSel.toString().trim();
          if (!currentText || currentText.length < 2) return;
          if (currentText === lastProcessedSelection) return;

          const timeSinceLastChange = Date.now() - lastSelectionChangeTime;
          if (timeSinceLastChange < 500) return;

          const currentRange = currentSel.getRangeAt(0);
          if (!container.contains(currentRange.commonAncestorContainer)) return;

          isHandleDraggingRef.current = false;
          processIOSSelection();
        }, 800);
      }
    };

    // Add event listeners
    container.addEventListener('touchstart', handleIOSTouchStart, { passive: true });
    container.addEventListener('touchmove', handleIOSTouchMove, { passive: true });
    container.addEventListener('touchend', handleIOSTouchEnd, { passive: true });
    container.addEventListener('touchcancel', handleIOSTouchCancel, { passive: true });
    container.addEventListener('contextmenu', preventContextMenu, { capture: true });
    container.addEventListener('copy', preventContextMenu, { capture: true });
    container.addEventListener('cut', preventContextMenu, { capture: true });
    document.addEventListener('selectionchange', handleIOSSelectionChange);

    document.addEventListener('contextmenu', preventContextMenu, { capture: true });
    document.addEventListener('copy', preventContextMenu, { capture: true });
    document.addEventListener('cut', preventContextMenu, { capture: true });

    // Prevent iOS gesture events that might trigger menus
    const preventGesture = (e: Event) => {
      e.preventDefault();
      e.stopPropagation();
      return false;
    };
    container.addEventListener('gesturestart', preventGesture, { capture: true });
    container.addEventListener('gesturechange', preventGesture, { capture: true });
    container.addEventListener('gestureend', preventGesture, { capture: true });

    // DO NOT prevent selectstart - we WANT native selection to work
    // Just suppress the callout menu via CSS

    return () => {
      container.removeEventListener('touchstart', handleIOSTouchStart);
      container.removeEventListener('touchmove', handleIOSTouchMove);
      container.removeEventListener('touchend', handleIOSTouchEnd);
      container.removeEventListener('touchcancel', handleIOSTouchCancel);
      container.removeEventListener('contextmenu', preventContextMenu, { capture: true });
      container.removeEventListener('copy', preventContextMenu, { capture: true });
      container.removeEventListener('cut', preventContextMenu, { capture: true });
      container.removeEventListener('gesturestart', preventGesture, { capture: true });
      container.removeEventListener('gesturechange', preventGesture, { capture: true });
      container.removeEventListener('gestureend', preventGesture, { capture: true });
      document.removeEventListener('selectionchange', handleIOSSelectionChange);
      document.removeEventListener('contextmenu', preventContextMenu, { capture: true });
      document.removeEventListener('copy', preventContextMenu, { capture: true });
      document.removeEventListener('cut', preventContextMenu, { capture: true });

      if (selectionStableTimeoutRef.current) {
        clearTimeout(selectionStableTimeoutRef.current);
      }
      if (selectionCheckTimer) {
        clearTimeout(selectionCheckTimer);
      }
    };
  }, [isIOSDevice, highlightModeEnabled, isLoggedIn, removeHighlight, addHighlight, showColorPicker, showMobileHighlightButton, highlights]);

  // Native selection is now used for iOS (same as Android)
  // No custom touch selection needed

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (touchTimeoutRef.current) {
        clearTimeout(touchTimeoutRef.current);
      }
      if (selectionStableTimeoutRef.current) {
        clearTimeout(selectionStableTimeoutRef.current);
      }
    };
  }, []);

  // Add body class when highlight mode is active (both desktop and mobile)
  // This helps CSS suppress OS options when highlight mode is ON
  useEffect(() => {
    if (!highlightModeEnabled || !isLoggedIn) {
      document.body.classList.remove('highlight-mode-active');
      return;
    }

    // Add class on both desktop and mobile when highlight mode is enabled
    document.body.classList.add('highlight-mode-active');
    return () => {
      document.body.classList.remove('highlight-mode-active');
    };
  }, [highlightModeEnabled, isLoggedIn]);

  const saveHighlight = useCallback((color: string) => {
    if (!selectedText || !user || !selectionInfo) return;

    // Remove temporary highlight before applying real one
    if (contentRef.current) {
      removeTempHighlights(contentRef.current);
    }

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
    setShowMobileHighlightButton(false);
    setSelectedText("");
    setSelectionInfo(null);
    buttonPositionedRef.current = false;
  }, [selectedText, user, selectionInfo, addHighlight, pageId]);

  // Mobile: When user taps the highlight button, show color picker
  // Apply temp highlight and clear native selection
  const handleMobileHighlightTap = useCallback(() => {
    // Apply temp highlight before clearing native selection (for iOS)
    if (contentRef.current && selectionInfo) {
      applyTempHighlight(contentRef.current, selectionInfo.startOffset, selectionInfo.endOffset);
    }
    window.getSelection()?.removeAllRanges();
    setShowMobileHighlightButton(false);
    setShowColorPicker(true);
  }, [selectionInfo]);

  const closeColorPicker = useCallback(() => {
    // Remove temporary highlight when dismissing (if any was applied)
    if (contentRef.current) {
      removeTempHighlights(contentRef.current);
    }

    // Also clear native selection
    window.getSelection()?.removeAllRanges();

    setShowColorPicker(false);
    setShowMobileHighlightButton(false);
    setSelectedText("");
    setSelectionInfo(null);

    // Reset tracking refs
    lastSelectionTextRef.current = "";
    lastSelectionLengthRef.current = 0;
    isSelectingRef.current = false;
    isHandleDraggingRef.current = false;
    buttonPositionedRef.current = false;
  }, []);

  return (
    <div
      ref={containerRef}
      className={`relative ${className} ${highlightModeEnabled && isMobileDevice ? "highlight-container-mobile" : ""}`}
    >
      <div
        ref={contentRef}
        onMouseUp={handleMouseUp}
        className={`highlightable-content ${showColorPicker ? "picker-active" : ""} ${highlightModeEnabled && isMobileDevice ? "mobile-highlight-mode" : ""} ${highlightModeEnabled && isIOSDevice ? "ios-highlight-mode" : ""}`}
      >
        {children}
      </div>

      {/* Mobile: Floating highlight button - always appears ABOVE the selected text */}
      {/* NO overlay here - allows user to continue dragging selection handles */}
      {showMobileHighlightButton && isLoggedIn && selectedText && (
        <div
          className="absolute z-[100]"
          style={{
            left: pickerPosition.x,
            top: pickerPosition.y,
            transform: "translateX(-50%) translateY(-100%) translateY(-12px)",
          }}
        >
          <button
            type="button"
            onClick={handleMobileHighlightTap}
            className="flex items-center gap-2 px-4 py-2.5 bg-purple-600 text-white rounded-full shadow-lg active:scale-95 transition-transform font-medium text-sm"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
            </svg>
            Highlight
          </button>
        </div>
      )}


      {/* Color picker - always positioned ABOVE the selected text */}
      {showColorPicker && isLoggedIn && selectedText && (
        <>
          <div className="fixed inset-0 z-[99]" onClick={closeColorPicker} />
          <div
            className="absolute z-[100] bg-white rounded-2xl shadow-2xl border border-gray-200 p-3 sm:p-4"
            style={{
              left: pickerPosition.x,
              top: pickerPosition.y,
              transform: "translateX(-50%) translateY(-100%) translateY(-12px)",
            }}
          >
            <p className="text-xs text-gray-500 mb-2 sm:mb-3 text-center font-medium">
              Select color
            </p>
            <div className="flex gap-2 sm:gap-3">
              {HIGHLIGHT_COLORS.map((color) => (
                <button
                  key={color.name}
                  type="button"
                  onClick={() => saveHighlight(color.value)}
                  className="w-9 h-9 sm:w-10 sm:h-10 rounded-full border-2 border-gray-200 hover:scale-110 hover:border-gray-400 transition-all cursor-pointer shadow-md active:scale-95"
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

      {/* Mobile styles to contain selection within content area and suppress native menus */}
      <style>{`
        /* CRITICAL: Global iOS callout suppression when highlight mode is active */
        /* This must be at the top to ensure highest specificity */
        body.highlight-mode-active * {
          -webkit-touch-callout: none !important;
        }

        /* Mobile only: Allow native text selection with drag handles */
        @media (pointer: coarse) {
          /* Container styles - allow scrolling and selection to work inside */
          .highlight-container-mobile {
            -webkit-touch-callout: none !important;
            -webkit-text-size-adjust: 100%;
            /* Allow scrolling - don't use manipulation which can block scroll */
            touch-action: pan-x pan-y !important;
            position: relative;
          }

          /* CRITICAL: Allow native text selection with drag handles on Android */
          .mobile-highlight-mode {
            -webkit-user-select: text !important;
            user-select: text !important;
            -webkit-touch-callout: none !important;
            -webkit-tap-highlight-color: transparent;
            /* touch-action: manipulation allows both selection and scrolling */
            touch-action: manipulation !important;
            position: relative;
            cursor: text;
            /* Ensure text can be selected */
            pointer-events: auto;
          }

          /* All child elements must allow selection for handle dragging - ALL text types */
          .mobile-highlight-mode *,
          .mobile-highlight-mode p,
          .mobile-highlight-mode span,
          .mobile-highlight-mode div,
          .mobile-highlight-mode h1,
          .mobile-highlight-mode h2,
          .mobile-highlight-mode h3,
          .mobile-highlight-mode h4,
          .mobile-highlight-mode h5,
          .mobile-highlight-mode h6,
          .mobile-highlight-mode li,
          .mobile-highlight-mode ol,
          .mobile-highlight-mode ul,
          .mobile-highlight-mode a,
          .mobile-highlight-mode mark,
          .mobile-highlight-mode strong,
          .mobile-highlight-mode em,
          .mobile-highlight-mode b,
          .mobile-highlight-mode i,
          .mobile-highlight-mode code,
          .mobile-highlight-mode pre,
          .mobile-highlight-mode blockquote,
          .mobile-highlight-mode td,
          .mobile-highlight-mode th,
          .mobile-highlight-mode label,
          .mobile-highlight-mode article,
          .mobile-highlight-mode section {
            -webkit-user-select: text !important;
            user-select: text !important;
            -webkit-touch-callout: none !important;
            touch-action: manipulation !important;
            cursor: text;
            pointer-events: auto;
          }

          /* Android specific: Ensure selection handles can be dragged */
          .mobile-highlight-mode {
            /* Allow long-press to start selection */
            -webkit-user-select: text !important;
            /* Don't interfere with drag gestures for selection handles */
            -webkit-user-drag: none !important;
          }

          /* Purple selection color for native selection on Android */
          .mobile-highlight-mode::selection,
          .mobile-highlight-mode *::selection {
            background-color: rgba(147, 51, 234, 0.4) !important;
            color: inherit !important;
          }

          /* Webkit-specific selection color */
          .mobile-highlight-mode::-webkit-selection,
          .mobile-highlight-mode *::-webkit-selection {
            background-color: rgba(147, 51, 234, 0.4) !important;
          }

          /* iOS specific styles - ALLOW native selection with drag handles */
          /* BUT suppress the iOS context menu (Copy, Look Up, Share) */
          .ios-highlight-mode {
            /* ALLOW native text selection with drag handles */
            -webkit-user-select: text !important;
            user-select: text !important;
            /* CRITICAL: Suppress callout menu completely */
            -webkit-touch-callout: none !important;
            -webkit-tap-highlight-color: transparent !important;
            /* Allow both scrolling and selection */
            touch-action: manipulation !important;
            -webkit-text-size-adjust: 100%;
            pointer-events: auto;
            cursor: text;
          }

          /* iOS: ALLOW native selection on ALL text elements for drag handles */
          .ios-highlight-mode *,
          .ios-highlight-mode p,
          .ios-highlight-mode span,
          .ios-highlight-mode div,
          .ios-highlight-mode h1,
          .ios-highlight-mode h2,
          .ios-highlight-mode h3,
          .ios-highlight-mode h4,
          .ios-highlight-mode h5,
          .ios-highlight-mode h6,
          .ios-highlight-mode li,
          .ios-highlight-mode ol,
          .ios-highlight-mode ul,
          .ios-highlight-mode a,
          .ios-highlight-mode mark,
          .ios-highlight-mode strong,
          .ios-highlight-mode em,
          .ios-highlight-mode b,
          .ios-highlight-mode i,
          .ios-highlight-mode code,
          .ios-highlight-mode pre,
          .ios-highlight-mode blockquote,
          .ios-highlight-mode td,
          .ios-highlight-mode th,
          .ios-highlight-mode label,
          .ios-highlight-mode article,
          .ios-highlight-mode section,
          .ios-highlight-mode aside,
          .ios-highlight-mode header,
          .ios-highlight-mode footer {
            /* ALLOW native selection for drag handles */
            -webkit-user-select: text !important;
            user-select: text !important;
            /* CRITICAL: Suppress iOS callout menu on EVERY element */
            -webkit-touch-callout: none !important;
            -webkit-tap-highlight-color: transparent !important;
            touch-action: manipulation !important;
            pointer-events: auto;
            cursor: text;
          }

          /* iOS: Purple selection color matching Android */
          .ios-highlight-mode::selection,
          .ios-highlight-mode *::selection {
            background-color: rgba(147, 51, 234, 0.4) !important;
            color: inherit !important;
          }

          /* iOS: AGGRESSIVE suppression at body level when highlight mode active */
          body.highlight-mode-active {
            -webkit-touch-callout: none !important;
            -webkit-tap-highlight-color: transparent !important;
          }

          body.highlight-mode-active .ios-highlight-mode,
          body.highlight-mode-active .ios-highlight-mode * {
            /* Keep selection enabled but suppress callout */
            -webkit-touch-callout: none !important;
            -webkit-user-select: text !important;
            user-select: text !important;
          }

          /* iOS: Temp highlight styling (purple) - this is our visual selection */
          .ios-highlight-mode [data-temp-highlight="true"] {
            background-color: rgba(147, 51, 234, 0.4) !important;
            border-radius: 3px;
            padding: 1px 0;
          }

          /* Temp highlights */
          .mobile-highlight-mode [data-temp-highlight="true"],
          .ios-highlight-mode [data-temp-highlight="true"] {
            background-color: rgba(147, 51, 234, 0.35) !important;
            border-radius: 2px;
          }

          /* Ensure saved highlights work correctly on both Android and iOS */
          .mobile-highlight-mode mark[data-highlight-id] {
            -webkit-user-select: text !important;
            user-select: text !important;
            cursor: text;
          }
        }

        /* Global: Suppress OS context menu only when highlight mode active */
        @media (pointer: coarse) {
          body.highlight-mode-active {
            -webkit-touch-callout: none !important;
          }

          /* Both Android and iOS: Allow native selection with purple color */
          body.highlight-mode-active .mobile-highlight-mode,
          body.highlight-mode-active .mobile-highlight-mode * {
            -webkit-user-select: text !important;
            user-select: text !important;
            -webkit-touch-callout: none !important;
          }

          /* When highlight mode is NOT active, allow normal behavior */
          body:not(.highlight-mode-active) * {
            -webkit-touch-callout: auto;
          }

          /* Both Android and iOS: Make sure selection handles are visible and draggable */
          body.highlight-mode-active .mobile-highlight-mode::selection,
          body.highlight-mode-active .mobile-highlight-mode *::selection {
            background-color: rgba(147, 51, 234, 0.4) !important;
          }
        }

        /* Desktop styles */
        @media (pointer: fine), (hover: hover) {
          body:not(.highlight-mode-active) .highlightable-content,
          body:not(.highlight-mode-active) .highlightable-content * {
            -webkit-touch-callout: auto !important;
            -webkit-user-select: text !important;
            user-select: text !important;
          }

          body.highlight-mode-active .highlightable-content,
          body.highlight-mode-active .highlightable-content * {
            -webkit-touch-callout: none !important;
            -webkit-user-select: text !important;
            user-select: text !important;
          }
        }

        /* Make highlighted text easier to tap on mobile - NO color feedback */
        @media (pointer: coarse) {
          mark[data-highlight-id] {
            /* Increase touch target slightly */
            padding: 2px 0 !important;
            margin: -2px 0 !important;
            cursor: pointer;
            /* Completely disable any tap color feedback */
            -webkit-tap-highlight-color: transparent !important;
            -webkit-touch-callout: none !important;
            outline: none !important;
          }
        }

        /* Global: Disable all tap highlight colors on touch devices */
        @media (pointer: coarse) {
          * {
            -webkit-tap-highlight-color: transparent !important;
          }
        }

      `}</style>
    </div>
  );
};

export default Highlightable;
