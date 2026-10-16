# Is Kavach a real business? A feasibility check

Written 14 Oct 2026 for problem discovery. Competitors and how other countries handle this are covered in [market-scan.md](market-scan.md), so this file doesn't repeat them. It answers four questions: is the pain real, who would pay, what blocks us, and which assumptions could kill the idea.

## Verdict

**The problem is real. Building it is easy. The business is plausible, but only in one or two shapes.**

- **Pain: real, and backed by evidence.** The corporate-cover gap is the strongest part of the idea.
- **Building it: not the risk.** Reading documents, a rules engine and a planner are all well within reach.
- **Business: the hard part.** Insurance is a low-frequency category. The money sits in distribution, which needs a licence and is about to pay less. A standalone "insurance planner app" with a subscription would most likely fail. Two shapes could work:
  1. **An advice-first, licensed distributor**, the Clark or Ditto model. The free gap check brings people in, and the commission on fixing a gap pays the bills.
  2. **An employer-sold product** for group health cover, plus help keeping cover continuous across job changes.
- **For the hackathon: still a strong entry.** It fits the BFSI theme exactly and needs substantial Gen AI. A good hackathon result doesn't prove the business, but the prototype can double as the tool for the validation tests in section 5.

---

## 1. Is the pain real and frequent?

| Pain from your framing | Evidence | My read |
|---|---|---|
| Relying only on corporate health cover | TATA AIG's 2026 survey found **~45% of corporate employees have no personal health cover beyond their employer's**. Only 41% fully understand their employer cover, and only 40% know how to keep cover across a job change ([TATA AIG, Aug 2026](https://www.tataaig.com/media/press-releases/corporate-health-production-pulse-2026)) | **Strongest pain.** It's specific and measurable, and it peaks at a clear moment (job change). The data comes from an insurer's own survey, so expect some bias, but the direction is clear |
| Families under-insured overall | About 400M "missing middle" people (~30%) have no health insurance, households pay **43%** of health spending out of pocket, and a private hospitalisation averages **₹50,508** ([South First, Aug 2026](https://thesouthfirst.com/opinion/indias-400-million-strong-missing-middle-uninsured-and-one-illness-away-from-financial-ruin/), citing NITI Aayog, National Health Accounts and the NSO survey). Swiss Re puts India's health protection gap at ~US$32bn (see the market scan) | Real, but much of the missing middle is lower-income and hard to reach through an app. Our natural user is salaried and urban, a narrower group |
| No term cover, or endowment plans mistaken for it | Life insurance density is about USD 72 per person against a global USD 388. Term sales grew 40 to 60% a year at ICICI Pru and HDFC Life after GST on individual life and health premiums went to 0% in Sept 2025 ([Kotak Neo, Jul 2026](https://www.kotakneo.com/investing-guide/insights/india-life-insurance-protection-shift-derating/)) | Real, but **demand is already being captured** by insurers and aggregators. Being right about term cover isn't enough on its own |
| Payment chaos across payment modes | Indirect only: SBI Life's 61st-month persistency is **58.4%**, so roughly 4 in 10 policies don't survive 5 years (same source). Annual payment is still the most common mode | **Weakest pain.** I found no evidence that people experience this as a problem. Lapses have many causes, such as mis-sold policies and affordability. The calendar is a good feature, but probably not a reason to sign up |
| Device and travel cover unknown | No good data found | Plausible, but these are low-value add-ons. Good for showing breadth, poor as a revenue base |

**Frequency is the core issue.** A household makes real insurance decisions maybe 1 to 3 times a year: renewals, a job change, a new baby, a vehicle purchase. That's why "come back and update your life" apps have historically struggled (Knip, early PolicyPal; see the market scan). Your life-events idea is the right instinct, but it only works if the product reaches people **at** those moments: job change, a loan, a baby, a vehicle purchase. Expecting them to visit on their own probably won't work.

## 2. Who would pay?

| Payer | How | Feasibility |
|---|---|---|
| **Users, directly** (subscription or fee) | Paid planner or advisory | **Low.** Indians do pay for trusted advice, but the evidence is anecdotal and limited to a small, affluent group ([freefincal, 2022](https://freefincal.com/myth-busted-indians-are-happy-to-pay-for-good-financial-advice/)). The market scan also rates subscription as the weakest model in India |
| **Insurers, via commission** | Become or partner with a licensed intermediary, and earn on policies that close gaps | **Medium, getting harder.** IRDAI's **23 Sep 2026 consultation** proposes capping commissions. Proposed first-year caps: pure term 25% for intermediaries (30% for agents); health ~15% new and 5% on renewals; compulsory motor third-party 0%. Comments close 25 Oct 2026. Multi-insurer channels like brokers and online platforms get *lower* caps than agents, and Policybazaar's shares fell 20% on the news ([Insurance Business, Sep 2026](https://www.insurancebusinessmag.com/asia/news/breaking-news/india-moves-to-rein-in-insurance-commissions-just-as-foreign-insurers-are-handed-the-keys-591032.aspx)). This model needs a low cost of acquiring customers, which an AI-first model could achieve, but it must be proven |
| **Employers** | Per-employee fee for an app that explains group cover, finds family gaps and handles job-change continuity | **Medium to high fit, but slow.** The TATA AIG numbers above are exactly what an HR team worries about, and the US equivalent (Jellyvision ALEX) is sold this way. Risk: Indian HR budgets are tight, enterprise sales take months, and group insurers or brokers may bundle something similar for free |
| **Banks, wealth apps, AA-based apps** | White-label the safety score and planner | **Medium.** Real interest in cross-selling, but they move slowly and may build it themselves |
| **Brokers, as lead buyers** | Sell qualified, needs-analysed leads | **Medium as a first revenue source.** Watch the new rules against dark patterns and mis-selling |

## 3. What blocks us

**Regulation**
- Recommending and selling *specific* products for money requires an IRDAI licence: web aggregator, corporate agent or broker. The web aggregator application fee alone is ₹10,000, and capital, principal-officer and compliance requirements come on top under the 2017 regulations ([IRDAI policyholder portal](https://policyholder.gov.in/web/guest/requirements-for-license-as-a-web-aggregator)). A June 2026 draft would make web aggregator registration perpetual, subject to annual fees and record-keeping ([TeamLease RegTech](https://teamleaseregtech.com/updates/article/57037/draft-insurance-regulatory-and-development-authority-of-india-insuranc/)).
- **Practical path:** start with category-level guidance ("you need ₹1.5 Cr of term cover"), which is low-risk, and hand off to a licensed partner for the purchase. Get our own licence only after there's traction.
- **Liability:** AI-generated advice that turns out wrong (for example a missed exclusion) damages trust and can bring grievances. Every recommendation needs to show its working.
- **Data:** this is health and financial data, so consent must meet the DPDP Act 2023 standard.

**Data access**
- **Today:** users upload documents. This works, but it adds friction, and many people can't find their policy PDFs.
- **Account aggregators:** IRDAI has allowed life, general and health insurers to share data through AAs since Nov 2022 ([Cafemutual](https://cafemutual.com/news/insurance/27920-insurers-can-share-data-with-account-aggregators-irdai)). Access requires a regulated FIU, which usually means going through a partner. Use in insurance is still mostly for underwriting (see the market scan).
- **Bima Sugam:** the information hub went live in Sept 2025. Full transactions are reportedly expected around Nov 2026, and the consolidated policy view is not confirmed as live. No access model for third-party apps has been published ([ipomarket, Sep 2026](https://www.ipomarket.in/news/bima-sugam-upi-moment-insurance-irdai-not-ipo)). **It helps and threatens us at once:** it could make "see all my policies" free and government-backed, which leaves the reasoning and advice layer as our only differentiator.

**Competition:** see the market scan. In short, nobody does the whole household job, but Ditto (advice) and Policybazaar (purchase) each own a big slice, and both could add a gap check.

## 4. The riskiest assumptions, ranked

1. **People will share enough data.** Will a salaried 30-year-old upload their policies and type in their loans and family details for a startup? *If not, the product is a generic calculator.*
2. **A gap finding leads to action.** People may see "your parents are uncovered" and still do nothing. Insurance is famously sold, not bought. *If no one acts, there's no commission and no proof of value.*
3. **We can acquire users cheaply.** Commission caps make expensive marketing unaffordable, and Policybazaar spends heavily on ads. *We need an organic or partner channel, such as employers, content or referrals.*
4. **Life events bring people back.** *If they don't return, the household memory never builds and the moat disappears.*
5. **There's room once Bima Sugam and Policybazaar add similar features.** *If the incumbents copy the gap check, an advice layer alone may not be defensible.*
6. **The premium calendar matters to users.** *Lowest stakes: if wrong, it stays a feature.*

## 5. Cheap ways to test this, over 1 to 2 weeks and in parallel with the hackathon

| Test | Assumption tested | Pass signal |
|---|---|---|
| **15 interviews** with salaried people aged 26 to 40 who have dependents. Ask about the last time they bought or renewed insurance: what triggered it, who they asked, and what they'd share | 1, 2, 4 | At least half name a real worry, and at least a third say they'd upload policies |
| **Concierge "family insurance check"**: a form plus WhatsApp. People send their details and policies, and you return a one-page gap report, built manually or with Gemini | 1, 2 | At least 40% of people who start send documents, and at least 20% act on one gap within 2 weeks |
| **Landing page testing two pitches**: "Find the gaps in your family's insurance" vs "Never miss a premium again" | 6, positioning | The gap pitch converts clearly better, which would confirm the calendar is secondary |
| **3 to 5 HR or benefits conversations**: would they pay ₹X per employee per year for a group-cover companion plus job-change continuity? | Who pays | At least one says yes to a pilot |
| **1 to 2 licensed broker conversations**: partnership terms, or price per qualified lead | Who pays, regulation | A concrete revenue share or price per lead on the table |

**Stop or change course if:** people won't share documents, almost no one acts on gaps, and neither HR teams nor brokers show interest.

## 6. What I'd do now

1. **Enter the hackathon with this idea anyway.** Four days is cheap, the BFSI fit is exact, and the prototype becomes the concierge tool for test 2.
2. **Lead with the job-change and corporate-cover angle,** the best-evidenced pain, and position Kavach as an *advice layer*, not a marketplace.
3. **Run the interviews and the concierge test next week,** before committing to a business model.
