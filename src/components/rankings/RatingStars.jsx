import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Star } from 'lucide-react';

export default function RatingStars({ rating = 0, onRate, size = 'md', interactive = false }) {
  const [hoverRating, setHoverRating] = useState(0);
  
  const sizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
    xl: 'w-8 h-8'
  };

  const displayRating = interactive ? (hoverRating || rating) : rating;

  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <motion.button
          key={star}
          whileHover={interactive ? { scale: 1.2 } : {}}
          whileTap={interactive ? { scale: 0.9 } : {}}
          onClick={() => interactive && onRate && onRate(star)}
          onMouseEnter={() => interactive && setHoverRating(star)}
          onMouseLeave={() => interactive && setHoverRating(0)}
          disabled={!interactive}
          className={`${interactive ? 'cursor-pointer' : 'cursor-default'} transition-all`}
        >
          <Star
            className={`${sizes[size]} transition-all ${
              star <= displayRating
                ? 'fill-yellow-400 text-yellow-400'
                : 'fill-transparent text-zinc-600'
            }`}
          />
        </motion.button>
      ))}
    </div>
  );
}