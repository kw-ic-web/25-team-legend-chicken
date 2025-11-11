const PDFDocument = require("pdfkit");
const fs = require("fs-extra");
const path = require("path");

const pdfBaseDir = "uploads/pdfs/whiteboard";

fs.ensureDirSync(pdfBaseDir);

/**
 * 이미지 한 장을 PDF로 변환합니다.
 * @param {string} imagePath - 원본 이미지의 파일 시스템 경로
 * @param {object} options
 * @param {string} options.lectureId
 * @param {string} options.classId
 * @param {number} options.pageNumber
 * @returns {Promise<{ pdfPath: string, filename: string }>}
 */
async function createPdfFromImage(imagePath, { lectureId, classId, pageNumber }) {
  const timestamp = Date.now();
  const filename = `whiteboard-${lectureId}-${classId}-p${pageNumber}-${timestamp}.pdf`;
  const outputPath = path.join(pdfBaseDir, filename);

  await new Promise((resolve, reject) => {
    const doc = new PDFDocument({ autoFirstPage: false });
    const stream = fs.createWriteStream(outputPath);

    doc.pipe(stream);
    doc.addPage({ margin: 0 });

    const { width, height } = doc.page;

    doc.image(imagePath, 0, 0, {
      width,
      height,
      align: "center",
      valign: "center",
    });

    doc.end();

    stream.on("finish", resolve);
    stream.on("error", reject);
  });

  return {
    pdfPath: `/${outputPath.replace(/\\/g, "/")}`,
    filename,
  };
}

const toAbsolutePath = (publicPath) => {
  const normalized = publicPath.startsWith("/") ? publicPath.slice(1) : publicPath;
  return path.resolve(process.cwd(), normalized);
};

module.exports = {
  createPdfFromImage,
  toAbsolutePath,
};

