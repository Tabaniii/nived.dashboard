import { ImageResponse } from 'next/og';
import { unstable_rethrow } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getStoreInitials } from '@/lib/store-initials';
import { formatReviewMonth, prepareQuote, resolveSocialFormat, SOCIAL_FORMATS } from '@/lib/social-card';
import { fetchImageAsDataUrl, loadOgFonts } from '@/lib/og/assets';
import { LogoBadge, QuoteIcon, StarRow } from '@/lib/og/elements';

export const instant = false;

async function getFonts() {
  try {
    return await loadOgFonts();
  } catch (err) {
    console.error('[api/dashboard/social-card] Font load failed:', err);
    return undefined;
  }
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const feedbackId = Number(searchParams.get('feedback_id'));
    if (!Number.isSafeInteger(feedbackId) || feedbackId <= 0) {
      return new Response('feedback_id tidak valid', { status: 400 });
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return new Response('Unauthorized', { status: 401 });

    const { data: feedback, error } = await supabase
      .from('internal_feedbacks')
      .select('id, rating, feedback_text, created_at, cards(slug, store_name, logo_url)')
      .eq('id', feedbackId)
      .maybeSingle();
    if (error) throw error;
    if (!feedback?.cards) return new Response('Ulasan tidak ditemukan', { status: 404 });
    if (feedback.rating < 4 || !feedback.feedback_text?.trim()) {
      return new Response('Hanya ulasan 4–5★ yang berisi teks yang bisa dijadikan konten', { status: 400 });
    }

    const format = resolveSocialFormat(searchParams.get('format'));
    const { width, height } = SOCIAL_FORMATS[format];
    const isStory = format === 'story';
    const quote = prepareQuote(feedback.feedback_text, format);
    const store = feedback.cards;

    const [logoDataUrl, fonts] = await Promise.all([fetchImageAsDataUrl(store.logo_url), getFonts()]);

    return new ImageResponse(
      (
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            padding: isStory ? '260px 96px 280px' : '88px 88px 80px',
            backgroundImage: 'linear-gradient(150deg, #2A53E7 0%, #1A3BB0 55%, #0B1B4D 100%)',
            color: '#FFFFFF',
            fontFamily: 'Plus Jakarta Sans',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div
              style={{
                display: 'flex',
                padding: '12px 28px',
                borderRadius: 999,
                backgroundColor: 'rgba(255,255,255,0.14)',
                fontSize: isStory ? 30 : 24,
                fontWeight: 700,
                letterSpacing: 3,
              }}
            >
              KATA PELANGGAN KAMI
            </div>
            <StarRow count={feedback.rating} size={isStory ? 52 : 44} gap={8} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <QuoteIcon size={isStory ? 180 : 130} />
            <div
              style={{
                marginTop: isStory ? 24 : 12,
                fontSize: quote.fontSize,
                fontWeight: 700,
                lineHeight: 1.3,
              }}
            >
              {`“${quote.text}”`}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 28 }}>
            <LogoBadge
              logoDataUrl={logoDataUrl}
              initials={getStoreInitials(store.store_name)}
              size={isStory ? 132 : 104}
              background="#FFFFFF"
              color="#2A53E7"
              ring="rgba(255,255,255,0.35)"
            />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ fontSize: isStory ? 44 : 36, fontWeight: 800 }}>{store.store_name}</div>
              <div style={{ fontSize: isStory ? 30 : 24, opacity: 0.8 }}>
                {`Ulasan pelanggan · ${formatReviewMonth(feedback.created_at)}`}
              </div>
            </div>
          </div>
        </div>
      ),
      {
        width,
        height,
        fonts,
        headers: {
          'Cache-Control': searchParams.get('download')
            ? 'private, no-store'
            : 'private, max-age=120, stale-while-revalidate=300',
          'Content-Disposition': `${searchParams.get('download') ? 'attachment' : 'inline'}; filename="ulasan-${store.slug}-${feedback.id}-${format}.png"`,
        },
      }
    );
  } catch (error) {
    unstable_rethrow(error);
    console.error('[api/dashboard/social-card]', error);
    return new Response('Gagal membuat gambar', { status: 500 });
  }
}
