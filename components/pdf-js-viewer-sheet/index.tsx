'use client';

import { useEffect, useRef, useState } from 'react';
import type { PDFDocumentLoadingTask, PDFDocumentProxy, RenderTask } from 'pdfjs-dist';

import { PDF_PATH, PDF_TITLE } from '../pdf-viewer/pdf-config';
import { PdfSheetChrome } from '../pdf-viewer/pdf-sheet-chrome';
import styles from './pdf-js-viewer-sheet.module.css';

type PdfPageCanvasProps = {
  document: PDFDocumentProxy;
  pageNumber: number;
  width: number;
};

function PdfPageCanvas({ document, pageNumber, width }: PdfPageCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const renderTaskRef = useRef<RenderTask | null>(null);
  const [status, setStatus] = useState('Loading page');

  useEffect(() => {
    if (!width) {
      return;
    }

    let active = true;

    const renderPage = async () => {
      setStatus('Loading page');

      try {
        renderTaskRef.current?.cancel();

        const page = await document.getPage(pageNumber);
        const unscaledViewport = page.getViewport({ scale: 1 });
        const outputScale = Math.min(window.devicePixelRatio || 1, 2);
        const scale = width / unscaledViewport.width;
        const viewport = page.getViewport({ scale });
        const canvas = canvasRef.current;
        const context = canvas?.getContext('2d');

        if (!canvas || !context || !active) {
          return;
        }

        canvas.width = Math.floor(viewport.width * outputScale);
        canvas.height = Math.floor(viewport.height * outputScale);
        canvas.style.width = `${Math.floor(viewport.width)}px`;
        canvas.style.height = `${Math.floor(viewport.height)}px`;

        context.setTransform(outputScale, 0, 0, outputScale, 0, 0);

        const renderTask = page.render({
          canvas,
          canvasContext: context,
          viewport,
        });

        renderTaskRef.current = renderTask;
        await renderTask.promise;

        if (active) {
          setStatus('');
        }
      } catch (error) {
        if (error instanceof Error && error.name === 'RenderingCancelledException') {
          return;
        }

        if (active) {
          setStatus('Page failed to render');
        }
      }
    };

    renderPage();

    return () => {
      active = false;
      renderTaskRef.current?.cancel();
    };
  }, [document, pageNumber, width]);

  return (
    <figure className={styles.page}>
      <canvas ref={canvasRef} className={styles.canvas} aria-label={`Page ${pageNumber}`} />
      {status ? <figcaption className={styles.pageStatus}>{status}</figcaption> : null}
    </figure>
  );
}

export function PdfJsViewerSheet() {
  const viewerRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [pdfDocument, setPdfDocument] = useState<PDFDocumentProxy | null>(null);
  const [documentStatus, setDocumentStatus] = useState('');
  const [pageWidth, setPageWidth] = useState(0);
  const pageNumbers = Array.from({ length: pdfDocument?.numPages ?? 0 }, (_, index) => index + 1);

  useEffect(() => {
    if (!open) {
      return;
    }

    const viewer = viewerRef.current;

    if (!viewer) {
      return;
    }

    const updateWidth = () => {
      setPageWidth(Math.max(0, Math.floor(viewer.clientWidth - 24)));
    };

    updateWidth();

    const resizeObserver = new ResizeObserver(updateWidth);
    resizeObserver.observe(viewer);

    return () => {
      resizeObserver.disconnect();
    };
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }

    let ignore = false;
    let loadingTask: PDFDocumentLoadingTask | null = null;

    setDocumentStatus('Loading PDF');
    setPdfDocument(null);

    const loadDocument = async () => {
      const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');

      if (ignore) {
        return;
      }

      pdfjs.GlobalWorkerOptions.workerSrc = new URL(
        'pdfjs-dist/legacy/build/pdf.worker.min.mjs',
        import.meta.url,
      ).toString();

      loadingTask = pdfjs.getDocument({ url: PDF_PATH });
      const loadedDocument = await loadingTask.promise;

      if (!ignore) {
        setPdfDocument(loadedDocument);
        setDocumentStatus('');
      }
    };

    loadDocument().catch(() => {
      if (!ignore) {
        setDocumentStatus('PDF failed to load');
      }
    });

    return () => {
      ignore = true;
      loadingTask?.destroy();
    };
  }, [open]);

  return (
    <PdfSheetChrome
      triggerLabel="View pdf with PDF.js"
      ariaLabel={`${PDF_TITLE} PDF.js viewer`}
      buttonVariant="secondary"
      contentClassName={styles.viewer}
      contentRef={viewerRef}
      onOpenChange={setOpen}
      sheetClassName={styles.sheet}
    >
      {documentStatus ? <p className={styles.documentStatus}>{documentStatus}</p> : null}

      {open && pdfDocument && pageWidth
        ? pageNumbers.map((pageNumber) => (
            <PdfPageCanvas
              key={pageNumber}
              document={pdfDocument}
              pageNumber={pageNumber}
              width={pageWidth}
            />
          ))
        : null}
    </PdfSheetChrome>
  );
}
