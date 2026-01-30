const pdf = require("html-pdf-node");
const {mouTemplate} = require("./emailTemplates");

exports.previewMouPdf = async (req, res) => {
  const html = mouTemplate({
    name: req.user.name,
    email: req.user.email,
    date: new Date().toDateString(),
    signedAt: null,
  });

  const file = await pdf.generatePdf(
    { content: html },
    { format: "A4" }
  );

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    "inline; filename=mou-preview.pdf"
  );

  return res.send(file);
};
