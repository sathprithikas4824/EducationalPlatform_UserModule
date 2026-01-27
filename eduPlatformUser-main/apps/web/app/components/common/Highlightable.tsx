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

  const highlights = getHighlightsForPage(pageId);
  const appliedHighlightsRef = useRef<Set<string>>(new Set());
  const touchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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

  // Handle touch selection (mobile) using selectionchange event
  // On iOS: process immediately and clear selection to prevent native menu
  // On Android: allow time for selection adjustment
  useEffect(() => {
    if (!isTouchDevice() || !highlightModeEnabled || !isLoggedIn) return;

    const isiOSDevice = isIOS();

    const handleSelectionChange = () => {
      // Don't process if color picker or highlight button is already shown
      if (showColorPicker || showMobileHighlightButton) return;

      // Clear any existing timeout
      if (touchTimeoutRef.current) {
        clearTimeout(touchTimeoutRef.current);
      }

      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) return;

      const text = selection.toString().trim();
      if (!text || text.length < 2) return;

      const range = selection.getRangeAt(0);
      const container = contentRef.current;

      // Only process if selection is within our container
      if (!container || !container.contains(range.commonAncestorContainer)) {
        // Selection is outside container - clear it on iOS to prevent page selection
        if (isiOSDevice) {
          selection.removeAllRanges();
        }
        return;
      }

      if (isiOSDevice) {
        // iOS: Process IMMEDIATELY to beat the native menu
        // Use very short timeout just to let the selection finalize
        touchTimeoutRef.current = setTimeout(() => {
          const sel = window.getSelection();
          if (!sel || sel.rangeCount === 0) return;

          const selText = sel.toString().trim();
          if (!selText || selText.length < 2) return;

          const selRange = sel.getRangeAt(0);
          if (!container.contains(selRange.commonAncestorContainer)) {
            sel.removeAllRanges();
            return;
          }

          // Process the selection
          processSelection();

          // CRITICAL: Clear the native selection immediately after processing
          // This prevents iOS from showing its native menu
          setTimeout(() => {
            window.getSelection()?.removeAllRanges();
          }, 10);
        }, 100); // Very short delay for iOS
      } else {
        // Android/Other: Allow more time for selection adjustment
        touchTimeoutRef.current = setTimeout(() => {
          const sel = window.getSelection();
          if (!sel || sel.rangeCount === 0) return;

          const selText = sel.toString().trim();
          if (!selText || selText.length < 2) return;

          const selRange = sel.getRangeAt(0);
          if (!container.contains(selRange.commonAncestorContainer)) return;

          processSelection();
        }, 600);
      }
    };

    document.addEventListener('selectionchange', handleSelectionChange);

    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange);
      if (touchTimeoutRef.current) {
        clearTimeout(touchTimeoutRef.current);
      }
    };
  }, [isLoggedIn, highlightModeEnabled, processSelection, showColorPicker, showMobileHighlightButton]);

  // Prevent native context menu on mobile when highlight mode is enabled
  // Also handle touch events to contain selection within the component
  useEffect(() => {
    if (!isTouchDevice() || !highlightModeEnabled || !isLoggedIn) return;

    const container = contentRef.current;
    if (!container) return;

    // For iOS: we need to suppress the native callout menu aggressively
    const isiOSDevice = isIOS();

    const handleContextMenu = (e: Event) => {
      // ALWAYS prevent native context menu on mobile when highlight mode is on
      if (isMobileViewport()) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        return false;
      }
    };

    // Handle selectstart to ensure selection stays within container
    const handleSelectStart = (e: Event) => {
      if (!isMobileViewport()) return;

      // Ensure selection starts within our container
      const target = e.target as Node;
      if (!container.contains(target)) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
    };

    // For iOS: Intercept touch events to prevent native menu
    const handleTouchStart = () => {
      if (!isMobileViewport()) return;

      // On iOS, if we already have our UI showing, clear any new selection attempts
      if (isiOSDevice && (showColorPicker || showMobileHighlightButton)) {
        window.getSelection()?.removeAllRanges();
      }
    };

    // Handle touchmove to prevent selection from extending outside container
    const handleTouchMove = (e: TouchEvent) => {
      if (!isMobileViewport()) return;

      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) return;

      const range = selection.getRangeAt(0);

      // If selection has extended outside our container, clear it immediately
      if (!container.contains(range.commonAncestorContainer)) {
        selection.removeAllRanges();
        if (isiOSDevice) {
          e.preventDefault();
        }
      }
    };

    // Handle touchend - on iOS we process in selectionchange, here we just prevent defaults
    const handleTouchEnd = (e: TouchEvent) => {
      if (!isMobileViewport()) return;

      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);

        // If selection extends outside container, clear it
        if (!container.contains(range.commonAncestorContainer)) {
          e.preventDefault();
          e.stopPropagation();
          selection.removeAllRanges();
          return;
        }
      }
    };

    // For iOS: Prevent the native action sheet by intercepting touch events globally
    const handleGlobalTouchEnd = (e: TouchEvent) => {
      if (!isiOSDevice || !isMobileViewport()) return;

      // If our highlight UI is showing, prevent any default touch behavior
      if (showMobileHighlightButton || showColorPicker) {
        const target = e.target as HTMLElement;
        // Don't prevent touches on our own UI elements
        if (!target.closest('.highlight-container-mobile') &&
            !target.closest('[class*="z-[100]"]')) {
          e.preventDefault();
        }
      }
    };

    // Listen for the native action sheet and try to prevent it
    const handleTouchCancel = () => {
      // Touch was cancelled (possibly by iOS showing menu) - reprocess if needed
      if (isiOSDevice && !showColorPicker && !showMobileHighlightButton) {
        setTimeout(() => {
          const sel = window.getSelection();
          if (sel && sel.rangeCount > 0 && sel.toString().trim().length >= 2) {
            const range = sel.getRangeAt(0);
            if (container.contains(range.commonAncestorContainer)) {
              processSelection();
              // Clear immediately after processing
              setTimeout(() => {
                window.getSelection()?.removeAllRanges();
              }, 0);
            }
          }
        }, 0);
      }
    };

    // Use capture phase to intercept events before they bubble
    container.addEventListener('contextmenu', handleContextMenu, { capture: true });
    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    container.addEventListener('touchend', handleTouchEnd, { capture: true });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchcancel', handleTouchCancel);
    document.addEventListener('selectstart', handleSelectStart, { capture: true });

    // For iOS: also listen on document level to catch everything
    if (isiOSDevice) {
      document.addEventListener('contextmenu', handleContextMenu, { capture: true });
      document.addEventListener('touchend', handleGlobalTouchEnd, { capture: true, passive: false });
    }

    return () => {
      container.removeEventListener('contextmenu', handleContextMenu, { capture: true });
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchend', handleTouchEnd, { capture: true });
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchcancel', handleTouchCancel);
      document.removeEventListener('selectstart', handleSelectStart, { capture: true });
      if (isiOSDevice) {
        document.removeEventListener('contextmenu', handleContextMenu, { capture: true });
        document.removeEventListener('touchend', handleGlobalTouchEnd, { capture: true });
      }
    };
  }, [highlightModeEnabled, isLoggedIn, showColorPicker, showMobileHighlightButton, processSelection]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (touchTimeoutRef.current) {
        clearTimeout(touchTimeoutRef.current);
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
    setSelectedText("");
    setSelectionInfo(null);
    window.getSelection()?.removeAllRanges();
  }, []);

  return (
    <div
      ref={containerRef}
      className={`relative ${className} ${highlightModeEnabled && isMobileDevice ? "highlight-container-mobile" : ""} ${highlightModeEnabled && isiOSDevice ? "ios-highlight-container" : ""}`}
      style={highlightModeEnabled && isMobileDevice ? {
        WebkitTouchCallout: 'none',
        WebkitUserSelect: 'none',
        userSelect: 'none',
      } as React.CSSProperties : undefined}
    >
      <div
        ref={contentRef}
        onMouseUp={handleMouseUp}
        className={`highlightable-content ${showColorPicker ? "picker-active" : ""} ${highlightModeEnabled && isMobileDevice ? "mobile-highlight-mode" : ""}`}
        style={highlightModeEnabled && isMobileDevice ? {
          WebkitTouchCallout: 'none',
          WebkitUserSelect: 'text',
          userSelect: 'text',
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

          /* Allow selection only within the content area */
          .mobile-highlight-mode {
            -webkit-user-select: text !important;
            user-select: text !important;
            -webkit-touch-callout: none !important;
            -webkit-tap-highlight-color: transparent;
            touch-action: pan-y pinch-zoom;
            contain: content;
            position: relative;
            isolation: isolate;
          }

          /* Prevent selection on child elements from bubbling */
          .mobile-highlight-mode * {
            -webkit-user-select: text;
            user-select: text;
            -webkit-touch-callout: none !important;
          }

          .mobile-highlight-mode::selection {
            background-color: rgba(147, 51, 234, 0.3);
          }
          .mobile-highlight-mode *::selection {
            background-color: rgba(147, 51, 234, 0.3);
          }
        }

        /* iOS Safari specific - suppress native callout menu */
        @supports (-webkit-touch-callout: none) {
          .highlight-container-mobile,
          .highlight-container-mobile * {
            -webkit-touch-callout: none !important;
          }

          .mobile-highlight-mode {
            -webkit-touch-callout: none !important;
            -webkit-user-select: text !important;
          }

          /* Disable iOS text selection magnifier behavior on non-content areas */
          body.highlight-mode-active {
            -webkit-touch-callout: none !important;
            -webkit-user-select: none !important;
            user-select: none !important;
          }

          body.highlight-mode-active .mobile-highlight-mode {
            -webkit-user-select: text !important;
            user-select: text !important;
          }

          body.highlight-mode-active .mobile-highlight-mode * {
            -webkit-user-select: text !important;
            user-select: text !important;
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
