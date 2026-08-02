"use client";

import { useState, useRef, MouseEvent } from "react";
import Image from "next/image";
import { ZoomIn } from "lucide-react";
import { Lightbox } from "./Lightbox";

interface ProductGalleryProps {
  images: string[];
  altText: string;
}

export function ProductGallery({ images, altText }: ProductGalleryProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [zoomStyle, setZoomStyle] = useState({});
  const [isZooming, setIsZooming] = useState(false);
  const imageContainerRef = useRef<HTMLDivElement>(null);

  // Fallback to placeholder if no images
  const safeImages = images && images.length > 0 ? images : ["/images/placeholder.jpg"];

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (!imageContainerRef.current) return;
    const { left, top, width, height } = imageContainerRef.current.getBoundingClientRect();
    const x = ((e.clientX - left) / width) * 100;
    const y = ((e.clientY - top) / height) * 100;
    
    setZoomStyle({
      transformOrigin: `${x}% ${y}%`,
      transform: "scale(2)",
    });
  };

  return (
    <div className="w-full flex flex-col gap-4 sticky top-32">
      {/* Featured Image */}
      <div 
        ref={imageContainerRef}
        className="relative w-full aspect-square bg-[#F8F7F4] rounded-2xl overflow-hidden cursor-zoom-in group"
        onClick={() => setIsLightboxOpen(true)}
        onMouseEnter={() => setIsZooming(true)}
        onMouseLeave={() => {
          setIsZooming(false);
          setZoomStyle({ transform: "scale(1)", transformOrigin: "center" });
        }}
        onMouseMove={handleMouseMove}
      >
        <Image
          src={safeImages[activeIndex]}
          alt={`${altText} - View ${activeIndex + 1}`}
          fill
          sizes="(max-width: 1024px) 100vw, 600px"
          priority
          className="object-cover transition-transform duration-200 ease-out will-change-transform"
          style={isZooming ? zoomStyle : { transform: "scale(1)" }}
        />
        
        {/* Hover Hint */}
        <div className="absolute top-4 right-4 w-10 h-10 bg-white/80 backdrop-blur-sm rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm">
          <ZoomIn className="w-5 h-5 text-[#18231F]" />
        </div>
      </div>

      {/* Thumbnail Strip */}
      {safeImages.length > 1 && (
        <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-hide">
          {safeImages.map((img, idx) => (
            <button
              key={idx}
              onClick={() => setActiveIndex(idx)}
              className={`relative w-20 h-20 flex-shrink-0 rounded-xl overflow-hidden transition-all ${
                activeIndex === idx 
                  ? "border-2 border-[#B48635] shadow-md" 
                  : "border border-black/5 hover:border-black/20 opacity-70 hover:opacity-100"
              }`}
            >
              <Image
                src={img}
                alt={`Thumbnail ${idx + 1}`}
                fill
                sizes="80px"
                className="object-cover"
              />
            </button>
          ))}
        </div>
      )}

      {/* Lightbox Modal */}
      <Lightbox 
        images={safeImages} 
        initialIndex={activeIndex} 
        isOpen={isLightboxOpen} 
        onClose={() => setIsLightboxOpen(false)} 
      />
    </div>
  );
}
