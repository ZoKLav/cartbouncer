## Cart Bouncer — Amazon Filter

## Detailed description

**Your Amazon search results have a guest list now.**

Meet Cart Bouncer: the tiny, slightly smug shopping bag guarding the door to your search results. It's not here to judge your shopping habits. It's here to judge the listings you explicitly don't want to see.

**What it can bounce:**

- Brands and store names you've had quite enough of.
- Individual seller IDs, pasted directly or from Amazon seller-profile links.
- Product titles containing your personal forbidden words and phrases.
- Products below your chosen star-rating threshold, including **2.5 stars**.
- Unrated products, if you choose that option.
- An optional **50-name, data-based seller watchlist** (OFF by default).

**No giant control panel required.** Click the toolbar icon to add a block, change the star cutoff, turn filtering on/off, and see how many results got shown the door. The full settings page is there when you want the administrative paperwork.

**A note on the 50-name watchlist:** It's a clearly labeled, opt-in snapshot of the 50 lowest positive-feedback percentages from a published cohort of 100 high-volume Amazon.com sellers, excluding mainland-China and Hong Kong registrations. That does **not** mean they are the 50 worst sellers on Amazon, or that any listed merchant is fraudulent. Some have excellent feedback scores; review the list before enabling it.

**Privacy:** Your rules stay in Chrome's local extension storage. No account, subscription, analytics, or external tracking service. Optional seller checks request product pages directly from Amazon.

**Limitations:** Cart Bouncer hides matching listings *inside your browser*. It cannot stop Amazon fetching the page, and some sellers are not identifiable until later or at all. Amazon's changing layouts can affect filtering.

Cart Bouncer is independently developed and isn't affiliated with Amazon.

## Data source

https://installmap.com/marketplaces/amazon/com/top-sellers — snapshot November 9, 2026.

## Permission justification

- `storage`: Save user's private blocklists, preferences and ratings threshold locally.
- `activeTab`: Show counts and request rechecks for the currently active Amazon tab.
- Amazon domains (host permissions): Read and filter search cards and optionally make seller-identity lookups from Amazon product pages. No access to unrelated sites.
