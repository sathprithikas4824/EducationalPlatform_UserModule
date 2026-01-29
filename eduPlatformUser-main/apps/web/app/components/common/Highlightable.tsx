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

  // iOS custom programmatic selection state (bypasses native selection completely)
  const [iosSelectionStart, setIosSelectionStart] = useState<number | null>(null);
  const [iosSelectionEnd, setIosSelectionEnd] = useState<number | null>(null);
  const iosLongPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const iosTouchStartPosRef = useRef<{ x: number; y: number } | null>(null);
  const iosIsSelectingRef = useRef<boolean>(false);
  const iosInitialOffsetRef = useRef<number | null>(null);

  // Scroll detection ref - to distinguish scrolling from selection
  const isScrollingRef = useRef<boolean>(false);
  const scrollStartYRef = useRef<number | null>(null);

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
  // On mobile: keeps native selection visible for handle dragging, doesn't apply temp highlight yet
  // On desktop: applies temp highlight immediately and shows color picker
  const processSelection = useCallback((keepNativeSelection: boolean = false) => {
    if (!isLoggedIn || !highlightModeEnabled) return;

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    const container = contentRef.current;

    if (!container || !container.contains(range.commonAncestorContainer)) {
      return;
    }

    // Check if clicking on an existing highlight FIRST (before selection length check)
    // This allows tapping on highlights to remove them
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
        setShowMobileHighlightButton(false);
        setSelectedText("");
        setSelectionInfo(null);
        return;
      }
    }

    // Now check if there's enough selection for new highlight
    const selectionText = selection.toString().trim();
    if (!selectionText || selectionText.length < 2) {
      setShowColorPicker(false);
      setSelectedText("");
      setSelectionInfo(null);
      return;
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

    // Calculate position relative to container
    const selectionCenterX = rect.left - containerRect.left + rect.width / 2;
    const topRelativeToContainer = rect.top - containerRect.top;

    // Color picker/button dimensions
    const isMobileView = window.innerWidth < 640;
    const pickerWidth = isMobileView ? 160 : 280;
    const pickerHalfWidth = pickerWidth / 2;

    // Horizontal boundary checks
    const containerWidth = containerRect.width;
    const minX = pickerHalfWidth + 10;
    const maxX = containerWidth - pickerHalfWidth - 10;
    const xPos = Math.max(minX, Math.min(maxX, selectionCenterX));

    // Always show ABOVE the selection on mobile (no jumping)
    setPickerPosition({
      x: xPos,
      y: topRelativeToContainer,
      showBelow: false,
    });

    if (isTouchDevice()) {
      // Mobile: Show highlight button but DON'T clear native selection yet
      // This allows users to continue dragging selection handles
      // Native selection will be cleared when user taps the highlight button
      if (!keepNativeSelection) {
        // Apply temporary visual highlight and clear native selection
        applyTempHighlight(container, startOffset, endOffset);
        window.getSelection()?.removeAllRanges();
      }
      // Show the highlight button (it will appear above/below the selection)
      setShowMobileHighlightButton(true);
      setShowColorPicker(false);
    } else {
      // Desktop: Apply temp highlight immediately and show color picker
      applyTempHighlight(container, startOffset, endOffset);
      window.getSelection()?.removeAllRanges();
      setShowColorPicker(true);
      setShowMobileHighlightButton(false);
    }
  }, [isLoggedIn, highlightModeEnabled, removeHighlight]);

  // Handle mouse selection (desktop)
  const handleMouseUp = useCallback(() => {
    if (isTouchDevice()) return;
    processSelection();
  }, [processSelection]);

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

      // Don't process if UI is already showing
      if (showColorPicker || showMobileHighlightButton) return;

      const sel = window.getSelection();
      const selText = sel?.toString().trim() || "";

      if (selText && selText.length >= 2) {
        // Clear any existing timer
        if (selectionStableTimeoutRef.current) {
          clearTimeout(selectionStableTimeoutRef.current);
        }

        // 1 second delay to allow user to drag handles if needed
        const delay = 1000;

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

          // Only process if selection hasn't changed in the last 500ms
          const timeSinceLastChange = Date.now() - lastSelectionChangeTime;
          if (timeSinceLastChange < 500) {
            // Selection is still changing, wait more
            return;
          }

          // Process selection but KEEP native selection visible
          isSelectingRef.current = false;
          isHandleDraggingRef.current = false;
          lastProcessedSelection = currentText;
          processSelection(true); // true = keep native selection
        }, delay);
      }
    };

    // Track selection changes - this fires when user drags handles
    const handleSelectionChange = () => {
      lastSelectionChangeTime = Date.now();

      // Don't process if UI is already showing
      if (showColorPicker || showMobileHighlightButton) return;

      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0) {
        lastSelectionTextRef.current = "";
        lastSelectionLengthRef.current = 0;
        isSelectingRef.current = false;
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

        // Wait 1 second after last selection change before showing button
        selectionCheckTimer = setTimeout(() => {
          // Double-check user isn't touching
          if (isTouchActive) return;

          const currentSel = window.getSelection();
          if (!currentSel || currentSel.rangeCount === 0) return;

          const currentText = currentSel.toString().trim();
          if (!currentText || currentText.length < 2) return;
          if (currentText === lastProcessedSelection) return;
          if (showColorPicker || showMobileHighlightButton) return;

          // Check selection hasn't changed recently
          const timeSinceLastChange = Date.now() - lastSelectionChangeTime;
          if (timeSinceLastChange < 600) return;

          const currentRange = currentSel.getRangeAt(0);
          if (!container || !container.contains(currentRange.commonAncestorContainer)) return;

          isSelectingRef.current = false;
          isHandleDraggingRef.current = false;
          lastProcessedSelection = currentText;
          processSelection(true); // Keep native selection
        }, 1000);
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

      if (showColorPicker || showMobileHighlightButton) return;

      // Check if this was a tap on an existing highlight (for de-highlighting)
      const pendingRemoval = (container as HTMLElement & { _pendingHighlightRemoval?: HTMLElement })._pendingHighlightRemoval;
      if (pendingRemoval && startPos) {
        const touch = e.changedTouches[0];
        if (touch) {
          const moveDistance = Math.sqrt(
            Math.pow(touch.clientX - startPos.x, 2) +
            Math.pow(touch.clientY - startPos.y, 2)
          );
          // If it was a tap (not a drag), remove the highlight
          if (moveDistance < 10) {
            const highlightId = pendingRemoval.getAttribute('data-highlight-id');
            if (highlightId) {
              removeHighlight(highlightId);
              removeHighlightFromDOM(container, highlightId);
              appliedHighlightsRef.current.delete(highlightId);
              window.getSelection()?.removeAllRanges();
              (container as HTMLElement & { _pendingHighlightRemoval?: HTMLElement })._pendingHighlightRemoval = undefined;
              isSelectingRef.current = false;
              isHandleDraggingRef.current = false;
              return;
            }
          }
        }
      }
      (container as HTMLElement & { _pendingHighlightRemoval?: HTMLElement })._pendingHighlightRemoval = undefined;

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
  }, [highlightModeEnabled, isLoggedIn, showColorPicker, showMobileHighlightButton, processSelection, removeHighlight, isIOSDevice]);

  // iOS-specific: CUSTOM PROGRAMMATIC SELECTION (completely bypasses native selection)
  // This prevents the iOS Copy/Lookup/Share menu by NOT using native selection at all
  // Instead, we track touch coordinates and apply visual highlights directly
  useEffect(() => {
    if (!isIOSDevice || !highlightModeEnabled || !isLoggedIn) return;

    const container = contentRef.current;
    if (!container) return;

    // Aggressively prevent ALL native selection and context menus
    const preventAll = (e: Event) => {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      return false;
    };

    // Clear any native selection immediately
    const clearNativeSelection = () => {
      window.getSelection()?.removeAllRanges();
    };

    // Apply iOS custom visual selection (purple highlight)
    const applyIOSVisualSelection = (startOffset: number, endOffset: number) => {
      if (!container) return;
      // First remove any existing iOS selection highlights
      removeIOSSelectionHighlights();
      // Apply new visual selection
      applyTempHighlight(container, Math.min(startOffset, endOffset), Math.max(startOffset, endOffset));
    };

    // Remove iOS selection highlights
    const removeIOSSelectionHighlights = () => {
      if (!container) return;
      removeTempHighlights(container);
    };

    // Handle touch start - start long press timer for selection
    const handleIOSTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0];
      if (!touch) return;

      iosTouchStartPosRef.current = { x: touch.clientX, y: touch.clientY };
      scrollStartYRef.current = touch.clientY;
      isScrollingRef.current = false;

      // Clear any pending timers
      if (iosLongPressTimerRef.current) {
        clearTimeout(iosLongPressTimerRef.current);
        iosLongPressTimerRef.current = null;
      }

      // If already selecting, update selection based on touch position
      if (iosIsSelectingRef.current && iosInitialOffsetRef.current !== null) {
        const offset = getCharacterOffsetAtPoint(container, touch.clientX, touch.clientY);
        if (offset !== null) {
          setIosSelectionEnd(offset);
          applyIOSVisualSelection(iosInitialOffsetRef.current, offset);
        }
        return;
      }

      // Check if tapping on an existing highlight (for removal)
      const target = e.target as HTMLElement;
      const highlightMark = target.closest('[data-highlight-id]') as HTMLElement | null;
      if (highlightMark) {
        const highlightId = highlightMark.getAttribute('data-highlight-id');
        if (highlightId) {
          // Will handle removal on touch end if it was a tap
          (container as HTMLElement & { _pendingHighlightRemoval?: string })._pendingHighlightRemoval = highlightId;
        }
        return;
      }

      // Start long press timer (300ms) to begin selection
      iosLongPressTimerRef.current = setTimeout(() => {
        if (isScrollingRef.current) return;

        // Get character offset at touch point
        const offset = getCharacterOffsetAtPoint(container, touch.clientX, touch.clientY);
        if (offset === null) return;

        // Get text node boundaries to limit word expansion to the current text node
        const fullText = getTextContent(container);
        const boundaries = getTextNodeBoundaries(container);
        const currentNodeBoundary = findTextNodeBoundaryAtOffset(boundaries, offset);

        let wordStart = offset;
        let wordEnd = offset;

        if (currentNodeBoundary) {
          // Expand to word boundaries BUT stay within the current text node
          // Find word start (go backwards until whitespace or text node start)
          while (wordStart > currentNodeBoundary.startOffset && !/\s/.test(fullText[wordStart - 1])) {
            wordStart--;
          }

          // Find word end (go forwards until whitespace or text node end)
          while (wordEnd < currentNodeBoundary.endOffset && !/\s/.test(fullText[wordEnd])) {
            wordEnd++;
          }
        } else {
          // Fallback: expand to word boundaries using full text (original behavior)
          while (wordStart > 0 && !/\s/.test(fullText[wordStart - 1])) {
            wordStart--;
          }
          while (wordEnd < fullText.length && !/\s/.test(fullText[wordEnd])) {
            wordEnd++;
          }
        }

        // Start selection mode
        iosIsSelectingRef.current = true;
        iosInitialOffsetRef.current = wordStart;
        setIosSelectionStart(wordStart);
        setIosSelectionEnd(wordEnd);

        // Apply visual highlight
        applyIOSVisualSelection(wordStart, wordEnd);

        // Prevent native selection
        clearNativeSelection();

        // Haptic feedback (if available)
        if (navigator.vibrate) {
          navigator.vibrate(10);
        }
      }, 300);
    };

    // Handle touch move - extend selection or detect scrolling
    const handleIOSTouchMove = (e: TouchEvent) => {
      const touch = e.touches[0];
      if (!touch) return;

      const startPos = iosTouchStartPosRef.current;
      const scrollStartY = scrollStartYRef.current;

      // Detect scrolling (vertical movement > 20px)
      if (scrollStartY !== null && !iosIsSelectingRef.current) {
        const deltaY = Math.abs(touch.clientY - scrollStartY);
        if (deltaY > 20) {
          isScrollingRef.current = true;
          // Cancel long press timer
          if (iosLongPressTimerRef.current) {
            clearTimeout(iosLongPressTimerRef.current);
            iosLongPressTimerRef.current = null;
          }
          return;
        }
      }

      // Cancel long press if moved too far before it triggered
      if (startPos && !iosIsSelectingRef.current) {
        const moveDistance = Math.sqrt(
          Math.pow(touch.clientX - startPos.x, 2) +
          Math.pow(touch.clientY - startPos.y, 2)
        );
        if (moveDistance > 10) {
          if (iosLongPressTimerRef.current) {
            clearTimeout(iosLongPressTimerRef.current);
            iosLongPressTimerRef.current = null;
          }
        }
      }

      // If in selection mode, extend selection to current touch point
      if (iosIsSelectingRef.current && iosInitialOffsetRef.current !== null) {
        e.preventDefault(); // Prevent scrolling while selecting

        const offset = getCharacterOffsetAtPoint(container, touch.clientX, touch.clientY);
        if (offset !== null) {
          setIosSelectionEnd(offset);
          applyIOSVisualSelection(iosInitialOffsetRef.current, offset);
        }

        // Keep native selection clear
        clearNativeSelection();
      }
    };

    // Handle touch end - finalize selection or handle tap
    const handleIOSTouchEnd = (e: TouchEvent) => {
      // Clear long press timer
      if (iosLongPressTimerRef.current) {
        clearTimeout(iosLongPressTimerRef.current);
        iosLongPressTimerRef.current = null;
      }

      const startPos = iosTouchStartPosRef.current;
      iosTouchStartPosRef.current = null;
      scrollStartYRef.current = null;

      // Check for tap on existing highlight
      const pendingRemoval = (container as HTMLElement & { _pendingHighlightRemoval?: string })._pendingHighlightRemoval;
      if (pendingRemoval && startPos) {
        const touch = e.changedTouches[0];
        if (touch) {
          const moveDistance = Math.sqrt(
            Math.pow(touch.clientX - startPos.x, 2) +
            Math.pow(touch.clientY - startPos.y, 2)
          );
          if (moveDistance < 10) {
            // It was a tap - remove the highlight
            removeHighlight(pendingRemoval);
            removeHighlightFromDOM(container, pendingRemoval);
            appliedHighlightsRef.current.delete(pendingRemoval);
            clearNativeSelection();
            (container as HTMLElement & { _pendingHighlightRemoval?: string })._pendingHighlightRemoval = undefined;
            return;
          }
        }
      }
      (container as HTMLElement & { _pendingHighlightRemoval?: string })._pendingHighlightRemoval = undefined;

      // If was scrolling, just reset
      if (isScrollingRef.current) {
        isScrollingRef.current = false;
        return;
      }

      // If we have an active selection, show the highlight button
      if (iosIsSelectingRef.current && iosInitialOffsetRef.current !== null) {
        const startOffset = iosInitialOffsetRef.current;
        const endOffset = iosSelectionEnd ?? startOffset;
        const actualStart = Math.min(startOffset, endOffset);
        const actualEnd = Math.max(startOffset, endOffset);

        if (actualEnd - actualStart >= 2) {
          const fullText = getTextContent(container);
          const text = fullText.substring(actualStart, actualEnd);

          // Get context
          const prefixStart = Math.max(0, actualStart - CONTEXT_LENGTH);
          const suffixEnd = Math.min(fullText.length, actualEnd + CONTEXT_LENGTH);
          const prefixContext = fullText.substring(prefixStart, actualStart);
          const suffixContext = fullText.substring(actualEnd, suffixEnd);

          setSelectedText(text);
          setSelectionInfo({
            startOffset: actualStart,
            endOffset: actualEnd,
            prefixContext,
            suffixContext,
          });

          // Calculate position for the highlight button
          // Use the touch end position
          const touch = e.changedTouches[0];
          if (touch && containerRef.current) {
            const containerRect = containerRef.current.getBoundingClientRect();

            // Get approximate position of selection
            const range = document.createRange();
            const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, null);
            let currentOffset = 0;
            let startNode: Text | null = null;
            let endNode: Text | null = null;
            let startNodeOffset = 0;
            let endNodeOffset = 0;

            let node = walker.nextNode() as Text | null;
            while (node) {
              const nodeLength = node.textContent?.length || 0;
              const nodeEnd = currentOffset + nodeLength;

              if (startNode === null && nodeEnd > actualStart) {
                startNode = node;
                startNodeOffset = actualStart - currentOffset;
              }
              if (nodeEnd >= actualEnd) {
                endNode = node;
                endNodeOffset = actualEnd - currentOffset;
                break;
              }

              currentOffset = nodeEnd;
              node = walker.nextNode() as Text | null;
            }

            if (startNode && endNode) {
              try {
                range.setStart(startNode, startNodeOffset);
                range.setEnd(endNode, endNodeOffset);
                const rect = range.getBoundingClientRect();

                const selectionCenterX = rect.left - containerRect.left + rect.width / 2;
                const topRelativeToContainer = rect.top - containerRect.top;

                const isMobileView = window.innerWidth < 640;
                const pickerWidth = isMobileView ? 160 : 280;
                const pickerHalfWidth = pickerWidth / 2;

                const containerWidth = containerRect.width;
                const minX = pickerHalfWidth + 10;
                const maxX = containerWidth - pickerHalfWidth - 10;
                const xPos = Math.max(minX, Math.min(maxX, selectionCenterX));

                setPickerPosition({
                  x: xPos,
                  y: topRelativeToContainer,
                  showBelow: false,
                });
              } catch (err) {
                // Fallback position
                setPickerPosition({
                  x: touch.clientX - containerRect.left,
                  y: touch.clientY - containerRect.top - 50,
                  showBelow: false,
                });
              }
            }
          }

          // Show the highlight button (not color picker yet)
          setShowMobileHighlightButton(true);
          setShowColorPicker(false);
        }

        // Keep selection mode active but stop extending
        // Don't reset iosIsSelectingRef here - we need it for the button tap
      }

      clearNativeSelection();
    };

    // Handle touch cancel
    const handleIOSTouchCancel = () => {
      if (iosLongPressTimerRef.current) {
        clearTimeout(iosLongPressTimerRef.current);
        iosLongPressTimerRef.current = null;
      }
      iosTouchStartPosRef.current = null;
      scrollStartYRef.current = null;
      isScrollingRef.current = false;
      // Don't reset selection state - let user dismiss explicitly
    };

    // Prevent native selection from starting
    const handleSelectStart = (e: Event) => {
      e.preventDefault();
      return false;
    };

    // Add all event listeners
    container.addEventListener('touchstart', handleIOSTouchStart, { passive: true });
    container.addEventListener('touchmove', handleIOSTouchMove, { passive: false });
    container.addEventListener('touchend', handleIOSTouchEnd, { passive: true });
    container.addEventListener('touchcancel', handleIOSTouchCancel, { passive: true });
    container.addEventListener('selectstart', handleSelectStart, { capture: true });
    container.addEventListener('contextmenu', preventAll, { capture: true });
    container.addEventListener('copy', preventAll, { capture: true });
    container.addEventListener('cut', preventAll, { capture: true });

    document.addEventListener('contextmenu', preventAll, { capture: true });
    document.addEventListener('copy', preventAll, { capture: true });
    document.addEventListener('cut', preventAll, { capture: true });

    // Set CSS to prevent native callout
    (container.style as CSSStyleDeclaration & { webkitTouchCallout: string }).webkitTouchCallout = 'none';
    (container.style as CSSStyleDeclaration & { webkitUserSelect: string }).webkitUserSelect = 'none';
    container.style.userSelect = 'none';

    return () => {
      container.removeEventListener('touchstart', handleIOSTouchStart);
      container.removeEventListener('touchmove', handleIOSTouchMove);
      container.removeEventListener('touchend', handleIOSTouchEnd);
      container.removeEventListener('touchcancel', handleIOSTouchCancel);
      container.removeEventListener('selectstart', handleSelectStart, { capture: true });
      container.removeEventListener('contextmenu', preventAll, { capture: true });
      container.removeEventListener('copy', preventAll, { capture: true });
      container.removeEventListener('cut', preventAll, { capture: true });
      document.removeEventListener('contextmenu', preventAll, { capture: true });
      document.removeEventListener('copy', preventAll, { capture: true });
      document.removeEventListener('cut', preventAll, { capture: true });

      if (iosLongPressTimerRef.current) {
        clearTimeout(iosLongPressTimerRef.current);
      }
    };
  }, [isIOSDevice, highlightModeEnabled, isLoggedIn, removeHighlight, iosSelectionEnd]);

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

    // Reset iOS selection state
    setIosSelectionStart(null);
    setIosSelectionEnd(null);
    iosIsSelectingRef.current = false;
    iosInitialOffsetRef.current = null;
  }, [selectedText, user, selectionInfo, addHighlight, pageId]);

  // Mobile: When user taps the highlight button, apply temp highlight and show color picker
  const handleMobileHighlightTap = useCallback(() => {
    // For iOS: temp highlight is already applied by custom selection
    // For Android: apply temp highlight now and clear native selection
    if (!isIOSDevice && contentRef.current && selectionInfo) {
      applyTempHighlight(contentRef.current, selectionInfo.startOffset, selectionInfo.endOffset);
    }
    window.getSelection()?.removeAllRanges();

    setShowMobileHighlightButton(false);
    setShowColorPicker(true);
  }, [selectionInfo, isIOSDevice]);

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

    // Reset iOS selection state
    setIosSelectionStart(null);
    setIosSelectionEnd(null);
    iosIsSelectingRef.current = false;
    iosInitialOffsetRef.current = null;
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
      {showMobileHighlightButton && isLoggedIn && selectedText && (
        <>
          <div className="fixed inset-0 z-[99]" onClick={closeColorPicker} />
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
        </>
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

          /* All child elements must allow selection for handle dragging */
          .mobile-highlight-mode *,
          .mobile-highlight-mode p,
          .mobile-highlight-mode span,
          .mobile-highlight-mode div,
          .mobile-highlight-mode h1,
          .mobile-highlight-mode h2,
          .mobile-highlight-mode h3,
          .mobile-highlight-mode li,
          .mobile-highlight-mode a,
          .mobile-highlight-mode mark {
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

          /* iOS specific styles - DISABLE native selection completely */
          /* Uses custom programmatic selection to avoid iOS context menu */
          .ios-highlight-mode {
            /* DISABLE native text selection on iOS to prevent Copy/Share menu */
            -webkit-user-select: none !important;
            user-select: none !important;
            /* Suppress all native callouts and menus */
            -webkit-touch-callout: none !important;
            -webkit-tap-highlight-color: transparent !important;
            /* Allow scrolling but not native selection */
            touch-action: pan-x pan-y !important;
            -webkit-text-size-adjust: 100%;
            pointer-events: auto;
            cursor: default;
          }

          .ios-highlight-mode *,
          .ios-highlight-mode p,
          .ios-highlight-mode span,
          .ios-highlight-mode div,
          .ios-highlight-mode h1,
          .ios-highlight-mode h2,
          .ios-highlight-mode h3,
          .ios-highlight-mode li,
          .ios-highlight-mode a,
          .ios-highlight-mode mark {
            /* DISABLE native selection on all elements */
            -webkit-user-select: none !important;
            user-select: none !important;
            -webkit-touch-callout: none !important;
            touch-action: pan-x pan-y !important;
            pointer-events: auto;
            cursor: default;
          }

          /* iOS: No native selection - using custom highlights instead */
          .ios-highlight-mode::selection,
          .ios-highlight-mode *::selection {
            background-color: transparent !important;
          }

          /* iOS: Webkit-specific - no native selection */
          .ios-highlight-mode::-webkit-selection,
          .ios-highlight-mode *::-webkit-selection {
            background-color: transparent !important;
          }

          /* iOS: Completely suppress native selection and context menu */
          body.highlight-mode-active .ios-highlight-mode,
          body.highlight-mode-active .ios-highlight-mode * {
            -webkit-touch-callout: none !important;
            -webkit-user-select: none !important;
            user-select: none !important;
          }

          /* iOS: Custom visual selection highlight (purple) */
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

      `}</style>
    </div>
  );
};

export default Highlightable;
