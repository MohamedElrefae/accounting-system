import React from 'react'
import { Box, Card, CardContent, Button, Typography, Stack, Divider } from '@mui/material'
import useAppStore from '../store/useAppStore'
import { TOURS } from '../tours/definitions'
import { useTour } from '../tours/TourContext'

const HelpCenter: React.FC = () => {
  const { language } = useAppStore()
  const isAr = language === 'ar'
  const { startTour } = useTour()

  const samples = React.useMemo(() => ([
    {
      href: `/help/images/tours/${language}/org-scope-chip.png`,
      fallbackHref: '/help/images/tours/org-scope-chip.png',
      fallbackHref2: '/help/images/tours/org-scope-chip.svg',
      titleEn: 'Scope chip',
      titleAr: 'زر النطاق',
    },
    {
      href: `/help/images/tours/${language}/org-selector.png`,
      fallbackHref: '/help/images/tours/org-selector.png',
      fallbackHref2: '/help/images/tours/org-selector.svg',
      titleEn: 'Organization selector',
      titleAr: 'اختيار المؤسسة',
    },
    {
      href: `/help/images/tours/${language}/accounts-add.png`,
      fallbackHref: '/help/images/tours/accounts-add.png',
      fallbackHref2: '/help/images/tours/accounts-add.svg',
      titleEn: 'Add account button',
      titleAr: 'زر إضافة حساب',
    },
  ]), [language])

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, direction: isAr ? 'rtl' : 'ltr' }}>
      <Box>
        <Typography variant="h4" sx={{ fontWeight: 800 }}>
          {isAr ? 'مركز المساعدة' : 'Help Center'}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {isAr
            ? 'شروحات تفاعلية داخل النظام + مواد فيديو و PDF.'
            : 'Interactive in-app tutorials + PDF/video resources.'}
        </Typography>
      </Box>

      <Card>
        <CardContent>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
            {isAr ? 'شروحات تفاعلية' : 'Interactive Tours'}
          </Typography>
          <Stack spacing={1.5}>
            {TOURS.map((t) => (
              <Box key={t.id}>
                <Stack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
                  <Box>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                      {isAr ? t.titleAr : t.titleEn}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {isAr ? `${t.steps.length} خطوات` : `${t.steps.length} steps`}
                    </Typography>
                  </Box>
                  <Button variant="contained" onClick={() => startTour(t.id)}>
                    {isAr ? 'ابدأ الشرح' : 'Start Tour'}
                  </Button>
                </Stack>
                <Divider sx={{ mt: 1.5 }} />
              </Box>
            ))}
          </Stack>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
            {isAr ? 'فيديو و PDF' : 'Video & PDF'}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {isAr
              ? 'يمكنك رفع ملفات الفيديو/PDF داخل public. هذه أزرار تجريبية تعمل الآن بروابط جاهزة.'
              : 'You can place video/PDF files under public/. These are working sample links for now.'}
          </Typography>
          <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
            <Button variant="outlined" component="a" href="https://www.youtube.com/watch?v=ysz5S6PUM-U" target="_blank" rel="noreferrer">
              {isAr ? 'فيديو: اختيار المؤسسة' : 'Video: Org Selection'}
            </Button>
            <Button variant="outlined" component="a" href="https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf" target="_blank" rel="noreferrer">
              {isAr ? 'PDF: شجرة الحسابات' : 'PDF: Accounts Tree'}
            </Button>
          </Stack>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
            {isAr ? 'لقطات الشاشة (أمثلة)' : 'Screenshots (Samples)'}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {isAr
              ? 'هذه صور تجريبية محلية للتأكد أن عرض اللقطات يعمل. يمكنك استبدالها بصورك.'
              : 'These are local placeholders to verify screenshot rendering. Replace them with your real screenshots.'}
          </Typography>
          <Stack direction="row" spacing={1.5} sx={{ flexWrap: 'wrap' }}>
            {samples.map((s) => (
              <Box key={s.href} sx={{ width: 220 }}>
                <Box
                  component="a"
                  href={s.href}
                  target="_blank"
                  rel="noreferrer"
                  sx={{ textDecoration: 'none', color: 'inherit' }}
                >
                  <Box
                    component="img"
                    src={s.href}
                    onError={(e) => {
                      const img = e.currentTarget
                      const next1 = (s as any).fallbackHref as string | undefined
                      const next2 = (s as any).fallbackHref2 as string | undefined
                      if (next1 && img.src !== next1) {
                        img.src = next1
                        return
                      }
                      if (next2 && img.src !== next2) {
                        img.src = next2
                      }
                    }}
                    alt={isAr ? s.titleAr : s.titleEn}
                    sx={{ width: '100%', height: 120, objectFit: 'contain', borderRadius: 1, border: '1px solid', borderColor: 'divider' }}
                  />
                  <Typography variant="body2" sx={{ mt: 1, fontWeight: 700 }}>
                    {isAr ? s.titleAr : s.titleEn}
                  </Typography>
                </Box>
              </Box>
            ))}
          </Stack>
        </CardContent>
      </Card>
    </Box>
  )
}

export default HelpCenter
