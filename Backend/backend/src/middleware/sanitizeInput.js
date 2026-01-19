import sanitizeHtml from 'sanitize-html';

const sanitizeConfig = {
  // Allow all TipTap editor tags including formatting, headings, lists, and custom elements
  allowedTags: [
    'p', 'br', 'b', 'i', 'em', 'strong', 'a', 'ul', 'ol', 'li', 'span',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'u', 's', 'mark',
    'blockquote', 'code', 'pre',
    'img', 'div'
  ],
  allowedAttributes: {
    'a': ['href', 'title', 'target', 'rel', 'class', 'style'],
    'span': ['class', 'style', 'data-circle', 'data-color'],
    'p': ['class', 'style'],
    'div': ['class', 'style'],
    'h1': ['class', 'style'],
    'h2': ['class', 'style'],
    'h3': ['class', 'style'],
    'h4': ['class', 'style'],
    'h5': ['class', 'style'],
    'h6': ['class', 'style'],
    'ul': ['class', 'style'],
    'ol': ['class', 'style'],
    'li': ['class', 'style'],
    'blockquote': ['class', 'style'],
    'code': ['class', 'style'],
    'pre': ['class', 'style'],
    'mark': ['class', 'style', 'data-color'],
    'img': ['src', 'alt', 'title', 'class', 'style'],
    'strong': ['style'],
    'em': ['style'],
    'b': ['style'],
    'i': ['style'],
    'u': ['style'],
    's': ['style']
  },
  allowedSchemes: ['http', 'https', 'mailto', 'data'],
  // Allow all safe inline styles for TipTap rich text formatting
  allowedStyles: {
    '*': {
      // Text colors and backgrounds
      'color': [/^#[0-9a-fA-F]{3,6}$/, /^rgb\(/, /^rgba\(/, /^hsl\(/, /^hsla\(/, /^\w+$/],
      'background': [/^#[0-9a-fA-F]{3,6}$/, /^rgb\(/, /^rgba\(/, /^hsl\(/, /^hsla\(/, /^\w+$/],
      'background-color': [/^#[0-9a-fA-F]{3,6}$/, /^rgb\(/, /^rgba\(/, /^hsl\(/, /^hsla\(/, /^\w+$/],

      // Font properties
      'font-family': [/.*/],
      'font-size': [/^\d+(?:px|em|rem|pt|%)$/],
      'font-weight': [/^\d{3}$/, /^(?:normal|bold|bolder|lighter)$/],
      'font-style': [/^(?:normal|italic|oblique)$/],

      // Text decoration and alignment
      'text-decoration': [/.*/],
      'text-decoration-line': [/^(?:none|underline|overline|line-through)$/],
      'text-decoration-color': [/^#[0-9a-fA-F]{3,6}$/, /^rgb\(/, /^rgba\(/],
      'text-decoration-style': [/^(?:solid|double|dotted|dashed|wavy)$/],
      'text-align': [/^(?:left|right|center|justify)$/],

      // Display and spacing
      'display': [/^(?:block|inline|inline-block|flex|inline-flex)$/],
      'padding': [/^\d+(?:px|em|rem|%)(?:\s+\d+(?:px|em|rem|%))*$/],
      'padding-top': [/^\d+(?:px|em|rem|%)$/],
      'padding-right': [/^\d+(?:px|em|rem|%)$/],
      'padding-bottom': [/^\d+(?:px|em|rem|%)$/],
      'padding-left': [/^\d+(?:px|em|rem|%)$/],
      'margin': [/^\d+(?:px|em|rem|%)(?:\s+\d+(?:px|em|rem|%))*$/],
      'margin-top': [/^\d+(?:px|em|rem|%)$/],
      'margin-right': [/^\d+(?:px|em|rem|%)$/],
      'margin-bottom': [/^\d+(?:px|em|rem|%)$/],
      'margin-left': [/^\d+(?:px|em|rem|%)$/],

      // Border properties (for circle extension and others)
      'border': [/.*/],
      'border-radius': [/^\d+(?:px|em|rem|%)(?:\s+\d+(?:px|em|rem|%))*$/],
      'border-color': [/^#[0-9a-fA-F]{3,6}$/, /^rgb\(/, /^rgba\(/],
      'border-width': [/^\d+(?:px|em|rem)$/],
      'border-style': [/^(?:none|solid|dashed|dotted|double)$/],

      // Other useful properties
      'vertical-align': [/^(?:baseline|sub|super|top|text-top|middle|bottom|text-bottom)$/],
      'line-height': [/^\d+(?:\.\d+)?(?:px|em|rem|%)?$/],
      'letter-spacing': [/^-?\d+(?:px|em|rem)$/],
      'word-spacing': [/^-?\d+(?:px|em|rem)$/],
      'white-space': [/^(?:normal|nowrap|pre|pre-wrap|pre-line)$/]
    }
  },
  transformTags: {
    'a': (tagName, attribs) => {
      // Force external links to open in new tab and add security attributes
      if (attribs.href && !attribs.href.startsWith('/')) {
        return {
          tagName: 'a',
          attribs: {
            ...attribs,
            target: '_blank',
            rel: 'noopener noreferrer'
          }
        };
      }
      return { tagName, attribs };
    }
  },
  // Limit nesting depth to prevent DoS
  nestingLimit: 10,
  // Allow data attributes for custom TipTap extensions
  allowedIframeHostnames: []
};

/**
 * Middleware to sanitize specific fields in request body
 * @param {Array<string>} fields - Array of field names to sanitize
 * @returns {Function} Express middleware function
 */
export const sanitizeBody = (fields) => {
  return (req, res, next) => {
    if (!req.body) return next();

    fields.forEach(field => {
      if (req.body[field] && typeof req.body[field] === 'string') {
        // Sanitize HTML content
        req.body[field] = sanitizeHtml(req.body[field], sanitizeConfig);

        // Additional length check (max 50KB per field)
        if (req.body[field].length > 50000) {
          return res.status(400).json({
            error: `Field "${field}" exceeds maximum length of 50,000 characters`
          });
        }
      }
    });

    next();
  };
};

/**
 * Sanitize a single text string
 * @param {string} text - Text to sanitize
 * @returns {string} Sanitized text
 */
export const sanitizeText = (text) => {
  if (!text || typeof text !== 'string') return '';
  return sanitizeHtml(text, sanitizeConfig);
};

/**
 * Strip all HTML tags completely (no tags allowed)
 * @param {string} text - Text to clean
 * @returns {string} Plain text
 */
export const stripAllHtml = (text) => {
  if (!text || typeof text !== 'string') return '';
  return sanitizeHtml(text, {
    allowedTags: [],
    allowedAttributes: {}
  });
};
