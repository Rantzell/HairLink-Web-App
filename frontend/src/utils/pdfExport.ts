import toast from 'react-hot-toast';

export const exportPDF = async (elementId: string, filename: string, options: any = {}) => {
  const toastId = toast.loading('Generating PDF...');
  try {
    if (!(window as any).html2pdf) {
      await new Promise<void>((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('Failed to load PDF generation library'));
        document.body.appendChild(script);
      });
    }

    const element = document.getElementById(elementId);
    if (!element) {
      throw new Error(`Element with ID "${elementId}" not found`);
    }

    // Clone element configuration and apply options
    const opt: any = {
      margin:       options.hasOwnProperty('margin') ? options.margin : 10,
      filename:     filename.endsWith('.pdf') ? filename : `${filename}.pdf`,
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  {
        scale: 2,
        useCORS: true,
        ignoreElements: (el: HTMLElement) => el.classList?.contains('no-print') || el.tagName === 'BUTTON' || el.classList?.contains('hair-stock-print-btn') || el.classList?.contains('wig-stock-print-btn') || el.classList?.contains('matching-print-btn') || el.classList?.contains('reports-print-btn'),
        ...options.html2canvas
      },
      jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait', ...options.jsPDF },
      pagebreak:    options.pagebreak || { mode: ['css', 'legacy'] }
    };

    await (window as any).html2pdf().from(element).set(opt).save();
    toast.success('PDF downloaded successfully!', { id: toastId });
  } catch (err: any) {
    console.error('Error generating PDF:', err);
    toast.error(err?.message || 'Failed to generate PDF', { id: toastId });
  }
};
