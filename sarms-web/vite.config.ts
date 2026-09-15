import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
  },
  build: {
    // Justified exception to the 500kB chunk guideline (Priority 5.1):
    // AssetCodes-*.js (~950kB) is bwip-js, which bundles EVERY barcode
    // symbology encoder; only the Code128 one is used. It is loaded ON DEMAND
    // (React.lazy inside AssetDetail), so ordinary users never download it -
    // the initial bundle is 255kB. Swapping to a lighter Code128-only library
    // is a future optimization tracked in the implementation report.
    chunkSizeWarningLimit: 1000,
  },
});
