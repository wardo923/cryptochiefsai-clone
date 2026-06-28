'use client'

import { useState } from 'react'
import { ChevronLeft, ChevronRight, Star, BadgeCheck } from 'lucide-react'
import { reviews } from '@/lib/site-data'

const PER_PAGE = 3
const totalPages = Math.ceil(reviews.length / PER_PAGE)

export function ReviewsSection() {
  const [page, setPage] = useState(0)

  const go = (next: number) => {
    setPage((next + totalPages) % totalPages)
  }

  const visible = reviews.slice(page * PER_PAGE, page * PER_PAGE + PER_PAGE)

  return (
    <section id="reviews" className="border-t border-border/60 py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-balance text-3xl font-bold tracking-tight sm:text-4xl">
              Reviews
            </h2>
            <p className="mt-3 text-pretty text-muted-foreground">
              What Premium Members are saying about Crypto Chiefs AI.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => go(page - 1)}
              aria-label="Previous reviews"
              className="flex size-11 items-center justify-center rounded-full border border-border/60 bg-card text-foreground transition-colors hover:border-primary/60"
            >
              <ChevronLeft className="size-5" />
            </button>
            <button
              type="button"
              onClick={() => go(page + 1)}
              aria-label="Next reviews"
              className="flex size-11 items-center justify-center rounded-full border border-border/60 bg-card text-foreground transition-colors hover:border-primary/60"
            >
              <ChevronRight className="size-5" />
            </button>
          </div>
        </div>

        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {visible.map((review) => (
            <article
              key={review.author}
              className="flex flex-col rounded-2xl border border-border/60 bg-card p-6"
            >
              <div className="flex items-center justify-between">
                <div
                  className="flex gap-0.5"
                  aria-label="5 out of 5 stars"
                  role="img"
                >
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className="size-4 fill-accent text-accent"
                    />
                  ))}
                </div>
                <span className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground">
                  <BadgeCheck className="size-4 text-primary" />
                  Verified
                </span>
              </div>

              <p className="mt-4 flex-1 text-sm leading-relaxed text-foreground/85">
                {review.quote}
                <strong className="font-semibold text-foreground">
                  {review.highlight}
                </strong>
                {review.quoteAfter}
              </p>

              <div className="mt-5 border-t border-border/60 pt-4">
                <p className="text-sm font-semibold text-foreground">
                  {review.author}
                </p>
                <p className="text-xs text-muted-foreground">{review.role}</p>
              </div>
            </article>
          ))}
        </div>

        <div
          className="mt-8 flex justify-center gap-2"
          role="tablist"
          aria-label="Review pages"
        >
          {Array.from({ length: totalPages }).map((_, i) => (
            <button
              key={i}
              type="button"
              role="tab"
              aria-selected={page === i}
              aria-label={`Go to reviews page ${i + 1}`}
              onClick={() => setPage(i)}
              className={`h-2 rounded-full transition-all ${
                page === i
                  ? 'w-6 bg-gradient-to-r from-primary to-accent'
                  : 'w-2 bg-border'
              }`}
            />
          ))}
        </div>
      </div>
    </section>
  )
}
