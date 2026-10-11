---
layout: post
title:  "How Circular Is AI's Money?"
tags: [fin]
date:   2026-10-11 10:15:20 -0400
giscus: https://giscus.jburgy.workers.dev/client.js
---

## A loan to buy the lender's own chips

A disclaimer, same as [last time]({% post_url 2025-09-27-what-is-vibe-coding %}): I am an
AI skeptic, not a luddite. I use the tools, I like the tools, I just don't quite believe
the valuations. So when [NVIDIA announced](https://nvidianews.nvidia.com/news/openai-and-nvidia-announce-strategic-partnership-to-deploy-10gw-of-nvidia-systems)
a letter of intent to invest "up to \\$100 billion" in OpenAI, specifically so OpenAI could
buy NVIDIA chips with it, my eyebrow shot up. NVIDIA lends (well, "invests") OpenAI money.
OpenAI spends that money on NVIDIA GPUs. NVIDIA books the revenue, and — this is the part
that should make everyone's eyebrow twitch — can point to that revenue as evidence that its
\\$100 billion "investment" was a sound one. The loan is collateralized by the lender's own
sales pitch.

I wanted to know: is this a one-off, or is it a pattern? Turns out it's very much a pattern.
Here is everything else I could find.

## The master list

| # | Parties | Amount & instrument | Circular loop | Source |
|---|---|---|---|---|
| 1 | NVIDIA → OpenAI | Up to **\\$100B** equity, staged per GW deployed | OpenAI spends it on ≥10GW of NVIDIA systems | [NVIDIA newsroom](https://nvidianews.nvidia.com/news/openai-and-nvidia-announce-strategic-partnership-to-deploy-10gw-of-nvidia-systems), [CNBC](https://www.cnbc.com/2025/09/22/nvidia-openai-data-center.html) |
| 2 | NVIDIA → OpenAI (walk-back) | Shrank to **~\\$30B**, Huang says "probably not in the cards" | Same loop, much smaller | [CNBC](https://www.cnbc.com/2026/03/04/nvidia-huang-openai-investment.html) |
| 3 | Microsoft ↔ OpenAI | **\\$135B stake (~27%)** of OpenAI Group PBC; OpenAI must buy an incremental **\\$250B** of Azure | Equity holder's own cloud gets the spend-back | [Microsoft blog](https://blogs.microsoft.com/blog/2025/10/28/the-next-chapter-of-the-microsoft-openai-partnership/) |
| 4 | Oracle ↔ OpenAI / Stargate | **\\$300B** cloud-compute commitment; Oracle's backlog jumped to **\\$455B**, reportedly >90% from OpenAI | OpenAI buys Oracle capacity; Oracle borrows billions to build it | [Yahoo Finance / Benzinga](https://finance.yahoo.com/technology/ai/articles/openai-300b-deal-could-oracle-174412368.html) |
| 5 | AMD ↔ OpenAI | 6GW of chips, plus a **warrant for up to ~10% of AMD** (160M shares) | AMD hands OpenAI equity upside as an incentive to buy AMD chips | [AMD investor relations](https://ir.amd.com/news-events/press-releases/detail/1260/amd-and-openai-announce-strategic-partnership-to-deploy-6-gigawatts-of-amd-gpus) |
| 6 | Broadcom ↔ OpenAI | 10GW custom accelerator deal, no equity disclosed | Pure supply contract — the one entry here that *isn't* equity-circular | [OpenAI blog](https://openai.com/index/openai-and-broadcom-announce-strategic-collaboration/) |
| 7 | SoftBank → OpenAI | **\\$40B** round at a \\$300B valuation, later topped up | SoftBank itself borrowed heavily to fund its own stake | [Asahi Shimbun / Reuters](https://www.asahi.com/ajw/articles/15693616) |
| 8 | Stargate JV (OpenAI/SoftBank/Oracle/MGX) | **\\$500B** target, **\\$100B** committed immediately | Umbrella vehicle that **overlaps with #4 and #7** — don't double count | [OpenAI blog](https://openai.com/index/announcing-the-stargate-project/) |
| 9 | NVIDIA ↔ CoreWeave | NVIDIA obligated to buy **≥\\$6.3B** of CoreWeave's unsold capacity through 2032 | NVIDIA guarantees demand for datacenters full of... NVIDIA chips | [CNBC](https://www.cnbc.com/2025/09/15/coreweave-stock-jumps-on-disclosure-of-6point3-billion-order-from-nvidia.html) |
| 10 | NVIDIA + Microsoft → Anthropic | Combined **up to \\$15B** equity | Anthropic commits **\\$30B** of Azure compute + 1GW of NVIDIA systems in the very same announcement | [Microsoft blog](https://blogs.microsoft.com/blog/2025/11/18/microsoft-nvidia-and-anthropic-announce-strategic-partnerships/) |
| 11 | Amazon ↔ Anthropic | **~\\$8B** cumulative equity (2023–2024) | Anthropic names AWS its primary cloud partner; later IPO filings value the compute contract at **\\$110B over 10 years** | [Wikipedia, funding history](https://en.wikipedia.org/wiki/Anthropic) |
| 12 | Google ↔ Anthropic | **~\\$3B** cumulative equity | Anthropic expands Google Cloud TPU usage to up to 1 million TPUs | [Wikipedia, funding history](https://en.wikipedia.org/wiki/Anthropic) |

Items 1, 2, 3, 5, 7, 8, 9, and 10 are primary-source press releases or SEC-adjacent
disclosures — about as solid as these things get. Item 4 and the two Anthropic equity
figures (11, 12) are secondary-sourced; treat the exact numbers as "roughly right," not
audited.

## Adding it all up (and why you shouldn't, not really)

Sum every unique headline figure above — carefully excluding the Stargate/Oracle/SoftBank
overlap, since those three line items describe overlapping flows of the same dollars
through the same joint venture — and you land somewhere around **\\$1.4 trillion** in
announced equity, loans, and purchase commitments. That number happens to match
[247wallst.com's](https://247wallst.com/) independent tally of just OpenAI's partner
network (NVIDIA + Microsoft + Oracle + AMD). Widen the lens to every deal above and the
figure creeps toward \\$1.5–1.8 trillion.

I want to be very clear that this total is almost meaningless as a measure of real,
risk-adjusted capital at stake. It mixes together things that are fundamentally different
instruments:

- **Non-binding letters of intent** — NVIDIA's original \\$100B was explicitly an LOI from
  day one, and had shrunk to \\$30B within six months.
- **Signed, multi-year, largely executory purchase commitments** — Oracle's \\$300B and
  Microsoft's \\$250B are real contracts, but the cash flows out over 5+ years and depends on
  OpenAI actually having the money then.
- **Actual, closed equity rounds** — SoftBank's \\$40B, Amazon's \\$8B, and Google's \\$3B are
  money that has genuinely changed hands.
- **Guarantees and backstops** — NVIDIA's \\$6.3B CoreWeave commitment is a promise to buy
  *if nobody else does*, which is a very different risk profile than a straight purchase.

Adding a non-binding LOI to a signed 10-year contract to a completed equity round and
calling the sum "\\$1.4 trillion of AI investment" is the financial equivalent of adding
apples, a fruit basket, and a coupon for apples. It's a useful number for conveying scale.
It is not a useful number for conveying risk.

## Four flavors of circularity

Looking at the list again, the loops aren't all the same shape:

1. **Chipmaker invests in a company that buys its chips** — NVIDIA → OpenAI, NVIDIA →
   CoreWeave, and (per the same research) smaller NVIDIA stakes in xAI, Crusoe, and Nebius.
2. **Chip supplier takes equity instead of cash** — AMD's warrant for up to 10% of its own
   stock is the most literal version of "we'll pay you to buy our chips" I found.
3. **Cloud provider invests, customer buys cloud back** — Microsoft/NVIDIA → Anthropic,
   Amazon → Anthropic, Google → Anthropic. The investment and the purchase commitment are
   frequently announced in the *same press release*, which is either refreshingly honest or
   a little on the nose, depending on your mood.
4. **Pure purchase commitment, no equity, but concentration risk anyway** — Oracle's \\$300B
   OpenAI deal has no equity component, but it's reportedly over 90% of Oracle's backlog
   growth, which is its own kind of "what if this customer can't pay" exposure.

## People who are nervous about this

I'm not the only skeptic. [Michael Burry disclosed large NVIDIA and Palantir put positions](https://www.bloomberg.com/news/articles/2025-11-04/burry-discloses-puts-on-nvidia-and-palantir-after-bubble-warning)
in his Q3 2025 13F, days after warning retail traders that "sometimes we see bubbles."
Short-seller Jim Chanos has been blunter still, arguing (paraphrasing multiple interviews)
that suppliers are financing their own customers' purchase orders — which is exactly the
pattern in this table.

NVIDIA, for its part, pushed back hard on its November 19, 2025 earnings call. CFO Colette
Kress defended the useful life of NVIDIA's GPUs, and Jensen Huang said flatly: "There's
been a lot of talk about an AI bubble. From our vantage point, we see something very
different." You can read the [full transcript here](https://www.fool.com/earnings/call-transcripts/2025/11/19/nvidia-nvda-q3-2026-earnings-call-transcript/).
Worth noting: four months later, [Huang himself conceded](https://www.cnbc.com/2026/03/04/nvidia-huang-openai-investment.html)
that the headline \\$100B figure was "probably not in the cards."

## My actual take

None of this proves the circularity is fraudulent, or even unusual — vendor financing is
an old trick, and infrastructure buildouts (railroads, telecoms, fiber) have always
involved suppliers helping customers afford the supplier's own product. The 1990s telecom
bubble ran on exactly this pattern, and some of that fiber is still in the ground earning
money today. The honest summary is: a genuinely enormous fraction of "AI investment" is
several large companies promising to pay each other, with the promises denominated in
dollars that mostly haven't moved yet. Whether that's a prudent bet on infinite compute
demand or a very expensive game of musical chairs depends entirely on whether the
underlying products — the models themselves — generate enough real, outside revenue to
make the music keep playing. I genuinely don't know. Nobody does yet. That's what makes it
interesting, and what makes it worth tracking the actual numbers instead of just the
vibes.
