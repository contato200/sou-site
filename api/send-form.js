// Vercel Serverless Function — envia o form de contato do site SOU pela API do Gmail.
// Usa OAuth2 (mesma credencial do "SOU Gmail MCP", scope gmail.modify). Sem SMTP, sem App Password, sem dependências.
//
// Env vars no Vercel (Project sou-site → Settings → Environment Variables):
//   GMAIL_CLIENT_ID      → client_id do gcp-oauth.keys.json
//   GMAIL_CLIENT_SECRET  → client_secret do gcp-oauth.keys.json
//   GMAIL_REFRESH_TOKEN  → refresh_token do credentials.json do MCP
//   GMAIL_USER           → contato@souproducoesaudiovisuais.com (remetente)
//   FORM_TO              → (opcional) destino. Default = GMAIL_USER

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const digits = (s) => (s || "").replace(/\D+/g, "");
const esc = (s) =>
  String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
const b64url = (buf) =>
  Buffer.from(buf).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const mimeWord = (s) => "=?UTF-8?B?" + Buffer.from(String(s)).toString("base64") + "?=";

async function getAccessToken() {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GMAIL_CLIENT_ID,
      client_secret: process.env.GMAIL_CLIENT_SECRET,
      refresh_token: process.env.GMAIL_REFRESH_TOKEN,
      grant_type: "refresh_token"
    })
  });
  const data = await res.json();
  if (!data.access_token) throw new Error("token: " + JSON.stringify(data));
  return data.access_token;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false, error: "Método não permitido" });
  }

  const b = req.body || {};
  const nome = (b.nome || "").toString().trim();
  const empresa = (b.empresa || "").toString().trim();
  const cargo = (b.cargo || "").toString().trim();
  const whatsapp = (b.whatsapp || "").toString().trim();
  const email = (b.email || "").toString().trim();
  const faturamento = (b.faturamento || "").toString().trim();
  const mensagem = (b.mensagem || "").toString().trim();

  if (!nome || nome.length < 2) return res.status(400).json({ ok: false, error: "Nome obrigatório." });
  if (!EMAIL_RE.test(email)) return res.status(400).json({ ok: false, error: "E-mail inválido." });
  if (digits(whatsapp).length < 10) return res.status(400).json({ ok: false, error: "WhatsApp inválido." });

  const user = process.env.GMAIL_USER;
  const to = process.env.FORM_TO || user;
  if (!user || !process.env.GMAIL_REFRESH_TOKEN || !process.env.GMAIL_CLIENT_ID) {
    console.error("Env vars GMAIL_* não configuradas no Vercel.");
    return res.status(500).json({ ok: false, error: "Servidor não configurado." });
  }

  const quando = new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
  const subject = `SOU — novo lead do site: ${nome}${empresa ? " (" + empresa + ")" : ""}`;

  const linhas = [
    ["Nome", nome],
    ["Empresa", empresa || "—"],
    ["Cargo", cargo || "—"],
    ["WhatsApp", whatsapp],
    ["E-mail", email],
    ["Faturamento anual", faturamento || "—"],
    ["Mensagem", mensagem || "—"]
  ];

  const rows = linhas
    .map(([k, v]) => {
      let cell;
      if (k === "E-mail") cell = `<a href="mailto:${esc(v)}" style="color:#0F1010">${esc(v)}</a>`;
      else if (k === "WhatsApp") cell = `<a href="https://wa.me/55${digits(v)}" style="color:#0F1010">${esc(v)}</a>`;
      else cell = `<strong>${esc(v)}</strong>`;
      return `<tr><td style="padding:9px 0;border-bottom:1px solid #ececec;color:#888;width:150px;vertical-align:top">${esc(k)}</td><td style="padding:9px 0;border-bottom:1px solid #ececec;color:#0F1010">${cell}</td></tr>`;
    })
    .join("");

  const html =
    `<div style="font-family:Inter,Arial,sans-serif;max-width:560px;color:#0F1010">` +
    `<p style="font-size:12px;color:#C9A961;margin:0 0 6px;text-transform:uppercase;letter-spacing:0.12em">SOU · Consultoria de Growth Marketing</p>` +
    `<h2 style="margin:0 0 20px;color:#0F1010;font-size:20px">Novo lead pelo site</h2>` +
    `<table style="width:100%;border-collapse:collapse">${rows}</table>` +
    `<p style="margin-top:24px;font-size:12px;color:#999">Recebido em ${esc(quando)} · consultoria.souproducoesaudiovisuais.com</p>` +
    `</div>`;

  const headers = [
    `From: ${mimeWord("SOU · Site")} <${user}>`,
    `To: ${to}`,
    `Reply-To: ${mimeWord(nome.replace(/"/g, ""))} <${email}>`,
    `Subject: ${mimeWord(subject)}`,
    "MIME-Version: 1.0",
    "Content-Type: text/html; charset=UTF-8",
    "Content-Transfer-Encoding: base64",
    "",
    Buffer.from(html).toString("base64")
  ].join("\r\n");

  try {
    const accessToken = await getAccessToken();
    const r = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ raw: b64url(headers) })
    });
    const data = await r.json();
    if (!r.ok || !data.id) throw new Error("send: " + JSON.stringify(data));
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("Erro Gmail API:", err.message);
    return res.status(500).json({ ok: false, error: "Falha ao enviar e-mail." });
  }
}
