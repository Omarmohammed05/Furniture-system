/**
 * Document export (M13). The on-screen document is rasterised with
 * html-to-image and either downloaded as a PNG or placed on an A4 page with
 * jsPDF. Rasterising keeps the Arabic shaping exactly as the browser renders
 * it, so nothing has to be re-typeset or have a font embedded.
 */
import { fileDateStamp } from './dates'

function download(dataUrl, filename) {
  const anchor = document.createElement('a')
  anchor.href = dataUrl
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
}

async function renderNode(node) {
  if (!node) throw new Error('المستند غير جاهز للتصدير')
  const { toPng } = await import('html-to-image')
  return toPng(node, { pixelRatio: 2, backgroundColor: '#ffffff', cacheBust: true })
}

export async function exportNodeToPng(node, name = 'document') {
  const dataUrl = await renderNode(node)
  download(dataUrl, `${name}-${fileDateStamp()}.png`)
}

export async function exportNodeToPdf(node, name = 'document', { orientation = 'portrait' } = {}) {
  const dataUrl = await renderNode(node)
  const { jsPDF } = await import('jspdf')
  const pdf = new jsPDF({ unit: 'pt', format: 'a4', orientation })
  const pageWidth = pdf.internal.pageSize.getWidth()
  const pageHeight = pdf.internal.pageSize.getHeight()
  const image = pdf.getImageProperties(dataUrl)
  const scale = Math.min(pageWidth / image.width, pageHeight / image.height)
  const width = image.width * scale
  const height = image.height * scale
  pdf.addImage(dataUrl, 'PNG', (pageWidth - width) / 2, (pageHeight - height) / 2, width, height)
  pdf.save(`${name}-${fileDateStamp()}.pdf`)
}
