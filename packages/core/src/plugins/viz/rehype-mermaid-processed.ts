import { visit } from "unist-util-visit";
import type { Root, Element } from "hast";

export function rehypeMermaidProcessed() {
  return (tree: Root) => {
    visit(tree, "element", (node: Element) => {
      if (
        node.tagName === "pre" &&
        node.properties?.className &&
        Array.isArray(node.properties.className) &&
        node.properties.className.includes("mermaid")
      ) {
        node.properties.dataProcessed = "true";
      }
    });
  };
}