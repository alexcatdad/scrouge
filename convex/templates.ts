import { v } from "convex/values";
import { query, internalMutation } from "./_generated/server";

// Category type for reuse
const categoryValidator = v.union(
  v.literal("streaming"),
  v.literal("music"),
  v.literal("gaming"),
  v.literal("productivity"),
  v.literal("news"),
  v.literal("fitness"),
  v.literal("cloud"),
  v.literal("other"),
);

export type Category =
  | "streaming"
  | "music"
  | "gaming"
  | "productivity"
  | "news"
  | "fitness"
  | "cloud"
  | "other";

// List all templates, optionally filtered by category
export const list = query({
  args: {
    category: v.optional(categoryValidator),
  },
  returns: v.array(
    v.object({
      _id: v.id("serviceTemplates"),
      _creationTime: v.number(),
      name: v.string(),
      category: categoryValidator,
      website: v.optional(v.string()),
      icon: v.optional(v.string()),
      defaultPrice: v.optional(v.number()),
      defaultCurrency: v.optional(v.string()),
      defaultBillingCycle: v.optional(v.string()),
    }),
  ),
  handler: async (ctx, args) => {
    if (args.category) {
      return await ctx.db
        .query("serviceTemplates")
        .withIndex("by_category", (q) => q.eq("category", args.category!))
        .collect();
    }
    return await ctx.db.query("serviceTemplates").collect();
  },
});

// Search templates by name
export const search = query({
  args: {
    query: v.string(),
  },
  returns: v.array(
    v.object({
      _id: v.id("serviceTemplates"),
      _creationTime: v.number(),
      name: v.string(),
      category: categoryValidator,
      website: v.optional(v.string()),
      icon: v.optional(v.string()),
      defaultPrice: v.optional(v.number()),
      defaultCurrency: v.optional(v.string()),
      defaultBillingCycle: v.optional(v.string()),
    }),
  ),
  handler: async (ctx, args) => {
    if (!args.query.trim()) {
      return await ctx.db.query("serviceTemplates").collect();
    }
    return await ctx.db
      .query("serviceTemplates")
      .withSearchIndex("search_name", (q) => q.search("name", args.query))
      .collect();
  },
});

