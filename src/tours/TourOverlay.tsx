import React from 'react'
import { Backdrop, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Divider, Paper, Stack, Typography } from '@mui/material'
import Popover from '@mui/material/Popover'
import useAppStore from '../store/useAppStore'
import { useTour } from './TourContext'

type ViewerState =
  | { open: false }
  | { open: true; type: 'video' | 'image'; href: string; title: string }

function withImageFallback(href: string) {
  // Prefer language-specific PNGs, then root PNG, then SVG placeholder.
  if (!href.endsWith('.png')) return { primary: href, fallbacks: [] as string[] }

  const lang = document.documentElement.lang === 'ar' ? 'ar' : 'en'
  const hasRootToursPng = href.startsWith('/help/images/tours/') && !href.startsWith('/help/images/tours/ar/') && !href.startsWith('/help/images/tours/en/')
  const localized = hasRootToursPng ? href.replace('/help/images/tours/', `/help/images/tours/${lang}/`) : null
  const svg = href.replace(/\.png$/i, '.svg')

  return {
    primary: localized ?? href,
    fallbacks: [href, svg].filter(Boolean) as string[],
  }
}

function getAnchorElement(selector: string): HTMLElement | null {
  try {
    return document.querySelector(selector) as HTMLElement | null
  } catch {
    return null
  }
}

function isVideoFile(href: string) {
  return /\.(mp4|webm|ogg)(\?.*)?$/i.test(href)
}

function toYouTubeEmbedUrl(href: string): string | null {
  try {
    const u = new URL(href, window.location.origin)
    if (u.hostname.includes('youtu.be')) {
      const id = u.pathname.replace('/', '')
      return id ? `https://www.youtube.com/embed/${id}` : null
    }
    if (u.hostname.includes('youtube.com')) {
      const id = u.searchParams.get('v')
      return id ? `https://www.youtube.com/embed/${id}` : null
    }
    return null
  } catch {
    return null
  }
}

