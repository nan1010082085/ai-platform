/**
 * PPT Renderer — 浏览器端 PPT 生成工具
 *
 * 使用 pptxgenjs 在浏览器端生成 .pptx 文件。
 * 支持多种布局模板和主题配色。
 */

export interface PptSlideData {
  index: number
  type: 'title' | 'content' | 'chart' | 'comparison' | 'summary'
  heading: string
  subtitle?: string
  content?: string[]
  speakerNotes?: string
  layout?: 'center' | 'left' | 'two-column' | 'full-image'
}

export interface PptGenerateOptions {
  title: string
  template: 'business' | 'tech' | 'education' | 'creative'
  style: 'professional' | 'casual' | 'academic'
  slides: PptSlideData[]
}

interface ThemeColors {
  primary: string
  secondary: string
  accent: string
  background: string
  text: string
  textLight: string
}

const THEMES: Record<string, ThemeColors> = {
  business: {
    primary: '1F4E79',
    secondary: '2E75B6',
    accent: '5B9BD5',
    background: 'FFFFFF',
    text: '333333',
    textLight: '666666',
  },
  tech: {
    primary: '0D1B2A',
    secondary: '1B263B',
    accent: '415A77',
    background: 'F8F9FA',
    text: '212529',
    textLight: '6C757D',
  },
  education: {
    primary: '2D6A4F',
    secondary: '40916C',
    accent: '52B788',
    background: 'FFFFFF',
    text: '333333',
    textLight: '666666',
  },
  creative: {
    primary: 'E63946',
    secondary: '457B9D',
    accent: 'F4A261',
    background: 'FFFFFF',
    text: '2B2D42',
    textLight: '8D99AE',
  },
}

function getTheme(template: string): ThemeColors {
  return THEMES[template] ?? THEMES.business
}

export async function generatePptx(options: PptGenerateOptions): Promise<Blob> {
  // Dynamic import to avoid bundling pptxgenjs in main chunk
  const PptxGenJS = (await import('pptxgenjs')).default
  const pptx = new PptxGenJS()

  const theme = getTheme(options.template)

  // Set presentation metadata
  pptx.title = options.title
  pptx.author = 'AI Platform'
  pptx.subject = options.title

  // Define slide master layouts
  pptx.defineLayout({ name: 'CUSTOM', width: 10, height: 5.625 })
  pptx.layout = 'CUSTOM'

  for (const slideData of options.slides) {
    const slide = pptx.addSlide()

    // Add speaker notes if provided
    if (slideData.speakerNotes) {
      slide.addNotes(slideData.speakerNotes)
    }

    switch (slideData.type) {
      case 'title':
        renderTitleSlide(slide, slideData, theme)
        break
      case 'content':
        renderContentSlide(slide, slideData, theme)
        break
      case 'comparison':
        renderComparisonSlide(slide, slideData, theme)
        break
      case 'summary':
        renderSummarySlide(slide, slideData, theme)
        break
      default:
        renderContentSlide(slide, slideData, theme)
    }
  }

  return pptx.write() as Promise<Blob>
}

function renderTitleSlide(slide: any, data: PptSlideData, theme: ThemeColors) {
  // Background accent bar
  slide.addShape('rect', {
    x: 0, y: 0, w: 10, h: 0.15,
    fill: { color: theme.primary },
  })

  // Title
  slide.addText(data.heading, {
    x: 1, y: 1.5, w: 8, h: 1.5,
    fontSize: 36,
    fontFace: 'Arial',
    color: theme.text,
    bold: true,
    align: 'center',
  })

  // Subtitle
  if (data.subtitle) {
    slide.addText(data.subtitle, {
      x: 1, y: 3.2, w: 8, h: 0.8,
      fontSize: 18,
      fontFace: 'Arial',
      color: theme.textLight,
      align: 'center',
    })
  }

  // Bottom accent bar
  slide.addShape('rect', {
    x: 0, y: 5.475, w: 10, h: 0.15,
    fill: { color: theme.accent },
  })
}

