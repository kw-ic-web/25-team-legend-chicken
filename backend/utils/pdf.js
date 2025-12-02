const PDFDocument = require("pdfkit");
const fs = require("fs-extra");
const path = require("path");
const PDFLib = require("pdf-lib");
const { execFile } = require("child_process");
const util = require("util");
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
const { uploadFile } = require("./gridfs");

fs.ensureDirSync(pdfBaseDir);
const execFileAsync = util.promisify(execFile);

/**
 * 이미지 한 장을 PDF로 변환하고 GridFS에 저장합니다.
 * @param {string} imagePath - 원본 이미지의 파일 시스템 경로
 * @param {object} options
 * @param {string} options.lectureId
 * @param {string} options.classId
 * @param {number} options.pageNumber
 * @param {boolean} options.saveToGridFS - GridFS에 저장할지 여부 (기본값: true)
 * @returns {Promise<{ pdfPath: string, filename: string, gridfsId?: string }>}
 */
async function createPdfFromImage(imagePath, { lectureId, classId, pageNumber, saveToGridFS = true }) {
  const timestamp = Date.now();
  const filename = `whiteboard-${lectureId}-${classId}-p${pageNumber}-${timestamp}.pdf`;
  const outputPath = path.join(pdfBaseDir, filename);

  // PDF 생성
  const pdfBuffer = await new Promise((resolve, reject) => {
    const doc = new PDFDocument({ autoFirstPage: false });
    const chunks = [];

    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    doc.addPage({ margin: 0 });
    const { width, height } = doc.page;

    doc.image(imagePath, 0, 0, {
      width,
      height,
      align: "center",
      valign: "center",
    });

    doc.end();
  });

  // GridFS에 저장
  if (saveToGridFS) {
    try {
      const gridfsId = await uploadFile(pdfBuffer, filename, "application/pdf", {
        lectureId,
        classId: String(classId),
        pageNumber,
        type: "annotated_pdf",
      });
      
      // 임시 파일 삭제
      await fs.remove(outputPath).catch(() => {});
      
      return {
        pdfPath: `/api/files/${gridfsId}`,
        filename,
        gridfsId,
      };
    } catch (error) {
      console.error("[createPdfFromImage] GridFS 저장 실패, 로컬 파일 사용:", error);
      // GridFS 저장 실패 시 로컬 파일로 저장
      await fs.writeFile(outputPath, pdfBuffer);
    }
  } else {
    // 로컬 파일로만 저장
    await fs.writeFile(outputPath, pdfBuffer);
  }

  return {
    pdfPath: `/${outputPath.replace(/\\/g, "/")}`,
    filename,
  };
}

const toAbsolutePath = (publicPath) => {
  if (!publicPath || typeof publicPath !== "string") {
    throw new Error("publicPath must be a non-empty string");
  }
  const normalized = publicPath.startsWith("/") ? publicPath.slice(1) : publicPath;
  return path.resolve(process.cwd(), normalized);
};

/**
 * 업로드된 PDF를 단일 페이지 PDF들로 분할 저장합니다.
 * @param {string|Buffer} sourcePdf - 업로드된 원본 PDF의 파일 시스템 경로 또는 Buffer
 * @param {object} options
 * @param {string} options.lectureId
 * @param {string|number} options.classId
 * @returns {Promise<Array<{ pageNumber: number, pdfPath: string, filename: string, buffer?: Buffer }>>}
 */
async function splitPdfIntoPages(sourcePdf, { lectureId, classId }) {
  // 경로 또는 버퍼 모두 처리
  const inputBytes = Buffer.isBuffer(sourcePdf) 
    ? sourcePdf 
    : await fs.readFile(sourcePdf);
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
      buffer: outBytes, // GridFS 저장을 위한 버퍼 추가
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
  /**
   * 단일 페이지 PDF를 PNG 이미지로 변환합니다.
   * (poppler의 pdftoppm 사용, Ghostscript 불필요)
   * @param {string} pdfAbsolutePath
   * @returns {Promise<string>} 생성된 이미지 파일의 절대 경로
   */
  async convertPdfPageToImage(pdfAbsolutePath) {
    // pdftoppm -singlefile -png -r 150 input.pdf output_base
    const outputBase = pdfAbsolutePath.replace(/\.pdf$/i, "");
    const args = ["-singlefile", "-png", "-r", "150", pdfAbsolutePath, outputBase];
    await execFileAsync("pdftoppm", args);
    const imagePath = `${outputBase}.png`;
    return imagePath;
  },
};

