'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type {
  PDFDocumentLoadingTask,
  PDFDocumentProxy,
  RenderTask,
  TextLayer as PdfTextLayer,
} from 'pdfjs-dist';

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
  const textLayerContainerRef = useRef<HTMLDivElement>(null);
  const renderTaskRef = useRef<RenderTask | null>(null);
  const textLayerRef = useRef<PdfTextLayer | null>(null);
  const [status, setStatus] = useState('Loading page');

  useEffect(() => {
    if (!width) {
      return;
    }

    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    const textLayerContainer = textLayerContainerRef.current;

    if (!canvas || !context || !textLayerContainer) {
      return;
    }

    let active = true;

    const renderPage = async () => {
      setStatus('Loading page');

      try {
        renderTaskRef.current?.cancel();
        textLayerRef.current?.cancel();
        textLayerContainer.replaceChildren();

        const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
        const page = await document.getPage(pageNumber);
        const unscaledViewport = page.getViewport({ scale: 1 });
        const outputScale = Math.min(window.devicePixelRatio || 1, 2);
        const scale = width / unscaledViewport.width;
        const viewport = page.getViewport({ scale });

        if (!active) {
          return;
        }

        canvas.width = Math.floor(viewport.width * outputScale);
        canvas.height = Math.floor(viewport.height * outputScale);
        canvas.style.width = `${Math.floor(viewport.width)}px`;
        canvas.style.height = `${Math.floor(viewport.height)}px`;

        textLayerContainer.style.width = `${Math.floor(viewport.width)}px`;
        textLayerContainer.style.height = `${Math.floor(viewport.height)}px`;
        textLayerContainer.style.setProperty('--total-scale-factor', `${viewport.scale * viewport.userUnit}`);
        textLayerContainer.style.setProperty('--scale-factor', `${viewport.scale}`);
        textLayerContainer.style.setProperty('--user-unit', `${viewport.userUnit}`);
        textLayerContainer.style.setProperty('--scale-round-x', '1px');
        textLayerContainer.style.setProperty('--scale-round-y', '1px');

        const renderTask = page.render({
          canvas,
          transform: outputScale !== 1 ? [outputScale, 0, 0, outputScale, 0, 0] : undefined,
          viewport,
        });
        const textLayer = new pdfjs.TextLayer({
          container: textLayerContainer,
          textContentSource: page.streamTextContent({
            disableNormalization: true,
            includeMarkedContent: true,
          }),
          viewport,
        });

        renderTaskRef.current = renderTask;
        textLayerRef.current = textLayer;
        await Promise.all([renderTask.promise, textLayer.render()]);

        if (active) {
          setStatus('');
        }
      } catch (error) {
        if (
          error instanceof Error &&
          (error.name === 'AbortException' || error.name === 'RenderingCancelledException')
        ) {
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
      textLayerRef.current?.cancel();
      textLayerContainer.replaceChildren();
    };
  }, [document, pageNumber, width]);

  return (
    <figure className={styles.page} style={{ width }}>
      <canvas ref={canvasRef} className={styles.canvas} aria-label={`Page ${pageNumber}`} />
      <div ref={textLayerContainerRef} className={`${styles.textLayer} textLayer`} />
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

  useLayoutEffect(() => {
    if (!open) {
      return;
    }

    const viewer = viewerRef.current;

    if (!viewer) {
      return;
    }

    const updateWidth = () => {
      const style = window.getComputedStyle(viewer);
      const paddingLeft = Number.parseFloat(style.paddingLeft) || 0;
      const paddingRight = Number.parseFloat(style.paddingRight) || 0;
      const padding = paddingLeft + paddingRight;
      const width = Math.max(0, Math.floor(viewer.clientWidth - padding));

      setPageWidth(width);
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

  const hasMeasuredPageWidth = pageWidth > 0;
  const shouldShowDocumentPlaceholder = open && hasMeasuredPageWidth && !pdfDocument;
  const shouldShowStatusFallback = open && !hasMeasuredPageWidth && documentStatus;
  const shouldRenderPages = open && pdfDocument && hasMeasuredPageWidth;

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
      {shouldShowDocumentPlaceholder ? (
        <figure className={styles.pagePlaceholder} style={{ width: pageWidth }}>
          {documentStatus ? (
            <figcaption className={styles.pageStatus}>{documentStatus}</figcaption>
          ) : null}
        </figure>
      ) : null}

      {shouldShowStatusFallback ? (
        <p className={styles.documentStatus}>{documentStatus}</p>
      ) : null}

      {shouldRenderPages
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