function renderContentSlide(slide: any, data: PptSlideData, theme: ThemeColors) {
  // Top bar
  slide.addShape('rect', {
    x: 0, y: 0, w: 10, h: 0.08,
    fill: { color: theme.primary },
  })

  // Slide number
  slide.addText(String(data.index), {
    x: 9, y: 0.2, w: 0.8, h: 0.4,
    fontSize: 12,
    color: theme.textLight,
    align: 'right',
  })

  // Title
  slide.addText(data.heading, {
    x: 0.5, y: 0.3, w: 9, h: 0.8,
    fontSize: 28,
    fontFace: 'Arial',
    color: theme.primary,
    bold: true,
  })

  // Divider line
  slide.addShape('line', {
    x: 0.5, y: 1.1, w: 9, h: 0,
    line: { color: theme.accent, width: 1.5 },
  })

  // Content bullets
  if (data.content?.length) {
    const bulletItems = data.content.map((point) => ({
      text: point,
      options: {
        fontSize: 16,
        fontFace: 'Arial',
        color: theme.text,
        bullet: { type: 'bullet', color: theme.accent },
        paraSpaceAfter: 8,
      },
    }))

    slide.addText(bulletItems, {
      x: 0.8, y: 1.4, w: 8.4, h: 3.8,
      valign: 'top',
    })
  }
}

function renderComparisonSlide(slide: any, data: PptSlideData, theme: ThemeColors) {
  // Top bar
  slide.addShape('rect', {
    x: 0, y: 0, w: 10, h: 0.08,
    fill: { color: theme.primary },
  })

  // Title
  slide.addText(data.heading, {
    x: 0.5, y: 0.3, w: 9, h: 0.8,
    fontSize: 28,
    fontFace: 'Arial',
    color: theme.primary,
    bold: true,
  })

  // Divider
  slide.addShape('line', {
    x: 0.5, y: 1.1, w: 9, h: 0,
    line: { color: theme.accent, width: 1.5 },
  })

  // Two columns
  const midPoint = data.content ? Math.ceil(data.content.length / 2) : 0
  const leftItems = data.content?.slice(0, midPoint) ?? []
  const rightItems = data.content?.slice(midPoint) ?? []

  // Left column
  if (leftItems.length) {
    slide.addShape('rect', {
      x: 0.5, y: 1.3, w: 4.2, h: 0.5,
      fill: { color: theme.primary },
    })
    slide.addText('方案 A', {
      x: 0.5, y: 1.3, w: 4.2, h: 0.5,
      fontSize: 14,
      color: 'FFFFFF',
      bold: true,
      align: 'center',
    })

    const bullets = leftItems.map((point) => ({
      text: point,
      options: {
        fontSize: 14,
        color: theme.text,
        bullet: { type: 'bullet', color: theme.accent },
        paraSpaceAfter: 6,
      },
    }))
    slide.addText(bullets, {
      x: 0.8, y: 2, w: 3.8, h: 3.2,
      valign: 'top',
    })
  }

  // Right column
  if (rightItems.length) {
    slide.addShape('rect', {
      x: 5.3, y: 1.3, w: 4.2, h: 0.5,
      fill: { color: theme.secondary },
    })
    slide.addText('方案 B', {
      x: 5.3, y: 1.3, w: 4.2, h: 0.5,
      fontSize: 14,
      color: 'FFFFFF',
      bold: true,
      align: 'center',
    })

    const bullets = rightItems.map((point) => ({
      text: point,
      options: {
        fontSize: 14,
        color: theme.text,
        bullet: { type: 'bullet', color: theme.accent },
        paraSpaceAfter: 6,
      },
    }))
    slide.addText(bullets, {
      x: 5.6, y: 2, w: 3.8, h: 3.2,
      valign: 'top',
    })
  }
}

function renderSummarySlide(slide: any, data: PptSlideData, theme: ThemeColors) {
  // Full background
  slide.addShape('rect', {
    x: 0, y: 0, w: 10, h: 5.625,
    fill: { color: theme.primary },
  })

  // Title
  slide.addText(data.heading, {
    x: 1, y: 1, w: 8, h: 1,
    fontSize: 32,
    fontFace: 'Arial',
    color: 'FFFFFF',
    bold: true,
    align: 'center',
  })

  // Content points
  if (data.content?.length) {
    const bullets = data.content.map((point) => ({
      text: point,
      options: {
        fontSize: 18,
        color: 'FFFFFF',
        bullet: { type: 'bullet', color: theme.accent },
        paraSpaceAfter: 10,
      },
    }))
    slide.addText(bullets, {
      x: 1.5, y: 2.2, w: 7, h: 3,
      valign: 'top',
    })
  }
}
