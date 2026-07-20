import type { Element, Root } from "hast";

const blockedValuePattern = /(?:url\s*\(|expression\s*\(|javascript:|data:|var\s*\(|@import|[{}<>])/i;
const colorPattern = /^(?:#[0-9a-f]{3,8}|(?:rgb|hsl)a?\(\s*[0-9.%+\-,\s]+\)|[a-z]{3,24})$/i;
const lengthPattern = /^(?:0|-?(?:\d+(?:\.\d+)?|\.\d+)(?:px|em|rem|%|pt|ch|ex|vw|vh|vmin|vmax))$/i;
const fontSizeKeywords = /^(?:xx-small|x-small|small|medium|large|x-large|xx-large|xxx-large|smaller|larger|inherit|initial|unset)$/i;
const fontWeightPattern = /^(?:normal|bold|bolder|lighter|[1-9]00|inherit|initial|unset)$/i;
const textDecorationPattern = /^(?:(?:none|underline|overline|line-through|solid|double|dotted|dashed|wavy|inherit|initial|unset)(?:\s+|$))+$/i;

function isSafeColor(value: string) {
  return !blockedValuePattern.test(value) && colorPattern.test(value);
}

function isLengthList(value: string, maximum = 4) {
  const parts = value.trim().split(/\s+/);
  return parts.length > 0 && parts.length <= maximum && parts.every((part) => lengthPattern.test(part));
}

function isSafeValue(property: string, value: string) {
  if (!value || blockedValuePattern.test(value)) return false;
  switch (property) {
    case "color":
    case "background":
    case "background-color":
      return isSafeColor(value);
    case "font-size":
      return lengthPattern.test(value) || fontSizeKeywords.test(value);
    case "font-weight":
      return fontWeightPattern.test(value);
    case "text-decoration":
    case "text-decoration-line":
      return textDecorationPattern.test(value);
    case "padding":
    case "border-radius":
      return isLengthList(value);
    case "line-height":
      return /^(?:normal|\d+(?:\.\d+)?|\.\d+)$/.test(value) || lengthPattern.test(value);
    case "letter-spacing":
      return value === "normal" || lengthPattern.test(value);
    default:
      return false;
  }
}

export function sanitizeInlineStyle(style: string | null | undefined): string {
  if (!style) return "";
  const declarations = new Map<string, string>();
  for (const declaration of style.split(";")) {
    const separator = declaration.indexOf(":");
    if (separator <= 0) continue;
    const property = declaration.slice(0, separator).trim().toLowerCase();
    const value = declaration.slice(separator + 1).trim();
    if (isSafeValue(property, value)) declarations.set(property, value);
  }
  return Array.from(declarations, ([property, value]) => `${property}: ${value}`).join("; ");
}

export function mergeInlineColor(style: string, color: string | null | undefined): string {
  if (!color || !isSafeColor(color.trim())) return sanitizeInlineStyle(style);
  const safeStyle = sanitizeInlineStyle(style);
  if (/(?:^|;)\s*color\s*:/i.test(safeStyle)) return safeStyle;
  return sanitizeInlineStyle(`${safeStyle}; color: ${color.trim()}`);
}

function sanitizeElement(element: Element) {
  const properties = element.properties as Record<string, unknown>;
  const legacyColor = typeof properties.color === "string" ? properties.color : undefined;
  const rawStyle = typeof properties.style === "string" ? properties.style : "";
  const safeStyle = mergeInlineColor(rawStyle, legacyColor);

  if (element.tagName === "font") element.tagName = "span";
  delete properties.color;
  delete properties.face;
  delete properties.size;

  if (safeStyle) properties.style = safeStyle;
  else delete properties.style;
}

function visit(node: Root | Element) {
  if (node.type === "element") sanitizeElement(node);
  for (const child of node.children) {
    if (child.type === "element") visit(child);
  }
}

export default function rehypeSafeInlineStyles() {
  return (tree: Root) => visit(tree);
}
