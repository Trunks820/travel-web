import { showToast } from "@/stores/toastStore";

export async function generatePdf(
  pages: HTMLDivElement[],
  filename: string,
): Promise<void> {
  const [htmlToImage, jsPDFModule] = await Promise.all([
    import("html-to-image"),
    import("jspdf"),
  ]);
  const { jsPDF } = jsPDFModule;

  await document.fonts.ready;

  const pdf = new jsPDF({ orientation: "portrait", unit: "px", format: [794, 1123] });

  for (let i = 0; i < pages.length; i++) {
    if (i > 0) pdf.addPage();
    const dataUrl = await htmlToImage.toPng(pages[i], {
      pixelRatio: 2,
      backgroundColor: "#ffffff",
      width: 794,
      height: 1123,
    });
    pdf.addImage(dataUrl, "PNG", 0, 0, 794, 1123);
  }

  pdf.save(filename);
  showToast("PDF 已导出");
}
