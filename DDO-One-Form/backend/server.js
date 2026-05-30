const express = require("express");
const cors = require("cors");
const multer = require("multer");
const nodemailer = require("nodemailer");
const PDFDocument = require("pdfkit");
const dotenv = require("dotenv");
const fs = require("fs");
const path = require("path");

dotenv.config();

const app = express();
const port = process.env.PORT || 4000;
const uploadsDir = path.join(__dirname, "uploads");
const pdfDir = path.join(__dirname, "generated-pdf");
const logoPath = path.resolve(__dirname, "../../src/assets/horse_logo.png");

fs.mkdirSync(uploadsDir, { recursive: true });
fs.mkdirSync(pdfDir, { recursive: true });

app.use(cors());
app.use(express.json());
app.use("/uploads", express.static(uploadsDir));

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    const baseName = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9-_]/g, "_");
    cb(null, `${Date.now()}-${baseName}${ext}`);
  },
});

const upload = multer({ storage });

const uploadFields = upload.fields([
  { name: "companyPhotos", maxCount: 10 },
  { name: "companyLogo", maxCount: 1 },
  { name: "companyProof", maxCount: 2 },
  { name: "otherDocuments", maxCount: 10 },
]);

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

function createSubmissionId() {
  return `DDO-${Date.now().toString().slice(-8)}`;
}

function hasPlaceholderEmailConfig() {
  return (
    !process.env.EMAIL_USER ||
    !process.env.EMAIL_PASS ||
    !process.env.RECEIVER_EMAIL ||
    process.env.EMAIL_USER === "yourgmail@gmail.com" ||
    process.env.EMAIL_PASS === "your_gmail_app_password"
  );
}

function formatDate(date = new Date()) {
  return new Intl.DateTimeFormat("en-IN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
}

function addPageChrome(doc, submissionId, dateText) {
  const margin = 36;
  const previousX = doc.x;
  const previousY = doc.y;
  doc.save();
  doc.lineWidth(1.2).rect(margin, margin, doc.page.width - margin * 2, doc.page.height - margin * 2).stroke("#111111");
  doc.restore();

  if (fs.existsSync(logoPath)) {
    doc.image(logoPath, margin + 12, margin + 12, { width: 52 });
  }

  doc
    .font("Helvetica")
    .fontSize(10)
    .fillColor("#111111")
    .text(`Date: ${dateText}`, doc.page.width - 210, margin + 14, {
      align: "right",
      width: 160,
    })
    .text(`Submission ID: ${submissionId}`, doc.page.width - 210, margin + 30, {
      align: "right",
      width: 160,
    });

  doc
    .font("Helvetica-Bold")
    .fontSize(20)
    .text("DDO One Company Form", margin, margin + 58, {
      align: "center",
      width: doc.page.width - margin * 2,
    });

  doc
    .font("Helvetica")
    .fontSize(9)
    .fillColor("#444444")
    .text("Powered by DDO", margin, doc.page.height - margin - 18, {
      align: "center",
      width: doc.page.width - margin * 2,
      lineBreak: false,
    });

  doc.x = previousX;
  doc.y = Math.max(previousY, margin + 110);
}

function ensureSpace(doc, neededHeight = 90, submissionId, dateText) {
  if (doc.y + neededHeight < doc.page.height - 70) {
    return;
  }
  doc.addPage();
  addPageChrome(doc, submissionId, dateText);
}

function drawSectionTitle(doc, title, submissionId, dateText) {
  ensureSpace(doc, 50, submissionId, dateText);
  doc.moveDown(0.5);
  doc
    .font("Helvetica-Bold")
    .fontSize(13)
    .fillColor("#111111")
    .text(title, 64, doc.y);

  doc
    .moveTo(64, doc.y + 4)
    .lineTo(doc.page.width - 64, doc.y + 4)
    .lineWidth(0.8)
    .stroke("#111111");

  doc.moveDown(0.8);
}

function drawRow(doc, label, value, submissionId, dateText) {
  const left = 64;
  const labelWidth = 170;
  const valueWidth = doc.page.width - left * 2 - labelWidth;
  const safeValue = value && String(value).trim() ? String(value).trim() : "N/A";
  const rowHeight = Math.max(
    doc.heightOfString(label, { width: labelWidth - 12 }),
    doc.heightOfString(safeValue, { width: valueWidth - 16 })
  ) + 18;

  ensureSpace(doc, rowHeight + 10, submissionId, dateText);

  const top = doc.y;

  doc.rect(left, top, labelWidth, rowHeight).lineWidth(0.8).stroke("#111111");
  doc.rect(left + labelWidth, top, valueWidth, rowHeight).lineWidth(0.8).stroke("#111111");

  doc
    .font("Helvetica-Bold")
    .fontSize(10)
    .fillColor("#111111")
    .text(label, left + 8, top + 8, { width: labelWidth - 12 });

  doc
    .font("Helvetica")
    .fontSize(10)
    .fillColor("#111111")
    .text(safeValue, left + labelWidth + 8, top + 8, { width: valueWidth - 16 });

  doc.y = top + rowHeight;
}

function collectFiles(files = {}) {
  return Object.entries(files).flatMap(([field, fileEntries]) =>
    fileEntries.map((file) => ({
      field,
      originalname: file.originalname,
      path: file.path,
    }))
  );
}

function formatUploadSummary(fieldName, files) {
  if (!files || files.length === 0) {
    return "Not provided";
  }
  return files.map((file) => file.originalname).join(", ");
}

async function generatePdf({ body, files, pdfPath, submissionId, dateText }) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 50 });
    const stream = fs.createWriteStream(pdfPath);

    stream.on("finish", resolve);
    stream.on("error", reject);
    doc.on("error", reject);

    doc.pipe(stream);
    addPageChrome(doc, submissionId, dateText);

    doc
      .font("Helvetica-Bold")
      .fontSize(12)
      .fillColor("#111111")
      .text(body.companyName || "Unnamed Company", 64, doc.y, {
        align: "center",
        width: doc.page.width - 128,
      });

    doc.moveDown(1.2);

    drawSectionTitle(doc, "1. Company Details", submissionId, dateText);
    drawRow(doc, "Company Name", body.companyName, submissionId, dateText);
    drawRow(doc, "Company Website URL", body.companyWebsite, submissionId, dateText);
    drawRow(doc, "Company Details", body.companyDescription, submissionId, dateText);
    drawRow(doc, "Company Email", body.companyEmail, submissionId, dateText);
    drawRow(doc, "Company Phone Number", body.companyPhone, submissionId, dateText);

    drawSectionTitle(doc, "2. Company Headquarter / Main Office Details", submissionId, dateText);
    drawRow(doc, "City", body.hqCity, submissionId, dateText);
    drawRow(doc, "State", body.hqState, submissionId, dateText);
    drawRow(doc, "Country", body.hqCountry, submissionId, dateText);
    drawRow(doc, "Pincode / ZIP Code", body.hqZip, submissionId, dateText);
    drawRow(doc, "Full Office Address", body.hqAddress, submissionId, dateText);
    drawRow(doc, "Landmark", body.hqLandmark, submissionId, dateText);
    drawRow(doc, "Office Contact Number", body.hqPhone, submissionId, dateText);

    drawSectionTitle(doc, "3. Person Filling This Form", submissionId, dateText);
    drawRow(doc, "Full Name", body.personName, submissionId, dateText);
    drawRow(doc, "Email", body.personEmail, submissionId, dateText);
    drawRow(doc, "Phone Number", body.personPhone, submissionId, dateText);
    drawRow(doc, "Country", body.personCountry, submissionId, dateText);
    drawRow(doc, "State", body.personState, submissionId, dateText);
    drawRow(doc, "City", body.personCity, submissionId, dateText);
    drawRow(doc, "Pincode", body.personZip, submissionId, dateText);
    drawRow(doc, "Full Address", body.personAddress, submissionId, dateText);
    drawRow(doc, "Position in Company", body.personPosition, submissionId, dateText);
    drawRow(doc, "Department", body.personDepartment, submissionId, dateText);
    drawRow(doc, "ID / Reference Number", body.referenceNumber, submissionId, dateText);

    drawSectionTitle(doc, "4. Optional Uploads", submissionId, dateText);
    drawRow(doc, "Company Photos", formatUploadSummary("companyPhotos", files.companyPhotos), submissionId, dateText);
    drawRow(doc, "Company Logo", formatUploadSummary("companyLogo", files.companyLogo), submissionId, dateText);
    drawRow(doc, "Company Registered Proof", formatUploadSummary("companyProof", files.companyProof), submissionId, dateText);
    drawRow(doc, "Other Documents", formatUploadSummary("otherDocuments", files.otherDocuments), submissionId, dateText);

    doc.end();
  });
}

