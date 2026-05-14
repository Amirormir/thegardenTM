import { Fragment, type ReactNode } from 'react';

const INLINE_PATTERN = /\*\*([^*\n]+)\*\*|__([^_\n]+)__|\*([^*\n]+)\*|_([^_\n]+)_/g;

function renderInline(text: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  let lastIndex = 0;
  let keyIndex = 0;
  let match: RegExpExecArray | null;
  INLINE_PATTERN.lastIndex = 0;

  while ((match = INLINE_PATTERN.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(
        <Fragment key={`t-${keyIndex++}`}>{text.slice(lastIndex, match.index)}</Fragment>,
      );
    }

    const boldContent = match[1] ?? match[2];
    const italicContent = match[3] ?? match[4];

    if (boldContent !== undefined) {
      nodes.push(
        <strong key={`b-${keyIndex++}`} className="font-semibold text-foreground">
          {boldContent}
        </strong>,
      );
    } else if (italicContent !== undefined) {
      nodes.push(<em key={`i-${keyIndex++}`}>{italicContent}</em>);
    }

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    nodes.push(<Fragment key={`t-${keyIndex++}`}>{text.slice(lastIndex)}</Fragment>);
  }

  return nodes.length > 0 ? nodes : [text];
}

export function renderArticleBody(body: string): ReactNode[] {
  const blocks: ReactNode[] = [];
  const lines = body.split(/\r?\n/);
  let buffer: string[] = [];
  let blockIndex = 0;

  const flushParagraph = () => {
    const text = buffer.join('\n').trim();
    buffer = [];
    if (text.length === 0) return;
    blocks.push(<p key={`p-${blockIndex++}`}>{renderInline(text)}</p>);
  };

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed === '') {
      flushParagraph();
      continue;
    }

    if (trimmed === '---' || trimmed === '***') {
      flushParagraph();
      blocks.push(
        <hr
          key={`hr-${blockIndex++}`}
          className="my-2 border-0 border-t border-hairline"
          aria-hidden
        />,
      );
      continue;
    }

    if (trimmed.startsWith('## ')) {
      flushParagraph();
      const content = trimmed.slice(3).trim();
      blocks.push(
        <h3
          key={`h3-${blockIndex++}`}
          className="mt-4 font-display text-2xl leading-tight text-foreground first:mt-0"
        >
          {renderInline(content)}
        </h3>,
      );
      continue;
    }

    if (trimmed.startsWith('# ')) {
      flushParagraph();
      const content = trimmed.slice(2).trim();
      blocks.push(
        <h2
          key={`h2-${blockIndex++}`}
          className="mt-6 display-md text-foreground first:mt-0"
        >
          {renderInline(content)}
        </h2>,
      );
      continue;
    }

    buffer.push(line);
  }

  flushParagraph();
  return blocks;
}
