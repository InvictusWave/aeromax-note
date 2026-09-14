import {
  AlignmentType, BorderStyle, Document as WordDocument, HeadingLevel, LevelFormat,
  LineRuleType, Packer, Paragraph, Table, TableCell, TableRow, TextRun,
  TableLayoutType, UnderlineType, VerticalAlign, WidthType,
} from 'docx';
import type { IBorderOptions, IParagraphOptions, IRunOptions, ILevelsOptions } from 'docx';

const px = (value: string) => parseFloat(value) || 0;
const twips = (value: number) => Math.round(value * 15);
const mm = (value: number) => Math.round(value * 1440 / 25.4);
const noBorder = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
const noBorders = { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder, insideHorizontal: noBorder, insideVertical: noBorder };

function color(value: string): string | undefined {
  const channels = value.match(/[\d.]+/g)?.map(Number);
  if (!channels || (channels.length === 4 && channels[3] === 0)) return undefined;
  return channels.slice(0, 3).map(channel => Math.round(channel).toString(16).padStart(2, '0')).join('').toUpperCase();
}

/** Reads the rendered preview, not a second report template. All content remains native Word text/tables. */
export function buildReportWordDocument(document: Document) {
  const style = (element: Element) => document.defaultView!.getComputedStyle(element);
  const numbering: { reference: string; levels: ILevelsOptions[] }[] = [];
  const canvas = document.createElement('canvas').getContext('2d');
  const fonts = new Map<string, string>();
  const font = (css: string) => {
    if (fonts.has(css)) return fonts.get(css)!;
    const families = css.split(',').map(item => item.trim().replace(/^['"]|['"]$/g, ''));
    // Resolve the browser's serif fallback too (Iowan is not installed on every machine).
    const sample = 'Aeromax Production 0123456789 WWW iii';
    if (canvas) canvas.font = `16px ${css}`;
    const width = canvas?.measureText(sample).width;
    const family = families.find(candidate => {
      if (!canvas) return true;
      canvas.font = `16px "${candidate}"`;
      return Math.abs(canvas.measureText(sample).width - width!) < 0.01;
    }) || families[0];
    const resolved = /^(?:-apple-system|system-ui|sans-serif)$/.test(family) ? 'Arial' : family === 'serif' ? 'Times New Roman' : family;
    fonts.set(css, resolved);
    return resolved;
  };
  const border = (css: CSSStyleDeclaration, side: string): IBorderOptions => {
    const width = px(css.getPropertyValue(`border-${side}-width`));
    const kind = css.getPropertyValue(`border-${side}-style`);
    return !width || kind === 'none' ? noBorder : {
      style: kind === 'dashed' ? BorderStyle.DASHED : kind === 'dotted' ? BorderStyle.DOTTED : kind === 'double' ? BorderStyle.DOUBLE : BorderStyle.SINGLE,
      size: Math.max(1, Math.round(width * 6)), color: color(css.getPropertyValue(`border-${side}-color`)),
      space: Math.round(px(css.getPropertyValue(`padding-${side}`)) * 0.75),
    };
  };
  const runStyle = (element: Element): IRunOptions => {
    const css = style(element);
    const fill = color(css.backgroundColor);
    return {
      font: font(css.fontFamily), size: Math.round(px(css.fontSize) * 1.5),
      bold: Number(css.fontWeight) >= 600, italics: css.fontStyle === 'italic',
      color: color(css.color), characterSpacing: twips(px(css.letterSpacing)),
      underline: css.textDecorationLine.includes('underline') ? { type: UnderlineType.SINGLE } : undefined,
      strike: css.textDecorationLine.includes('line-through'),
      superScript: css.verticalAlign === 'super', subScript: css.verticalAlign === 'sub',
      shading: fill ? { fill } : undefined,
      // ponytail: Word run borders are rectangular; CSS pill corners have no native editable equivalent.
      border: css.display === 'inline-block' && px(css.borderBottomWidth) ? border(css, 'bottom') : undefined,
    };
  };
  const runs = (nodes: Node[], parent: Element): TextRun[] => nodes.flatMap(node => {
    if (node.nodeType === 3) {
      const css = style(parent);
      let text = node.textContent || '';
      if (!css.whiteSpace.startsWith('pre')) text = text.replace(/[\t\r\n ]+/g, ' ');
      if (css.textTransform === 'uppercase') text = text.toLocaleUpperCase('id-ID');
      if (css.textTransform === 'lowercase') text = text.toLocaleLowerCase('id-ID');
      return [new TextRun({ ...runStyle(parent), text })];
    }
    if (node.nodeType !== 1) return [];
    const element = node as Element;
    if (style(element).display === 'none') return [];
    if (element.tagName === 'BR') return [new TextRun({ ...runStyle(parent), break: 1 })];
    return runs(Array.from(element.childNodes), element);
  });
  const paragraph = (element: Element, nodes: Node[] = Array.from(element.childNodes), options: IParagraphOptions = {}) => {
    const css = style(element);
    const alignment = css.textAlign === 'right' || css.textAlign === 'end' ? AlignmentType.RIGHT : css.textAlign === 'center' ? AlignmentType.CENTER : css.textAlign === 'justify' ? AlignmentType.JUSTIFIED : AlignmentType.LEFT;
    return new Paragraph({
      children: runs(nodes, element), run: runStyle(element), alignment,
      heading: element.tagName === 'H1' ? HeadingLevel.TITLE : element.tagName === 'H2' ? HeadingLevel.HEADING_1 : undefined,
      spacing: { before: twips(px(css.marginTop)), after: twips(px(css.marginBottom)), line: twips(px(css.lineHeight) || px(css.fontSize) * 1.2), lineRule: LineRuleType.EXACT },
      border: { top: border(css, 'top'), bottom: border(css, 'bottom'), left: border(css, 'left'), right: border(css, 'right') },
      keepNext: css.breakAfter === 'avoid', keepLines: css.breakInside === 'avoid',
      pageBreakBefore: css.breakBefore === 'page', widowControl: true,
      ...options,
    });
  };
  const spacer = (height: number, bottom?: IBorderOptions) => new Paragraph({
    run: { size: 1 }, spacing: { before: 0, after: 0, line: Math.max(1, twips(height)), lineRule: LineRuleType.EXACT },
    border: bottom ? { bottom } : undefined,
  });
  type Block = Paragraph | Table;
  const blocks = (element: Element): Block[] => {
    const output: Block[] = [];
    let inline: Node[] = [];
    const flush = () => {
      if (inline.some(node => node.nodeType === 1 || node.textContent?.trim())) {
        // Anonymous text in a cell/div has no paragraph margins in HTML.
        output.push(paragraph(element, inline, { border: {}, spacing: { before: 0, after: 0, line: twips(px(style(element).lineHeight) || px(style(element).fontSize) * 1.2), lineRule: LineRuleType.EXACT } }));
      }
      inline = [];
    };
    for (const node of Array.from(element.childNodes)) {
      if (node.nodeType !== 1) { inline.push(node); continue; }
      const child = node as Element;
      const css = style(child);
      if (css.display === 'none') continue;
      if (css.display.startsWith('inline') || child.tagName === 'BR') { inline.push(child); continue; }
      flush();
      if (child.tagName === 'TABLE') {
        if ((child as HTMLTableElement).rows.length) output.push(table(child as HTMLTableElement));
      }
      else if (child.matches('.ident')) {
        const width = twips(child.getBoundingClientRect().width);
        const items = Array.from(child.children);
        if (!items.length) continue;
        const widths = items.map((item, index) => twips(item.getBoundingClientRect().width) + (index < items.length - 1 ? twips(px(css.columnGap)) : 0));
        output.push(spacer(px(css.marginTop)));
        output.push(new Table({
          width: { size: width, type: WidthType.DXA }, columnWidths: widths,
          layout: TableLayoutType.FIXED, borders: noBorders, margins: { top: 0, bottom: 0, left: 0, right: 0 },
          rows: [new TableRow({ cantSplit: true, children: items.map((item, index) => new TableCell({
            width: { size: widths[index], type: WidthType.DXA }, borders: noBorders,
            margins: { top: 0, bottom: 0, left: 0, right: index < items.length - 1 ? twips(px(css.columnGap)) : 0 },
            verticalAlign: VerticalAlign.TOP, children: blocks(item),
          })) })],
        }));
      } else if (child.tagName === 'UL' || child.tagName === 'OL') {
        const reference = `preview-list-${numbering.length}`;
        const left = twips(px(css.paddingLeft));
        numbering.push({ reference, levels: [{ level: 0, format: child.tagName === 'OL' ? LevelFormat.DECIMAL : LevelFormat.BULLET, text: child.tagName === 'OL' ? '%1.' : '•', start: Number(child.getAttribute('start')) || 1, style: { run: runStyle(child), paragraph: { leftTabStop: left, indent: { left, hanging: Math.min(left, 150) } } } }] });
        const items = Array.from(child.children);
        items.forEach((item, index) => {
          const content = blocks(item);
          // Normal list items are one paragraph; pasted block paragraphs/nested lists remain separate.
          const firstNodes = Array.from(item.childNodes).filter(node => node.nodeType !== 1 || style(node as Element).display.startsWith('inline') || (node as Element).tagName === 'BR');
          const hasInline = firstNodes.some(node => node.textContent?.trim());
          const firstElement = hasInline ? item : item.firstElementChild || item;
          const first = paragraph(firstElement, hasInline ? firstNodes : Array.from(firstElement.childNodes), { numbering: { reference, level: 0 }, indent: { left, hanging: Math.min(left, 150) }, spacing: { before: 0, after: twips(Math.max(px(style(item).marginBottom), index === items.length - 1 ? px(css.marginBottom) : 0)), line: twips(px(style(firstElement).lineHeight)), lineRule: LineRuleType.EXACT } });
          output.push(first, ...content.slice(1));
        });
      } else if (/^(P|H[1-6]|DT|DD)$/.test(child.tagName)) output.push(paragraph(child));
      else {
        output.push(...blocks(child));
        if (px(css.borderBottomWidth)) output.push(spacer(px(css.paddingBottom), { ...border(css, 'bottom'), space: 0 }));
      }
    }
    flush();
    return output;
  };
  const table = (element: HTMLTableElement) => {
    const bounds = element.getBoundingClientRect();
    const rows = Array.from(element.rows);
    const edges = [...new Set(rows.flatMap(row => Array.from(row.cells).flatMap(cell => {
      const rect = cell.getBoundingClientRect();
      return [twips(rect.left - bounds.left), twips(rect.right - bounds.left)];
    })))].sort((a, b) => a - b);
    const columnWidths = edges.slice(1).map((edge, index) => edge - edges[index]);
    return new Table({
      width: { size: twips(bounds.width), type: WidthType.DXA }, columnWidths,
      layout: TableLayoutType.FIXED, borders: noBorders, margins: { top: 0, bottom: 0, left: 0, right: 0 },
      rows: rows.map(row => new TableRow({
        tableHeader: row.parentElement?.tagName === 'THEAD', cantSplit: style(row).breakInside === 'avoid',
        children: Array.from(row.cells).map(cell => {
          const css = style(cell);
          const children = blocks(cell);
          if (!children.length || children[children.length - 1] instanceof Table) children.push(paragraph(cell, []));
          return new TableCell({
            children, width: { size: twips(cell.getBoundingClientRect().width), type: WidthType.DXA },
            columnSpan: cell.colSpan > 1 ? cell.colSpan : undefined, rowSpan: cell.rowSpan > 1 ? cell.rowSpan : undefined,
            borders: { top: border(css, 'top'), bottom: border(css, 'bottom'), left: border(css, 'left'), right: border(css, 'right') },
            margins: { top: twips(px(css.paddingTop)), bottom: twips(px(css.paddingBottom)), left: twips(px(css.paddingLeft)), right: twips(px(css.paddingRight)) },
            verticalAlign: css.verticalAlign === 'middle' ? VerticalAlign.CENTER : css.verticalAlign === 'bottom' ? VerticalAlign.BOTTOM : VerticalAlign.TOP,
            shading: color(css.backgroundColor) ? { fill: color(css.backgroundColor) } : undefined,
          });
        }),
      })),
    });
  };
  const children = blocks(document.body);
  return new WordDocument({
    styles: { default: { document: { run: runStyle(document.body), paragraph: { spacing: { before: 0, after: 0 } } } } },
    numbering: { config: numbering },
    sections: [{ properties: { page: { size: { width: mm(210), height: mm(297) }, margin: { top: mm(18), bottom: mm(18), left: mm(16), right: mm(16) } } }, children }],
  });
}

export async function reportDocxBlob(html: string): Promise<Blob> {
  const frame = document.createElement('iframe');
  frame.setAttribute('aria-hidden', 'true');
  frame.style.cssText = 'position:fixed;left:-10000px;top:0;width:178mm;height:297mm;border:0;visibility:hidden';
  try {
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Preview DOCX tidak dapat dimuat. Silakan coba lagi.')), 15_000);
      frame.onload = () => { clearTimeout(timeout); resolve(); };
      frame.srcdoc = html;
      document.body.appendChild(frame);
    });
    const preview = frame.contentDocument;
    if (!preview) throw new Error('Preview DOCX tidak tersedia.');
    // The editor's screen-only padding/focus outline is UI, not report formatting.
    preview.querySelectorAll('[contenteditable]').forEach(element => element.removeAttribute('contenteditable'));
    preview.body.style.setProperty('padding', '0', 'important');
    await preview.fonts.ready;
    return await Packer.toBlob(buildReportWordDocument(preview));
  } finally { frame.remove(); }
}