async function cleanupFiles(filePaths) {
  await Promise.all(
    filePaths.map(async (filePath) => {
      try {
        await fs.promises.unlink(filePath);
      } catch (_error) {
        // Ignore cleanup failures.
      }
    })
  );
}

app.post("/api/submissions", uploadFields, async (req, res) => {
  const submissionId = createSubmissionId();
  const dateText = formatDate();
  const pdfPath = path.join(pdfDir, `${submissionId}.pdf`);
  const uploadedFiles = collectFiles(req.files);
  const cleanupTargets = [pdfPath, ...uploadedFiles.map((file) => file.path)];

  try {
    if (hasPlaceholderEmailConfig()) {
      return res.status(500).json({
        message: "Email configuration is not ready. Please update backend/.env with your Gmail address and app password before submitting.",
      });
    }

    if (req.body.companyEmailVerified !== "true") {
      return res.status(400).json({ message: "Company email must be verified before submission." });
    }

    await generatePdf({
      body: req.body,
      files: req.files || {},
      pdfPath,
      submissionId,
      dateText,
    });

    const attachments = [
      {
        filename: path.basename(pdfPath),
        path: pdfPath,
      },
      ...uploadedFiles.map((file) => ({
        filename: file.originalname,
        path: file.path,
      })),
    ];

    const mailInfo = await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: process.env.RECEIVER_EMAIL,
      subject: "New DDO One Company Form Submission",
      text: "A new company has submitted the DDO One form. Please check the attached PDF for full details.",
      attachments,
    });

    await cleanupFiles(cleanupTargets);

    console.log("DDO One mail accepted:", {
      submissionId,
      messageId: mailInfo.messageId,
      accepted: mailInfo.accepted,
      response: mailInfo.response,
    });

    return res.status(200).json({
      message: "DDO One form submitted successfully. Details sent to DDO team.",
      submissionId,
      messageId: mailInfo.messageId,
    });
  } catch (error) {
    await cleanupFiles(cleanupTargets);
    return res.status(500).json({
      message: error.message || "Failed to submit the form.",
    });
  }
});

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.listen(port, () => {
  console.log(`DDO One backend listening on http://127.0.0.1:${port}`);
});
