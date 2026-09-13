import { useEffect, useState } from 'react';
// bwip-js ships a browser bundle via its './browser' subpath; the package root
// resolves to a Node-oriented entry point that Vite/TS can't bundle for the web.
import { toSVG } from 'bwip-js/browser';

/**
 * Renders a scannable Code128 barcode for the given text (typically an asset's
 * human-readable assetTag) as inline SVG via bwip-js. Falls back to plain text
 * if the barcode renderer is unavailable.
 */
export function Barcode({ text, height = 14 }: { text: string; height?: number }) {
  const [svg, setSvg] = useState<string | null>(null);

  useEffect(() => {
    try {
      const out = toSVG({
        bcid: 'code128',
        text,
        height,
        scale: 2,
        includetext: true,
        textxalign: 'center',
        paddingwidth: 4,
        paddingheight: 2,
      });
      setSvg(out);
    } catch {
      setSvg(null);
    }
  }, [text, height]);

  if (!svg) {
    return (
      <div className="font-mono text-text-primary text-sm tracking-widest border border-border rounded px-3 py-2 bg-white">
        {text}
      </div>
    );
  }

  return <div className="bg-white border border-border rounded p-2" dangerouslySetInnerHTML={{ __html: svg }} />;
}