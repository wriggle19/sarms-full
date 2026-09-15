import { QRCodeSVG } from 'qrcode.react';
import { Barcode } from './Barcode';

/**
 * QR code + barcode panel for an asset. Deliberately a SEPARATE component so
 * AssetDetail can lazy-load it: qrcode.react and especially bwip-js are
 * ~900KB of codec code that most page views never need (Priority 5.1).
 */
export function AssetCodes({ qrToken, assetTag }: { qrToken: string; assetTag: string }) {
  return (
    <div>
      <div className="text-sm font-medium text-text-primary mb-3">QR Code &amp; Barcode</div>
      <QRCodeSVG value={`${window.location.origin}/scan/${qrToken}`} size={132} />
      <div className="text-xs font-semibold text-text-secondary uppercase tracking-wide mt-4">Barcode (Code128)</div>
      <Barcode text={assetTag} />
    </div>
  );
}
