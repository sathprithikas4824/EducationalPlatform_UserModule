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

// Get the text node and offset at a specific point (for iOS tap-to-select)
const getTextNodeAtPoint = (x: number, y: number): { node: Text; offset: number } | null => {
  // Use caretPositionFromPoint or caretRangeFromPoint
  let range: Range | null = null;

  if (document.caretRangeFromPoint) {
    range = document.caretRangeFromPoint(x, y);
  } else if ((document as Document & { caretPositionFromPoint?: (x: number, y: number) => { offsetNode: Node; offset: number } | null }).caretPositionFromPoint) {
    const pos = (document as Document & { caretPositionFromPoint: (x: number, y: number) => { offsetNode: Node; offset: number } | null }).caretPositionFromPoint(x, y);
    if (pos && pos.offsetNode) {
      range = document.createRange();
      range.setStart(pos.offsetNode, pos.offset);
      range.setEnd(pos.offsetNode, pos.offset);
    }
  }

  if (!range) return null;

  const node = range.startContainer;
  if (node.nodeType === Node.TEXT_NODE) {
    return { node: node as Text, offset: range.startOffset };
  }

  return null;
};

// Get the sentence containing a position in text
const getSentenceAtPosition = (text: string, position: number): { start: number; end: number; text: string } | null => {
  if (position < 0 || position >= text.length) return null;

  // Find sentence boundaries (., !, ?, or newlines)
  const sentenceEndRegex = /[.!?]\s+|[\n\r]+/g;

  let sentenceStart = 0;
  let sentenceEnd = text.length;

  // Find the start of the sentence (look backwards for sentence ender)
  for (let i = position - 1; i >= 0; i--) {
    if (text[i] === '.' || text[i] === '!' || text[i] === '?' || text[i] === '\n') {
      sentenceStart = i + 1;
      // Skip whitespace after punctuation
      while (sentenceStart < position && /\s/.test(text[sentenceStart])) {
        sentenceStart++;
      }
      break;
    }
  }

  // Find the end of the sentence (look forwards for sentence ender)
  for (let i = position; i < text.length; i++) {
    if (text[i] === '.' || text[i] === '!' || text[i] === '?') {
      sentenceEnd = i + 1;
      break;
    }
    if (text[i] === '\n') {
      sentenceEnd = i;
      break;
    }
  }

  const sentenceText = text.substring(sentenceStart, sentenceEnd).trim();
  if (sentenceText.length < 2) return null;

  return { start: sentenceStart, end: sentenceEnd, text: sentenceText };
};

