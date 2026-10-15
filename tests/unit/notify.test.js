import { describe, it, expect } from 'vitest';
import {
  sendFonnteMessage,
  sendTelegramMessage,
  sendNotification,
  getNotifyStatus,
} from '@/lib/notify';

function fakeFetch(responseBody, { status = 200 } = {}) {
  const calls = [];
  const impl = async (url, init) => {
    calls.push({ url, init });
    return new Response(JSON.stringify(responseBody), {
      status,
      headers: { 'Content-Type': 'application/json' },
    });
  };
  return { impl, calls };
}

describe('sendFonnteMessage', () => {
  it('skips when FONNTE_TOKEN is not configured', async () => {
    const { impl, calls } = fakeFetch({ status: true });
    const result = await sendFonnteMessage({
      target: '6281234567890',
      message: 'tes',
      token: '',
      fetchImpl: impl,
    });
    expect(result).toMatchObject({ ok: false, skipped: true });
    expect(calls).toHaveLength(0);
  });

  it('posts target and message with the Authorization token', async () => {
    const { impl, calls } = fakeFetch({ status: true, id: ['80367170'] });
    const result = await sendFonnteMessage({
      target: '6281234567890',
      message: 'Rating 2/5 masuk',
      token: 'fonnte-token',
      fetchImpl: impl,
    });

    expect(result.ok).toBe(true);
    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe('https://api.fonnte.com/send');
    expect(calls[0].init.method).toBe('POST');
    expect(calls[0].init.headers.Authorization).toBe('fonnte-token');
    expect(calls[0].init.body.get('target')).toBe('6281234567890');
    expect(calls[0].init.body.get('message')).toBe('Rating 2/5 masuk');
  });

  it('reports the provider reason when Fonnte rejects the request', async () => {
    const { impl } = fakeFetch({ status: false, reason: 'invalid token' });
    const result = await sendFonnteMessage({
      target: '6281234567890',
      message: 'tes',
      token: 'bad',
      fetchImpl: impl,
    });
    expect(result).toEqual({ ok: false, error: 'invalid token' });
  });

  it('turns network failures into an error result instead of throwing', async () => {
    const result = await sendFonnteMessage({
      target: '6281234567890',
      message: 'tes',
      token: 'fonnte-token',
      fetchImpl: async () => {
        throw new Error('network down');
      },
    });
    expect(result).toEqual({ ok: false, error: 'network down' });
  });
});

describe('sendTelegramMessage', () => {
  it('skips when TELEGRAM_BOT_TOKEN is not configured', async () => {
    const { impl, calls } = fakeFetch({ ok: true });
    const result = await sendTelegramMessage({ chatId: '123456', text: 'tes', token: '', fetchImpl: impl });
    expect(result).toMatchObject({ ok: false, skipped: true });
    expect(calls).toHaveLength(0);
  });

  it('calls sendMessage on the bot API with chat_id and text', async () => {
    const { impl, calls } = fakeFetch({ ok: true, result: { message_id: 7 } });
    const result = await sendTelegramMessage({
      chatId: '-1001234567890',
      text: 'Rating 1/5 masuk',
      token: '123:abc',
      fetchImpl: impl,
    });

    expect(result.ok).toBe(true);
    expect(calls[0].url).toBe('https://api.telegram.org/bot123:abc/sendMessage');
    expect(JSON.parse(calls[0].init.body)).toEqual({
      chat_id: '-1001234567890',
      text: 'Rating 1/5 masuk',
      disable_web_page_preview: true,
    });
  });

  it('reports Telegram error descriptions', async () => {
    const { impl } = fakeFetch({ ok: false, description: 'Bad Request: chat not found' }, { status: 400 });
    const result = await sendTelegramMessage({ chatId: '1', text: 'x', token: '123:abc', fetchImpl: impl });
    expect(result).toEqual({ ok: false, error: 'Bad Request: chat not found' });
  });
});

describe('sendNotification', () => {
  it('delivers to every configured channel and reports per-channel results', async () => {
    const urls = [];
    const fetchImpl = async (url) => {
      urls.push(url);
      const body = url.includes('fonnte') ? { status: true } : { ok: true };
      return new Response(JSON.stringify(body), { status: 200 });
    };

    const result = await sendNotification({
      whatsapp: '6281234567890',
      telegramChatId: '123456789',
      message: 'tes',
      config: { fonnteToken: 'f', telegramBotToken: 't' },
      fetchImpl,
    });

    expect(result.delivered).toBe(true);
    expect(result.whatsapp.ok).toBe(true);
    expect(result.telegram.ok).toBe(true);
    expect(urls).toHaveLength(2);
  });

  it('marks channels without a target as skipped', async () => {
    const result = await sendNotification({
      whatsapp: null,
      telegramChatId: null,
      message: 'tes',
      config: { fonnteToken: 'f', telegramBotToken: 't' },
      fetchImpl: async () => new Response('{}'),
    });
    expect(result.delivered).toBe(false);
    expect(result.whatsapp).toMatchObject({ ok: false, skipped: true });
    expect(result.telegram).toMatchObject({ ok: false, skipped: true });
  });
});

describe('getNotifyStatus', () => {
  it('reports which providers are configured without exposing secrets', () => {
    expect(
      getNotifyStatus({ FONNTE_TOKEN: 'secret', TELEGRAM_BOT_USERNAME: 'nived_alert_bot' })
    ).toEqual({ whatsapp: true, telegram: false, telegramBotUsername: 'nived_alert_bot' });
  });
});
