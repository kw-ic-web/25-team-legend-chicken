const mongoose = require("mongoose");

const WhiteboardPageSchema = new mongoose.Schema(
  {
    lecture_id: { type: String, required: true },
    class_id: { type: String, required: true },
    page_number: { type: Number, required: true },
    image_path: { type: String, required: true }, // 필기 이미지 (GridFS URL)
    text: { type: String, default: "" },
    original_pdf_path: { type: String, default: "" }, // 원본 교안 PDF (GridFS URL)
    pdf_path: { type: String, default: "" }, // 필기+교안 합본 PDF (GridFS URL)
    status: {
      type: String,
      enum: ["draft", "finalized"],
      default: "draft",
    },
  },
  {
    timestamps: true,
  }
);

WhiteboardPageSchema.index({ lecture_id: 1, class_id: 1, page_number: 1 }, { unique: true });

module.exports =
  mongoose.models.WhiteboardPage || mongoose.model("WhiteboardPage", WhiteboardPageSchema);

