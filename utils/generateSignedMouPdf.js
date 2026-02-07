const path = require("path");
const fs = require("fs");
const pdf = require("html-pdf-node");
const MouVersion = require("../models/mouVersion");
const { fillTemplate } = require("./emailTemplates");

module.exports = async function generateSignedPdf({ mou, user }) {
  // 1️⃣ Load base template
  const template = await MouVersion.findOne({ isBaseTemplate: true });
  if (!template) throw new Error("Base template missing");

  // 2️⃣ Fill placeholders properly
  const html = fillTemplate(template.htmlContent, {
    mouNumber: mou.mouNumber,
    createdAt: mou.createdAt,
    name: user.name,
    email: user.email,
  });

  // 3️⃣ Save PDF
  const uploadDir = path.join(__dirname, "../assets/uploads/mou/signed");
  if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

  const filePath = path.join(uploadDir, `MOU-${mou.mouNumber}.pdf`);

  await pdf.generatePdf({ content: html }, { format: "A4", path: filePath });

  return `assets/uploads/mou/signed/MOU-${mou.mouNumber}.pdf`;
};
