# 🛍️ Cart Bouncer — No Name, No Entry

*An Amazon search-result filter with the temperament of a nightclub bouncer who has read too many one-star reviews.*

You: “I would like to buy one normal pair of socks.”

Amazon: “Excellent. Here are 9,000 products, some unrelated sponsored tiles, a questionable brand you've already said no to, and a fish-shaped lamp.”

Cart Bouncer: **“Absolutely not. You. Out.”**

## The guest-list policy

- **Brands/store names:** Add `AVIDLOVE` and results mentioning that brand are escorted politely but firmly off-screen.
- **Seller IDs:** Paste an Amazon seller/merchant profile ID or profile URL. This isn't the same as a brand.
- **Words and phrases:** Block `refurbished`, `glitter cannon`, or whatever your personal shopping nemesis happens to be.
- **Minimum stars:** Turn on the product-rating gate. Anything below **2.5 stars** (or your chosen threshold) gets the “not tonight” treatment. Unrated items are innocent until you decide otherwise.
- **Optional 50-seller watchlist:** A very particular guest list drawn from established US marketplace accounts, and **OFF by default**. See the section below before calling anyone a villain.
- **Actual popup:** Click the toolbar icon for quick add, lists, the rating threshold, watchlist toggle, and live hidden-result count.
- **On/off switch:** The bouncer occasionally needs a sandwich.
- **JSON export/import:** Your personal feud with shopping results is portable.

## The famous 50 (with a very important asterisk)

I tried to find a defensible public “50 worst Amazon sellers” ranking and discovered that “worst” is not an actual measurable scientific unit, despite extensive attempts to measure it in groans per minute.

So the built-in list is **the 50 lowest 12-month positive seller-feedback percentages among Installmap's published top 100 high-volume Amazon.com third-party sellers (snapshot: November 9, 2026)**, with China- and Hong Kong-registered accounts excluded. That gives us established, trackable names instead of pop-up storefront whack-a-mole. The underlying data lists seller names, number of recent ratings, and the percent positive.

**Crucial:** These are *relative* results in a high-volume cohort—not Amazon's worst 50, not a fraud list, not a finding of wrongdoing, and not even uniformly *bad*. Some entries are **99% positive**, because ranking demands exactly 50 names. This setting is disabled unless you opt in. The extension only checks seller identity for this list; it does not block a product just because its title mentions a seller's name.

Data: https://installmap.com/marketplaces/amazon/com/top-sellers (November 2026)

Seller *feedback percentage* and a **product's star rating** are different measurements. The 2.5-star rule refers to product ratings on listing cards, not seller feedback percentages.

## Install the bouncer

1. Extract the ZIP. The extracted `cart-bouncer-v1.2` folder should contain `manifest.json`.
2. Open `chrome://extensions`, enable **Developer mode**, choose **Load unpacked**, and select that folder.
3. **Disable the old copy** if Chrome shows two extensions. New unpacked folders are often different installations with separate saved settings. If you package with the same original private key, the extension ID can remain the same.
4. Search Amazon. Click the grinning shopping bag in the toolbar.
5. Use the tiny popup. It's the one you actually wanted, not a full-screen administrative portal from 2007.

Existing v1.1 personal lists can migrate automatically when updating the same extension ID. The known `AVIDLOVE` brand and its associated seller ID are preloaded for this custom build unless you've previously removed them.

## What Cart Bouncer actually does

Chrome injects CSS at `document_start` to briefly hide Amazon result cards while a content script checks their visible titles, brands and ratings. It then hides matching cards and reveals the rest. It rechecks asynchronously added cards. Seller-ID and watchlist checks may make optional product-page requests **to Amazon itself**, and may fail if Amazon changes markup, obscures the seller, or blocks requests.

**It does not stop Amazon downloading page content or images**, delete listings from Amazon's servers, examine every seller offering every ASIN, or guarantee that an unknown seller is identified. Some results can appear before an asynchronous seller lookup finishes and disappear afterward. It doesn't send browsing data to an outside server, call an analytics provider, or use an external API.

If Chrome shows a listing that should be hidden: open DevTools, inspect the result tile, and look for `data-alf-reason`. The extension's selector code and Amazon's page templates aren't married; occasionally they need couples counseling.

## Packing and updating

Chrome Manifest V3. All files are local, and there's no build step. To distribute as a CRX, pack this source folder with **the original private `.pem` key** to retain the signing identity. The key is **not** in this ZIP. If you've just installed the new unpacked directory, its installation state may be separate from an older copy.

### Privacy and store disclosure

- Local rule settings: `chrome.storage.local`.
- The Amazon host permissions are for filtering displayed listings and (optionally) fetching product information directly from Amazon.
- `activeTab` is used for popup statistics/rechecks.
- No tracking, ads, paid services, or unrelated network calls.

Cart Bouncer is independent of Amazon. Amazon is a trademark of its respective owner. This extension is not endorsed by or affiliated with Amazon.

*No shopping bags were harmed during development. Several terrible listing titles were judged.*
