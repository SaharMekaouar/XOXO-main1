import { Capacitor } from '@capacitor/core';
import { Directory, Filesystem } from '@capacitor/filesystem';
import jsPDF from 'jspdf';

export async function downloadTextAsPdf(content: string, fileName: string, title = 'Recapify'): Promise<void> {
  const doc = new jsPDF();
  const margin = 14;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const lineHeight = 7;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text(title, pageWidth / 2, 18, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);

  const lines = doc.splitTextToSize(content || 'No content available', pageWidth - margin * 2);
  let y = 30;
  for (const line of lines) {
    if (y > pageHeight - margin) {
      doc.addPage();
      y = margin;
    }
    doc.text(line, margin, y);
    y += lineHeight;
  }

  if (Capacitor.isNativePlatform()) {
    const base64 = doc.output('datauristring').split(',')[1];
    await Filesystem.writeFile({ path: fileName, data: base64, directory: Directory.Documents });
    return;
  }

  const url = URL.createObjectURL(doc.output('blob'));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
