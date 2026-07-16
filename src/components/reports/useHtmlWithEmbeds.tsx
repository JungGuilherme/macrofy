import { useEffect, useRef } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { sanitizeHtml } from '@/lib/sanitize';
import { MacroEmbedChart, type MacroChartMode } from './MacroEmbedChart';

/**
 * Renders admin-authored HTML (from reports/articles content_html) into a
 * container, then mounts a live <MacroEmbedChart> React root into every
 * `[data-macro-chart]` placeholder left by the RichTextEditor's chart node.
 * Plain dangerouslySetInnerHTML can't host live components, so this walks
 * the DOM after the fact instead.
 */
export function useHtmlWithEmbeds(html: string | null | undefined) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.innerHTML = sanitizeHtml(html);

    const nodes = container.querySelectorAll<HTMLElement>('[data-macro-chart]');
    const roots: Root[] = [];

    nodes.forEach((node) => {
      const country = node.dataset.country || 'BR';
      const seriesCode = node.dataset.series;
      const mode = (node.dataset.mode as MacroChartMode) || 'level';
      if (!seriesCode) return;
      const root = createRoot(node);
      root.render(<MacroEmbedChart country={country} seriesCode={seriesCode} mode={mode} />);
      roots.push(root);
    });

    return () => {
      // Defer unmount to avoid "synchronous unmount during render" warnings
      // when this effect re-runs immediately (React 18 strict mode / fast html changes).
      setTimeout(() => roots.forEach((r) => r.unmount()), 0);
    };
  }, [html]);

  return containerRef;
}

/** Convenience wrapper: renders sanitized HTML with live macro chart embeds. */
export function RichHtmlContent({ html, className }: { html: string | null | undefined; className?: string }) {
  const ref = useHtmlWithEmbeds(html);
  return <div ref={ref} className={className} />;
}