// Get the word at a position in text
const getWordAtPosition = (text: string, position: number): { start: number; end: number; text: string } | null => {
  if (position < 0 || position >= text.length) return null;

  // Check if position is on a word character
  if (/\s/.test(text[position])) {
    // Try to find nearest word
    let searchPos = position;
    while (searchPos > 0 && /\s/.test(text[searchPos])) {
      searchPos--;
    }
    if (/\s/.test(text[searchPos])) return null;
    position = searchPos;
  }

  // Find word boundaries
  let wordStart = position;
  let wordEnd = position;

  // Find start of word
  while (wordStart > 0 && !/\s/.test(text[wordStart - 1])) {
    wordStart--;
  }

  // Find end of word
  while (wordEnd < text.length && !/\s/.test(text[wordEnd])) {
    wordEnd++;
  }

  const wordText = text.substring(wordStart, wordEnd).trim();
  if (wordText.length < 1) return null;

  return { start: wordStart, end: wordEnd, text: wordText };
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
  const [isiOSDevice, setIsiOSDevice] = useState(false);
  const [isMobileDevice, setIsMobileDevice] = useState(false);
  // iOS tap selection state
  const [iOSTapSelection, setIOSTapSelection] = useState<{
    text: string;
    startOffset: number;
    endOffset: number;
  } | null>(null);
  const [showIOSSelectionUI, setShowIOSSelectionUI] = useState(false);
  // iOS: Store both word and sentence for user choice
  const [iOSWordSelection, setIOSWordSelection] = useState<{
    text: string;
    startOffset: number;
    endOffset: number;
  } | null>(null);
  const [iOSSentenceSelection, setIOSSentenceSelection] = useState<{
    text: string;
    startOffset: number;
    endOffset: number;
  } | null>(null);
  // Show iOS selection options (word/sentence choice)
  const [showIOSOptions, setShowIOSOptions] = useState(false);

  const highlights = getHighlightsForPage(pageId);
  const appliedHighlightsRef = useRef<Set<string>>(new Set());
  const touchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const longPressTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const touchStartPosRef = useRef<{ x: number; y: number } | null>(null);

  // Detect iOS and mobile on client side to avoid hydration mismatch
  useEffect(() => {
    setIsiOSDevice(isIOS());
    setIsMobileDevice(isTouchDevice());
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

    // First check if there's any selection
    const selectionText = selection.toString().trim();
    if (!selectionText || selectionText.length < 2) {
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

    // On mobile: show highlight button first (user can still adjust selection)
    // On desktop: show color picker directly
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

  // iOS: Long-press to select word/sentence (no native selection menu)
  // This completely bypasses iOS native text selection
  const handleIOSLongPress = useCallback((x: number, y: number) => {
    const container = contentRef.current;
    if (!container || !highlightModeEnabled || !isLoggedIn) return;

    // Get the text node at the touch point
    const textNodeInfo = getTextNodeAtPoint(x, y);
    if (!textNodeInfo) return;

    // Make sure the touch is within our container
    if (!container.contains(textNodeInfo.node)) return;

    // Get the full text content and the offset within it
    const fullText = getTextContent(container);
    const offsetInContainer = getTextOffset(container, textNodeInfo.node, textNodeInfo.offset);

    // Get both word and sentence at this position
    const word = getWordAtPosition(fullText, offsetInContainer);
    const sentence = getSentenceAtPosition(fullText, offsetInContainer);

    if (!word && !sentence) return;

    // Store both options for user choice
    if (word) {
      setIOSWordSelection({
        text: word.text,
        startOffset: word.start,
        endOffset: word.end,
      });
    }

    if (sentence) {
      setIOSSentenceSelection({
        text: sentence.text,
        startOffset: sentence.start,
        endOffset: sentence.end,
      });
    }

    // Default to word selection initially (more precise)
    const selection = word || sentence;
    if (!selection) return;

    // Get context for later matching
    const prefixStart = Math.max(0, selection.start - CONTEXT_LENGTH);
    const suffixEnd = Math.min(fullText.length, selection.end + CONTEXT_LENGTH);
    const prefixContext = fullText.substring(prefixStart, selection.start);
    const suffixContext = fullText.substring(selection.end, suffixEnd);

    // Store the selection info (start with word)
    setIOSTapSelection({
      text: selection.text,
      startOffset: selection.start,
      endOffset: selection.end,
    });

    setSelectedText(selection.text);
    setSelectionInfo({
      startOffset: selection.start,
      endOffset: selection.end,
      prefixContext,
      suffixContext,
    });

    // Position the UI near the touch point
    const containerRect = containerRef.current?.getBoundingClientRect();
    if (!containerRect) return;

    const relativeX = x - containerRect.left;
    const relativeY = y - containerRect.top;

    // Keep button within bounds
    const buttonWidth = 200; // Wider for options
    const minX = buttonWidth / 2 + 10;
    const maxX = containerRect.width - buttonWidth / 2 - 10;
    const xPos = Math.max(minX, Math.min(maxX, relativeX));

    setPickerPosition({
      x: xPos,
      y: relativeY,
      showBelow: true, // Show below touch point on iOS
    });

    // Show iOS options UI (word/sentence choice)
    setShowIOSOptions(true);
    setShowMobileHighlightButton(false);
    setShowIOSSelectionUI(true);

    // Haptic feedback if available
    if (navigator.vibrate) {
      navigator.vibrate(50);
    }
  }, [highlightModeEnabled, isLoggedIn]);

  // iOS: Handle user selecting word option
  const handleIOSSelectWord = useCallback(() => {
    if (!iOSWordSelection) return;

    const container = contentRef.current;
    if (!container) return;

    const fullText = getTextContent(container);
    const prefixStart = Math.max(0, iOSWordSelection.startOffset - CONTEXT_LENGTH);
    const suffixEnd = Math.min(fullText.length, iOSWordSelection.endOffset + CONTEXT_LENGTH);
    const prefixContext = fullText.substring(prefixStart, iOSWordSelection.startOffset);
    const suffixContext = fullText.substring(iOSWordSelection.endOffset, suffixEnd);

    setSelectedText(iOSWordSelection.text);
    setSelectionInfo({
      startOffset: iOSWordSelection.startOffset,
      endOffset: iOSWordSelection.endOffset,
      prefixContext,
      suffixContext,
    });

    setShowIOSOptions(false);
    setShowColorPicker(true);
  }, [iOSWordSelection]);

  // iOS: Handle user selecting sentence option
  const handleIOSSelectSentence = useCallback(() => {
    if (!iOSSentenceSelection) return;

    const container = contentRef.current;
    if (!container) return;

    const fullText = getTextContent(container);
    const prefixStart = Math.max(0, iOSSentenceSelection.startOffset - CONTEXT_LENGTH);
    const suffixEnd = Math.min(fullText.length, iOSSentenceSelection.endOffset + CONTEXT_LENGTH);
    const prefixContext = fullText.substring(prefixStart, iOSSentenceSelection.startOffset);
    const suffixContext = fullText.substring(iOSSentenceSelection.endOffset, suffixEnd);

    setSelectedText(iOSSentenceSelection.text);
    setSelectionInfo({
      startOffset: iOSSentenceSelection.startOffset,
      endOffset: iOSSentenceSelection.endOffset,
      prefixContext,
      suffixContext,
    });

    setShowIOSOptions(false);
    setShowColorPicker(true);
  }, [iOSSentenceSelection]);

  // Handle touch selection (mobile) using selectionchange event
  // On iOS: Use long-press instead to avoid native menu
  // On Android: use native selection with debounce
  useEffect(() => {
    if (!isTouchDevice() || !highlightModeEnabled || !isLoggedIn) return;

    const isiOSDevice = isIOS();

    // For iOS: Don't use selectionchange at all - we use long-press
    if (isiOSDevice) {
      // Clear any native selection that might occur
      const clearNativeSelection = () => {
        window.getSelection()?.removeAllRanges();
      };

      // Periodically clear selection on iOS to prevent native menu
      const intervalId = setInterval(() => {
        if (!showColorPicker && !showMobileHighlightButton) {
          // Don't clear if we're not showing our UI
        } else {
          clearNativeSelection();
        }
      }, 100);

      document.addEventListener('selectionchange', clearNativeSelection);

      return () => {
        clearInterval(intervalId);
        document.removeEventListener('selectionchange', clearNativeSelection);
      };
    }

    // Android/Other: Use native selection with selectionchange
    const handleSelectionChange = () => {
      // Don't process if color picker or highlight button is already shown
      if (showColorPicker || showMobileHighlightButton) return;

      // Clear any existing timeout
      if (touchTimeoutRef.current) {
        clearTimeout(touchTimeoutRef.current);
      }

      const container = contentRef.current;

      // Allow time for selection adjustment
      touchTimeoutRef.current = setTimeout(() => {
        const sel = window.getSelection();
        if (!sel || sel.rangeCount === 0) return;

        const selText = sel.toString().trim();
        if (!selText || selText.length < 2) return;

        const selRange = sel.getRangeAt(0);
        if (!container || !container.contains(selRange.commonAncestorContainer)) return;

        processSelection();
      }, 600);
    };

    document.addEventListener('selectionchange', handleSelectionChange);

    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange);
      if (touchTimeoutRef.current) {
        clearTimeout(touchTimeoutRef.current);
      }
    };
  }, [isLoggedIn, highlightModeEnabled, processSelection, showColorPicker, showMobileHighlightButton, handleIOSLongPress]);

  // iOS: Long-press touch handling (completely replaces native text selection)
  // Android: Standard touch handling with native selection
  useEffect(() => {
    if (!isTouchDevice() || !highlightModeEnabled || !isLoggedIn) return;

    const container = contentRef.current;
    if (!container) return;

    const isiOSDevice = isIOS();
    const LONG_PRESS_DURATION = 400; // ms for long press detection

    // Prevent context menu on all mobile devices
    const handleContextMenu = (e: Event) => {
      if (isMobileViewport()) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        return false;
      }
    };

    // iOS: Prevent ALL native text selection
    const handleSelectStart = (e: Event) => {
      if (isiOSDevice && isMobileViewport()) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
      // Android: allow selection only within container
      const target = e.target as Node;
      if (!container.contains(target)) {
        e.preventDefault();
        return false;
      }
    };

    // Touch start - begin long press timer for iOS
    const handleTouchStart = (e: TouchEvent) => {
      if (!isMobileViewport()) return;

      // Clear any existing timers
      if (longPressTimeoutRef.current) {
        clearTimeout(longPressTimeoutRef.current);
        longPressTimeoutRef.current = null;
      }

      // If UI is showing, ignore new touches (except on UI elements)
      if (showColorPicker || showMobileHighlightButton || showIOSOptions) {
        return;
      }

      const touch = e.touches[0];
      if (!touch) return;

      touchStartPosRef.current = { x: touch.clientX, y: touch.clientY };

      if (isiOSDevice) {
        // iOS: Start long press timer
        longPressTimeoutRef.current = setTimeout(() => {
          if (touchStartPosRef.current) {
            handleIOSLongPress(touchStartPosRef.current.x, touchStartPosRef.current.y);
          }
        }, LONG_PRESS_DURATION);
      }
    };

    // Touch move - cancel long press if moved too far
    const handleTouchMove = (e: TouchEvent) => {
      if (!isMobileViewport()) return;

      const touch = e.touches[0];
      if (!touch || !touchStartPosRef.current) return;

      // Calculate distance moved
      const dx = touch.clientX - touchStartPosRef.current.x;
      const dy = touch.clientY - touchStartPosRef.current.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      // If moved more than 10px, cancel long press
      if (distance > 10 && longPressTimeoutRef.current) {
        clearTimeout(longPressTimeoutRef.current);
        longPressTimeoutRef.current = null;
      }

      // iOS: Always clear any native selection
      if (isiOSDevice) {
        window.getSelection()?.removeAllRanges();
      }
    };

    // Touch end - cancel long press timer
    const handleTouchEnd = () => {
      if (longPressTimeoutRef.current) {
        clearTimeout(longPressTimeoutRef.current);
        longPressTimeoutRef.current = null;
      }
      touchStartPosRef.current = null;

      // iOS: Clear any native selection that might have occurred
      if (isiOSDevice) {
        window.getSelection()?.removeAllRanges();
      }
    };

    // Touch cancel - cancel long press timer
    const handleTouchCancel = () => {
      if (longPressTimeoutRef.current) {
        clearTimeout(longPressTimeoutRef.current);
        longPressTimeoutRef.current = null;
      }
      touchStartPosRef.current = null;
    };

    // Add event listeners
    container.addEventListener('contextmenu', handleContextMenu, { capture: true });
    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    container.addEventListener('touchmove', handleTouchMove, { passive: true });
    container.addEventListener('touchend', handleTouchEnd, { passive: true });
    container.addEventListener('touchcancel', handleTouchCancel, { passive: true });

    // iOS: Also prevent selection at document level
    if (isiOSDevice) {
      document.addEventListener('selectstart', handleSelectStart, { capture: true });
      document.addEventListener('contextmenu', handleContextMenu, { capture: true });
    } else {
      // Android: Only prevent selection outside container
      document.addEventListener('selectstart', handleSelectStart, { capture: true });
    }

    return () => {
      container.removeEventListener('contextmenu', handleContextMenu, { capture: true });
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
      container.removeEventListener('touchcancel', handleTouchCancel);
      document.removeEventListener('selectstart', handleSelectStart, { capture: true });
      if (isiOSDevice) {
        document.removeEventListener('contextmenu', handleContextMenu, { capture: true });
      }
      if (longPressTimeoutRef.current) {
        clearTimeout(longPressTimeoutRef.current);
      }
    };
  }, [highlightModeEnabled, isLoggedIn, showColorPicker, showMobileHighlightButton, showIOSOptions, handleIOSLongPress]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (touchTimeoutRef.current) {
        clearTimeout(touchTimeoutRef.current);
      }
      if (longPressTimeoutRef.current) {
        clearTimeout(longPressTimeoutRef.current);
      }
    };
  }, []);

  // Add body class for mobile highlight mode to prevent page-wide selection
  useEffect(() => {
    if (!isTouchDevice() || !highlightModeEnabled || !isLoggedIn) {
      document.body.classList.remove('highlight-mode-active');
      return;
    }

    document.body.classList.add('highlight-mode-active');
    return () => {
      document.body.classList.remove('highlight-mode-active');
    };
  }, [highlightModeEnabled, isLoggedIn]);

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

  // Mobile: When user taps the highlight button, show color picker
  const handleMobileHighlightTap = useCallback(() => {
    setShowMobileHighlightButton(false);
    setShowColorPicker(true);
    // Clear native selection now that we're showing the picker
    window.getSelection()?.removeAllRanges();
  }, []);

  const closeColorPicker = useCallback(() => {
    setShowColorPicker(false);
    setShowMobileHighlightButton(false);
    setShowIOSSelectionUI(false);
    setShowIOSOptions(false);
    setIOSTapSelection(null);
    setIOSWordSelection(null);
    setIOSSentenceSelection(null);
    setSelectedText("");
    setSelectionInfo(null);
    window.getSelection()?.removeAllRanges();
  }, []);

  // Determine if we should use iOS mode (no native selection)
  const useIOSMode = highlightModeEnabled && isiOSDevice;

  return (
    <div
      ref={containerRef}
      className={`relative ${className} ${highlightModeEnabled && isMobileDevice ? "highlight-container-mobile" : ""} ${useIOSMode ? "ios-highlight-container" : ""}`}
      style={highlightModeEnabled && isMobileDevice ? {
        WebkitTouchCallout: 'none',
        WebkitUserSelect: 'none',
        userSelect: 'none',
      } as React.CSSProperties : undefined}
    >
      <div
        ref={contentRef}
        onMouseUp={handleMouseUp}
        className={`highlightable-content ${showColorPicker ? "picker-active" : ""} ${highlightModeEnabled && isMobileDevice ? "mobile-highlight-mode" : ""} ${useIOSMode ? "ios-no-select" : ""}`}
        style={highlightModeEnabled && isMobileDevice ? {
          WebkitTouchCallout: 'none',
          // iOS: Disable all native selection - we use long-press instead
          // Android: Allow native text selection
          WebkitUserSelect: useIOSMode ? 'none' : 'text',
          userSelect: useIOSMode ? 'none' : 'text',
          touchAction: 'pan-y pinch-zoom',
          contain: 'content',
          isolation: 'isolate',
        } as React.CSSProperties : undefined}
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

      {/* iOS: Word/Sentence selection options - appears after long-press */}
      {showIOSOptions && isLoggedIn && (iOSWordSelection || iOSSentenceSelection) && (
        <>
          <div className="fixed inset-0 z-[99]" onClick={closeColorPicker} />
          <div
            className="absolute z-[100] bg-white rounded-2xl shadow-2xl border border-gray-200 p-3 animate-fadeIn"
            style={{
              left: pickerPosition.x,
              top: pickerPosition.y + 10,
              transform: "translateX(-50%)",
              minWidth: "200px",
              maxWidth: "90vw",
            }}
          >
            <p className="text-xs text-gray-500 mb-2 text-center font-medium">
              What to highlight?
            </p>
            <div className="flex flex-col gap-2">
              {/* Word option */}
              {iOSWordSelection && (
                <button
                  type="button"
                  onClick={handleIOSSelectWord}
                  className="flex flex-col items-start gap-1 px-3 py-2.5 bg-purple-50 hover:bg-purple-100 active:bg-purple-200 rounded-xl transition-colors text-left w-full"
                >
                  <span className="text-xs font-semibold text-purple-600">Word</span>
                  <span className="text-sm text-gray-800 line-clamp-1 break-all">
                    &ldquo;{iOSWordSelection.text}&rdquo;
                  </span>
                </button>
              )}
              {/* Sentence option */}
              {iOSSentenceSelection && (
                <button
                  type="button"
                  onClick={handleIOSSelectSentence}
                  className="flex flex-col items-start gap-1 px-3 py-2.5 bg-blue-50 hover:bg-blue-100 active:bg-blue-200 rounded-xl transition-colors text-left w-full"
                >
                  <span className="text-xs font-semibold text-blue-600">Sentence</span>
                  <span className="text-sm text-gray-800 line-clamp-2 break-words">
                    &ldquo;{iOSSentenceSelection.text.length > 60
                      ? iOSSentenceSelection.text.substring(0, 60) + "..."
                      : iOSSentenceSelection.text}&rdquo;
                  </span>
                </button>
              )}
            </div>
            {/* Cancel button */}
            <button
              type="button"
              onClick={closeColorPicker}
              className="mt-2 w-full py-2 text-xs text-gray-500 hover:text-gray-700 transition-colors"
            >
              Cancel
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

      {/* Mobile styles to suppress native context menu and contain selection */}
      <style>{`
        @media (max-width: 639px) {
          /* Prevent selection from escaping the container */
          .highlight-container-mobile {
            -webkit-user-select: none;
            user-select: none;
            -webkit-touch-callout: none !important;
          }

          /* Android: Allow selection only within the content area */
          .mobile-highlight-mode:not(.ios-no-select) {
            -webkit-user-select: text !important;
            user-select: text !important;
            -webkit-touch-callout: none !important;
            -webkit-tap-highlight-color: transparent;
            touch-action: pan-y pinch-zoom;
            contain: content;
            position: relative;
            isolation: isolate;
          }

          /* Android: Allow selection on child elements */
          .mobile-highlight-mode:not(.ios-no-select) * {
            -webkit-user-select: text;
            user-select: text;
            -webkit-touch-callout: none !important;
          }

          .mobile-highlight-mode:not(.ios-no-select)::selection {
            background-color: rgba(147, 51, 234, 0.3);
          }
          .mobile-highlight-mode:not(.ios-no-select) *::selection {
            background-color: rgba(147, 51, 234, 0.3);
          }
        }

        /* iOS: COMPLETELY disable native text selection - use long-press instead */
        .ios-no-select,
        .ios-no-select * {
          -webkit-user-select: none !important;
          user-select: none !important;
          -webkit-touch-callout: none !important;
          -webkit-tap-highlight-color: transparent !important;
        }

        /* iOS: No selection highlighting at all */
        .ios-no-select::selection,
        .ios-no-select *::selection {
          background-color: transparent !important;
        }

        /* iOS highlight container - disable everything */
        .ios-highlight-container,
        .ios-highlight-container * {
          -webkit-user-select: none !important;
          user-select: none !important;
          -webkit-touch-callout: none !important;
        }

        /* iOS Safari specific - ensure native callout never appears */
        @supports (-webkit-touch-callout: none) {
          .ios-highlight-container,
          .ios-highlight-container * {
            -webkit-touch-callout: none !important;
            -webkit-user-select: none !important;
            user-select: none !important;
          }

          body.highlight-mode-active {
            -webkit-touch-callout: none !important;
            -webkit-user-select: none !important;
            user-select: none !important;
          }
        }

        /* Global fix to prevent parent elements from being selected on touch */
        @media (pointer: coarse) {
          body.highlight-mode-active {
            -webkit-user-select: none !important;
            user-select: none !important;
            -webkit-touch-callout: none !important;
          }

          body.highlight-mode-active .mobile-highlight-mode,
          body.highlight-mode-active .mobile-highlight-mode * {
            -webkit-user-select: text !important;
            user-select: text !important;
          }

          /* Prevent ALL other elements from being selected */
          body.highlight-mode-active *:not(.mobile-highlight-mode):not(.mobile-highlight-mode *) {
            -webkit-user-select: none !important;
            user-select: none !important;
            -webkit-touch-callout: none !important;
          }

          /* Explicitly allow selection in highlight content */
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
          }
        }
      `}</style>
    </div>
  );
};

export default Highlightable;