export default function TourOverlay() {
  const { activeTour, stepIndex, nextStep, prevStep, stopTour } = useTour()
  const { language } = useAppStore()
  const isAr = language === 'ar'

  const step = React.useMemo(() => {
    if (!activeTour) return null
    return activeTour.steps[stepIndex] ?? null
  }, [activeTour, stepIndex])

  const [anchorEl, setAnchorEl] = React.useState<HTMLElement | null>(null)
  const [highlightRect, setHighlightRect] = React.useState<{ top: number; left: number; width: number; height: number } | null>(null)
  const [viewer, setViewer] = React.useState<ViewerState>({ open: false })

  React.useEffect(() => {
    if (!step) {
      setAnchorEl(null)
      setHighlightRect(null)
      return
    }

    // Reset between steps so we don't keep pointing at the previous element
    setAnchorEl(null)
    setHighlightRect(null)

    let cancelled = false
    let triedAutoOpen = false

    const tryResolve = () => {
      if (cancelled) return
      const el = getAnchorElement(step.target)
      if (!el) {
        if (!triedAutoOpen && step.autoOpenTarget) {
          triedAutoOpen = true
          const opener = getAnchorElement(step.autoOpenTarget)
          opener?.click()
        }
        return
      }

      try {
        el.scrollIntoView({ block: 'center', inline: 'center', behavior: 'smooth' })
      } catch {
        // ignore
      }

      setAnchorEl(el)
      const r = el.getBoundingClientRect()
      setHighlightRect({
        top: r.top + window.scrollY,
        left: r.left + window.scrollX,
        width: r.width,
        height: r.height,
      })
    }

    const t0 = window.setInterval(tryResolve, 120)
    window.setTimeout(() => window.clearInterval(t0), 2000)
    tryResolve()

    const onScroll = () => {
      const el = getAnchorElement(step.target)
      if (!el) return
      const r = el.getBoundingClientRect()
      setHighlightRect({
        top: r.top + window.scrollY,
        left: r.left + window.scrollX,
        width: r.width,
        height: r.height,
      })
    }

    window.addEventListener('scroll', onScroll, true)
    window.addEventListener('resize', onScroll)

    return () => {
      cancelled = true
      window.clearInterval(t0)
      window.removeEventListener('scroll', onScroll, true)
      window.removeEventListener('resize', onScroll)
    }
  }, [step])

  if (!activeTour || !step) return null

  const title = isAr ? step.titleAr : step.titleEn
  const body = isAr ? step.bodyAr : step.bodyEn
  const total = activeTour.steps.length
  const isFirst = stepIndex === 0
  const isLast = stepIndex === total - 1

  const media = step.media ?? []
  const images = media.filter((m) => m.type === 'image')
  const resources = media.filter((m) => m.type !== 'image')

  const showOverlay = Boolean(highlightRect)

  return (
    <>
      {showOverlay ? (
        <Backdrop
          open
          sx={{
            zIndex: (t) => t.zIndex.modal + 1,
            backgroundColor: 'rgba(0,0,0,0.55)',
            // Allow user to click the highlighted element (interactive tours)
            pointerEvents: 'none',
          }}
        />
      ) : null}

      {highlightRect ? (
        <Box
          sx={{
            position: 'absolute',
            top: highlightRect.top - 6,
            left: highlightRect.left - 6,
            width: highlightRect.width + 12,
            height: highlightRect.height + 12,
            borderRadius: 2,
            border: '2px solid',
            borderColor: 'warning.main',
            zIndex: (t) => t.zIndex.modal + 2,
            boxShadow: '0 0 0 9999px rgba(0,0,0,0.55)',
            pointerEvents: 'none',
          }}
        />
      ) : null}

      {anchorEl ? (
        <Popover
          open
          anchorEl={anchorEl}
          anchorOrigin={{
            vertical: step.placement === 'top' ? 'top' : step.placement === 'bottom' ? 'bottom' : 'center',
            horizontal: step.placement === 'left' ? 'left' : step.placement === 'right' ? 'right' : 'center',
          }}
          transformOrigin={{
            vertical: step.placement === 'top' ? 'bottom' : step.placement === 'bottom' ? 'top' : 'center',
            horizontal: step.placement === 'left' ? 'right' : step.placement === 'right' ? 'left' : 'center',
          }}
          PaperProps={{
            sx: {
              width: 420,
              maxWidth: '90vw',
              p: 2,
              direction: isAr ? 'rtl' : 'ltr',
            },
          }}
          disableAutoFocus
          disableEnforceFocus
          disableRestoreFocus
        >
          <Stack spacing={1.25}>
            <Typography variant="subtitle2" color="text.secondary">
              {isAr ? `الخطوة ${stepIndex + 1} من ${total}` : `Step ${stepIndex + 1} of ${total}`}
            </Typography>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              {title}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {body}
            </Typography>

            {images.length ? (
              <Paper variant="outlined" sx={{ p: 1.25 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                  {isAr ? 'لقطات الشاشة' : 'Screenshots'}
                </Typography>
                <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
                  {images.map((m) => (
                    (() => {
                      const { primary, fallbacks } = withImageFallback(m.href)
                      return (
                    <Box
                      key={m.href}
                      component="button"
                      type="button"
                      onClick={() => setViewer({ open: true, type: 'image', href: primary, title: isAr ? m.titleAr : m.titleEn })}
                      sx={{
                        p: 0,
                        border: 0,
                        background: 'transparent',
                        cursor: 'pointer',
                      }}
                    >
                      <Box
                        component="img"
                        src={primary}
                        onError={(e) => {
                          const img = e.currentTarget
                          const next = fallbacks.find((f) => img.src !== f)
                          if (next) img.src = next
                        }}
                        alt={isAr ? m.titleAr : m.titleEn}
                        sx={{
                          width: 132,
                          height: 84,
                          objectFit: 'cover',
                          borderRadius: 1,
                          border: '1px solid',
                          borderColor: 'divider',
                        }}
                      />
                    </Box>
                      )
                    })()
                  ))}
                </Stack>
              </Paper>
            ) : null}

            {resources.length ? (
              <Paper variant="outlined" sx={{ p: 1.25 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                  {isAr ? 'مواد مساعدة' : 'Resources'}
                </Typography>
                <Stack spacing={0.75}>
                  {resources.map((m) => {
                    const label = isAr ? m.titleAr : m.titleEn
                    if (m.type === 'video') {
                      return (
                        <Stack key={m.href} direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
                          <Typography variant="body2" sx={{ flex: '1 1 auto' }}>
                            {label}
                          </Typography>
                          <Stack direction="row" spacing={1} sx={{ flex: '0 0 auto' }}>
                            <Button
                              size="small"
                              variant="outlined"
                              onClick={() => setViewer({ open: true, type: 'video', href: m.href, title: label })}
                            >
                              {isAr ? 'تشغيل' : 'Play'}
                            </Button>
                            <Button
                              size="small"
                              variant="text"
                              component="a"
                              href={m.href}
                              target="_blank"
                              rel="noreferrer"
                            >
                              {isAr ? 'فتح' : 'Open'}
                            </Button>
                          </Stack>
                        </Stack>
                      )
                    }

                    return (
                      <Button
                        key={m.href}
                        size="small"
                        variant="text"
                        component="a"
                        href={m.href}
                        target="_blank"
                        rel="noreferrer"
                        sx={{ justifyContent: 'flex-start' }}
                      >
                        {label}
                      </Button>
                    )
                  })}
                </Stack>
              </Paper>
            ) : null}

            <Divider />
            <Stack direction="row" spacing={1} sx={{ justifyContent: 'space-between' }}>
              <Button variant="text" color="inherit" onClick={stopTour}>
                {isAr ? 'إنهاء' : 'End'}
              </Button>
              <Stack direction="row" spacing={1}>
                <Button variant="outlined" disabled={isFirst} onClick={prevStep}>
                  {isAr ? 'السابق' : 'Back'}
                </Button>
                <Button variant="contained" onClick={isLast ? stopTour : nextStep}>
                  {isLast ? (isAr ? 'إنهاء' : 'Finish') : (isAr ? 'التالي' : 'Next')}
                </Button>
              </Stack>
            </Stack>
          </Stack>
        </Popover>
      ) : (
        <Box
          sx={{
            position: 'fixed',
            bottom: 16,
            insetInlineEnd: 16,
            zIndex: (t) => t.zIndex.modal + 2,
            pointerEvents: 'none',
          }}
        >
          <Paper sx={{ p: 2, width: 380, maxWidth: '90vw', direction: isAr ? 'rtl' : 'ltr', pointerEvents: 'auto' }}>
            <Stack spacing={1}>
              <Typography variant="subtitle2" color="text.secondary">
                {isAr ? `الخطوة ${stepIndex + 1} من ${total}` : `Step ${stepIndex + 1} of ${total}`}
              </Typography>
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                {title}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {isAr
                  ? 'لا يمكن العثور على عنصر الواجهة لهذه الخطوة حالياً. انتقل للصفحة المطلوبة أو تخطّ الخطوة.'
                  : 'The target UI element for this step is not available on this page. Navigate to the relevant page or skip this step.'}
              </Typography>
              <Divider />
              <Stack direction="row" spacing={1} sx={{ justifyContent: 'space-between' }}>
                <Button variant="text" color="inherit" onClick={stopTour}>
                  {isAr ? 'إنهاء' : 'End'}
                </Button>
                <Button variant="contained" onClick={nextStep}>
                  {isAr ? 'تخطي' : 'Skip'}
                </Button>
              </Stack>
            </Stack>
          </Paper>
        </Box>
      )}

      <Dialog
        open={viewer.open}
        onClose={() => setViewer({ open: false })}
        fullWidth
        maxWidth="md"
        PaperProps={{ sx: { direction: isAr ? 'rtl' : 'ltr' } }}
      >
        {viewer.open ? (
          <>
            <DialogTitle sx={{ fontWeight: 800 }}>{viewer.title}</DialogTitle>
            <DialogContent>
              {viewer.type === 'image' ? (
                <Box
                  component="img"
                  src={viewer.href}
                  onError={(e) => {
                    const img = e.currentTarget
                    const { fallbacks } = withImageFallback(viewer.href)
                    const next = fallbacks.find((f) => img.src !== f)
                    if (next) img.src = next
                  }}
                  alt={viewer.title}
                  sx={{ width: '100%', maxHeight: '70vh', objectFit: 'contain' }}
                />
              ) : null}

              {viewer.type === 'video' ? (
                (() => {
                  const yt = toYouTubeEmbedUrl(viewer.href)
                  if (yt) {
                    return (
                      <Box
                        component="iframe"
                        src={yt}
                        sx={{ width: '100%', height: '70vh', border: 0 }}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    )
                  }

                  if (isVideoFile(viewer.href)) {
                    return (
                      <Box
                        component="video"
                        src={viewer.href}
                        controls
                        style={{ width: '100%', maxHeight: '70vh' }}
                      />
                    )
                  }

                  return (
                    <Typography variant="body2" color="text.secondary">
                      {isAr
                        ? 'لا يمكن تشغيل هذا الفيديو داخل النظام. استخدم خيار فتح.'
                        : 'This video cannot be played inline. Please use Open.'}
                    </Typography>
                  )
                })()
              ) : null}
            </DialogContent>
            <DialogActions>
              {viewer.type === 'video' ? (
                <Button component="a" href={viewer.href} target="_blank" rel="noreferrer">
                  {isAr ? 'فتح في صفحة جديدة' : 'Open in new tab'}
                </Button>
              ) : null}
              <Button onClick={() => setViewer({ open: false })} variant="contained">
                {isAr ? 'إغلاق' : 'Close'}
              </Button>
            </DialogActions>
          </>
        ) : null}
      </Dialog>
    </>
  )
}
