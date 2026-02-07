const otpTemplate = (otp) => `
<html>
  <body style="margin:0; padding:0; background:#0f172a; font-family: 'Arial', sans-serif;">

    <table width="100%" cellpadding="0" cellspacing="0" style="padding:30px 10px;">
      <tr>
        <td align="center">

          <!-- Card -->
          <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px; background:#ffffff; border-radius:14px; overflow:hidden;">

            <!-- Header -->
            <tr>
              <td style="background:linear-gradient(135deg,#ff512f,#dd2476); padding:30px; text-align:center;">
                <h1 style="margin:0; color:#ffffff; font-size:30px; letter-spacing:2px;">
                  INDIA COLLEGE FEST
                </h1>
                <p style="margin:8px 0 0; color:#ffecec; font-size:14px;">
                  Music • Dance • Culture • Talent
                </p>
              </td>
            </tr>

            <!-- Body -->
            <tr>
              <td style="padding:35px 30px; text-align:center;">
                <h2 style="margin-top:0; color:#111827; font-size:22px;">
                  Verify Your Login
                </h2>

                <p style="font-size:15px; color:#4b5563; line-height:1.6;">
                  You're one step away from entering the fest zone 🎉  
                  Use the OTP below to continue.
                </p>

                <!-- OTP -->
                <div style="
                  margin:30px auto;
                  padding:18px 30px;
                  background:#fef3c7;
                  color:#92400e;
                  font-size:28px;
                  font-weight:bold;
                  letter-spacing:6px;
                  border-radius:10px;
                  display:inline-block;
                ">
                  ${otp}
                </div>

                <p style="font-size:13px; color:#6b7280; margin-top:25px;">
                  ⏳ This OTP is valid for <strong>2 minutes</strong>
                </p>

                <p style="font-size:13px; color:#9ca3af;">
                  Didn’t request this? Just ignore this email.
                </p>
              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td style="background:#f9fafb; padding:20px; text-align:center;">
                <p style="margin:0; font-size:12px; color:#6b7280;">
                  © ${new Date().getFullYear()} India College Fest  
                  <br/>Made for students, by students 🎓
                </p>
              </td>
            </tr>

          </table>

        </td>
      </tr>
    </table>

  </body>
</html>
`;

const organiserCredentialsTemplate = (email, name, password) => `
<html>
  <body style="margin:0;padding:0;background:#0f172a;font-family:Arial,sans-serif;">

    <table width="100%" cellpadding="0" cellspacing="0" style="padding:30px 10px;">
      <tr>
        <td align="center">

          <table width="100%" cellpadding="0" cellspacing="0"
            style="max-width:600px;background:#ffffff;border-radius:14px;overflow:hidden;">

            <!-- Header -->
            <tr>
              <td style="background:linear-gradient(135deg,#7c3aed,#4f46e5);
                padding:30px;text-align:center;">
                <h1 style="margin:0;color:#ffffff;font-size:28px;letter-spacing:2px;">
                  INDIA COLLEGE FEST
                </h1>
                <p style="margin-top:8px;color:#e0e7ff;">
                  Organizer Access Approved 🎉
                </p>
              </td>
            </tr>

            <!-- Body -->
            <tr>
              <td style="padding:35px 30px;text-align:center;">

                <h2 style="margin-top:0;color:#111827;">
                  Welcome ${name} 🚀
                </h2>

                <p style="font-size:15px;color:#4b5563;line-height:1.6;">
                  Your organizer account has been approved by our team.
                </p>

                <div style="
                  margin:25px auto;
                  padding:20px;
                  background:#f3f4f6;
                  border-radius:12px;
                  text-align:left;
                  max-width:360px;
                  font-size:15px;
                  color:#111827;
                ">
                  <p><strong>Email:</strong> ${email}</p>
                  <p><strong>Password:</strong> ${password}</p>
                </div>

                <p style="color:#dc2626;font-size:14px;">
                  ⚠ Please change your password after first login.
                </p>

                <a href="https://indiacollegefest.com/login"
                  style="
                    display:inline-block;
                    margin-top:20px;
                    padding:12px 30px;
                    background:#4f46e5;
                    color:#ffffff;
                    text-decoration:none;
                    border-radius:8px;
                    font-weight:bold;
                  ">
                  Login Now
                </a>

              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td style="background:#f9fafb;padding:20px;text-align:center;">
                <p style="margin:0;font-size:12px;color:#6b7280;">
                  © ${new Date().getFullYear()} India College Fest
                </p>
              </td>
            </tr>

          </table>

        </td>
      </tr>
    </table>

  </body>
</html>
`;

const mouTemplate = ({ name, email, date, signedAt }) => `
<!DOCTYPE html>
<html>
<head>
  <style>
    body {
      font-family: Arial, Helvetica, sans-serif;
      font-size: 13px;
      color: #222;
      line-height: 1.6;
    }

    .container {
      width: 90%;
      margin: auto;
    }

    .title {
      text-align: center;
      font-size: 22px;
      font-weight: bold;
      margin-bottom: 30px;
      text-transform: uppercase;
    }

    .section {
      margin-bottom: 20px;
    }

    .signature {
      margin-top: 40px;
    }

    .footer {
      margin-top: 50px;
      font-size: 11px;
      color: #666;
      border-top: 1px solid #ddd;
      padding-top: 10px;
    }

    ul {
      margin-left: 20px;
    }
  </style>
</head>

<body>
  <div class="container">

    <div class="title">
      Memorandum of Understanding (MOU)
    </div>

    <div class="section">
      This Memorandum of Understanding ("Agreement") is entered on
      <b>${date}</b> between:
    </div>

    <div class="section">
      <b>Organizer:</b><br/>
      Name: ${name}<br/>
      Email: ${email}
    </div>

    <div class="section">
      By electronically signing this agreement, the Organizer agrees to the
      following terms:
    </div>

    <ul>
      <li>The platform acts only as a technology provider.</li>
      <li>The platform bears no financial responsibility.</li>
      <li>All disputes are solely between event organizers and participants.</li>
      <li>OTP-based digital consent is legally valid under the IT Act, 2000.</li>
      <li>This agreement is binding once digitally signed.</li>
    </ul>

    <div class="signature">
      <b>Organizer Signature:</b><br/>
      Digitally signed via OTP verification.
    </div>

    <div class="footer">
      Signed At: ${signedAt || "-"} <br/>
      This is a system generated document. No physical signature required.
    </div>

  </div>
</body>
</html>
`;

function fillTemplate(html, data) {
  return html
    .replace(/{{MOU_NUMBER}}/g, data.mouNumber)
    .replace(/{{MOU_DATE}}/g, new Date(data.createdAt).toDateString())
    .replace(/{{ORGANISER_NAME}}/g, data.name)
    .replace(/{{ORGANISER_EMAIL}}/g, data.email)
    // .replace(/{{ORGANISER_SIGNATURE}}/g, data.email)
    .replace(/{{SIGNED_AT}}/g, new Date().toLocaleString());
}


module.exports = { otpTemplate, organiserCredentialsTemplate, mouTemplate, fillTemplate };
