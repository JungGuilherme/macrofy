import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer, NodeViewWrapper } from '@tiptap/react';
import { MacroEmbedChart, type MacroChartMode } from '@/components/reports/MacroEmbedChart';
import { BarChart3 } from 'lucide-react';

export interface MacroChartAttrs {
  country: string;
  series: string;
  mode: MacroChartMode;
  label: string;
}

function MacroChartView({ node }: { node: { attrs: MacroChartAttrs } }) {
  const { country, series, mode, label } = node.attrs;
  return (
    <NodeViewWrapper className="not-prose my-2" contentEditable={false}>
      <div className="rounded-lg border border-dashed border-primary/40 bg-primary/5 p-2">
        <div className="flex items-center gap-1.5 text-[11px] font-medium text-primary mb-1.5">
          <BarChart3 className="h-3.5 w-3.5" />
          {label || `${series} (${country})`}
        </div>
        <MacroEmbedChart country={country} seriesCode={series} mode={mode} />
      </div>
    </NodeViewWrapper>
  );
}

/** Tiptap atom node: stores as <div data-macro-chart data-country data-series data-mode>, renders live in the editor via MacroEmbedChart, and round-trips back into the same div when re-opened for editing. */
export const MacroChartNode = Node.create({
  name: 'macroChart',
  group: 'block',
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      country: { default: 'BR' },
      series: { default: '' },
      mode: { default: 'level' },
      label: { default: '' },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-macro-chart]',
        getAttrs: (el) => {
          const e = el as HTMLElement;
          return {
            country: e.dataset.country || 'BR',
            series: e.dataset.series || '',
            mode: e.dataset.mode || 'level',
            label: e.dataset.label || '',
          };
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    const { country, series, mode, label } = HTMLAttributes as MacroChartAttrs;
    return [
      'div',
      mergeAttributes({
        'data-macro-chart': 'true',
        'data-country': country,
        'data-series': series,
        'data-mode': mode,
        'data-label': label,
      }),
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(MacroChartView);
  },

  addCommands() {
    return {
      insertMacroChart:
        (attrs: MacroChartAttrs) =>
        ({ commands }: any) =>
          commands.insertContent({ type: this.name, attrs }),
    } as any;
  },
});
