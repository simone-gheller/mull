import fp from 'fastify-plugin';
import nodemailer from 'nodemailer';

export default fp(async function mailerPlugin(fastify) {
  const transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST || '127.0.0.1',
    port: parseInt(process.env.SMTP_PORT || '54325'),
    secure: false,
    ignoreTLS: true,
  });

  fastify.decorate('mailer', {
    async sendInvite({ to, orgName, inviterName, role, inviteUrl }) {
      await transport.sendMail({
        from: process.env.SMTP_FROM || 'noreply@mull.app',
        to,
        subject: `You've been invited to join ${orgName} on mull`,
        html: buildInviteEmail({ orgName, inviterName, role, inviteUrl }),
      });
    },
  });
}, { name: 'mailer-plugin' });

function buildInviteEmail({ orgName, inviterName, role, inviteUrl }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>you've been invited — mull</title>
</head>
<body style="margin:0;padding:0;background-color:#08090c;font-family:'DM Sans','Outfit',-apple-system,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#08090c;padding:48px 16px;">
    <tr><td align="center">
      <table width="480" cellpadding="0" cellspacing="0" border="0" style="max-width:480px;width:100%;background-color:#0e1015;border:1px solid #1e232e;border-radius:8px;overflow:hidden;">
        <tr><td style="background-color:#22c55e;height:2px;padding:0;font-size:0;line-height:0;">&nbsp;</td></tr>
        <tr>
          <td style="padding:20px 28px 18px;border-bottom:1px solid #1e232e;">
            <table cellpadding="0" cellspacing="0" border="0"><tr>
              <td style="background-color:#1a1e26;border:1px solid #1e232e;border-radius:5px;width:24px;height:24px;text-align:center;vertical-align:middle;font-family:'JetBrains Mono','Fira Code',ui-monospace,monospace;font-size:12px;color:#f5f7fa;">▣</td>
              <td style="padding-left:9px;"><span style="font-family:'DM Sans','Outfit',sans-serif;font-size:14px;font-weight:700;color:#f5f7fa;letter-spacing:-0.01em;">mull</span></td>
            </tr></table>
          </td>
        </tr>
        <tr>
          <td style="padding:32px 28px 28px;">
            <p style="margin:0 0 6px;font-family:'DM Sans','Outfit',sans-serif;font-size:20px;font-weight:700;color:#f5f7fa;letter-spacing:-0.02em;">you've been invited</p>
            <p style="margin:0 0 28px;font-family:'DM Sans','Outfit',sans-serif;font-size:13px;color:#8a95a8;line-height:1.6;">
              <strong style="color:#f5f7fa;">${inviterName}</strong> invited you to join
              <strong style="color:#f5f7fa;">${orgName}</strong> as
              <span style="font-family:'JetBrains Mono','Fira Code',ui-monospace,monospace;font-size:11px;background:#1a1e26;border:1px solid #1e232e;padding:2px 7px;border-radius:3px;color:#f5f7fa;">${role.toLowerCase()}</span>
            </p>
            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:24px;">
              <tr>
                <td style="text-align:center;">
                  <a href="${inviteUrl}" style="display:inline-block;background-color:#22c55e;color:#08090c;font-family:'JetBrains Mono','Fira Code',ui-monospace,monospace;font-size:13px;font-weight:700;text-decoration:none;padding:12px 28px;border-radius:5px;">accept invite →</a>
                </td>
              </tr>
            </table>
            <p style="margin:0;font-family:'DM Sans','Outfit',sans-serif;font-size:12px;color:#3d4555;line-height:1.6;">
              or copy this link: <a href="${inviteUrl}" style="color:#8a95a8;word-break:break-all;">${inviteUrl}</a>
            </p>
            <p style="margin:12px 0 0;font-family:'DM Sans','Outfit',sans-serif;font-size:12px;color:#3d4555;">
              this invite expires in <span style="color:#8a95a8;">7 days</span>. if you weren't expecting this, you can ignore this email.
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding:14px 28px;border-top:1px solid #1e232e;">
            <p style="margin:0;font-family:'JetBrains Mono','Fira Code',ui-monospace,monospace;font-size:9px;color:#3d4555;letter-spacing:0.05em;">mull — secure configuration management</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
