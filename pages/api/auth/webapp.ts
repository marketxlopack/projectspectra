import type { NextApiRequest, NextApiResponse } from "next";
import crypto from "crypto";

const BOT_TOKEN = process.env.BOT_TOKEN || "";

/** Проверка подписи initData (WebApp):
 * https://core.telegram.org/bots/webapps#validating-data-received-via-the-web-app
 */
function checkWebAppSignature(initData: string, botToken: string): boolean {
  const urlParams = new URLSearchParams(initData);
  const hash = urlParams.get("hash");
  if (!hash) return false;

  const pairs: string[] = [];
  urlParams.forEach((value, key) => {
    if (key !== "hash") pairs.push(`${key}=${value}`);
  });
  pairs.sort();
  const dataCheckString = pairs.join("\n");

  const secretKey = crypto.createHash("sha256").update(botToken).digest();
  const hmac = crypto.createHmac("sha256", secretKey).update(dataCheckString).digest("hex");

  return hmac === hash;
}

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method !== "POST") return res.status(405).send("Method Not Allowed");
    if (!BOT_TOKEN) return res.status(500).send("BOT_TOKEN is not set");

    const { initData } = req.body || {};
    if (!initData || typeof initData !== "string") {
      return res.status(400).send("initData missing");
    }

    const ok = checkWebAppSignature(initData, BOT_TOKEN);
    if (!ok) return res.status(403).send("Invalid signature");

    // тут можно распарсить user из initData и сохранить
    // const params = new URLSearchParams(initData);
    // const userJSON = params.get("user");
    // const user = userJSON ? JSON.parse(userJSON) : null;

    // Ставим cookie на 7 дней (демо)
    const session = Buffer.from(JSON.stringify({ ok: true })).toString("base64url");
    res.setHeader("Set-Cookie", [
      `session=${session}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${7 * 24 * 3600}; ${
        process.env.NODE_ENV === "production" ? "Secure" : ""
      }`,
    ]);

    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error(e);
    return res.status(500).send("Server error");
  }
}
