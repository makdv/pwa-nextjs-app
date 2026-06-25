'use client';

import Image from 'next/image';
import Link from 'next/link';

import { SetupWorker } from '../components/setup-worker';
import { PdfViewerSheet } from '../components/pdf-viewer-sheet';
import { PdfJsViewerSheet } from '../components/pdf-js-viewer-sheet';
import styles from './page.module.css';

export default function Home() {
  return (
    <div className={styles.page}>
      <SetupWorker />
      <div className={styles.navBar}>navbar</div>
      <main className={styles.main}>
        <Image
          className={styles.logo}
          src="/next.svg"
          alt="Next.js logo"
          width={180}
          height={38}
          priority
        />
        <div className={styles.ctas}>
          <div className={styles.linkStack}>
            <PdfViewerSheet />
            <PdfJsViewerSheet />
            <Link className={styles.secondary} href={'/side-panel'}>
              Side Panel
            </Link>
            <Link className={styles.secondary} href={'/modal'}>
              Modal
            </Link>
            <Link className={styles.secondary} href={'/bottom-sheet'}>
              Bottom Sheet
            </Link>
            <Link className={styles.secondary} href={'/calendar'}>
              Calendar
            </Link>
            <Link className={styles.secondary} href={'/tab-bar'}>
              Tab Bar
            </Link>
            <Link className={styles.secondary} href={'/refresh'}>
              Refresh page
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
