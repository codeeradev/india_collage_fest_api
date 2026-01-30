const path = require("path");
const fs = require("fs");
const pdf = require("html-pdf-node");
const { mouTemplate } = require("./emailTemplates");

module.exports = async function generateSignedPdf(data) {
  const html = mouTemplate({
    name: data.name,
    email: data.email,
    date: new Date().toDateString(),
    signedAt: new Date().toLocaleString(),
  });

  // absolute directory
  const uploadDir = path.join(
    __dirname,
    "../assets/uploads/mou/signed"
  );

  // create folder if not exists
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  const signedPath = path.join(
    uploadDir,
    `MOU-${data.mouNumber}.pdf`
  );

  await pdf.generatePdf(
    { content: html },
    {
      format: "A4",
      path: signedPath,
    }
  );

  // return public path (for frontend)
  return `assets/uploads/mou/signed/MOU-${data.mouNumber}.pdf`;
};
