import { useRef, useState, useCallback } from 'react';

/** True when content_html is a full standalone document (own <html>/<style>/
 *  <script>) rather than a fragment authored in the rich-text editor. */
export function isFullHtmlDocument(html: string | null | undefined): boolean {
  if (!html) return false;
  return /^\s*<!DOCTYPE|<html[\s>]/i.test(html);
}

/**
 * Renders a full standalone HTML report (e.g. the Chart.js-based exports the
 * user authors outside the app) inside an isolated iframe via srcDoc — the
 * document's own <style> and <script> run exactly as designed, without
 * leaking into or colliding with the app's own styles/scripts.
 *
 * sandbox="allow-scripts allow-same-origin": scripts run (needed for the
 * charts to draw) and same-origin access lets us read the rendered height
 * to auto-size the iframe. Only admins can author reports, so this trusts
 * admin-authored content the same way the rich-text editor already does.
 */
export function RawHtmlDocument({ html, className }: { html: string; className?: string }) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState(600);

  const handleLoad = useCallback(() => {
    const doc = iframeRef.current?.contentDocument;
    if (doc?.body) {
      setHeight(doc.body.scrollHeight + 24);
    }
  }, []);

  return (
    <iframe
      ref={iframeRef}
      srcDoc={html}
      onLoad={handleLoad}
      sandbox="allow-scripts allow-same-origin allow-popups"
      className={className}
      style={{ width: '100%', height, border: 'none', display: 'block' }}
      title="Relatório"
    />
  );
}
