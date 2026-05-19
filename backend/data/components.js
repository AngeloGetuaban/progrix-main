/**
 * Pre-built Tailwind HTML component snippets.
 * The AI uses these as exact copy-paste starting points, adapting
 * colors, copy, and layout to match the project's design brief.
 */

const COMPONENTS = {
  nav: [
    {
      name: "sticky-navbar",
      tags: ["navigation", "header"],
      html: `<nav class="sticky top-0 z-50 bg-white/90 backdrop-blur border-b border-gray-100">
  <div class="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
    <a href="#" class="text-xl font-bold text-gray-900">Brand</a>
    <div class="hidden md:flex items-center gap-8 text-sm font-medium text-gray-600">
      <a href="#features" class="hover:text-gray-900 transition">Features</a>
      <a href="#pricing" class="hover:text-gray-900 transition">Pricing</a>
      <a href="#about" class="hover:text-gray-900 transition">About</a>
    </div>
    <a href="#contact" class="hidden md:inline-flex px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition">Get Started</a>
  </div>
</nav>`,
    },
  ],

  hero: [
    {
      name: "centered-hero",
      tags: ["hero", "landing"],
      html: `<section class="bg-gradient-to-b from-slate-50 to-white pt-24 pb-20 text-center">
  <div class="max-w-4xl mx-auto px-6">
    <span class="inline-block px-3 py-1 text-xs font-semibold text-blue-700 bg-blue-100 rounded-full mb-6">Trusted by 10,000+ teams</span>
    <h1 class="text-5xl md:text-6xl font-extrabold text-gray-900 leading-tight mb-6">Your Headline<br><span class="text-blue-600">Goes Right Here</span></h1>
    <p class="text-xl text-gray-500 max-w-2xl mx-auto mb-10">A compelling subheadline that explains the benefit in one or two concise sentences.</p>
    <div class="flex flex-col sm:flex-row gap-4 justify-center">
      <a href="#" class="px-8 py-4 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition shadow-lg shadow-blue-200">Get Started Free</a>
      <a href="#" class="px-8 py-4 bg-white text-gray-700 font-semibold rounded-xl border border-gray-200 hover:border-gray-300 transition">See How It Works →</a>
    </div>
    <p class="mt-6 text-sm text-gray-400">No credit card required · Free 14-day trial</p>
  </div>
</section>`,
    },
    {
      name: "split-hero",
      tags: ["hero", "landing", "image"],
      html: `<section class="bg-white pt-20 pb-16">
  <div class="max-w-6xl mx-auto px-6 grid md:grid-cols-2 gap-12 items-center">
    <div>
      <span class="inline-block px-3 py-1 text-xs font-semibold text-emerald-700 bg-emerald-100 rounded-full mb-4">New in 2025</span>
      <h1 class="text-4xl md:text-5xl font-extrabold text-gray-900 leading-tight mb-6">The Smarter Way to <span class="text-emerald-600">Get Things Done</span></h1>
      <p class="text-lg text-gray-500 mb-8">Describe your product benefit clearly. One sentence per idea. Keep it scannable and direct.</p>
      <div class="flex flex-wrap gap-4">
        <a href="#" class="px-6 py-3 bg-emerald-600 text-white font-bold rounded-lg hover:bg-emerald-700 transition">Start for Free</a>
        <a href="#" class="px-6 py-3 text-gray-700 font-semibold rounded-lg border border-gray-200 hover:bg-gray-50 transition">Watch Demo</a>
      </div>
    </div>
    <div class="bg-gradient-to-br from-emerald-100 to-teal-200 rounded-2xl h-80 flex items-center justify-center">
      <span class="text-gray-400 text-sm">Product Image / Screenshot</span>
    </div>
  </div>
</section>`,
    },
    {
      name: "gradient-hero",
      tags: ["hero", "landing", "dark"],
      html: `<section class="bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 pt-28 pb-24 text-center text-white">
  <div class="max-w-4xl mx-auto px-6">
    <span class="inline-block px-3 py-1 text-xs font-semibold text-purple-300 bg-purple-900/60 border border-purple-700 rounded-full mb-6">Now in Public Beta</span>
    <h1 class="text-5xl md:text-7xl font-black leading-tight mb-6">Build Faster.<br><span class="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">Ship Smarter.</span></h1>
    <p class="text-xl text-slate-300 max-w-2xl mx-auto mb-10">Your power subheadline goes here. Keep it short, benefit-focused, and jargon-free.</p>
    <div class="flex flex-col sm:flex-row gap-4 justify-center">
      <a href="#" class="px-8 py-4 bg-purple-600 text-white font-bold rounded-xl hover:bg-purple-500 transition shadow-lg shadow-purple-900">Get Early Access</a>
      <a href="#" class="px-8 py-4 bg-white/10 text-white font-semibold rounded-xl border border-white/20 hover:bg-white/20 transition backdrop-blur">See the Demo →</a>
    </div>
  </div>
</section>`,
    },
  ],

  features: [
    {
      name: "feature-grid-3",
      tags: ["features", "benefits", "grid"],
      html: `<section class="py-20 bg-white">
  <div class="max-w-6xl mx-auto px-6">
    <div class="text-center mb-14">
      <h2 class="text-3xl md:text-4xl font-extrabold text-gray-900 mb-4">Everything You Need</h2>
      <p class="text-lg text-gray-500 max-w-xl mx-auto">Supporting sentence that adds context to the section headline.</p>
    </div>
    <div class="grid md:grid-cols-3 gap-8">
      <div class="p-6 rounded-2xl bg-gray-50 hover:bg-gray-100 transition">
        <div class="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-4">
          <svg class="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
        </div>
        <h3 class="text-lg font-bold text-gray-900 mb-2">Fast Performance</h3>
        <p class="text-gray-500 text-sm">Describe the feature benefit in 1–2 short sentences. Focus on the outcome, not the technology.</p>
      </div>
      <div class="p-6 rounded-2xl bg-gray-50 hover:bg-gray-100 transition">
        <div class="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mb-4">
          <svg class="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
        </div>
        <h3 class="text-lg font-bold text-gray-900 mb-2">Secure by Default</h3>
        <p class="text-gray-500 text-sm">Describe the feature benefit in 1–2 short sentences. Focus on the outcome, not the technology.</p>
      </div>
      <div class="p-6 rounded-2xl bg-gray-50 hover:bg-gray-100 transition">
        <div class="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center mb-4">
          <svg class="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>
        </div>
        <h3 class="text-lg font-bold text-gray-900 mb-2">Powerful Analytics</h3>
        <p class="text-gray-500 text-sm">Describe the feature benefit in 1–2 short sentences. Focus on the outcome, not the technology.</p>
      </div>
    </div>
  </div>
</section>`,
    },
    {
      name: "feature-list-icon",
      tags: ["features", "benefits", "list"],
      html: `<section class="py-20 bg-gray-50">
  <div class="max-w-5xl mx-auto px-6 grid md:grid-cols-2 gap-16 items-center">
    <div>
      <h2 class="text-3xl md:text-4xl font-extrabold text-gray-900 mb-6">Why Teams Choose Us</h2>
      <p class="text-gray-500 mb-10">A short paragraph reinforcing the section headline. Keep it to 2 sentences max.</p>
      <ul class="space-y-6">
        <li class="flex gap-4">
          <div class="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
            <svg class="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>
          </div>
          <div><h4 class="font-bold text-gray-900 mb-1">Benefit One</h4><p class="text-gray-500 text-sm">Short description of this specific benefit.</p></div>
        </li>
        <li class="flex gap-4">
          <div class="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
            <svg class="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>
          </div>
          <div><h4 class="font-bold text-gray-900 mb-1">Benefit Two</h4><p class="text-gray-500 text-sm">Short description of this specific benefit.</p></div>
        </li>
        <li class="flex gap-4">
          <div class="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
            <svg class="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>
          </div>
          <div><h4 class="font-bold text-gray-900 mb-1">Benefit Three</h4><p class="text-gray-500 text-sm">Short description of this specific benefit.</p></div>
        </li>
      </ul>
    </div>
    <div class="bg-gradient-to-br from-blue-100 to-indigo-200 rounded-2xl h-80 flex items-center justify-center">
      <span class="text-gray-400 text-sm">Feature Image</span>
    </div>
  </div>
</section>`,
    },
  ],

  stats: [
    {
      name: "stats-bar",
      tags: ["stats", "social-proof", "numbers"],
      html: `<section class="py-16 bg-slate-900 text-white">
  <div class="max-w-5xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
    <div>
      <div class="text-4xl font-extrabold text-blue-400 mb-1">10k+</div>
      <div class="text-sm text-slate-400 uppercase tracking-wide">Happy Customers</div>
    </div>
    <div>
      <div class="text-4xl font-extrabold text-blue-400 mb-1">99.9%</div>
      <div class="text-sm text-slate-400 uppercase tracking-wide">Uptime SLA</div>
    </div>
    <div>
      <div class="text-4xl font-extrabold text-blue-400 mb-1">500ms</div>
      <div class="text-sm text-slate-400 uppercase tracking-wide">Avg Response</div>
    </div>
    <div>
      <div class="text-4xl font-extrabold text-blue-400 mb-1">4.9★</div>
      <div class="text-sm text-slate-400 uppercase tracking-wide">Customer Rating</div>
    </div>
  </div>
</section>`,
    },
  ],

  testimonials: [
    {
      name: "testimonial-cards",
      tags: ["testimonials", "social-proof", "reviews"],
      html: `<section class="py-20 bg-gray-50">
  <div class="max-w-6xl mx-auto px-6">
    <h2 class="text-3xl font-extrabold text-center text-gray-900 mb-12">What Our Customers Say</h2>
    <div class="grid md:grid-cols-3 gap-6">
      <div class="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <div class="text-yellow-400 text-sm mb-3">★★★★★</div>
        <p class="text-gray-600 text-sm mb-5">"This product completely changed how our team works. We saved hours every week and the quality improved dramatically."</p>
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center font-bold text-blue-600 text-sm">JD</div>
          <div><div class="font-semibold text-gray-900 text-sm">Jane Doe</div><div class="text-xs text-gray-400">CEO, Acme Corp</div></div>
        </div>
      </div>
      <div class="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <div class="text-yellow-400 text-sm mb-3">★★★★★</div>
        <p class="text-gray-600 text-sm mb-5">"Exceptional support and a product that actually delivers. Setup took minutes and the results speak for themselves."</p>
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center font-bold text-emerald-600 text-sm">MS</div>
          <div><div class="font-semibold text-gray-900 text-sm">Mark Smith</div><div class="text-xs text-gray-400">CTO, TechFlow</div></div>
        </div>
      </div>
      <div class="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <div class="text-yellow-400 text-sm mb-3">★★★★★</div>
        <p class="text-gray-600 text-sm mb-5">"I was skeptical at first, but after trying it I recommended it to my whole team. Now we can't imagine working without it."</p>
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center font-bold text-purple-600 text-sm">AL</div>
          <div><div class="font-semibold text-gray-900 text-sm">Amy Lee</div><div class="text-xs text-gray-400">Head of Ops, Startup Co</div></div>
        </div>
      </div>
    </div>
  </div>
</section>`,
    },
  ],

  pricing: [
    {
      name: "pricing-cards",
      tags: ["pricing", "plans", "tiers"],
      html: `<section class="py-20 bg-white">
  <div class="max-w-5xl mx-auto px-6 text-center">
    <h2 class="text-3xl font-extrabold text-gray-900 mb-4">Simple, Transparent Pricing</h2>
    <p class="text-gray-500 mb-12">No hidden fees. Cancel anytime.</p>
    <div class="grid md:grid-cols-3 gap-8">
      <div class="border border-gray-200 rounded-2xl p-8">
        <div class="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-2">Starter</div>
        <div class="text-4xl font-extrabold text-gray-900 mb-1">$9<span class="text-lg font-normal text-gray-400">/mo</span></div>
        <p class="text-sm text-gray-500 mb-6">Perfect for individuals</p>
        <ul class="text-sm text-gray-600 space-y-3 mb-8 text-left">
          <li class="flex gap-2"><span class="text-emerald-500">✓</span> 5 projects</li>
          <li class="flex gap-2"><span class="text-emerald-500">✓</span> Basic analytics</li>
          <li class="flex gap-2"><span class="text-emerald-500">✓</span> Email support</li>
        </ul>
        <a href="#" class="block w-full py-3 rounded-xl border border-gray-200 text-gray-700 font-semibold hover:bg-gray-50 transition text-sm">Get Started</a>
      </div>
      <div class="border-2 border-blue-600 rounded-2xl p-8 bg-blue-50 relative">
        <span class="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-xs font-bold px-4 py-1 rounded-full">Most Popular</span>
        <div class="text-sm font-semibold text-blue-600 uppercase tracking-wide mb-2">Pro</div>
        <div class="text-4xl font-extrabold text-gray-900 mb-1">$29<span class="text-lg font-normal text-gray-400">/mo</span></div>
        <p class="text-sm text-gray-500 mb-6">Great for growing teams</p>
        <ul class="text-sm text-gray-600 space-y-3 mb-8 text-left">
          <li class="flex gap-2"><span class="text-emerald-500">✓</span> Unlimited projects</li>
          <li class="flex gap-2"><span class="text-emerald-500">✓</span> Advanced analytics</li>
          <li class="flex gap-2"><span class="text-emerald-500">✓</span> Priority support</li>
          <li class="flex gap-2"><span class="text-emerald-500">✓</span> Custom domain</li>
        </ul>
        <a href="#" class="block w-full py-3 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 transition text-sm">Get Started</a>
      </div>
      <div class="border border-gray-200 rounded-2xl p-8">
        <div class="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-2">Enterprise</div>
        <div class="text-4xl font-extrabold text-gray-900 mb-1">$99<span class="text-lg font-normal text-gray-400">/mo</span></div>
        <p class="text-sm text-gray-500 mb-6">For large organizations</p>
        <ul class="text-sm text-gray-600 space-y-3 mb-8 text-left">
          <li class="flex gap-2"><span class="text-emerald-500">✓</span> Everything in Pro</li>
          <li class="flex gap-2"><span class="text-emerald-500">✓</span> SSO & SAML</li>
          <li class="flex gap-2"><span class="text-emerald-500">✓</span> Dedicated support SLA</li>
          <li class="flex gap-2"><span class="text-emerald-500">✓</span> Custom integrations</li>
        </ul>
        <a href="#" class="block w-full py-3 rounded-xl border border-gray-200 text-gray-700 font-semibold hover:bg-gray-50 transition text-sm">Contact Sales</a>
      </div>
    </div>
  </div>
</section>`,
    },
  ],

  cta: [
    {
      name: "cta-banner",
      tags: ["cta", "conversion", "action"],
      html: `<section class="py-20 bg-blue-600">
  <div class="max-w-4xl mx-auto px-6 text-center">
    <h2 class="text-3xl md:text-4xl font-extrabold text-white mb-4">Ready to Get Started?</h2>
    <p class="text-blue-100 text-lg mb-10 max-w-xl mx-auto">Join thousands of happy customers. No credit card required.</p>
    <div class="flex flex-col sm:flex-row gap-4 justify-center">
      <a href="#" class="px-8 py-4 bg-white text-blue-700 font-bold rounded-xl hover:bg-blue-50 transition shadow-lg">Start Free Trial</a>
      <a href="#" class="px-8 py-4 bg-blue-500 text-white font-semibold rounded-xl hover:bg-blue-400 transition border border-blue-400">Talk to Sales</a>
    </div>
  </div>
</section>`,
    },
    {
      name: "cta-split",
      tags: ["cta", "conversion", "newsletter"],
      html: `<section class="py-20 bg-gray-900 text-white">
  <div class="max-w-5xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-10">
    <div>
      <h2 class="text-3xl font-extrabold mb-2">Don't miss out.</h2>
      <p class="text-gray-400">Get product updates, tips, and offers straight to your inbox.</p>
    </div>
    <form class="flex w-full md:w-auto gap-3">
      <input type="email" placeholder="Enter your email" class="flex-1 md:w-72 px-4 py-3 rounded-xl bg-gray-800 border border-gray-700 text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
      <button type="submit" class="px-6 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-500 transition text-sm whitespace-nowrap">Subscribe</button>
    </form>
  </div>
</section>`,
    },
  ],

  process: [
    {
      name: "steps-horizontal",
      tags: ["how-it-works", "process", "steps"],
      html: `<section class="py-20 bg-gray-50">
  <div class="max-w-6xl mx-auto px-6">
    <h2 class="text-3xl font-extrabold text-center text-gray-900 mb-14">How It Works</h2>
    <div class="grid md:grid-cols-3 gap-8">
      <div class="text-center">
        <div class="w-16 h-16 bg-blue-600 text-white rounded-2xl flex items-center justify-center text-2xl font-extrabold mx-auto mb-5">1</div>
        <h3 class="text-lg font-bold text-gray-900 mb-2">Sign Up</h3>
        <p class="text-gray-500 text-sm">Create your free account in under 60 seconds. No credit card required.</p>
      </div>
      <div class="text-center">
        <div class="w-16 h-16 bg-blue-600 text-white rounded-2xl flex items-center justify-center text-2xl font-extrabold mx-auto mb-5">2</div>
        <h3 class="text-lg font-bold text-gray-900 mb-2">Configure</h3>
        <p class="text-gray-500 text-sm">Set up your workspace with our guided onboarding wizard in minutes.</p>
      </div>
      <div class="text-center">
        <div class="w-16 h-16 bg-blue-600 text-white rounded-2xl flex items-center justify-center text-2xl font-extrabold mx-auto mb-5">3</div>
        <h3 class="text-lg font-bold text-gray-900 mb-2">Go Live</h3>
        <p class="text-gray-500 text-sm">Launch and start seeing results from day one. Our team has your back.</p>
      </div>
    </div>
  </div>
</section>`,
    },
  ],

  faq: [
    {
      name: "faq-accordion",
      tags: ["faq", "questions", "accordion"],
      html: `<section class="py-20 bg-white">
  <div class="max-w-3xl mx-auto px-6">
    <h2 class="text-3xl font-extrabold text-center text-gray-900 mb-12">Frequently Asked Questions</h2>
    <div class="space-y-4">
      <details class="group border border-gray-200 rounded-xl overflow-hidden">
        <summary class="flex justify-between items-center p-5 cursor-pointer font-semibold text-gray-900 hover:bg-gray-50 list-none">
          How do I get started?
          <span class="text-gray-400 group-open:rotate-180 transition-transform duration-200">▾</span>
        </summary>
        <div class="px-5 pb-5 text-gray-500 text-sm">Getting started is easy. Sign up for a free account, follow the onboarding steps, and you'll be up and running in minutes.</div>
      </details>
      <details class="group border border-gray-200 rounded-xl overflow-hidden">
        <summary class="flex justify-between items-center p-5 cursor-pointer font-semibold text-gray-900 hover:bg-gray-50 list-none">
          Is there a free trial?
          <span class="text-gray-400 group-open:rotate-180 transition-transform duration-200">▾</span>
        </summary>
        <div class="px-5 pb-5 text-gray-500 text-sm">Yes! We offer a 14-day free trial with full access to all Pro features. No credit card required to start.</div>
      </details>
      <details class="group border border-gray-200 rounded-xl overflow-hidden">
        <summary class="flex justify-between items-center p-5 cursor-pointer font-semibold text-gray-900 hover:bg-gray-50 list-none">
          Can I cancel anytime?
          <span class="text-gray-400 group-open:rotate-180 transition-transform duration-200">▾</span>
        </summary>
        <div class="px-5 pb-5 text-gray-500 text-sm">Absolutely. Cancel anytime from your account settings with no questions asked and no hidden fees.</div>
      </details>
      <details class="group border border-gray-200 rounded-xl overflow-hidden">
        <summary class="flex justify-between items-center p-5 cursor-pointer font-semibold text-gray-900 hover:bg-gray-50 list-none">
          Do you offer customer support?
          <span class="text-gray-400 group-open:rotate-180 transition-transform duration-200">▾</span>
        </summary>
        <div class="px-5 pb-5 text-gray-500 text-sm">Yes — email support for all plans, priority support for Pro, and dedicated support for Enterprise customers.</div>
      </details>
    </div>
  </div>
</section>`,
    },
  ],

  contact: [
    {
      name: "contact-form",
      tags: ["contact", "form", "email"],
      html: `<section class="py-20 bg-gray-50">
  <div class="max-w-xl mx-auto px-6">
    <h2 class="text-3xl font-extrabold text-center text-gray-900 mb-3">Get in Touch</h2>
    <p class="text-center text-gray-500 mb-10">We'll get back to you within 24 hours.</p>
    <form class="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 space-y-5">
      <div class="grid sm:grid-cols-2 gap-5">
        <div>
          <label class="block text-sm font-semibold text-gray-700 mb-1">First Name</label>
          <input type="text" placeholder="Jane" class="w-full px-4 py-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
        </div>
        <div>
          <label class="block text-sm font-semibold text-gray-700 mb-1">Last Name</label>
          <input type="text" placeholder="Doe" class="w-full px-4 py-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
        </div>
      </div>
      <div>
        <label class="block text-sm font-semibold text-gray-700 mb-1">Email</label>
        <input type="email" placeholder="jane@example.com" class="w-full px-4 py-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
      </div>
      <div>
        <label class="block text-sm font-semibold text-gray-700 mb-1">Message</label>
        <textarea rows="4" placeholder="How can we help?" class="w-full px-4 py-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"></textarea>
      </div>
      <button type="submit" class="w-full py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition">Send Message</button>
    </form>
  </div>
</section>`,
    },
  ],

  footer: [
    {
      name: "multi-col-footer",
      tags: ["footer", "links", "navigation"],
      html: `<footer class="bg-slate-900 text-slate-400 pt-16 pb-8">
  <div class="max-w-6xl mx-auto px-6">
    <div class="grid grid-cols-2 md:grid-cols-4 gap-10 mb-14">
      <div class="col-span-2 md:col-span-1">
        <div class="text-white font-bold text-xl mb-3">Brand</div>
        <p class="text-sm text-slate-500 mb-4">Short tagline about your product or company mission.</p>
      </div>
      <div>
        <div class="text-white font-semibold text-sm mb-4 uppercase tracking-wide">Product</div>
        <ul class="space-y-2 text-sm">
          <li><a href="#" class="hover:text-white transition">Features</a></li>
          <li><a href="#" class="hover:text-white transition">Pricing</a></li>
          <li><a href="#" class="hover:text-white transition">Changelog</a></li>
        </ul>
      </div>
      <div>
        <div class="text-white font-semibold text-sm mb-4 uppercase tracking-wide">Company</div>
        <ul class="space-y-2 text-sm">
          <li><a href="#" class="hover:text-white transition">About</a></li>
          <li><a href="#" class="hover:text-white transition">Blog</a></li>
          <li><a href="#" class="hover:text-white transition">Careers</a></li>
        </ul>
      </div>
      <div>
        <div class="text-white font-semibold text-sm mb-4 uppercase tracking-wide">Legal</div>
        <ul class="space-y-2 text-sm">
          <li><a href="#" class="hover:text-white transition">Privacy</a></li>
          <li><a href="#" class="hover:text-white transition">Terms</a></li>
        </ul>
      </div>
    </div>
    <div class="border-t border-slate-800 pt-6 text-center text-xs text-slate-600">
      © 2025 Brand. All rights reserved.
    </div>
  </div>
</footer>`,
    },
  ],
};

