import { global } from '@storybook/global';
import type { Result, NodeResult } from 'axe-core';

const { document } = global;

// APCA contrast thresholds based on WCAG 3 draft
const APCA_THRESHOLDS = {
  BODY_TEXT: 75, // Primary readable content
  SECONDARY_TEXT: 60, // Secondary content (75 - 15)
  SPOT_TEXT: 50, // Placeholders, labels (75 - 25)
  MINIMUM: 30, // Absolute minimum
} as const;

interface APCAViolation {
  element: Element;
  foreground: string;
  background: string;
  contrastValue: number;
  fontSize: number;
  fontWeight: number;
  threshold: number;
}

/**
 * Get computed color for an element
 */
function getComputedColor(element: Element, property: 'color' | 'backgroundColor'): string {
  const computed = global.getComputedStyle(element);
  return computed[property] || '';
}

/**
 * Get the effective background color by traversing up the DOM
 */
function getEffectiveBackgroundColor(element: Element): string {
  let current: Element | null = element;

  while (current && current !== document.body) {
    const bgColor = getComputedColor(current, 'backgroundColor');
    // Check if background is not transparent
    if (bgColor && bgColor !== 'rgba(0, 0, 0, 0)' && bgColor !== 'transparent') {
      return bgColor;
    }
    current = current.parentElement;
  }

  // Default to white if no background found
  return 'rgb(255, 255, 255)';
}

/**
 * Convert RGB/RGBA string to array of numbers
 */
function parseColor(color: string): [number, number, number] | null {
  const match = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (!match) return null;

  return [parseInt(match[1], 10), parseInt(match[2], 10), parseInt(match[3], 10)];
}

/**
 * Determine the appropriate APCA threshold based on font size and weight
 */
function getAPCAThreshold(fontSize: number, fontWeight: number): number {
  // Convert font size from px to points (approximately)
  const fontSizePt = fontSize * 0.75;

  // For larger fonts (≥24px and weight ≥300), use lower threshold
  if (fontSize >= 24 && fontWeight >= 300) {
    return APCA_THRESHOLDS.SECONDARY_TEXT;
  }

  // For bold text (weight ≥700)
  if (fontWeight >= 700) {
    return APCA_THRESHOLDS.SECONDARY_TEXT;
  }

  // Default to body text threshold
  return APCA_THRESHOLDS.BODY_TEXT;
}

/**
 * Check if element contains readable text
 */
function hasReadableText(element: Element): boolean {
  const text = element.textContent?.trim() || '';
  // Ignore elements with no text or very short text (like icons)
  return text.length > 0 && !element.hasAttribute('aria-hidden');
}

/**
 * Check if element is visible
 */
function isVisible(element: Element): boolean {
  const computed = global.getComputedStyle(element);
  return (
    computed.display !== 'none' &&
    computed.visibility !== 'hidden' &&
    computed.opacity !== '0'
  );
}

/**
 * Run APCA contrast checks on the document
 */
export async function runAPCACheck(context: Element | Document = document): Promise<Result> {
  // Dynamic import of APCA library
  const { calcAPCA, sRGBtoY } = await import('apca-w3');

  const violations: APCAViolation[] = [];
  const root = context instanceof Document ? context.body : context;

  // Get all text-containing elements
  const textElements = root.querySelectorAll(
    'p, span, div, h1, h2, h3, h4, h5, h6, a, button, label, td, th, li, input, textarea'
  );

  textElements.forEach((element) => {
    // Skip if not visible or has no text
    if (!isVisible(element) || !hasReadableText(element)) {
      return;
    }

    // Get colors
    const foreground = getComputedColor(element, 'color');
    const background = getEffectiveBackgroundColor(element);

    // Parse colors
    const fgColor = parseColor(foreground);
    const bgColor = parseColor(background);

    if (!fgColor || !bgColor) {
      return;
    }

    // Get font properties
    const computed = global.getComputedStyle(element);
    const fontSize = parseFloat(computed.fontSize);
    const fontWeight = parseInt(computed.fontWeight, 10);

    try {
      // Calculate APCA contrast
      const fgLuminance = sRGBtoY(fgColor);
      const bgLuminance = sRGBtoY(bgColor);
      const contrastValue = Math.abs(calcAPCA(fgLuminance, bgLuminance));

      // Get appropriate threshold
      const threshold = getAPCAThreshold(fontSize, fontWeight);

      // Check if contrast is sufficient
      if (contrastValue < threshold) {
        violations.push({
          element,
          foreground,
          background,
          contrastValue,
          fontSize,
          fontWeight,
          threshold,
        });
      }
    } catch (error) {
      // Skip elements that cause calculation errors
      console.warn('APCA calculation error:', error);
    }
  });

  // Convert violations to axe-core compatible format
  const nodes: NodeResult[] = violations.map((violation) => ({
    html: violation.element.outerHTML,
    target: [getSelector(violation.element)],
    any: [],
    all: [],
    none: [],
    impact: getImpact(violation.contrastValue, violation.threshold),
    failureSummary: `APCA contrast of ${violation.contrastValue.toFixed(1)} Lc is below the minimum of ${violation.threshold} Lc for this text size and weight.`,
  }));

  return {
    id: 'apca-contrast',
    impact: nodes.length > 0 ? 'serious' : null,
    tags: ['wcag3', 'wcag30', 'apca', 'contrast'],
    description: 'Ensures text has sufficient contrast using APCA (WCAG 3.0 method)',
    help: 'Elements must have sufficient color contrast using APCA',
    helpUrl: 'https://git.apcacontrast.com/',
    nodes,
  };
}

/**
 * Generate a CSS selector for an element
 */
function getSelector(element: Element): string {
  if (element.id) {
    return `#${element.id}`;
  }

  const path: string[] = [];
  let current: Element | null = element;

  while (current && current !== document.body) {
    let selector = current.tagName.toLowerCase();

    if (current.className) {
      const classes = current.className.split(' ').filter(Boolean);
      if (classes.length > 0) {
        selector += `.${classes[0]}`;
      }
    }

    // Add nth-child for specificity
    const parent = current.parentElement;
    if (parent) {
      const siblings = Array.from(parent.children);
      const index = siblings.indexOf(current) + 1;
      selector += `:nth-child(${index})`;
    }

    path.unshift(selector);
    current = parent;
  }

  return path.join(' > ');
}

/**
 * Determine impact level based on how far below threshold
 */
function getImpact(contrastValue: number, threshold: number): 'minor' | 'moderate' | 'serious' | 'critical' {
  const difference = threshold - contrastValue;

  if (difference > 30) {
    return 'critical';
  } else if (difference > 20) {
    return 'serious';
  } else if (difference > 10) {
    return 'moderate';
  }
  return 'minor';
}
