import { marked } from 'marked';

type RichTextNode = {
  type?: string;
  text?: string;
  bold?: boolean;
  italic?: boolean;
  children?: RichTextNode[];
};

function normalizeInlineText(value: string): string {
  return value.replace(/\\([*_])/g, '$1');
}

function renderInlineNode(node: RichTextNode): string {
  if (!node) {
    return '';
  }

  if (node.type === 'text') {
    let text = normalizeInlineText(node.text || '');

    if (node.bold) {
      text = `**${text}**`;
    }

    if (node.italic) {
      text = `*${text}*`;
    }

    return text;
  }

  if (node.type === 'break') {
    return '\n';
  }

  if (Array.isArray(node.children)) {
    return node.children.map(renderInlineNode).join('');
  }

  return '';
}

export function richTextToMarkdown(content: unknown): string {
  if (!content) {
    return '';
  }

  if (typeof content === 'string') {
    return content;
  }

  if (typeof content !== 'object') {
    return String(content);
  }

  const root = content as RichTextNode;

  if (!Array.isArray(root.children)) {
    return '';
  }

  return root.children
    .map((child) => {
      if (child.type === 'p') {
        return renderInlineNode(child).trimEnd();
      }

      return renderInlineNode(child).trimEnd();
    })
    .filter(Boolean)
    .join('\n\n');
}

export function richTextToHtml(content: unknown): string {
  const markdown = richTextToMarkdown(content);

  if (!markdown) {
    return '';
  }

  return marked.parse(markdown, {
    gfm: true,
    breaks: true,
    mangle: false,
    headerIds: false,
  }) as string;
}