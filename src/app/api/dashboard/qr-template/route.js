import { ImageResponse } from 'next/og';
import { unstable_rethrow } from 'next/navigation';
import QRCode from 'qrcode';
import { createClient } from '@/lib/supabase/server';
import { cardPublicUrl } from '@/lib/slug';
import { buildAttributedUrl, parseAttribution } from '@/lib/attribution';
import { getStoreInitials } from '@/lib/store-initials';
import { isValidUUID } from '@/lib/validation';
import { fetchImageAsDataUrl, loadOgFonts } from '@/lib/og/assets';
import { LogoBadge, NfcIcon, StarRow } from '@/lib/og/elements';

export const instant = false;

// A6 at 300 dpi.
const WIDTH = 1240;
const HEIGHT = 1748;
const BRAND = '#2A53E7';
const INK = '#0B1B4D';

const COPY = {
  id: {
    question: 'Bagaimana kunjungan Anda hari ini?',
    tap: 'Tempelkan HP di sini',
    scan: 'atau scan QR code di atas',
    table: 'Meja',
    footer: 'Cuma 10 detik · Tanpa install aplikasi',
  },
  en: {
    question: 'How was your visit today?',
    tap: 'Tap your phone here',
    scan: 'or scan the QR code above',
    table: 'Table',
    footer: 'Takes 10 seconds · No app needed',
  },
};

async function getFonts() {
  try {
    return await loadOgFonts();
  } catch (err) {
    console.error('[api/dashboard/qr-template] Font load failed:', err);
    return undefined;
  }
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const cardId = searchParams.get('card_id') || '';
    if (!isValidUUID(cardId)) return new Response('card_id tidak valid', { status: 400 });

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return new Response('Unauthorized', { status: 401 });

    const { data: card, error } = await supabase
      .from('cards')
      .select('id, slug, store_name, logo_url')
      .eq('id', cardId)
      .is('deleted_at', null)
      .maybeSingle();
    if (error) throw error;
    if (!card) return new Response('Kartu tidak ditemukan', { status: 404 });

    const copy = COPY[searchParams.get('lang') === 'en' ? 'en' : 'id'];
    const attribution = parseAttribution(searchParams);
    const targetUrl = buildAttributedUrl(cardPublicUrl(card.slug), {
      staff: attribution.staffCode,
      table: attribution.tableCode,
    });

    const [qrDataUrl, logoDataUrl, fonts] = await Promise.all([
      QRCode.toDataURL(targetUrl, {
        errorCorrectionLevel: 'M',
        margin: 1,
        width: 600,
        color: { dark: INK, light: '#FFFFFF' },
      }),
      fetchImageAsDataUrl(card.logo_url),
      getFonts(),
    ]);

    const fileName = [
      'akrilik',
      card.slug,
      attribution.tableCode && `meja-${attribution.tableCode.toLowerCase()}`,
      attribution.staffCode,
    ]
      .filter(Boolean)
      .join('-');

    return new ImageResponse(
      (
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            backgroundColor: '#F4F6FB',
            fontFamily: 'Plus Jakarta Sans',
          }}
        >
          <div
            style={{
              width: '100%',
              height: 720,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              padding: '96px 80px 0',
              backgroundImage: `linear-gradient(160deg, ${BRAND} 0%, #1A3BB0 100%)`,
              color: '#FFFFFF',
            }}
          >
            <LogoBadge logoDataUrl={logoDataUrl} initials={getStoreInitials(card.store_name)} size={150} background="#FFFFFF" color={BRAND} />
            <div
              style={{
                marginTop: 30,
                fontSize: card.store_name.length > 24 ? 52 : 64,
                fontWeight: 800,
                textAlign: 'center',
                lineHeight: 1.15,
                maxWidth: 1060,
              }}
            >
              {card.store_name}
            </div>
            <div style={{ display: 'flex', marginTop: 30 }}>
              <StarRow size={58} gap={14} />
            </div>
            <div style={{ marginTop: 28, fontSize: 42, fontWeight: 700, opacity: 0.92, textAlign: 'center' }}>
              {copy.question}
            </div>
          </div>

          <div
            style={{
              marginTop: -150,
              display: 'flex',
              padding: 40,
              borderRadius: 56,
              backgroundColor: '#FFFFFF',
              boxShadow: '0 30px 80px rgba(11, 27, 77, 0.18)',
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qrDataUrl} alt="" width={600} height={600} />
          </div>

          <div style={{ marginTop: 60, display: 'flex', alignItems: 'center', gap: 20 }}>
            <NfcIcon size={70} color={BRAND} />
            <div style={{ fontSize: 50, fontWeight: 800, color: INK }}>{copy.tap}</div>
          </div>
          <div style={{ marginTop: 10, fontSize: 34, color: '#55607A' }}>{copy.scan}</div>

          {attribution.tableCode ? (
            <div
              style={{
                marginTop: 40,
                display: 'flex',
                padding: '14px 48px',
                borderRadius: 999,
                border: `4px solid ${BRAND}`,
                color: BRAND,
                fontSize: 42,
                fontWeight: 800,
              }}
            >
              {`${copy.table} ${attribution.tableCode}`}
            </div>
          ) : null}

          <div
            style={{
              marginTop: 'auto',
              marginBottom: 64,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 8,
              color: '#8A93A8',
            }}
          >
            <div style={{ fontSize: 28 }}>{copy.footer}</div>
            <div style={{ fontSize: 24, fontWeight: 700, letterSpacing: 1 }}>Powered by Nived</div>
          </div>
        </div>
      ),
      {
        width: WIDTH,
        height: HEIGHT,
        fonts,
        headers: {
          'Cache-Control': 'private, no-store',
          'Content-Disposition': `${searchParams.get('download') ? 'attachment' : 'inline'}; filename="${fileName}.png"`,
        },
      }
    );
  } catch (error) {
    unstable_rethrow(error);
    console.error('[api/dashboard/qr-template]', error);
    return new Response('Gagal membuat template', { status: 500 });
  }
}
