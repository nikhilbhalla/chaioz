import { useEffect } from "react";
import { Instagram } from "lucide-react";

// A curated list of Chaioz-related public IG post URLs (placeholders until owner shares real ones)
const IG_POSTS = [
  "https://www.instagram.com/p/DKNuSDMyDy1/",
  "https://www.instagram.com/p/DJlxXhpyFO9/",
  "https://www.instagram.com/p/DI_Ws5dyfNo/",
];

export default function InstagramFeed() {
  useEffect(() => {
    // Lazy-load Instagram embed script
    const existing = document.querySelector('script[src*="instagram.com/embed.js"]');
    if (!existing) {
      const s = document.createElement("script");
      s.async = true;
      s.src = "https://www.instagram.com/embed.js";
      document.body.appendChild(s);
    } else if (window.instgrm) {
      window.instgrm.Embeds.process();
    }
    // Re-process when posts change
    const t = setTimeout(() => window.instgrm?.Embeds.process(), 800);
    return () => clearTimeout(t);
  }, []);

  return (
    <div data-testid="instagram-feed">
      <div className="flex justify-between items-end mb-6">
        <div>
          <span className="text-xs uppercase tracking-[0.3em] text-chaioz-saffron">@chaioz_aus on the gram</span>
          <h2 className="font-serif text-4xl text-chaioz-teal mt-2">Tag us. Get featured.</h2>
        </div>
        <a
          href="https://instagram.com/chaioz"
          target="_blank"
          rel="noreferrer"
          className="text-sm text-chaioz-saffron hover:underline inline-flex items-center gap-1"
          data-testid="ig-follow-link"
        >
          <Instagram className="w-4 h-4" /> Follow
        </a>
      </div>
      <div className="grid md:grid-cols-3 gap-4">
        {IG_POSTS.map((url, i) => (
          <blockquote
            key={i}
            className="instagram-media bg-white rounded-2xl overflow-hidden border border-chaioz-line"
            data-instgrm-captioned
            data-instgrm-permalink={url}
            data-instgrm-version="14"
            data-testid={`ig-embed-${i}`}
            style={{ minWidth: 240, margin: 0 }}
          >
            <a href={url} target="_blank" rel="noreferrer" className="block text-center py-10 text-chaioz-teal/60 text-sm">
              Loading Instagram post...
            </a>
          </blockquote>
        ))}
      </div>
      <p className="text-xs text-chaioz-teal/50 text-center mt-4">
        Share yours with <span className="text-chaioz-saffron">#chaiozadl</span> to be featured here.
      </p>
    </div>
  );
}
