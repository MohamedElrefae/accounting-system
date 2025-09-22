import { useEffect, useRef, useState } from 'react';
import { Box, IconButton, Stack, Typography } from '@mui/material';
import ZoomIn from '@mui/icons-material/ZoomIn';
import ZoomOut from '@mui/icons-material/ZoomOut';
import NavigateBefore from '@mui/icons-material/NavigateBefore';
import NavigateNext from '@mui/icons-material/NavigateNext';

// NOTE: requires: npm install pdfjs-dist
import { getDocument, GlobalWorkerOptions, version as pdfjsVersion } from 'pdfjs-dist';
// Import the worker URL from Vite
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker?url';

interface Props {
  file: Blob | string; // Blob or URL
  height?: number; // viewport height per page
  continuous?: boolean; // render all pages continuously
}

export default function PdfPreview({ file, height = 480, continuous = false }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [doc, setDoc] = useState<any>(null);
  const [pageCount, setPageCount] = useState(0);
  const [pageNum, setPageNum] = useState(1);
  const [scale, setScale] = useState(1.2);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Set the worker source for pdf.js
    GlobalWorkerOptions.workerSrc = pdfjsWorker;
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setError(null);
        // Convert Blob to URL if needed
        const src = typeof file === 'string' ? file : URL.createObjectURL(file);
        const loadingTask = getDocument(src);
        const pdf = await loadingTask.promise;
        if (cancelled) return;
        setDoc(pdf);
        setPageCount(pdf.numPages);
        setPageNum(1);
      } catch (e: any) {
        if (!cancelled) setError(e?.message || 'Failed to load PDF');
      }
    })();
    return () => { cancelled = true; };
  }, [file]);

  useEffect(() => {
    (async () => {
      if (!doc || !containerRef.current) return;
      const container = containerRef.current;
      container.innerHTML = '';

      const renderPage = async (num: number) => {
        const page = await doc.getPage(num);
        const viewport = page.getViewport({ scale });
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        const outputScale = window.devicePixelRatio || 1;
        canvas.width = Math.floor(viewport.width * outputScale);
        canvas.height = Math.floor(viewport.height * outputScale);
        canvas.style.width = `${viewport.width}px`;
        canvas.style.height = `${viewport.height}px`;
        const transform = outputScale !== 1 ? [outputScale, 0, 0, outputScale, 0, 0] : undefined;
        await page.render({ canvasContext: context as any, viewport, transform }).promise;
        container.appendChild(canvas);
      };

      if (continuous) {
        for (let i = 1; i <= pageCount; i++) {
          // eslint-disable-next-line no-await-in-loop
          await renderPage(i);
        }
      } else {
        await renderPage(pageNum);
      }
    })();
  }, [doc, pageNum, scale, continuous, pageCount]);

  const canPrev = pageNum > 1;
  const canNext = pageNum < pageCount;

  return (
    <Box>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
        {!continuous && (
          <>
            <IconButton size="small" onClick={() => canPrev && setPageNum(n => Math.max(1, n - 1))} disabled={!canPrev}><NavigateBefore /></IconButton>
            <Typography variant="body2">{pageNum} / {pageCount || '?'}</Typography>
            <IconButton size="small" onClick={() => canNext && setPageNum(n => Math.min(pageCount, n + 1))} disabled={!canNext}><NavigateNext /></IconButton>
          </>
        )}
        <IconButton size="small" onClick={() => setScale(s => Math.max(0.5, s - 0.1))}><ZoomOut /></IconButton>
        <IconButton size="small" onClick={() => setScale(s => Math.min(3, s + 0.1))}><ZoomIn /></IconButton>
      </Stack>
      {error ? (
        <Typography variant="body2" color="error">{error}</Typography>
      ) : (
        <Box ref={containerRef} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, height, overflow: 'auto' }} />
      )}
    </Box>
  );
}