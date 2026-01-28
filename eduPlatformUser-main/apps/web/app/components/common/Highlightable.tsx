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

// Get caret position from touch point (cross-browser)
const getCaretPositionFromPoint = (x: number, y: number): { node: Node; offset: number } | null => {
  // Modern standard
  if (document.caretPositionFromPoint) {
    const pos = document.caretPositionFromPoint(x, y);
    if (pos) return { node: pos.offsetNode, offset: pos.offset };
  }
  // WebKit/Safari fallback
  if (document.caretRangeFromPoint) {
    const range = document.caretRangeFromPoint(x, y);
    if (range) return { node: range.startContainer, offset: range.startOffset };
  }
  return null;
};

// Get word boundaries around a position in text
const getWordBoundaries = (text: string, offset: number): { start: number; end: number } => {
  // Find word start
  let start = offset;
  while (start > 0 && /\S/.test(text[start - 1])) {
    start--;
  }
  // Find word end
  let end = offset;
  while (end < text.length && /\S/.test(text[end])) {
    end++;
  }
  return { start, end };
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
  const selectionStableCountRef = useRef<number>(0);
  const isHandleDraggingRef = useRef<boolean>(false);

  // iOS custom touch selection state
  const [isIOSDevice, setIsIOSDevice] = useState(false);
  const iosTouchStartRef = useRef<{ x: number; y: number; startOffset: number; node: Node } | null>(null);
  const iosSelectionRef = useRef<{ startOffset: number; endOffset: number } | null>(null);
  const isDraggingRef = useRef<boolean>(false);

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

  const processSelection = useCallback(() => {
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
    const bottomRelativeToContainer = rect.bottom - containerRect.top;

    // Color picker dimensions (approximate) - use smaller mobile size for safer bounds
    const pickerHeight = 100;
    const isMobileView = window.innerWidth < 640;
    const pickerWidth = isMobileView ? 216 : 280;
    const pickerHalfWidth = pickerWidth / 2;

    // Horizontal boundary checks for mobile
    const containerWidth = containerRect.width;
    const minX = pickerHalfWidth + 10;
    const maxX = containerWidth - pickerHalfWidth - 10;
    const xPos = Math.max(minX, Math.min(maxX, selectionCenterX));

    // Check if there's enough space above the selection (using viewport position)
    const spaceAbove = rect.top;
    const showBelow = spaceAbove < pickerHeight + 10;

    setPickerPosition({
      x: xPos,
      y: showBelow ? bottomRelativeToContainer : topRelativeToContainer,
      showBelow,
    });

    // On mobile: show highlight button first
    // On desktop: show color picker directly
    // Both: Clear native selection immediately and show temp highlight to prevent OS menu/toolbar

    // Apply temporary visual highlight to show what user selected
    applyTempHighlight(container, startOffset, endOffset);

    // Clear native selection immediately to prevent native menus/toolbars
    window.getSelection()?.removeAllRanges();

    if (isTouchDevice()) {
      setShowMobileHighlightButton(true);
      setShowColorPicker(false);
    } else {
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
  // Both iOS and Android: Allow native drag selection for multi-word/sentence selection
  useEffect(() => {
    if (!isTouchDevice() || !highlightModeEnabled || !isLoggedIn) return;

    const container = contentRef.current;

    // Track if user is actively touching/dragging to extend selection
    let isTouchActive = false;
    let selectionGrowingTimer: NodeJS.Timeout | null = null;
    let lastProcessedSelection = "";

    // Track touch state for handle dragging detection
    const handleTouchStartForSelection = (e: TouchEvent) => {
      isTouchActive = true;
      isHandleDraggingRef.current = false;
      selectionStableCountRef.current = 0;

      // Clear any pending processing when user starts a new touch
      if (selectionStableTimeoutRef.current) {
        clearTimeout(selectionStableTimeoutRef.current);
        selectionStableTimeoutRef.current = null;
      }

      // Check if there's already a selection - if so, user might be dragging handles
      const sel = window.getSelection();
      if (sel && sel.toString().trim().length > 0) {
        isHandleDraggingRef.current = true;
      }
    };

    const handleTouchEndForSelection = () => {
      isTouchActive = false;

      // When touch ends, start a timer to process selection
      // Give user time to potentially tap again to adjust handles
      const sel = window.getSelection();
      const selText = sel?.toString().trim() || "";

      if (selText && selText.length >= 2 && !showColorPicker && !showMobileHighlightButton) {
        // Clear any existing timer
        if (selectionStableTimeoutRef.current) {
          clearTimeout(selectionStableTimeoutRef.current);
        }

        // Use longer delay after touch ends to allow handle manipulation
        // iOS needs even more time because of its selection behavior
        const delay = isIOS() ? 1200 : 800;

        selectionStableTimeoutRef.current = setTimeout(() => {
          const currentSel = window.getSelection();
          if (!currentSel || currentSel.rangeCount === 0) return;

          const currentText = currentSel.toString().trim();
          if (!currentText || currentText.length < 2) return;

          // Skip if already processed this exact selection
          if (currentText === lastProcessedSelection) return;

          const currentRange = currentSel.getRangeAt(0);
          if (!container || !container.contains(currentRange.commonAncestorContainer)) return;

          isSelectingRef.current = false;
          isHandleDraggingRef.current = false;
          lastProcessedSelection = currentText;
          processSelection();
        }, delay);
      }
    };

    // Track selection changes to detect when user finishes selecting
    // Use debounce: reset timer on each change to allow extending selection
    const handleSelectionChange = () => {
      // Don't process if color picker or highlight button is already shown
      if (showColorPicker || showMobileHighlightButton) return;

      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0) {
        lastSelectionTextRef.current = "";
        lastSelectionLengthRef.current = 0;
        isSelectingRef.current = false;
        selectionStableCountRef.current = 0;
        return;
      }

      const selText = sel.toString().trim();

      // Check if selection is within our container
      const selRange = sel.getRangeAt(0);
      if (!container || !container.contains(selRange.commonAncestorContainer)) {
        return;
      }

      // Track selection text
      const prevSelText = lastSelectionTextRef.current;
      lastSelectionTextRef.current = selText;
      isSelectingRef.current = selText.length > 0;

      // Track if selection is changing (user is dragging handles)
      const selectionChanged = selText !== prevSelText;
      const isSelectionGrowing = selText.length > lastSelectionLengthRef.current;
      const isSelectionShrinking = selText.length < lastSelectionLengthRef.current;

      // If selection is changing, user is actively adjusting
      if (selectionChanged && (isSelectionGrowing || isSelectionShrinking)) {
        isHandleDraggingRef.current = true;
        selectionStableCountRef.current = 0;
      } else if (!selectionChanged && selText.length > 0) {
        // Selection is stable, increment counter
        selectionStableCountRef.current++;
      }

      lastSelectionLengthRef.current = selText.length;

      // Clear any pending stable timeout - this allows user to keep extending selection
      if (selectionStableTimeoutRef.current) {
        clearTimeout(selectionStableTimeoutRef.current);
        selectionStableTimeoutRef.current = null;
      }

      // Clear selection growing timer
      if (selectionGrowingTimer) {
        clearTimeout(selectionGrowingTimer);
        selectionGrowingTimer = null;
      }

      // Don't auto-process while touch is active (user is still dragging)
      // Let the touchend handler process the selection instead
      if (isTouchActive) {
        return;
      }

      // Only start the stable timer if we have a valid selection
      // and user is not actively dragging handles
      if (selText && selText.length >= 2) {
        // Very long delay to allow for drag selection of sentences
        // Users need time to drag handles to select multiple words/sentences
        const baseDelay = isIOS() ? 1500 : 1200;

        selectionStableTimeoutRef.current = setTimeout(() => {
          // Double-check selection is still valid
          const currentSel = window.getSelection();
          if (!currentSel || currentSel.rangeCount === 0) return;

          const currentText = currentSel.toString().trim();
          if (!currentText || currentText.length < 2) return;

          // Skip if already processed this exact selection
          if (currentText === lastProcessedSelection) return;

          const currentRange = currentSel.getRangeAt(0);
          if (!container || !container.contains(currentRange.commonAncestorContainer)) return;

          // Selection is stable, process it
          // processSelection will apply temp highlight and clear native selection
          isSelectingRef.current = false;
          isHandleDraggingRef.current = false;
          lastProcessedSelection = currentText;
          processSelection();
        }, baseDelay);
      }
    };

    // Add touch listeners to track active touch state
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
      if (selectionGrowingTimer) {
        clearTimeout(selectionGrowingTimer);
      }
    };
  }, [isLoggedIn, highlightModeEnabled, processSelection, showColorPicker, showMobileHighlightButton, isIOSDevice]);

  // Touch handling for both iOS and Android
  // Allows native drag selection for multi-word/sentence selection
  // Suppresses OS context menu (copy/paste/select all) completely
  useEffect(() => {
    if (!isTouchDevice() || !highlightModeEnabled || !isLoggedIn) return;

    const container = contentRef.current;
    if (!container) return;

    // Prevent context menu (copy/paste/select all) on all mobile devices - VERY aggressive
    const handleContextMenu = (e: Event) => {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      return false;
    };

    // Prevent copy/cut actions
    const handleCopy = (e: Event) => {
      if (isMobileViewport()) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
    };

    // Allow selection only within container
    const handleSelectStart = (e: Event) => {
      const target = e.target as Node;
      if (!container.contains(target)) {
        e.preventDefault();
        return false;
      }
      // Mark that user started selecting
      isSelectingRef.current = true;
    };

    // Touch start - track position and mark selection start
    const handleTouchStart = (e: TouchEvent) => {
      // If UI is showing, ignore new touches
      if (showColorPicker || showMobileHighlightButton) {
        return;
      }

      const touch = e.touches[0];
      if (!touch) return;

      touchStartPosRef.current = { x: touch.clientX, y: touch.clientY };

      // Check if there's an existing selection - user might be about to drag handles
      const sel = window.getSelection();
      const hasExistingSelection = sel && sel.toString().trim().length > 0;

      if (!hasExistingSelection) {
        // Reset selection tracking only if no existing selection
        lastSelectionTextRef.current = "";
        lastSelectionLengthRef.current = 0;
        isHandleDraggingRef.current = false;
      } else {
        // User might be about to drag selection handles
        isHandleDraggingRef.current = true;
      }

      // Clear any pending timeout from previous selection
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

    // Touch move - user is dragging to select more text or dragging selection handles
    // Clear any pending timeout to allow more selection time
    // Do NOT cancel selection on movement - this allows handle dragging
    const handleTouchMove = () => {
      // Clear any pending processing timeout - user is still adjusting selection
      if (selectionStableTimeoutRef.current) {
        clearTimeout(selectionStableTimeoutRef.current);
        selectionStableTimeoutRef.current = null;
      }

      // Check if there's an active selection - if so, user might be dragging handles
      const sel = window.getSelection();
      if (sel && sel.toString().trim().length > 0) {
        isHandleDraggingRef.current = true;
      }
    };

    // Touch end - handle tap on existing highlights
    // Selection processing is handled by selectionchange event
    const handleTouchEnd = (e: TouchEvent) => {
      const startPos = touchStartPosRef.current;
      touchStartPosRef.current = null;

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

      // Check if user was dragging selection handles (has active selection)
      const sel = window.getSelection();
      const selText = sel?.toString().trim() || "";

      if (selText && selText.length >= 2 && isHandleDraggingRef.current) {
        // User finished dragging selection handles
        // Start a timer to process the selection after a short delay
        // This gives time for any final adjustments
        if (selectionStableTimeoutRef.current) {
          clearTimeout(selectionStableTimeoutRef.current);
        }

        const delay = isIOS() ? 1200 : 800;
        selectionStableTimeoutRef.current = setTimeout(() => {
          const currentSel = window.getSelection();
          if (!currentSel || currentSel.rangeCount === 0) return;

          const currentText = currentSel.toString().trim();
          if (!currentText || currentText.length < 2) return;

          const currentRange = currentSel.getRangeAt(0);
          if (!container || !container.contains(currentRange.commonAncestorContainer)) return;

          isSelectingRef.current = false;
          isHandleDraggingRef.current = false;
          processSelection();
        }, delay);
      }

      // Reset handle dragging state after a delay to allow for continued adjustments
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

    // Prevent selection outside container
    document.addEventListener('selectstart', handleSelectStart, { capture: true });

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
      document.removeEventListener('selectstart', handleSelectStart, { capture: true });
      document.removeEventListener('contextmenu', handleContextMenu, { capture: true });
      document.removeEventListener('copy', handleCopy, { capture: true });
      document.removeEventListener('cut', handleCopy, { capture: true });
    };
  }, [highlightModeEnabled, isLoggedIn, showColorPicker, showMobileHighlightButton, processSelection, removeHighlight]);

  // iOS-specific: Additional event suppression (but uses same selection as Android)
  // This helps prevent native iOS context menu from appearing
  useEffect(() => {
    // Disabled - iOS now uses same approach as Android
    if (true) return;
    if (!isIOSDevice || !highlightModeEnabled || !isLoggedIn) return;

    const container = contentRef.current;
    if (!container) return;

    let longPressTimer: NodeJS.Timeout | null = null;

    const handleIOSTouchStart = (e: TouchEvent) => {
      if (showColorPicker || showMobileHighlightButton) return;

      const touch = e.touches[0];
      if (!touch) return;

      // Get caret position from touch
      const caretPos = getCaretPositionFromPoint(touch.clientX, touch.clientY);
      if (!caretPos || !container.contains(caretPos.node)) return;

      // Check if tapping on existing highlight
      const target = e.target as HTMLElement;
      const highlightMark = target.closest('[data-highlight-id]') as HTMLElement | null;
      if (highlightMark) {
        // Handle tap on existing highlight for removal
        const highlightId = highlightMark.getAttribute('data-highlight-id');
        if (highlightId) {
          e.preventDefault();
          removeHighlight(highlightId);
          removeHighlightFromDOM(container, highlightId);
          appliedHighlightsRef.current.delete(highlightId);
          window.getSelection()?.removeAllRanges();
          return;
        }
      }

      touchStartPosRef.current = { x: touch.clientX, y: touch.clientY };
      isDraggingRef.current = false;

      // Calculate text offset for touch position
      const textOffset = getTextOffset(container, caretPos.node, caretPos.offset);

      iosTouchStartRef.current = {
        x: touch.clientX,
        y: touch.clientY,
        startOffset: textOffset,
        node: caretPos.node,
      };

      // Long press to start selection (like iOS native word selection)
      longPressTimer = setTimeout(() => {
        if (!iosTouchStartRef.current) return;
        isDraggingRef.current = true;

        // Select the word at touch point
        const nodeText = caretPos.node.textContent || "";
        const nodeOffset = caretPos.offset;
        const boundaries = getWordBoundaries(nodeText, nodeOffset);

        // Calculate global offsets
        const nodeStartOffset = getTextOffset(container, caretPos.node, 0);
        const wordStartOffset = nodeStartOffset + boundaries.start;
        const wordEndOffset = nodeStartOffset + boundaries.end;

        if (wordEndOffset > wordStartOffset) {
          // Remove any existing temp highlights
          removeTempHighlights(container);

          // Apply temp highlight for the word
          applyTempHighlight(container, wordStartOffset, wordEndOffset);
          iosSelectionRef.current = { startOffset: wordStartOffset, endOffset: wordEndOffset };

          // Clear native selection
          window.getSelection()?.removeAllRanges();
        }
      }, 300);
    };

    const handleIOSTouchMove = (e: TouchEvent) => {
      const touch = e.touches[0];
      if (!touch) return;

      const startPos = touchStartPosRef.current;
      if (!startPos) return;

      // Calculate movement distance
      const moveDistance = Math.sqrt(
        Math.pow(touch.clientX - startPos.x, 2) +
        Math.pow(touch.clientY - startPos.y, 2)
      );

      // If user moves significantly, they're scrolling - cancel everything
      if (moveDistance > 15) {
        // Cancel long press timer
        if (longPressTimer) {
          clearTimeout(longPressTimer);
          longPressTimer = null;
        }
        // Reset ALL touch tracking - user is scrolling
        iosTouchStartRef.current = null;
        touchStartPosRef.current = null;
        isDraggingRef.current = false;
        iosSelectionRef.current = null;
        // Remove any temp highlights
        removeTempHighlights(container);
        return;
      }
    };

    const handleIOSTouchEnd = (e: TouchEvent) => {
      if (longPressTimer) {
        clearTimeout(longPressTimer);
        longPressTimer = null;
      }

      const selection = iosSelectionRef.current;

      iosTouchStartRef.current = null;
      touchStartPosRef.current = null;

      if (!selection || !isDraggingRef.current) {
        isDraggingRef.current = false;
        iosSelectionRef.current = null;
        return;
      }

      isDraggingRef.current = false;

      // Check if we have a valid selection
      const { startOffset, endOffset } = selection;
      if (endOffset <= startOffset) {
        iosSelectionRef.current = null;
        removeTempHighlights(container);
        return;
      }

      // Get the selected text
      const fullText = getTextContent(container);
      const text = fullText.substring(startOffset, endOffset).trim();

      if (!text || text.length < 2) {
        iosSelectionRef.current = null;
        removeTempHighlights(container);
        return;
      }

      // Get context for matching
      const prefixStart = Math.max(0, startOffset - CONTEXT_LENGTH);
      const suffixEnd = Math.min(fullText.length, endOffset + CONTEXT_LENGTH);
      const prefixContext = fullText.substring(prefixStart, startOffset);
      const suffixContext = fullText.substring(endOffset, suffixEnd);

      // Calculate picker position
      const containerRect = containerRef.current?.getBoundingClientRect();
      if (!containerRect) {
        iosSelectionRef.current = null;
        return;
      }

      const touch = e.changedTouches[0];
      const touchY = touch?.clientY || 0;
      const touchX = touch?.clientX || 0;

      const xPos = touchX - containerRect.left;
      const yPos = touchY - containerRect.top;

      const pickerHeight = 100;
      const spaceAbove = touchY;
      const showBelow = spaceAbove < pickerHeight + 10;

      // Ensure x position is within bounds
      const isMobileView = window.innerWidth < 640;
      const pickerWidth = isMobileView ? 216 : 280;
      const pickerHalfWidth = pickerWidth / 2;
      const containerWidth = containerRect.width;
      const minX = pickerHalfWidth + 10;
      const maxX = containerWidth - pickerHalfWidth - 10;
      const boundedX = Math.max(minX, Math.min(maxX, xPos));

      setSelectedText(text);
      setSelectionInfo({
        startOffset,
        endOffset,
        prefixContext,
        suffixContext,
      });
      setPickerPosition({
        x: boundedX,
        y: yPos,
        showBelow,
      });
      setShowMobileHighlightButton(true);
      setShowColorPicker(false);

      // Keep the temp highlight visible
      // Clear native selection
      window.getSelection()?.removeAllRanges();
    };

    const handleIOSTouchCancel = () => {
      if (longPressTimer) {
        clearTimeout(longPressTimer);
        longPressTimer = null;
      }
      iosTouchStartRef.current = null;
      touchStartPosRef.current = null;
      isDraggingRef.current = false;
      iosSelectionRef.current = null;
      removeTempHighlights(container);
    };

    // Prevent ALL native selection behavior on iOS
    const preventNativeSelection = (e: Event) => {
      e.preventDefault();
      return false;
    };

    // Add iOS-specific listeners
    container.addEventListener('touchstart', handleIOSTouchStart, { passive: false });
    container.addEventListener('touchmove', handleIOSTouchMove, { passive: false });
    container.addEventListener('touchend', handleIOSTouchEnd, { passive: true });
    container.addEventListener('touchcancel', handleIOSTouchCancel, { passive: true });

    // Aggressively prevent native selection on iOS
    container.addEventListener('selectstart', preventNativeSelection, { capture: true });
    container.addEventListener('contextmenu', preventNativeSelection, { capture: true });
    document.addEventListener('selectionchange', () => {
      if (isDraggingRef.current) {
        window.getSelection()?.removeAllRanges();
      }
    });

    return () => {
      if (longPressTimer) clearTimeout(longPressTimer);
      container.removeEventListener('touchstart', handleIOSTouchStart);
      container.removeEventListener('touchmove', handleIOSTouchMove);
      container.removeEventListener('touchend', handleIOSTouchEnd);
      container.removeEventListener('touchcancel', handleIOSTouchCancel);
      container.removeEventListener('selectstart', preventNativeSelection, { capture: true });
      container.removeEventListener('contextmenu', preventNativeSelection, { capture: true });
    };
  }, [isIOSDevice, highlightModeEnabled, isLoggedIn, showColorPicker, showMobileHighlightButton, removeHighlight]);

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
  }, [selectedText, user, selectionInfo, addHighlight, pageId]);

  // Mobile: When user taps the highlight button, show color picker
  const handleMobileHighlightTap = useCallback(() => {
    setShowMobileHighlightButton(false);
    setShowColorPicker(true);
    // Keep temp highlight visible while color picker is shown
    window.getSelection()?.removeAllRanges();
  }, []);

  const closeColorPicker = useCallback(() => {
    // Remove temporary highlight when dismissing
    if (contentRef.current) {
      removeTempHighlights(contentRef.current);
    }

    setShowColorPicker(false);
    setShowMobileHighlightButton(false);
    setSelectedText("");
    setSelectionInfo(null);
    window.getSelection()?.removeAllRanges();
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

      {/* Mobile: Floating highlight button - appears first, user can still adjust selection */}
      {showMobileHighlightButton && isLoggedIn && selectedText && (
        <>
          <div className="fixed inset-0 z-[99]" onClick={closeColorPicker} />
          <div
            className="absolute z-[100] animate-fadeIn"
            style={{
              left: pickerPosition.x,
              top: pickerPosition.showBelow ? pickerPosition.y + 8 : pickerPosition.y,
              transform: pickerPosition.showBelow
                ? "translateX(-50%)"
                : "translateX(-50%) translateY(-100%) translateY(-8px)",
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


      {/* Color picker - positioned near selected text (both mobile and desktop) */}
      {showColorPicker && isLoggedIn && selectedText && (
        <>
          <div className="fixed inset-0 z-[99]" onClick={closeColorPicker} />
          <div
            className="absolute z-[100] bg-white rounded-2xl shadow-2xl border border-gray-200 p-3 sm:p-4 animate-fadeIn"
            style={{
              left: pickerPosition.x,
              top: pickerPosition.showBelow ? pickerPosition.y + 10 : pickerPosition.y,
              transform: pickerPosition.showBelow
                ? "translateX(-50%)"
                : "translateX(-50%) translateY(-100%) translateY(-10px)",
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
        /* Mobile only: Suppression of native menus (pointer: coarse = touch devices) */
        @media (pointer: coarse) {
          /* Prevent selection from escaping the container */
          .highlight-container-mobile {
            -webkit-user-select: none;
            user-select: none;
            -webkit-touch-callout: none !important;
            -webkit-text-size-adjust: none;
          }

          /* Allow selection only within the content area */
          .mobile-highlight-mode {
            -webkit-user-select: text !important;
            user-select: text !important;
            -webkit-touch-callout: none !important;
            -webkit-tap-highlight-color: transparent;
            /* Allow manipulation for selection handles to work */
            touch-action: pan-y pinch-zoom manipulation;
            contain: content;
            position: relative;
            isolation: isolate;
          }

          /* Allow selection on child elements but PREVENT callout completely */
          .mobile-highlight-mode,
          .mobile-highlight-mode * {
            -webkit-user-select: text !important;
            user-select: text !important;
            -webkit-touch-callout: none !important;
          }

          .mobile-highlight-mode::selection,
          .mobile-highlight-mode *::selection {
            background-color: rgba(147, 51, 234, 0.3);
          }
        }

        /* Global fix - ONLY suppress OS options when highlight mode is active */
        @media (pointer: coarse) {
          /* When highlight mode is active, suppress OS options outside content area */
          body.highlight-mode-active {
            -webkit-touch-callout: none !important;
          }

          /* Allow selection in content area when highlight mode is active */
          body.highlight-mode-active .mobile-highlight-mode,
          body.highlight-mode-active .mobile-highlight-mode * {
            -webkit-user-select: text !important;
            user-select: text !important;
            -webkit-touch-callout: none !important;
          }

          /* Explicitly allow selection in highlight content elements */
          body.highlight-mode-active .mobile-highlight-mode,
          body.highlight-mode-active .mobile-highlight-mode p,
          body.highlight-mode-active .mobile-highlight-mode span,
          body.highlight-mode-active .mobile-highlight-mode h1,
          body.highlight-mode-active .mobile-highlight-mode h2,
          body.highlight-mode-active .mobile-highlight-mode h3,
          body.highlight-mode-active .mobile-highlight-mode h4,
          body.highlight-mode-active .mobile-highlight-mode li,
          body.highlight-mode-active .mobile-highlight-mode div,
          body.highlight-mode-active .mobile-highlight-mode section,
          body.highlight-mode-active .mobile-highlight-mode article {
            -webkit-user-select: text !important;
            user-select: text !important;
            -webkit-touch-callout: none !important;
          }

          /* When highlight mode is NOT active, allow normal OS behavior */
          body:not(.highlight-mode-active) * {
            -webkit-touch-callout: auto;
          }
        }

        /* Mobile only: Suppress OS callout menu but ALLOW drag selection */
        @media (pointer: coarse) {
          /* iOS Safari specific - MUST allow user-select for drag selection */
          @supports (-webkit-touch-callout: none) {
            .highlight-container-mobile {
              -webkit-touch-callout: none !important;
            }

            /* Critical: Allow text selection for drag-to-select on iOS */
            .mobile-highlight-mode,
            .mobile-highlight-mode * {
              -webkit-touch-callout: none !important;
              -webkit-user-select: text !important;
              user-select: text !important;
              -webkit-user-drag: none !important;
            }

            /* iOS specific: Enable drag selection with handles */
            .ios-highlight-mode {
              -webkit-touch-callout: none !important;
              -webkit-user-select: text !important;
              user-select: text !important;
              -webkit-tap-highlight-color: transparent !important;
              /* Allow manipulation for selection handles to work on iOS */
              touch-action: pan-y pinch-zoom manipulation !important;
              /* Allow selection handles to work properly */
              -webkit-text-size-adjust: 100%;
              /* Ensure selection handles are interactive */
              pointer-events: auto;
            }

            /* iOS: All text elements must allow selection */
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
            .ios-highlight-mode td,
            .ios-highlight-mode th,
            .ios-highlight-mode article,
            .ios-highlight-mode section {
              -webkit-touch-callout: none !important;
              -webkit-user-select: text !important;
              user-select: text !important;
              -webkit-user-drag: none !important;
            }
          }

          /* Custom purple selection color on mobile */
          .mobile-highlight-mode::selection,
          .mobile-highlight-mode *::selection,
          .ios-highlight-mode::selection,
          .ios-highlight-mode *::selection {
            background-color: rgba(147, 51, 234, 0.3) !important;
          }

          /* Disable tap highlight on mobile */
          .mobile-highlight-mode,
          .ios-highlight-mode {
            -webkit-tap-highlight-color: transparent !important;
          }

          /* Ensure temp highlights are visible */
          .ios-highlight-mode [data-temp-highlight="true"],
          .mobile-highlight-mode [data-temp-highlight="true"] {
            background-color: rgba(147, 51, 234, 0.3) !important;
          }

          /* Ensure selection handles are visible and draggable */
          .mobile-highlight-mode::selection,
          .ios-highlight-mode::selection {
            background-color: rgba(147, 51, 234, 0.4) !important;
          }

          /* Make sure text elements are selectable with handles */
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
          .mobile-highlight-mode td,
          .mobile-highlight-mode th,
          .mobile-highlight-mode article,
          .mobile-highlight-mode section,
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
          .ios-highlight-mode td,
          .ios-highlight-mode th,
          .ios-highlight-mode article,
          .ios-highlight-mode section {
            -webkit-user-select: text !important;
            user-select: text !important;
            pointer-events: auto !important;
          }
        }

        /* Desktop: Normal OS behavior ONLY when highlight mode is NOT active */
        @media (pointer: fine), (hover: hover) {
          /* When highlight mode is NOT active, allow normal OS behavior */
          body:not(.highlight-mode-active) .highlightable-content,
          body:not(.highlight-mode-active) .highlightable-content * {
            -webkit-touch-callout: auto !important;
            -webkit-user-select: text !important;
            user-select: text !important;
          }

          /* When highlight mode IS active on desktop, suppress OS options */
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
