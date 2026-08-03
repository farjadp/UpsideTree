import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { target, productType, collection, motif, audience, tone, languageQuality, existingText } = await request.json();

    const apiKey = process.env.ANTHROPIC_API_KEY;

    if (apiKey) {
      // Direct call to Anthropic Claude API (claude-3-5-sonnet or claude-sonnet-4-6)
      const systemPrompt = `You are an expert cultural copywriter for Upside Tree, a Persian cultural brand.
Brand Voice: Rooted, Creative, Bold, Precise, Warm.
Tagline: Rooted in Story. Made for Now.
Brand Rules: Avoid cliché words like 'Ancient', 'Royal', 'Luxury' unless strictly required. Be authentic and contemporary. Correct Persian typography (half-spaces zwnj) is mandatory for Persian outputs.`;

      let userPrompt = "";
      if (target === "emotional_en") {
        userPrompt = `Write a ONE sentence emotional description for a ${productType || 'product'} featuring ${motif || 'Persian artwork'} in the ${collection || 'Roots'} collection. Tone: ${tone || 'Warm & poetic'}. Max 25 words.`;
      } else if (target === "emotional_fa") {
        userPrompt = `یک جمله توصیف احساسی و عمیق برای یک ${productType || 'محصول'} با نقش ${motif || 'هنر ایرانی'} در کالکشن ${collection || 'ریشه‌ها'} بنویس. لحن: ${tone || 'گرم و شاعرانه'}. حداکثر ۱۵ کلمه با رعایت نیم‌فاصله‌ها.`;
      } else if (target === "functional_en") {
        userPrompt = `Write concise ecommerce functional specs for a ${productType || 'product'} featuring ${motif || 'Persian artwork'}. Use 4 short bullet-style lines. Mention material feel, print quality, fit/use, and care without inventing certifications.`;
      } else if (target === "functional_fa") {
        userPrompt = `مشخصات کاربردی فروشگاهی برای یک ${productType || 'محصول'} با طرح ${motif || 'هنر ایرانی'} بنویس. ۴ خط کوتاه و روشن درباره جنس، کیفیت چاپ، کاربرد/تن‌خور، و نگهداری. اطلاعات تاییدنشده نساز و نیم‌فاصله را رعایت کن.`;
      } else if (target === "story_en") {
        userPrompt = `Write a cultural story & inspiration paragraph (max 80 words) for a ${productType || 'product'} featuring ${motif || 'traditional motif'}. Connect cultural origins to modern life without exoticizing.`;
      } else if (target === "story_fa") {
        userPrompt = `داستان الهام‌بخش کوتاه (حداکثر ۶۰ کلمه) برای یک ${productType || 'محصول'} با موتیف ${motif || 'نقش‌های ایرانی'} بنویس. ریشه‌های فرهنگی را به زندگی امروز پیوند بزن. با املای درست و نیم‌فاصله.`;
      } else {
        userPrompt = `Generate a compelling copy for ${target} for a ${productType} featuring ${motif}.`;
      }

      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model: "claude-3-5-sonnet-20241022",
          max_tokens: 500,
          system: systemPrompt,
          messages: [{ role: "user", content: userPrompt }],
        }),
      });

      const data = await res.json();
      if (data.content && data.content[0]) {
        return NextResponse.json({ text: data.content[0].text });
      }
    }

    // High quality brand fallback when ANTHROPIC_API_KEY is not configured yet
    let fallbackText = "";
    if (target === "emotional_en") {
      fallbackText = `Designed to carry the weight of memory while fitting seamlessly into the rhythm of modern life.`;
    } else if (target === "emotional_fa") {
      fallbackText = `طراحی‌شده برای ماندگاری خاطره‌ها، همگام با نبض زندگی امروز.`;
    } else if (target === "functional_en") {
      fallbackText = `Heavyweight everyday feel\nDurable single-color print\nRelaxed fit for daily wear\nWash inside out on cold`;
    } else if (target === "functional_fa") {
      fallbackText = `پارچه خوش‌فرم برای استفاده روزمره\nچاپ تک‌رنگ با دوام مناسب\nتن‌خور راحت و کاربردی\nشست‌وشو با آب سرد و پشت‌ورو`;
    } else if (target === "story_en") {
      fallbackText = `Drawing inspiration from classical geometric motifs, this piece honors generations of craftsmanship while offering a minimalist, contemporary aesthetic.`;
    } else if (target === "story_fa") {
      fallbackText = `این اثر با الهام از نقش‌مایه‌های اصیل هندسی، ادای دینی است به هنر دیروز برای همراهی با سبک زندگی امروز.`;
    } else if (target === "seo_title_en") {
      fallbackText = `${motif || 'Cypress'} ${productType || 'Tee'} — Upside Tree Persian Cultural Collection`;
    } else if (target === "seo_description_en") {
      fallbackText = `Discover the ${collection || 'Roots'} Collection. Authentic Persian story-driven design made with sustainable materials for daily wear.`;
    } else {
      fallbackText = `A thoughtful fusion of Persian heritage and modern aesthetic precision.`;
    }

    return NextResponse.json({ text: fallbackText });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to generate AI copy" }, { status: 500 });
  }
}
