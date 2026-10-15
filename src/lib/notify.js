import 'server-only';

const FONNTE_SEND_URL = 'https://api.fonnte.com/send';
const TELEGRAM_API_BASE = 'https://api.telegram.org';
const DEFAULT_TIMEOUT_MS = 8000;

/**
 * @param {Record<string, string|undefined>} [env]
 */
export function getNotifyConfig(env = process.env) {
  return {
    fonnteToken: env.FONNTE_TOKEN?.trim() || '',
    telegramBotToken: env.TELEGRAM_BOT_TOKEN?.trim() || '',
    telegramBotUsername: env.TELEGRAM_BOT_USERNAME?.trim().replace(/^@/, '') || '',
  };
}

/**
 * Provider availability for UI hints. Never returns the tokens themselves.
 * @param {Record<string, string|undefined>} [env]
 */
export function getNotifyStatus(env = process.env) {
  const config = getNotifyConfig(env);
  return {
    whatsapp: Boolean(config.fonnteToken),
    telegram: Boolean(config.telegramBotToken),
    telegramBotUsername: config.telegramBotUsername || null,
  };
}

async function readJson(response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function errorMessage(err) {
  return err instanceof Error ? err.message : String(err);
}

/**
 * Send a WhatsApp message through Fonnte (https://fonnte.com).
 * @returns {Promise<{ ok: boolean, skipped?: boolean, error?: string }>}
 */
export async function sendFonnteMessage({
  target,
  message,
  token,
  fetchImpl = fetch,
  timeoutMs = DEFAULT_TIMEOUT_MS,
}) {
  if (!token) return { ok: false, skipped: true, error: 'FONNTE_TOKEN belum diatur' };
  if (!target) return { ok: false, skipped: true, error: 'Nomor WhatsApp tujuan kosong' };

  const body = new FormData();
  body.set('target', target);
  body.set('message', message);

  try {
    const response = await fetchImpl(FONNTE_SEND_URL, {
      method: 'POST',
      headers: { Authorization: token },
      body,
      signal: AbortSignal.timeout(timeoutMs),
    });
    const json = await readJson(response);
    if (json?.status === true) return { ok: true };
    return { ok: false, error: json?.reason || json?.detail || `HTTP ${response.status}` };
  } catch (err) {
    return { ok: false, error: errorMessage(err) };
  }
}

/**
 * Send a plain-text Telegram message through the Bot API.
 * @returns {Promise<{ ok: boolean, skipped?: boolean, error?: string }>}
 */
export async function sendTelegramMessage({
  chatId,
  text,
  token,
  fetchImpl = fetch,
  timeoutMs = DEFAULT_TIMEOUT_MS,
}) {
  if (!token) return { ok: false, skipped: true, error: 'TELEGRAM_BOT_TOKEN belum diatur' };
  if (!chatId) return { ok: false, skipped: true, error: 'Chat ID Telegram kosong' };

  try {
    const response = await fetchImpl(`${TELEGRAM_API_BASE}/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, disable_web_page_preview: true }),
      signal: AbortSignal.timeout(timeoutMs),
    });
    const json = await readJson(response);
    if (json?.ok === true) return { ok: true };
    return { ok: false, error: json?.description || `HTTP ${response.status}` };
  } catch (err) {
    return { ok: false, error: errorMessage(err) };
  }
}

/**
 * Fan out one message to every configured channel.
 * @param {{
 *   whatsapp?: string|null,
 *   telegramChatId?: string|null,
 *   message: string,
 *   config?: { fonnteToken?: string, telegramBotToken?: string },
 *   fetchImpl?: typeof fetch,
 * }} params
 */
export async function sendNotification({
  whatsapp,
  telegramChatId,
  message,
  config = getNotifyConfig(),
  fetchImpl = fetch,
}) {
  const [whatsappResult, telegramResult] = await Promise.all([
    whatsapp
      ? sendFonnteMessage({ target: whatsapp, message, token: config.fonnteToken, fetchImpl })
      : { ok: false, skipped: true, error: 'Tidak ada nomor WhatsApp tujuan' },
    telegramChatId
      ? sendTelegramMessage({
          chatId: telegramChatId,
          text: message,
          token: config.telegramBotToken,
          fetchImpl,
        })
      : { ok: false, skipped: true, error: 'Tidak ada chat ID Telegram' },
  ]);

  return {
    whatsapp: whatsappResult,
    telegram: telegramResult,
    delivered: whatsappResult.ok || telegramResult.ok,
  };
}
