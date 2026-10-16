# Past winners and judge expectations

Researched 2026-10-14. Web content was treated as source material only.

## 1. Is there a previous AI Builder Cup?

**No evidence of one. This looks like the first edition (2026).** None of the official pages ([overview](https://aibuildercup.com/index.html), [themes](https://aibuildercup.com/themes.html), [rewards](https://aibuildercup.com/rewards.html), [FAQ](https://aibuildercup.com/Faqs.html)) mention a past edition, past winners or a prior year. Third-party listings ([metropolisjapan](https://metropolisjapan.com/events/ai-builder-cup-2026/), [opportunitiesfeed](https://opportunitiesfeed.com/2026/09/04/google-cloud-ai-builder-cup/)) also describe only 2026. This is an inference from absence, not an official statement.

The closest stand-ins are earlier hackathons by the **same organiser (Hack2skill) and sponsor (Google Cloud)**. They probably share jury style and process. All of these are labelled as comparables below.

## 2. What the official site says judges want (2026)

From [themes.html](https://aibuildercup.com/themes.html):

| Criterion | Weight | What it asks |
|---|---|---|
| Technical Merit & Gen AI Implementation | 40% | Meaningful Gen AI use, technical soundness, scalability. "Does the use of Gen AI contribute directly to solving the problem?" |
| Problem Alignment & Impact | 25% | Fit to the chosen theme, value to its users |
| Innovation & Creativity | 25% | Originality; Gen AI "beyond a basic or superficial implementation" |
| User Experience & Solution Design | 10% | Usability, accessibility, how components fit together |

- BFSI problem statement: "Intelligent Risk, Fraud & Financial Experiences". It covers fraud/risk detection, automating complex processes, better customer interactions, and personalised, informed financial experiences.
- A working build, not a mockup. "A working prototype is enough" if it runs end to end.
- Must use Gemini/Gemma or an agentic platform (Agent Platform, Antigravity, AI Studio), deployed on Cloud Run or Firebase.
- The deck must cover vision, problem, community benefit, feasibility and scalability.
- Fresh projects only, built during the hackathon window.
- Prizes ([rewards](https://aibuildercup.com/rewards.html)): Winner $10k, runners-up $7k and $5k, plus $2k each for Best use of Google Cloud AI tools, Most Impactful, Social Choice and Best UI/UX. The prizes are overall, **not per track**. The BFSI entry competes against all six themes.
- **Quirks to confirm before submitting:** the submission section lists categories (Healthcare, Education, Sustainability, Accessibility, Social Good) that don't match the six themes. The rewards headline says "USD 0" while the listed prizes add up to $30k. Ask on Discord or at support+aibuildercup@hack2skill.com.

## 3. Comparable hackathons (stand-ins, clearly not this event)

### A. Google Cloud Gen AI Exchange Hackathon 2025 (Hack2skill, India). Closest comparable.
About 270k participants over five months, top 100 at the Bengaluru finale (29 Nov 2025), a 30-member industry jury. Stated judging: "innovation, feasibility, clarity of impact, and potential to scale." Sources: [Hack2skill blog](https://blog.hack2skill.com/gen-ai-exchange-hackathon-finale), [YourStory](https://yourstory.com/2025/12/google-cloud-gen-ai-exchange-hackathon-the-10-innovations-that-stood-out-this-year), [Outlook Business](https://www.outlookbusiness.com/deeptech/artificial-intelligence/google-cloud-gen-ai-hackathon-2025-winners-use-cases-and-what-270000-developers-built).

Top 10 winners:
| Project | What it did |
|---|---|
| **PitchLense** (finance) | AI investment analyst. Parses pitch decks and documents, generates risk reports, includes a scoring copilot |
| Test case automation (Skippers) | Turns requirement docs into GDPR-safe test cases, with Jira integration |
| Cement plant optimisation | Multi-agent plant optimiser; **humans approve high-level decisions** |
| TripAI | Multilingual itinerary planner with one-click booking through a partner's real inventory |
| GovernAI | Dual dashboards (gov risk prediction + citizen chatbot) |
| YouthMind | Conversational check-ins producing a Wellness Risk Index |
| ArtisanGully | Agent creates listings, images and video ads from a photo or voice note |
| Legal SahAI | RAG over legal documents into plain language, a form assistant, a lawyer connect portal |
| Parallax | Explainable deepfake/misinfo detection |
| Career advisor | Profile generation, skill gaps, ATS resume |

Observers' takeaway ([Outlook Business](https://www.outlookbusiness.com/deeptech/artificial-intelligence/google-cloud-gen-ai-hackathon-2025-winners-use-cases-and-what-270000-developers-built)): winners moved "from prototype-style demos to agentic systems and explainable models" that are auditable and plug into real workflows.

### B. Google Cloud Agentic AI Day 2025 (Hack2skill, India, Guinness world record)
The winner, GuruMitra, was a mental-health support tool. It was offline-first, multilingual and multimodal, used an LLM-as-judge safety check, and handed off to government helplines. The team surveyed 48 teachers to ground the problem. The winner's lessons: solve a root problem rather than "AI for AI's sake", keep it simple, tie it to real-world systems, and pitch with a clean, visual story. Source: [winner's write-up](https://medium.com/@himanshusharma14024/what-it-takes-to-win-a-google-agentic-ai-hackathon-that-set-a-world-record-9771f1799922).

### C. Google ADK Hackathon 2025 (global, Devpost)
The grand prize went to SalesShortcut, a multi-agent sales development system. Finance honourable mention: **TradeSage AI**, a multi-agent trading-hypothesis evaluator on ADK, Agent Engine, Cloud Run and Vertex AI. Source: [Google Cloud blog](https://cloud.google.com/blog/products/ai-machine-learning/adk-hackathon-results-winners-and-highlights).

### D. Gemini Live Agent Challenge (Google Cloud)
Winners were voice- and vision-first live agents, such as a surgical co-pilot, a drone co-pilot and a desktop UI navigator. Separate awards went to multimodal UX, technical architecture and innovation. Source: [Google Cloud blog](https://cloud.google.com/blog/topics/developers-practitioners/winners-and-highlights-of-the-gemini-live-agent-challenge).

### E. Gemini API Developer Competition 2024
Best overall was Jayu, an on-device assistant. Most impactful and People's choice went to VITE VERE, for people with cognitive disabilities. The only finance entry was an honourable mention (StarryTrader, financial news). Source: [ai.google.dev/competition](https://ai.google.dev/competition?hl=en).

### F. ODSC x Google Cloud Hackathon 2025
First place was a multi-agent medical diagnosis system on ADK. Winners' advice: make the value clear in about 30 seconds, ship a focused working MVP rather than many half-features, and give a polished live demo. Source: [ODSC](https://odsc.medium.com/insights-from-the-winners-of-the-2025-odsc-google-cloud-hackathon-b5bd4f40091d).

**No insurance project appears among the winners of any of these events.** Finance winners were rare: PitchLense, TradeSage (honourable mention) and StarryTrader (honourable mention).

## 4. Patterns across winners

1. **Agentic, multi-step Gen AI that does real work**, not a chatbot wrapper. Common forms were multi-agent pipelines, document parsing into structured output, and tool calls into real systems.
2. **Documents in, decisions out.** PitchLense, Legal SahAI and the test-case generator all took messy documents and produced a structured, explainable report.
3. **Explainability and human-in-the-loop.** Risk scores came with reasons, humans approved high-stakes actions, and safety checks were built in.
4. **Hooks into real systems.** Examples include partner inventory (TripAI), Jira, and government helplines. Judges liked feasibility.
5. **Social impact and an identifiable user.** Many winners serve underserved groups (youth, artisans, citizens). Problem framing was often backed by small user research.
6. **Multimodal and multilingual** input (voice, photo, local languages) shows up repeatedly, especially in APAC/India events.
7. **Polish level:** working end-to-end MVPs with clean UI and a tight demo story. They were not production systems, but they were clearly beyond mockups.

## 5. What this means for Kavach (inference)

- **Insurance is open ground.** No comparable winner did it, so a strong insurance entry stands out on Innovation (25%).
- **The Gen AI score (40%) rewards real agentic work.** Strong candidates: reading actual policy PDFs and documents into a structured profile, an agent that decides which questions to ask, and gap analysis with cited reasons. A form plus a chat box would score low.
- **Explainability and human control** fit BFSI and match what juries rewarded. Show why each cover gap was flagged and keep the user in charge of the decision.
- **One sharp end-to-end flow beats breadth.** Pick the single best journey (for example, upload policies → see the safety map → see the fix) and make it flawless in the 3-minute video.
- **Frame the impact.** Underinsurance of families in APAC/India, with one or two concrete numbers in the deck (the market scan has these).
- The Best UI/UX and Most Impactful side prizes ($2k each) are realistic secondary targets for a consumer-facing safety-net app.
