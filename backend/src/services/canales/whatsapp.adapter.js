function normalizarDestino(destino) {
  const valor = String(destino || '').trim();
  if (!valor) return '';
  if (valor.startsWith('whatsapp:')) return valor;
  return `whatsapp:${valor.startsWith('+') ? valor : `+${valor}`}`;
}

async function enviar({ destino, mensaje }) {
  if (String(process.env.TWILIO_MODO_SIMULACION || '').toLowerCase() === 'true') {
    return { estado: 'enviado', proveedorId: `simulado-${Date.now()}` };
  }

  const numero = normalizarDestino(destino);
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const remitente = process.env.TWILIO_WHATSAPP_FROM;

  if (!sid || !token || !remitente || !numero) {
    return { estado: 'omitido', motivo: 'Twilio no configurado' };
  }

  const cuerpo = new URLSearchParams({
    To: numero,
    From: normalizarDestino(remitente),
    Body: mensaje,
  });

  const respuesta = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(sid)}/Messages.json`,
    {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: cuerpo,
    }
  );

  let datos = {};
  try {
    datos = await respuesta.json();
  } catch {
    datos = {};
  }

  if (!respuesta.ok) {
    const error = new Error(datos.message || `Twilio respondió ${respuesta.status}`);
    error.codigo = respuesta.status;
    throw error;
  }

  return { estado: 'enviado', proveedorId: datos.sid || null };
}

module.exports = { enviar, normalizarDestino };
