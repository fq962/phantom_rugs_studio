export const prerender = false;

import type { APIRoute } from "astro";
import nodemailer from "nodemailer";

const ALLOWED_EXT = ["png", "jpg", "jpeg", "webp", "heic", "heif"];
const MAX_SIZE = 10 * 1024 * 1024; // 10 MB

const json = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

export const POST: APIRoute = async ({ request }) => {
  let data: FormData;
  try {
    data = await request.formData();
  } catch {
    return json(400, { ok: false, error: "invalid_body" });
  }

  const firstName = data.get("firstName")?.toString().trim() ?? "";
  const lastName = data.get("lastName")?.toString().trim() ?? "";
  const email = data.get("email")?.toString().trim() ?? "";

  if (!firstName || !lastName || !email) {
    return json(400, { ok: false, error: "missing_fields" });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return json(400, { ok: false, error: "invalid_email" });
  }

  const attachments: { filename: string; content: Buffer }[] = [];
  const design = data.get("design");
  if (design instanceof File && design.size > 0) {
    const ext = design.name.split(".").pop()?.toLowerCase() ?? "";
    if (!ALLOWED_EXT.includes(ext)) {
      return json(400, { ok: false, error: "invalid_file_type" });
    }
    if (design.size > MAX_SIZE) {
      return json(400, { ok: false, error: "file_too_large" });
    }
    attachments.push({
      filename: design.name,
      content: Buffer.from(await design.arrayBuffer()),
    });
  }

  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = import.meta.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    console.error(
      "[contact] Missing SMTP_HOST / SMTP_USER / SMTP_PASS env vars",
    );
    return json(500, { ok: false, error: "server_misconfigured" });
  }

  const port = Number(SMTP_PORT ?? 465);
  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port,
    secure: port === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });

  try {
    await transporter.sendMail({
      from: `"${firstName} ${lastName}" <${email}>`,
      to: SMTP_USER,
      replyTo: `"${firstName} ${lastName}" <${email}>`,
      subject: `COTIZACIÓN CLIENTE: ${firstName} ${lastName}`,
      text: [
        `NOMBRE COMPLETO: ${firstName} ${lastName}`,
        `CORREO ELECTRÓNICO: ${email}`,
        `DISEÑO: ${attachments.length ? attachments[0].filename : "no se adjunto ningún diseño"}`,
      ].join("\n"),
      attachments,
    });
  } catch (err) {
    console.error("[contact] sendMail failed:", err);
    return json(500, { ok: false, error: "send_failed" });
  }

  return json(200, { ok: true });
};
