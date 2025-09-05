import type { NextApiRequest, NextApiResponse } from "next";
import crypto from "crypto";

const BOT_TOKEN = process.env.BOT_TOKEN;

function verify(data: Record<string, any>, botToken: string): boolean {
  const { hash, ...rest } = data;
  const sorted = Object.keys(rest).sort().map(k => `${k}=${rest[k]}`).join("\n");
  const secret = crypto.createHash("sha256").update(botToken).digest();
  const hmac = crypto.createHmac("sha256", secret).update(sorted).digest("hex");
  return hmac === String(hash);
}

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (!BOT_TOKEN) return res.status(500).send("BOT_TOKEN is not set");

    const q = req.query as Record<string, any>;
    if (!q.hash) return res.status(400).send("Missing hash");
    if (!verify(q, BOT_TOKEN)) return res.status(403).send("Invalid signature");

    const authDateMs = Number(q.auth_date || 0) * 1000;
    if (!authDateMs || Date.now() - authDateMs > 24 * 3600 * 1000) {
      return res.status(403).send("Auth data is too old");
    }

    const user = {
      id: Number(q.id),
      first_name: q.first_name || "",
      last_name: q.last_name || "",
      username: q.username || "",
      photo_url: q.photo_url || "",
    };

    // Сохранять пользователя в БД можно здесь.

    // Простая cookie-сессия (демо)
    const session = Buffer.from(JSON.stringify({ uid: user.id, u: user.username })).toString("base64url");
    res.setHeader("Set-Cookie", [
      `session=${session}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${7*24*3600}; ${process.env.NODE_ENV === "production" ? "Secure" : ""}`,
    ]);

    // Редирект в приложение (страница /app)
    res.writeHead(302, { Location: "/app" });
    res.end();
  } catch (e) {
    console.error(e);
    res.status(500).send("Server error");
  }
}