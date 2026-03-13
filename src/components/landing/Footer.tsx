const LINK_HREFS: Record<string, string> = {
  "Explore Stories": "/browse",
  "Start Writing": "/create",
  Collaborate: "/browse",
  Pricing: "#",
  "Writer Circles": "#",
  "Weekly Challenges": "#",
  Blog: "#",
  Events: "#",
  About: "#",
  Careers: "#",
  Contact: "#",
  Legal: "#",
};

export default function Footer() {
  const columns = [
    {
      heading: "Platform",
      links: ["Explore Stories", "Start Writing", "Collaborate", "Pricing"],
    },
    {
      heading: "Community",
      links: ["Writer Circles", "Weekly Challenges", "Blog", "Events"],
    },
    {
      heading: "Company",
      links: ["About", "Careers", "Contact", "Legal"],
    },
  ];

  return (
    <footer className="relative py-16 px-6 border-t border-espresso/30">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-10">
          {/* Logo & tagline */}
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2.5">
              <svg
                className="w-6 h-6 text-amber"
                viewBox="0 0 32 32"
                fill="none"
              >
                <path
                  d="M26 3C22 7 18 11 14 16C10 21 8 25 7 28L5 29L4 27C5 24 8 18 12 13C16 8 21 5 26 3Z"
                  fill="currentColor"
                  opacity="0.85"
                />
                <path
                  d="M7 28L5 29L4 27L7 28Z"
                  fill="currentColor"
                />
                <circle cx="4.5" cy="28" r="1" fill="currentColor" opacity="0.6" />
              </svg>
              <span className="font-display text-lg font-bold text-cream">
                Quiloria
              </span>
            </div>
            <p className="mt-4 text-sm text-linen/30 leading-relaxed max-w-[200px]">
              Made for storytellers.
              <br />
              Built by creatives.
            </p>
          </div>

          {/* Link columns */}
          {columns.map((col) => (
            <div key={col.heading}>
              <h4 className="text-sm font-semibold text-cream/70 mb-4 tracking-wide">
                {col.heading}
              </h4>
              <ul className="space-y-3">
                {col.links.map((link) => (
                  <li key={link}>
                    <a
                      href={LINK_HREFS[link] || "#"}
                      className="text-sm text-linen/30 hover:text-amber transition-colors duration-300"
                    >
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="mt-16 pt-6 border-t border-espresso/20 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-linen/20">
            &copy; 2026 Quiloria. All rights reserved.
          </p>
          <div className="flex gap-6">
            {["Twitter", "Discord", "GitHub"].map((social) => (
              <a
                key={social}
                href="#"
                className="text-xs text-linen/20 hover:text-amber transition-colors duration-300"
              >
                {social}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
