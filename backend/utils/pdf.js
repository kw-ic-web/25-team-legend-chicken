const PDFDocument = require("pdfkit");
const fs = require("fs-extra");
const path = require("path");
const PDFLib = require("pdf-lib");
let pdfParse = null;
try {
  // 동적 로드: ESM/CJS 호환 처리
  // eslint-disable-next-line global-require
  const pdfParseLib = require("pdf-parse");
  pdfParse =
    typeof pdfParseLib === "function"
      ? pdfParseLib
      : typeof pdfParseLib?.default === "function"
      ? pdfParseLib.default
      : null;
} catch (_) {
  pdfParse = null;
}

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

/**
 * 업로드된 PDF를 단일 페이지 PDF들로 분할 저장합니다.
 * @param {string} sourcePdfPath - 업로드된 원본 PDF의 파일 시스템 경로
 * @param {object} options
 * @param {string} options.lectureId
 * @param {string|number} options.classId
 * @returns {Promise<Array<{ pageNumber: number, pdfPath: string, filename: string }>>}
 */
async function splitPdfIntoPages(sourcePdfPath, { lectureId, classId }) {
  const inputBytes = await fs.readFile(sourcePdfPath);
  const srcDoc = await PDFLib.PDFDocument.load(inputBytes);
  const totalPages = srcDoc.getPageCount();

  const results = [];

  for (let i = 0; i < totalPages; i++) {
    const outDoc = await PDFLib.PDFDocument.create();
    const [copied] = await outDoc.copyPages(srcDoc, [i]);
    outDoc.addPage(copied);

    const timestamp = Date.now();
    const filename = `whiteboard-${lectureId}-${classId}-p${i + 1}-${timestamp}.pdf`;
    const outputPath = path.join(pdfBaseDir, filename);

    const outBytes = await outDoc.save();
    await fs.writeFile(outputPath, outBytes);

    results.push({
      pageNumber: i + 1,
      pdfPath: `/${outputPath.replace(/\\/g, "/")}`,
      filename,
    });
  }

  return results;
}

module.exports = {
  createPdfFromImage,
  toAbsolutePath,
  splitPdfIntoPages,
  /**
   * 단일 페이지 PDF에서 텍스트를 추출합니다.
   * (분할된 페이지 PDF에 사용)
   * @param {string} filePath
   * @returns {Promise<string>}
   */
  async extractTextFromPdf(filePath) {
    const buffer = await fs.readFile(filePath);
    if (!pdfParse) {
      return "";
    }
    const result = await pdfParse(buffer).catch(() => null);
    return result?.text || "";
  },
};

