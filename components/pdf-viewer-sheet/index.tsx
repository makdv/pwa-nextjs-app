'use client';

import { PDF_EMBED_PATH, PDF_TITLE } from '../pdf-viewer/pdf-config';
import { PdfSheetChrome } from '../pdf-viewer/pdf-sheet-chrome';

import styles from './pdf-viewer-sheet.module.css';

export function PdfViewerSheet() {
  return (
    <PdfSheetChrome
      triggerLabel="View pdf"
      ariaLabel={PDF_TITLE}
      contentClassName={styles.frameWrap}
    >
      <embed className={styles.frame} src={PDF_EMBED_PATH} type="application/pdf" title={PDF_TITLE} />
    </PdfSheetChrome>
  );
}
