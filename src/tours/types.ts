export type TourStep = {
  id: string
  target: string
  titleEn: string
  titleAr: string
  bodyEn: string
  bodyAr: string
  placement?: 'top' | 'bottom' | 'left' | 'right'
  autoOpenTarget?: string
  media?: {
    type: 'video' | 'pdf' | 'image'
    titleEn: string
    titleAr: string
    href: string
  }[]
}

export type TourDefinition = {
  id: string
  titleEn: string
  titleAr: string
  steps: TourStep[]
}
