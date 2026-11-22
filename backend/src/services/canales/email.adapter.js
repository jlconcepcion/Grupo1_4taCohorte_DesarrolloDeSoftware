const nodemailer = require('nodemailer');

let transporter = null;

function obtenerTransporter() {
  if (transporter) return transporter;

  const puerto = Number(process.env.SMTP_PORT || 587);
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: puerto,
    secure: puerto === 465,
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
      : undefined,
  });

  return transporter;
}

async function enviar({ destino, asunto, texto, html }) {
  if (!process.env.SMTP_HOST || !destino) {
    return { estado: 'omitido', motivo: 'SMTP no configurado' };
  }

  const informacion = await obtenerTransporter().sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to: destino,
    subject: asunto,
    text: texto,
    html: html || undefined,
  });

  return { estado: 'enviado', proveedorId: informacion?.messageId || null };
}

function __setTransporter(fakeTransporter) {
  transporter = fakeTransporter;
}

module.exports = { enviar, __setTransporter };