// Get a single template by ID
export const get = query({
  args: {
    id: v.id("serviceTemplates"),
  },
  returns: v.union(
    v.object({
      _id: v.id("serviceTemplates"),
      _creationTime: v.number(),
      name: v.string(),
      category: categoryValidator,
      website: v.optional(v.string()),
      icon: v.optional(v.string()),
      defaultPrice: v.optional(v.number()),
      defaultCurrency: v.optional(v.string()),
      defaultBillingCycle: v.optional(v.string()),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// Seed data - 100+ popular services
const SEED_DATA: Array<{
  name: string;
  category: Category;
  website: string;
  defaultPrice?: number;
  defaultCurrency?: string;
  defaultBillingCycle?: string;
}> = [
  // Streaming (20)
  { name: "Netflix", category: "streaming", website: "netflix.com", defaultPrice: 15.49, defaultCurrency: "USD", defaultBillingCycle: "monthly" },
  { name: "Hulu", category: "streaming", website: "hulu.com", defaultPrice: 17.99, defaultCurrency: "USD", defaultBillingCycle: "monthly" },
  { name: "Disney+", category: "streaming", website: "disneyplus.com", defaultPrice: 13.99, defaultCurrency: "USD", defaultBillingCycle: "monthly" },
  { name: "HBO Max", category: "streaming", website: "max.com", defaultPrice: 15.99, defaultCurrency: "USD", defaultBillingCycle: "monthly" },
  { name: "Amazon Prime Video", category: "streaming", website: "primevideo.com", defaultPrice: 8.99, defaultCurrency: "USD", defaultBillingCycle: "monthly" },
  { name: "Peacock", category: "streaming", website: "peacocktv.com", defaultPrice: 5.99, defaultCurrency: "USD", defaultBillingCycle: "monthly" },
  { name: "Paramount+", category: "streaming", website: "paramountplus.com", defaultPrice: 11.99, defaultCurrency: "USD", defaultBillingCycle: "monthly" },
  { name: "Apple TV+", category: "streaming", website: "tv.apple.com", defaultPrice: 9.99, defaultCurrency: "USD", defaultBillingCycle: "monthly" },
  { name: "Crunchyroll", category: "streaming", website: "crunchyroll.com", defaultPrice: 7.99, defaultCurrency: "USD", defaultBillingCycle: "monthly" },
  { name: "Funimation", category: "streaming", website: "funimation.com", defaultPrice: 7.99, defaultCurrency: "USD", defaultBillingCycle: "monthly" },
  { name: "Discovery+", category: "streaming", website: "discoveryplus.com", defaultPrice: 4.99, defaultCurrency: "USD", defaultBillingCycle: "monthly" },
  { name: "ESPN+", category: "streaming", website: "espn.com", defaultPrice: 10.99, defaultCurrency: "USD", defaultBillingCycle: "monthly" },
  { name: "YouTube Premium", category: "streaming", website: "youtube.com", defaultPrice: 13.99, defaultCurrency: "USD", defaultBillingCycle: "monthly" },
  { name: "Twitch", category: "streaming", website: "twitch.tv", defaultPrice: 8.99, defaultCurrency: "USD", defaultBillingCycle: "monthly" },
  { name: "Shudder", category: "streaming", website: "shudder.com", defaultPrice: 5.99, defaultCurrency: "USD", defaultBillingCycle: "monthly" },
  { name: "Criterion Channel", category: "streaming", website: "criterionchannel.com", defaultPrice: 10.99, defaultCurrency: "USD", defaultBillingCycle: "monthly" },
  { name: "Mubi", category: "streaming", website: "mubi.com", defaultPrice: 12.99, defaultCurrency: "USD", defaultBillingCycle: "monthly" },
  { name: "BritBox", category: "streaming", website: "britbox.com", defaultPrice: 8.99, defaultCurrency: "USD", defaultBillingCycle: "monthly" },
  { name: "AMC+", category: "streaming", website: "amcplus.com", defaultPrice: 8.99, defaultCurrency: "USD", defaultBillingCycle: "monthly" },
  { name: "Starz", category: "streaming", website: "starz.com", defaultPrice: 9.99, defaultCurrency: "USD", defaultBillingCycle: "monthly" },

  // Music (12)
  { name: "Spotify", category: "music", website: "spotify.com", defaultPrice: 11.99, defaultCurrency: "USD", defaultBillingCycle: "monthly" },
  { name: "Apple Music", category: "music", website: "music.apple.com", defaultPrice: 10.99, defaultCurrency: "USD", defaultBillingCycle: "monthly" },
  { name: "YouTube Music", category: "music", website: "music.youtube.com", defaultPrice: 10.99, defaultCurrency: "USD", defaultBillingCycle: "monthly" },
  { name: "Tidal", category: "music", website: "tidal.com", defaultPrice: 10.99, defaultCurrency: "USD", defaultBillingCycle: "monthly" },
  { name: "Deezer", category: "music", website: "deezer.com", defaultPrice: 10.99, defaultCurrency: "USD", defaultBillingCycle: "monthly" },
  { name: "Amazon Music", category: "music", website: "music.amazon.com", defaultPrice: 9.99, defaultCurrency: "USD", defaultBillingCycle: "monthly" },
  { name: "Pandora", category: "music", website: "pandora.com", defaultPrice: 9.99, defaultCurrency: "USD", defaultBillingCycle: "monthly" },
  { name: "SoundCloud Go+", category: "music", website: "soundcloud.com", defaultPrice: 9.99, defaultCurrency: "USD", defaultBillingCycle: "monthly" },
  { name: "Qobuz", category: "music", website: "qobuz.com", defaultPrice: 12.99, defaultCurrency: "USD", defaultBillingCycle: "monthly" },
  { name: "Audiomack", category: "music", website: "audiomack.com", defaultPrice: 4.99, defaultCurrency: "USD", defaultBillingCycle: "monthly" },
  { name: "iHeartRadio", category: "music", website: "iheart.com", defaultPrice: 9.99, defaultCurrency: "USD", defaultBillingCycle: "monthly" },
  { name: "Audible", category: "music", website: "audible.com", defaultPrice: 14.95, defaultCurrency: "USD", defaultBillingCycle: "monthly" },

  // Gaming (15)
  { name: "Xbox Game Pass Ultimate", category: "gaming", website: "xbox.com", defaultPrice: 16.99, defaultCurrency: "USD", defaultBillingCycle: "monthly" },
  { name: "PlayStation Plus Essential", category: "gaming", website: "playstation.com", defaultPrice: 9.99, defaultCurrency: "USD", defaultBillingCycle: "monthly" },
  { name: "PlayStation Plus Extra", category: "gaming", website: "playstation.com", defaultPrice: 14.99, defaultCurrency: "USD", defaultBillingCycle: "monthly" },
  { name: "PlayStation Plus Premium", category: "gaming", website: "playstation.com", defaultPrice: 17.99, defaultCurrency: "USD", defaultBillingCycle: "monthly" },
  { name: "Nintendo Switch Online", category: "gaming", website: "nintendo.com", defaultPrice: 3.99, defaultCurrency: "USD", defaultBillingCycle: "monthly" },
  { name: "EA Play", category: "gaming", website: "ea.com", defaultPrice: 4.99, defaultCurrency: "USD", defaultBillingCycle: "monthly" },
  { name: "Ubisoft+", category: "gaming", website: "ubisoft.com", defaultPrice: 17.99, defaultCurrency: "USD", defaultBillingCycle: "monthly" },
  { name: "Humble Choice", category: "gaming", website: "humblebundle.com", defaultPrice: 11.99, defaultCurrency: "USD", defaultBillingCycle: "monthly" },
  { name: "GeForce Now", category: "gaming", website: "nvidia.com", defaultPrice: 9.99, defaultCurrency: "USD", defaultBillingCycle: "monthly" },
  { name: "Xbox Live Gold", category: "gaming", website: "xbox.com", defaultPrice: 9.99, defaultCurrency: "USD", defaultBillingCycle: "monthly" },
  { name: "Apple Arcade", category: "gaming", website: "apple.com", defaultPrice: 6.99, defaultCurrency: "USD", defaultBillingCycle: "monthly" },
  { name: "Google Play Pass", category: "gaming", website: "play.google.com", defaultPrice: 4.99, defaultCurrency: "USD", defaultBillingCycle: "monthly" },
  { name: "World of Warcraft", category: "gaming", website: "worldofwarcraft.com", defaultPrice: 14.99, defaultCurrency: "USD", defaultBillingCycle: "monthly" },
  { name: "Final Fantasy XIV", category: "gaming", website: "finalfantasyxiv.com", defaultPrice: 12.99, defaultCurrency: "USD", defaultBillingCycle: "monthly" },
  { name: "Elder Scrolls Online Plus", category: "gaming", website: "elderscrollsonline.com", defaultPrice: 14.99, defaultCurrency: "USD", defaultBillingCycle: "monthly" },

  // Productivity (20)
  { name: "Microsoft 365", category: "productivity", website: "microsoft.com", defaultPrice: 9.99, defaultCurrency: "USD", defaultBillingCycle: "monthly" },
  { name: "Google One", category: "productivity", website: "one.google.com", defaultPrice: 2.99, defaultCurrency: "USD", defaultBillingCycle: "monthly" },
  { name: "Notion", category: "productivity", website: "notion.so", defaultPrice: 10.00, defaultCurrency: "USD", defaultBillingCycle: "monthly" },
  { name: "Evernote", category: "productivity", website: "evernote.com", defaultPrice: 10.99, defaultCurrency: "USD", defaultBillingCycle: "monthly" },
  { name: "Todoist", category: "productivity", website: "todoist.com", defaultPrice: 4.00, defaultCurrency: "USD", defaultBillingCycle: "monthly" },
  { name: "1Password", category: "productivity", website: "1password.com", defaultPrice: 2.99, defaultCurrency: "USD", defaultBillingCycle: "monthly" },
  { name: "LastPass", category: "productivity", website: "lastpass.com", defaultPrice: 3.00, defaultCurrency: "USD", defaultBillingCycle: "monthly" },
  { name: "Bitwarden", category: "productivity", website: "bitwarden.com", defaultPrice: 0.83, defaultCurrency: "USD", defaultBillingCycle: "monthly" },
  { name: "Dashlane", category: "productivity", website: "dashlane.com", defaultPrice: 4.99, defaultCurrency: "USD", defaultBillingCycle: "monthly" },
  { name: "Dropbox", category: "productivity", website: "dropbox.com", defaultPrice: 11.99, defaultCurrency: "USD", defaultBillingCycle: "monthly" },
  { name: "Slack", category: "productivity", website: "slack.com", defaultPrice: 8.75, defaultCurrency: "USD", defaultBillingCycle: "monthly" },
  { name: "Zoom", category: "productivity", website: "zoom.us", defaultPrice: 15.99, defaultCurrency: "USD", defaultBillingCycle: "monthly" },
  { name: "Figma", category: "productivity", website: "figma.com", defaultPrice: 15.00, defaultCurrency: "USD", defaultBillingCycle: "monthly" },
  { name: "Canva Pro", category: "productivity", website: "canva.com", defaultPrice: 12.99, defaultCurrency: "USD", defaultBillingCycle: "monthly" },
  { name: "Adobe Creative Cloud", category: "productivity", website: "adobe.com", defaultPrice: 54.99, defaultCurrency: "USD", defaultBillingCycle: "monthly" },
  { name: "Grammarly", category: "productivity", website: "grammarly.com", defaultPrice: 12.00, defaultCurrency: "USD", defaultBillingCycle: "monthly" },
  { name: "Calendly", category: "productivity", website: "calendly.com", defaultPrice: 12.00, defaultCurrency: "USD", defaultBillingCycle: "monthly" },
  { name: "Asana", category: "productivity", website: "asana.com", defaultPrice: 10.99, defaultCurrency: "USD", defaultBillingCycle: "monthly" },
  { name: "Monday.com", category: "productivity", website: "monday.com", defaultPrice: 9.00, defaultCurrency: "USD", defaultBillingCycle: "monthly" },
  { name: "Trello", category: "productivity", website: "trello.com", defaultPrice: 5.00, defaultCurrency: "USD", defaultBillingCycle: "monthly" },

  // News (10)
  { name: "The New York Times", category: "news", website: "nytimes.com", defaultPrice: 17.00, defaultCurrency: "USD", defaultBillingCycle: "monthly" },
  { name: "The Washington Post", category: "news", website: "washingtonpost.com", defaultPrice: 10.00, defaultCurrency: "USD", defaultBillingCycle: "monthly" },
  { name: "The Wall Street Journal", category: "news", website: "wsj.com", defaultPrice: 38.99, defaultCurrency: "USD", defaultBillingCycle: "monthly" },
  { name: "The Economist", category: "news", website: "economist.com", defaultPrice: 22.00, defaultCurrency: "USD", defaultBillingCycle: "monthly" },
  { name: "The Athletic", category: "news", website: "theathletic.com", defaultPrice: 9.99, defaultCurrency: "USD", defaultBillingCycle: "monthly" },
  { name: "Bloomberg", category: "news", website: "bloomberg.com", defaultPrice: 34.99, defaultCurrency: "USD", defaultBillingCycle: "monthly" },
  { name: "Financial Times", category: "news", website: "ft.com", defaultPrice: 39.00, defaultCurrency: "USD", defaultBillingCycle: "monthly" },
  { name: "Wired", category: "news", website: "wired.com", defaultPrice: 2.50, defaultCurrency: "USD", defaultBillingCycle: "monthly" },
  { name: "The New Yorker", category: "news", website: "newyorker.com", defaultPrice: 12.99, defaultCurrency: "USD", defaultBillingCycle: "monthly" },
  { name: "Medium", category: "news", website: "medium.com", defaultPrice: 5.00, defaultCurrency: "USD", defaultBillingCycle: "monthly" },

  // Fitness (10)
  { name: "Peloton", category: "fitness", website: "onepeloton.com", defaultPrice: 44.00, defaultCurrency: "USD", defaultBillingCycle: "monthly" },
  { name: "Strava", category: "fitness", website: "strava.com", defaultPrice: 11.99, defaultCurrency: "USD", defaultBillingCycle: "monthly" },
  { name: "MyFitnessPal", category: "fitness", website: "myfitnesspal.com", defaultPrice: 19.99, defaultCurrency: "USD", defaultBillingCycle: "monthly" },
  { name: "Headspace", category: "fitness", website: "headspace.com", defaultPrice: 12.99, defaultCurrency: "USD", defaultBillingCycle: "monthly" },
  { name: "Calm", category: "fitness", website: "calm.com", defaultPrice: 14.99, defaultCurrency: "USD", defaultBillingCycle: "monthly" },
  { name: "Nike Training Club", category: "fitness", website: "nike.com", defaultPrice: 14.99, defaultCurrency: "USD", defaultBillingCycle: "monthly" },
  { name: "Fitbit Premium", category: "fitness", website: "fitbit.com", defaultPrice: 9.99, defaultCurrency: "USD", defaultBillingCycle: "monthly" },
  { name: "Apple Fitness+", category: "fitness", website: "apple.com", defaultPrice: 9.99, defaultCurrency: "USD", defaultBillingCycle: "monthly" },
  { name: "ClassPass", category: "fitness", website: "classpass.com", defaultPrice: 49.00, defaultCurrency: "USD", defaultBillingCycle: "monthly" },
  { name: "Noom", category: "fitness", website: "noom.com", defaultPrice: 59.00, defaultCurrency: "USD", defaultBillingCycle: "monthly" },

  // Cloud (15)
  { name: "iCloud+", category: "cloud", website: "apple.com", defaultPrice: 2.99, defaultCurrency: "USD", defaultBillingCycle: "monthly" },
  { name: "Google Drive", category: "cloud", website: "drive.google.com", defaultPrice: 2.99, defaultCurrency: "USD", defaultBillingCycle: "monthly" },
  { name: "OneDrive", category: "cloud", website: "onedrive.com", defaultPrice: 1.99, defaultCurrency: "USD", defaultBillingCycle: "monthly" },
  { name: "Backblaze", category: "cloud", website: "backblaze.com", defaultPrice: 9.00, defaultCurrency: "USD", defaultBillingCycle: "monthly" },
  { name: "pCloud", category: "cloud", website: "pcloud.com", defaultPrice: 4.99, defaultCurrency: "USD", defaultBillingCycle: "monthly" },
  { name: "Cloudflare", category: "cloud", website: "cloudflare.com", defaultPrice: 20.00, defaultCurrency: "USD", defaultBillingCycle: "monthly" },
  { name: "DigitalOcean", category: "cloud", website: "digitalocean.com", defaultPrice: 5.00, defaultCurrency: "USD", defaultBillingCycle: "monthly" },
  { name: "Linode", category: "cloud", website: "linode.com", defaultPrice: 5.00, defaultCurrency: "USD", defaultBillingCycle: "monthly" },
  { name: "Vultr", category: "cloud", website: "vultr.com", defaultPrice: 5.00, defaultCurrency: "USD", defaultBillingCycle: "monthly" },
  { name: "Hetzner", category: "cloud", website: "hetzner.com", defaultPrice: 4.15, defaultCurrency: "USD", defaultBillingCycle: "monthly" },
  { name: "Vercel", category: "cloud", website: "vercel.com", defaultPrice: 20.00, defaultCurrency: "USD", defaultBillingCycle: "monthly" },
  { name: "Netlify", category: "cloud", website: "netlify.com", defaultPrice: 19.00, defaultCurrency: "USD", defaultBillingCycle: "monthly" },
  { name: "GitHub Pro", category: "cloud", website: "github.com", defaultPrice: 4.00, defaultCurrency: "USD", defaultBillingCycle: "monthly" },
  { name: "GitLab", category: "cloud", website: "gitlab.com", defaultPrice: 29.00, defaultCurrency: "USD", defaultBillingCycle: "monthly" },
  { name: "Heroku", category: "cloud", website: "heroku.com", defaultPrice: 5.00, defaultCurrency: "USD", defaultBillingCycle: "monthly" },

  // Other (10)
  { name: "Amazon Prime", category: "other", website: "amazon.com", defaultPrice: 14.99, defaultCurrency: "USD", defaultBillingCycle: "monthly" },
  { name: "Costco", category: "other", website: "costco.com", defaultPrice: 6.67, defaultCurrency: "USD", defaultBillingCycle: "monthly" },
  { name: "Sam's Club", category: "other", website: "samsclub.com", defaultPrice: 4.17, defaultCurrency: "USD", defaultBillingCycle: "monthly" },
  { name: "AAA", category: "other", website: "aaa.com", defaultPrice: 5.00, defaultCurrency: "USD", defaultBillingCycle: "monthly" },
  { name: "NordVPN", category: "other", website: "nordvpn.com", defaultPrice: 12.99, defaultCurrency: "USD", defaultBillingCycle: "monthly" },
  { name: "ExpressVPN", category: "other", website: "expressvpn.com", defaultPrice: 12.95, defaultCurrency: "USD", defaultBillingCycle: "monthly" },
  { name: "Surfshark", category: "other", website: "surfshark.com", defaultPrice: 12.95, defaultCurrency: "USD", defaultBillingCycle: "monthly" },
  { name: "ChatGPT Plus", category: "other", website: "openai.com", defaultPrice: 20.00, defaultCurrency: "USD", defaultBillingCycle: "monthly" },
  { name: "Claude Pro", category: "other", website: "anthropic.com", defaultPrice: 20.00, defaultCurrency: "USD", defaultBillingCycle: "monthly" },
  { name: "Midjourney", category: "other", website: "midjourney.com", defaultPrice: 10.00, defaultCurrency: "USD", defaultBillingCycle: "monthly" },
];

// Seed templates (internal mutation - call via dashboard or script)
export const seed = internalMutation({
  args: {},
  returns: v.object({ inserted: v.number(), skipped: v.number() }),
  handler: async (ctx) => {
    let inserted = 0;
    let skipped = 0;

    for (const template of SEED_DATA) {
      // Check if template already exists by name
      const existing = await ctx.db
        .query("serviceTemplates")
        .withSearchIndex("search_name", (q) => q.search("name", template.name))
        .first();

      if (existing && existing.name === template.name) {
        skipped++;
        continue;
      }

      await ctx.db.insert("serviceTemplates", {
        name: template.name,
        category: template.category,
        website: template.website,
        icon: `https://logo.clearbit.com/${template.website}`,
        defaultPrice: template.defaultPrice,
        defaultCurrency: template.defaultCurrency,
        defaultBillingCycle: template.defaultBillingCycle,
      });
      inserted++;
    }

    return { inserted, skipped };
  },
});
