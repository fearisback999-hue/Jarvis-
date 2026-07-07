const GRAPH = {
 "nodes": [
  {
   "id": 0,
   "label": "Advertising Playbook",
   "group": "advertising",
   "excerpt": "Budgets are per-channel with hard caps \u2014 see Monthly Operating Budget. Creative comes from two lanes: AI UGC videos via Higgsfield Workflow, and real creators from the UGC Creator Program. Kill a campaign under 1.0 ROAS after $50 spend; scale past 2.0. Log every dollar. Related: TikTok Shop Strategy."
  },
  {
   "id": 1,
   "label": "Content Calendar",
   "group": "advertising",
   "excerpt": "Every UGC brief, hook, and caption lands here from Higgsfield Workflow and JARVIS drafts. Mark posted, track views and attributed sales per video. Three posts a day on TikTok Shop Strategy lanes. Dead hooks get rewritten, not reposted."
  },
  {
   "id": 2,
   "label": "Higgsfield Workflow",
   "group": "advertising",
   "excerpt": "For each product: draft a UGC brief (hook, 30s script with timestamps, caption), generate the AI UGC video in Higgsfield, cut 3 hook variants, launch as spark ads at $20/day test budget. Winners get budget doubled every 3 days while ROAS holds above 1.5. See Advertising Playbook and UGC Creator Program."
  },
  {
   "id": 3,
   "label": "TikTok Shop Strategy",
   "group": "advertising",
   "excerpt": "Three content lanes daily: product demos, POV hooks, and creator reposts. Post 3x/day minimum. The algorithm rewards native-feel content \u2014 no watermarks, no obvious ads. Winning products come from TikTok Product Research; creative from Higgsfield Workflow and the UGC Creator Program."
  },
  {
   "id": 4,
   "label": "UGC Creator Program",
   "group": "advertising",
   "excerpt": "Affiliate pipeline: prospect -> contacted -> negotiating -> active. Standard offer 15% commission, free sample, script provided. Track GMV per creator; drop non-posters after two weeks. Creators beat AI UGC on trust; AI UGC beats creators on speed and cost \u2014 run both. Related: Higgsfield Workflow, TikTok Shop Strategy."
  },
  {
   "id": 5,
   "label": "Bank and Bills",
   "group": "business",
   "excerpt": "Bank linked read-only through Plaid so the guard can see the balance. Bills are whitelisted with exact amounts and due days; payments require human approval after all six Spending Guard Rules pass. Full operating cost = fixed bills + ad budgets, shown in one number."
  },
  {
   "id": 6,
   "label": "Business Overview",
   "group": "business",
   "excerpt": "The operation runs two engines: a POD Automation Engine selling print-on-demand designs on Etsy, and a TikTok Shop Strategy built on short-form video. Monthly operating budget is about $1,500 \u2014 see Monthly Operating Budget. The north star: replace a salary with Passive Income Streams before transferring to a UC. Revenue is tracked in Revenue Tracking, and every dollar of spend passes the Spending Guard Rules."
  },
  {
   "id": 7,
   "label": "Monthly Operating Budget",
   "group": "business",
   "excerpt": "Total: ~$1,500/month. TikTok Ads $800, Etsy Ads $300, API & software $150, POD samples & other $250. Fixed bills live in the Bills system with a hard monthly cap. Ad spend is blocked per channel when a budget is hit \u2014 no silent overspending. Related: Advertising Playbook, Spending Guard Rules, Revenue Tracking."
  },
  {
   "id": 8,
   "label": "Passive Income Streams",
   "group": "business",
   "excerpt": "Goal: systems that earn while studying. 1) Etsy POD listings compound \u2014 300+ live listings is the target, fed by the POD Automation Engine. 2) TikTok Shop affiliate commissions via the UGC Creator Program. 3) Evergreen video content that keeps converting. Every stream must run without daily attention."
  },
  {
   "id": 9,
   "label": "Revenue Tracking",
   "group": "business",
   "excerpt": "Income is logged by source: TikTok Shop, Etsy, other. ROAS = month revenue / ad spend; below 1.0 means ads lose money, above 2.0 means scale the winners. The POD Automation Engine syncs order data automatically. Weekly money review every Sunday. See Business Overview and Monthly Operating Budget."
  },
  {
   "id": 10,
   "label": "Spending Guard Rules",
   "group": "business",
   "excerpt": "Six checks on every payment: whitelist-only payees, exact registered amount, one payment per bill per month, per-payment cap, monthly cap, minimum balance buffer. Fail-closed: no balance data means no payments. The AI can never execute a payment \u2014 final approval is always a human tap. Related: Monthly Operating Budget."
  },
  {
   "id": 11,
   "label": "Boxing Discipline",
   "group": "career",
   "excerpt": "Five days a week: Monday, Tuesday, Wednesday, Friday, Saturday. Just show up \u2014 no logging, no overthinking. Lifting every single day. The discipline transfers: same consistency wins in Daily Schedule and the LSAT Preparation grind."
  },
  {
   "id": 12,
   "label": "Cypress Classes",
   "group": "career",
   "excerpt": "MATH 150A/B (Calc I/II), MATH 250A (Multivariable), MATH 250B (Linear Algebra & Diff Eq), PHYS 221/222/223 (calc-based series), CSCI 133 (C++), CSCI 233 (advanced C++), CSCI 241 (data structures), ENGL 100/103 for IGETC. Verify every number on assist.org each term. Related: UC Transfer Plan."
  },
  {
   "id": 13,
   "label": "LSAT Preparation",
   "group": "career",
   "excerpt": "Target 175+, ceiling 180. Daily logic drills already in the schedule; full timed practice tests logged with a trend chart. Harvard median ~173, Yale ~175. The LSAT is learnable \u2014 volume of timed sections beats everything. Related: Patent Law Route."
  },
  {
   "id": 14,
   "label": "Patent Law Route",
   "group": "career",
   "excerpt": "Cypress College (1.5-2 years) -> UC transfer via ASSIST -> CS or EE degree -> LSAT 175+ -> Harvard or Yale Law -> patent attorney. The technical degree qualifies for the USPTO patent bar. Scarce, defensible, top billing rates. See UC Transfer Plan and LSAT Preparation."
  },
  {
   "id": 15,
   "label": "UC Transfer Plan",
   "group": "career",
   "excerpt": "Targets: Berkeley, UCLA, San Diego on grades; TAG filed at Riverside or Merced as the guaranteed floor (TAG excludes CS at Davis/Irvine and all engineering at Santa Barbara). Class checklist tracked against assist.org: calc series, linear algebra, calc-based physics, C++, data structures. GPA target 3.9+. Related: Patent Law Route, Cypress Classes."
  },
  {
   "id": 16,
   "label": "Why Patent Law",
   "group": "career",
   "excerpt": "Patent attorneys with real EE/CS backgrounds are scarce. The patent bar requires a technical degree \u2014 most lawyers can't sit it. Tech background + business experience from running Business Overview compounds into client credibility. Related: Patent Law Route."
  },
  {
   "id": 17,
   "label": "Daily Schedule",
   "group": "operations",
   "excerpt": "Anchored on the five prayers \u2014 everything schedules around them. Lifting every day after Asr. Boxing Monday, Tuesday, Wednesday, Friday, Saturday. School on weekdays. Deep work blocks filled by ROI score. Missed blocks reflow automatically. See Weekly Review and Prayer Anchors."
  },
  {
   "id": 18,
   "label": "Desktop Voice Control",
   "group": "operations",
   "excerpt": "\"Hey Jarvis\" controls the PC through a local bridge: open apps, YouTube searches, volume, media, screenshots, lock. The bridge runs on localhost only with a pairing token. High-risk commands require confirmation. Related: Daily Schedule."
  },
  {
   "id": 19,
   "label": "Prayer Anchors",
   "group": "operations",
   "excerpt": "Fajr, Dhuhr, Asr, Maghrib, Isha \u2014 computed astronomically, never scheduled over. The day plan builds around them: Qur'an-free tracking by request, prayer logging with streaks. The scheduler treats prayers as immovable; everything else flexes. Related: Daily Schedule."
  },
  {
   "id": 20,
   "label": "Weekly Review",
   "group": "operations",
   "excerpt": "Sunday: money review (revenue, ROAS, expenses vs budget), content performance, creator pipeline status, missed schedule blocks, next week's top-3 ROI tasks. Twenty minutes, every week, no skipping. Feeds Revenue Tracking and Daily Schedule."
  },
  {
   "id": 21,
   "label": "Etsy Listing SEO",
   "group": "products",
   "excerpt": "Titles front-load the buyer's exact search phrase, 13 tags used every time, long-tail over head terms. Mockups sorted by URL presence. Prices anchored against the category median. The POD Automation Engine drafts all of this; human review before publish. Related: Revenue Tracking."
  },
  {
   "id": 22,
   "label": "POD Automation Engine",
   "group": "products",
   "excerpt": "NEO POD (Alsaduquon) generates designs, validates listings, prices for margin, and publishes to Etsy automatically. Pipeline: generate -> validate -> mockup -> list -> optimize. Runs on a cron or by voice command. Costs API money per run, so runs are deliberate. Feeds Revenue Tracking and Etsy Listing SEO."
  },
  {
   "id": 23,
   "label": "Sample Ordering",
   "group": "products",
   "excerpt": "Order samples before scaling any product: check print quality, shipping time, packaging. Budget $250/month under POD samples & other in Monthly Operating Budget. A bad sample kills a product before reviews do. Related: Winning Product Criteria."
  },
  {
   "id": 24,
   "label": "TikTok Product Research",
   "group": "products",
   "excerpt": "The tt-engine scores products 0-100: momentum, saturation, window estimate, margin floor, return risk, trademark check. A product only surfaces at 80+ with every hard gate cleared. Output is an attack packet: sourcing, pricing, creative angles. Related: TikTok Shop Strategy, Winning Product Criteria."
  },
  {
   "id": 25,
   "label": "Winning Product Criteria",
   "group": "products",
   "excerpt": "Under $30 retail, 3x margin after fees, solves a visible problem in 3 seconds on camera, low saturation (fewer than 5 strong sellers), shippable under 10 days. Trend window matters more than the product itself \u2014 see TikTok Product Research for the scoring engine."
  }
 ],
 "links": [
  {
   "source": 0,
   "target": 1
  },
  {
   "source": 0,
   "target": 2
  },
  {
   "source": 0,
   "target": 3
  },
  {
   "source": 0,
   "target": 4
  },
  {
   "source": 0,
   "target": 6
  },
  {
   "source": 0,
   "target": 7
  },
  {
   "source": 0,
   "target": 8
  },
  {
   "source": 0,
   "target": 9
  },
  {
   "source": 0,
   "target": 10
  },
  {
   "source": 0,
   "target": 23
  },
  {
   "source": 0,
   "target": 24
  },
  {
   "source": 1,
   "target": 2
  },
  {
   "source": 1,
   "target": 3
  },
  {
   "source": 1,
   "target": 4
  },
  {
   "source": 1,
   "target": 6
  },
  {
   "source": 1,
   "target": 24
  },
  {
   "source": 2,
   "target": 3
  },
  {
   "source": 2,
   "target": 4
  },
  {
   "source": 2,
   "target": 7
  },
  {
   "source": 2,
   "target": 8
  },
  {
   "source": 3,
   "target": 4
  },
  {
   "source": 3,
   "target": 6
  },
  {
   "source": 3,
   "target": 8
  },
  {
   "source": 3,
   "target": 24
  },
  {
   "source": 3,
   "target": 25
  },
  {
   "source": 4,
   "target": 6
  },
  {
   "source": 4,
   "target": 8
  },
  {
   "source": 4,
   "target": 24
  },
  {
   "source": 5,
   "target": 6
  },
  {
   "source": 5,
   "target": 7
  },
  {
   "source": 5,
   "target": 10
  },
  {
   "source": 6,
   "target": 7
  },
  {
   "source": 6,
   "target": 8
  },
  {
   "source": 6,
   "target": 9
  },
  {
   "source": 6,
   "target": 10
  },
  {
   "source": 6,
   "target": 16
  },
  {
   "source": 6,
   "target": 20
  },
  {
   "source": 6,
   "target": 21
  },
  {
   "source": 6,
   "target": 22
  },
  {
   "source": 6,
   "target": 23
  },
  {
   "source": 6,
   "target": 24
  },
  {
   "source": 7,
   "target": 9
  },
  {
   "source": 7,
   "target": 10
  },
  {
   "source": 7,
   "target": 20
  },
  {
   "source": 7,
   "target": 21
  },
  {
   "source": 7,
   "target": 22
  },
  {
   "source": 7,
   "target": 23
  },
  {
   "source": 8,
   "target": 9
  },
  {
   "source": 8,
   "target": 21
  },
  {
   "source": 8,
   "target": 22
  },
  {
   "source": 9,
   "target": 10
  },
  {
   "source": 9,
   "target": 16
  },
  {
   "source": 9,
   "target": 20
  },
  {
   "source": 9,
   "target": 21
  },
  {
   "source": 9,
   "target": 22
  },
  {
   "source": 9,
   "target": 23
  },
  {
   "source": 10,
   "target": 23
  },
  {
   "source": 11,
   "target": 13
  },
  {
   "source": 11,
   "target": 14
  },
  {
   "source": 11,
   "target": 17
  },
  {
   "source": 11,
   "target": 18
  },
  {
   "source": 11,
   "target": 19
  },
  {
   "source": 11,
   "target": 20
  },
  {
   "source": 12,
   "target": 14
  },
  {
   "source": 12,
   "target": 15
  },
  {
   "source": 13,
   "target": 14
  },
  {
   "source": 13,
   "target": 15
  },
  {
   "source": 13,
   "target": 16
  },
  {
   "source": 14,
   "target": 15
  },
  {
   "source": 14,
   "target": 16
  },
  {
   "source": 15,
   "target": 16
  },
  {
   "source": 17,
   "target": 18
  },
  {
   "source": 17,
   "target": 19
  },
  {
   "source": 17,
   "target": 20
  },
  {
   "source": 18,
   "target": 19
  },
  {
   "source": 18,
   "target": 20
  },
  {
   "source": 19,
   "target": 20
  },
  {
   "source": 20,
   "target": 21
  },
  {
   "source": 20,
   "target": 22
  },
  {
   "source": 21,
   "target": 22
  },
  {
   "source": 23,
   "target": 24
  },
  {
   "source": 23,
   "target": 25
  },
  {
   "source": 24,
   "target": 25
  }
 ]
};
