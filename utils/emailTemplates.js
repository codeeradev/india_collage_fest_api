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

module.exports = { otpTemplate };
