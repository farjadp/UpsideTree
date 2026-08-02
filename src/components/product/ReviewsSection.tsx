"use client";

import { useState } from "react";
import Image from "next/image";
import { Star, StarHalf, ThumbsUp, UploadCloud, CheckCircle2, Filter } from "lucide-react";
import { useLanguageStore } from "@/store/useLanguageStore";

interface Review {
  id: string;
  rating: number;
  title: string;
  body: string;
  created_at: string;
  reviewer_name: string;
  location?: string;
  is_verified: boolean;
  photos?: string[];
  helpful_count: number;
}

interface ReviewsSectionProps {
  productId: string;
  initialReviews: Review[];
  stats: {
    avg: number;
    count: number;
    stars: { [key: number]: number };
  };
}

export function ReviewsSection({ productId, initialReviews, stats }: ReviewsSectionProps) {
  const { language } = useLanguageStore();
  const isFa = language === "fa";
  
  const [reviews, setReviews] = useState(initialReviews);
  const [isWriting, setIsWriting] = useState(false);
  const [formState, setFormState] = useState({ rating: 0, title: "", body: "", name: "", email: "" });
  const [hoverRating, setHoverRating] = useState(0);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }).map((_, i) => (
      <Star 
        key={i} 
        className={`w-4 h-4 ${i < rating ? 'fill-[#B48635] text-[#B48635]' : 'text-gray-300'}`} 
      />
    ));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Simulate submission
    setTimeout(() => {
      setIsSubmitted(true);
      setIsWriting(false);
    }, 1000);
  };

  return (
    <div className={`mt-24 pt-16 border-t border-gray-200 max-w-4xl mx-auto ${isFa ? 'text-right' : 'text-left'}`} dir={isFa ? 'rtl' : 'ltr'}>
      
      <div className="flex flex-col md:flex-row gap-12 mb-12">
        {/* SUMMARY COLUMN */}
        <div className="md:w-1/3 flex flex-col gap-4">
          <h2 className="text-3xl font-display font-semibold text-[#18231F]">
            {isFa ? 'نظرات مشتریان' : 'Customer Reviews'}
          </h2>
          <div className="flex items-end gap-4">
            <span className="text-5xl font-display font-bold text-[#18231F]">{stats.avg.toFixed(1)}</span>
            <div className="flex flex-col gap-1 pb-1">
              <div className="flex gap-1">{renderStars(Math.round(stats.avg))}</div>
              <span className="text-sm text-gray-500">{isFa ? `بر اساس ${stats.count} نظر` : `Based on ${stats.count} reviews`}</span>
            </div>
          </div>
          
          <div className="flex flex-col gap-2 mt-2">
            {[5, 4, 3, 2, 1].map(star => {
              const count = stats.stars[star] || 0;
              const percentage = stats.count > 0 ? (count / stats.count) * 100 : 0;
              return (
                <div key={star} className="flex items-center gap-3 text-sm text-gray-600">
                  <span className="w-4 text-center">{star}</span>
                  <Star className="w-3.5 h-3.5 text-gray-400" />
                  <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-[#B48635]" style={{ width: `${percentage}%` }} />
                  </div>
                  <span className="w-8 text-right text-gray-400">{count}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* WRITE REVIEW CTA */}
        <div className="md:w-2/3 flex flex-col justify-center items-start md:items-end border-t md:border-t-0 md:border-l border-gray-200 md:pl-12 pt-8 md:pt-0">
          <h3 className="text-xl font-display font-semibold text-[#18231F] mb-2">
            {isFa ? 'نظر خود را به اشتراک بگذارید' : 'Share Your Thoughts'}
          </h3>
          <p className="text-gray-500 mb-6 text-sm max-w-sm">
            {isFa ? 'تجربه شما به دیگران در انتخاب کمک می‌کند و برای ما بسیار ارزشمند است.' : 'Your experience helps others make informed choices and helps us improve.'}
          </p>
          {!isWriting && !isSubmitted && (
            <button 
              onClick={() => setIsWriting(true)}
              className="px-8 py-3 bg-[#18231F] text-white font-medium rounded-lg hover:bg-black transition-colors"
            >
              {isFa ? 'ثبت نظر جدید' : 'Write a Review'}
            </button>
          )}
          {isSubmitted && (
            <div className="flex items-center gap-2 text-[#697A4D] bg-[#697A4D]/10 px-4 py-3 rounded-lg border border-[#697A4D]/20">
              <CheckCircle2 className="w-5 h-5" />
              <span className="font-medium text-sm">{isFa ? 'نظر شما با موفقیت ثبت شد و پس از تایید نمایش داده می‌شود.' : 'Thank you! Your review is pending approval.'}</span>
            </div>
          )}
        </div>
      </div>

      {/* WRITE REVIEW FORM */}
      {isWriting && (
        <form onSubmit={handleSubmit} className="bg-[#F8F7F4] p-8 rounded-2xl mb-12 animate-fade-in border border-black/5">
          <div className="flex justify-between items-center mb-6 border-b border-gray-200 pb-4">
            <h4 className="text-xl font-display font-semibold text-[#18231F]">{isFa ? 'ثبت نظر' : 'Write a Review'}</h4>
            <button type="button" onClick={() => setIsWriting(false)} className="text-gray-400 hover:text-black">بستن ✕</button>
          </div>
          
          <div className="flex flex-col gap-6">
            <div>
              <label className="block text-sm font-medium text-[#18231F] mb-2">{isFa ? 'امتیاز شما' : 'Your Rating'} *</label>
              <div className="flex gap-1" onMouseLeave={() => setHoverRating(0)}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onMouseEnter={() => setHoverRating(star)}
                    onClick={() => setFormState(s => ({ ...s, rating: star }))}
                    className="p-1"
                  >
                    <Star className={`w-8 h-8 ${star <= (hoverRating || formState.rating) ? 'fill-[#B48635] text-[#B48635]' : 'text-gray-300'} transition-colors`} />
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[#18231F] mb-2">{isFa ? 'عنوان نظر' : 'Review Title'} *</label>
                <input required type="text" className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-[#B48635] focus:outline-none" placeholder={isFa ? 'خلاصه نظر شما' : 'Summary of your experience'} />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#18231F] mb-2">{isFa ? 'متن نظر' : 'Review'} *</label>
              <textarea required rows={4} className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-[#B48635] focus:outline-none resize-none" placeholder={isFa ? 'تجربه خود را درباره این محصول بنویسید...' : 'Write your detailed review here...'} />
            </div>

            <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 flex flex-col items-center justify-center text-center hover:bg-white transition-colors cursor-pointer group">
              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-3 group-hover:bg-[#B48635]/10 group-hover:text-[#B48635] transition-colors">
                <UploadCloud className="w-6 h-6" />
              </div>
              <span className="font-medium text-[#18231F]">{isFa ? 'آپلود عکس (اختیاری)' : 'Upload Photos (Optional)'}</span>
              <span className="text-xs text-gray-500 mt-1">{isFa ? 'کشیدن و رها کردن یا کلیک کنید' : 'Drag & drop or click to browse'}</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[#18231F] mb-2">{isFa ? 'نام شما' : 'Your Name'} *</label>
                <input required type="text" className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-[#B48635] focus:outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#18231F] mb-2">{isFa ? 'ایمیل شما' : 'Your Email'} *</label>
                <input required type="email" className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-[#B48635] focus:outline-none" />
              </div>
            </div>

            <button type="submit" className="mt-2 w-full md:w-auto px-10 py-4 bg-[#8C2F39] text-white font-medium rounded-lg hover:bg-[#7a2831] transition-colors self-end">
              {isFa ? 'ثبت نظر' : 'Submit Review'}
            </button>
          </div>
        </form>
      )}

      {/* FILTER & SORT */}
      <div className="flex justify-between items-center mb-8 pb-4 border-b border-gray-200">
        <h3 className="font-semibold text-lg text-[#18231F]">{reviews.length} {isFa ? 'نظر' : 'Reviews'}</h3>
        <div className="flex items-center gap-2 text-sm">
          <Filter className="w-4 h-4 text-gray-500" />
          <select className="bg-transparent border-none focus:outline-none font-medium text-[#18231F] cursor-pointer">
            <option>{isFa ? 'جدیدترین' : 'Newest'}</option>
            <option>{isFa ? 'بالاترین امتیاز' : 'Highest Rating'}</option>
            <option>{isFa ? 'پایین‌ترین امتیاز' : 'Lowest Rating'}</option>
            <option>{isFa ? 'عکس‌دار' : 'With Photos'}</option>
          </select>
        </div>
      </div>

      {/* REVIEWS LIST */}
      <div className="flex flex-col gap-8">
        {reviews.length === 0 ? (
          <p className="text-gray-500 text-center py-8">{isFa ? 'هنوز نظری ثبت نشده است.' : 'No reviews yet.'}</p>
        ) : (
          reviews.map((review) => (
            <div key={review.id} className="flex flex-col md:flex-row gap-4 border-b border-gray-100 pb-8 last:border-0">
              {/* Author Info */}
              <div className="md:w-1/4 flex flex-col gap-1">
                <span className="font-bold text-[#18231F]">{review.reviewer_name}</span>
                {review.is_verified && (
                  <span className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-[#697A4D]">
                    <CheckCircle2 className="w-3.5 h-3.5" /> {isFa ? 'خریدار تایید شده' : 'Verified Buyer'}
                  </span>
                )}
                {review.location && <span className="text-xs text-gray-500 mt-1">{review.location}</span>}
                <span className="text-xs text-gray-400 mt-2">{new Date(review.created_at).toLocaleDateString(isFa ? 'fa-IR' : 'en-US')}</span>
              </div>
              
              {/* Content */}
              <div className="md:w-3/4 flex flex-col gap-3">
                <div className="flex gap-1">{renderStars(review.rating)}</div>
                <h4 className="font-semibold text-[#18231F] text-lg">{review.title}</h4>
                <p className="text-gray-600 leading-relaxed text-sm whitespace-pre-line">{review.body}</p>
                
                {review.photos && review.photos.length > 0 && (
                  <div className="flex gap-3 mt-2">
                    {review.photos.map((photo, i) => (
                      <div key={i} className="w-20 h-20 relative rounded-lg overflow-hidden border border-gray-200 cursor-pointer hover:border-[#B48635] transition-colors">
                        <Image src={photo} alt="Review photo" fill className="object-cover" />
                      </div>
                    ))}
                  </div>
                )}
                
                <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-50 text-xs font-medium text-gray-500">
                  <span>{isFa ? 'آیا این نظر مفید بود؟' : 'Was this helpful?'}</span>
                  <button className="flex items-center gap-1 hover:text-[#18231F] transition-colors">
                    <ThumbsUp className="w-3.5 h-3.5" /> ({review.helpful_count})
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
      
      {reviews.length > 0 && (
        <div className="flex justify-center mt-8">
          <button className="px-8 py-3 rounded-full border border-gray-300 font-medium text-[#18231F] hover:border-black transition-colors">
            {isFa ? 'مشاهده بیشتر' : 'Load More Reviews'}
          </button>
        </div>
      )}
    </div>
  );
}