// Which component categories to pull for each page type
const PAGE_TYPE_MAP = {
  landing:     ["nav", "hero", "features", "stats", "testimonials", "process", "cta", "faq", "contact", "footer"],
  promotional: ["nav", "hero", "stats", "testimonials", "pricing", "cta", "footer"],
  blog:        ["nav", "hero", "features", "cta", "footer"],
};

// Map section IDs from design briefs to component categories
const SECTION_ID_MAP = {
  hero:            ["hero"],
  features:        ["features"],
  "social-proof":  ["stats", "testimonials"],
  testimonials:    ["testimonials"],
  stats:           ["stats"],
  pricing:         ["pricing"],
  process:         ["process"],
  "how-it-works":  ["process"],
  faq:             ["faq"],
  contact:         ["contact"],
  footer:          ["footer"],
  nav:             ["nav"],
  navigation:      ["nav"],
  cta:             ["cta"],
};

/**
 * Returns components relevant to the given page type and section IDs.
 * @param {string} pageType
 * @param {string[]} sectionIds
 * @returns {{ category: string, name: string, html: string }[]}
 */
function getComponentsForContext(pageType = "landing", sectionIds = []) {
  const categories = new Set(PAGE_TYPE_MAP[pageType] || PAGE_TYPE_MAP.landing);
  for (const id of sectionIds) {
    for (const cat of SECTION_ID_MAP[id] || []) categories.add(cat);
  }
  const result = [];
  for (const cat of categories) {
    for (const comp of COMPONENTS[cat] || []) {
      result.push({ category: cat, name: comp.name, html: comp.html });
    }
  }
  return result;
}

module.exports = { COMPONENTS, getComponentsForContext };
