let transporter = null;

function obtenerTransporter() {
  if (transporter) return transporter;

  const nodemailer = require('nodemailer');
  const puerto = Number(process.env.SMTP_PORT || 587);
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: puerto,
    secure: puerto === 465,
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
      : undefined,
  });

  return transporter;
}

async function enviarPorApiMailgrid({ destino, asunto, texto, html }) {
  const apiUrl =
    process.env.MAILGRID_API_URL || 'https://api.mailgrid.net.br/send/';
  const headers = {
    'Content-Type': 'application/json',
  };
  if (process.env.MAILGRID_API_KEY) {
    headers.Authorization = `Bearer ${process.env.MAILGRID_API_KEY}`;
  }

  const remitente =
    process.env.MAILGRID_FROM_EMAIL ||
    process.env.SMTP_FROM ||
    process.env.SMTP_USER ||
    'no-responder@gimnasio.local';

  const respuesta = await fetch(apiUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      host_smtp: process.env.SMTP_HOST || 'cloud.mailgrid.net.br',
      usuario_smtp: process.env.SMTP_USER || '',
      senha_smtp: process.env.SMTP_PASS || process.env.MAILGRID_API_KEY || '',
      emailRemetente: remitente,
      nomeRemetente: process.env.MAILGRID_FROM_NAME || 'FitBook Gimnasio y Canchas',
      emailDestino: Array.isArray(destino) ? destino : [destino],
      assunto: asunto,
      mensagem: html || texto,
    }),
  });

  if (!respuesta.ok) {
    const detalle = await respuesta.text().catch(() => '');
    throw new Error(`Error Mailgrid API (${respuesta.status}): ${detalle}`);
  }

  const datos = await respuesta.json().catch(() => ({}));
  return {
    estado: 'enviado',
    proveedorId: datos?.id || datos?.messageId || 'mailgrid-api',
  };
}

async function enviar({ destino, asunto, texto, html }) {
  if (!destino) {
    return { estado: 'omitido', motivo: 'SMTP no configurado' };
  }

  if (
    process.env.EMAIL_PROVIDER === 'mailgrid-api' &&
    (process.env.MAILGRID_API_KEY || process.env.SMTP_PASS)
  ) {
    return enviarPorApiMailgrid({ destino, asunto, texto, html });
  }

  if (!process.env.SMTP_HOST) {
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

module.exports = { enviar, enviarPorApiMailgrid, __setTransporter };
