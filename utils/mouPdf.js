const pdf = require("html-pdf-node");
const MouVersion = require("../models/mouVersion");
const MOU = require("../models/mou");
const { fillTemplate } = require("../utils/emailTemplates");

exports.previewMouPdf = async (req, res) => {
  const mou = await MOU.findOne({ organizationId: req.user });

  if (!mou) return res.status(404).json({ message: "MOU missing" });

  const template = await MouVersion.findOne({ isBaseTemplate: true });
  if (!template)
    return res.status(500).json({ message: "Base template missing" });

  const html = fillTemplate(template.htmlContent, {
    mouNumber: mou.mouNumber,
    createdAt: mou.createdAt,
    name: req.user.name,
    email: req.user.email,
    // ORGANISER_SIGNATURE: req.user.name,
    SIGNED_AT: new Date().toLocaleString()

  });

  const file = await pdf.generatePdf(
    { content: html },
    { format: "A4" }
  );

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", "inline; filename=mou-preview.pdf");

  res.send(file);
};
