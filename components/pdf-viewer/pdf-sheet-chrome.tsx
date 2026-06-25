'use client';

import { useState } from 'react';
import type { ReactNode, Ref, SyntheticEvent } from 'react';
import classNames from 'classnames';
import { BottomSheet } from '@alfalab/core-components/bottom-sheet';

import { PDF_TITLE } from './pdf-config';
import { usePdfShare } from './use-pdf-share';
import styles from './pdf-sheet-chrome.module.css';

type PdfSheetChromeProps = {
  ariaLabel?: string;
  buttonVariant?: 'primary' | 'secondary';
  children: ReactNode;
  contentClassName?: string;
  contentRef?: Ref<HTMLDivElement>;
  onOpenChange?: (open: boolean) => void;
  sheetClassName?: string;
  triggerLabel: string;
};

export function PdfSheetChrome({
  ariaLabel = PDF_TITLE,
  buttonVariant = 'primary',
  children,
  contentClassName,
  contentRef,
  onOpenChange,
  sheetClassName,
  triggerLabel,
}: PdfSheetChromeProps) {
  const [open, setOpen] = useState(false);
  const { handleShare, resetShareStatus, sharing, shareStatus } = usePdfShare(open);

  const setSheetOpen = (nextOpen: boolean) => {
    setOpen(nextOpen);
    onOpenChange?.(nextOpen);
  };

  const handleClose = () => {
    setSheetOpen(false);
    resetShareStatus();
  };

  const stopSheetDrag = (event: SyntheticEvent) => {
    event.stopPropagation();
  };

  return (
    <>
      <button
        className={classNames(styles.viewButton, {
          [styles.primaryButton]: buttonVariant === 'primary',
          [styles.secondaryButton]: buttonVariant === 'secondary',
        })}
        type="button"
        onClick={() => setSheetOpen(true)}
      >
        {triggerLabel}
      </button>

      <BottomSheet
        open={open}
        onClose={handleClose}
        initialHeight="full"
        swipeable={false}
        hasCloser={false}
      >
        <section className={classNames(styles.sheet, sheetClassName)} aria-label={ariaLabel}>
          <div className={styles.toolbar}>
            <button className={styles.textButton} type="button" onClick={handleClose}>
              Закрыть
            </button>
            <h1 className={styles.title}>{PDF_TITLE}</h1>
            <button
              className={styles.iconButton}
              type="button"
              onClick={handleShare}
              disabled={sharing}
              aria-label="Share PDF"
            >
              <span className={styles.shareIcon} aria-hidden="true" />
            </button>
          </div>

          <div
            ref={contentRef}
            className={classNames(styles.content, contentClassName)}
            onPointerDown={stopSheetDrag}
            onPointerMove={stopSheetDrag}
            onTouchStart={stopSheetDrag}
            onTouchMove={stopSheetDrag}
          >
            {children}
          </div>

          {shareStatus ? <p className={styles.shareStatus}>{shareStatus}</p> : null}
        </section>
      </BottomSheet>
    </>
  );
}
