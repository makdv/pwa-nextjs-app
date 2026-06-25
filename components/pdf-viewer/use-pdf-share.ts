'use client';

import { useEffect, useState } from 'react';

import { PDF_FILE_NAME, PDF_PATH, PDF_TITLE } from './pdf-config';

type ShareNavigator = Navigator & {
  canShare?: (data: ShareData) => boolean;
};

export function usePdfShare(open: boolean) {
  const [sharing, setSharing] = useState(false);
  const [shareStatus, setShareStatus] = useState('');
  const [pdfFile, setPdfFile] = useState<File | null>(null);

  useEffect(() => {
    if (!open || pdfFile) {
      return;
    }

    let ignore = false;

    const preparePdfFile = async () => {
      try {
        const response = await fetch(PDF_PATH);
        const blob = await response.blob();

        if (!ignore) {
          setPdfFile(new File([blob], PDF_FILE_NAME, { type: 'application/pdf' }));
        }
      } catch {
        if (!ignore) {
          setPdfFile(null);
        }
      }
    };

    preparePdfFile();

    return () => {
      ignore = true;
    };
  }, [open, pdfFile]);

  const resetShareStatus = () => {
    setShareStatus('');
  };

  const downloadPdf = (documentUrl: string) => {
    const link = document.createElement('a');

    link.href = documentUrl;
    link.download = PDF_FILE_NAME;
    link.rel = 'noopener';
    document.body.append(link);
    link.click();
    link.remove();
    setShareStatus('Download started');
  };

  const handleShare = async () => {
    const documentUrl = new URL(PDF_PATH, window.location.href).toString();
    const shareNavigator = window.navigator as ShareNavigator;

    setSharing(true);
    setShareStatus('');

    try {
      if (shareNavigator.share) {
        if (pdfFile) {
          const fileShareData: ShareData = {
            title: PDF_TITLE,
            files: [pdfFile],
          };

          if (shareNavigator.canShare?.(fileShareData)) {
            await shareNavigator.share(fileShareData);
            return;
          }
        }

        await shareNavigator.share({
          title: PDF_TITLE,
          url: documentUrl,
        });
        return;
      }

      downloadPdf(documentUrl);
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        return;
      }

      downloadPdf(documentUrl);
    } finally {
      setSharing(false);
    }
  };

  return {
    handleShare,
    resetShareStatus,
    sharing,
    shareStatus,
  };
}
