export type Subscription = {
  id: string;
  name: string;
  amount: number;
  cardId: string;
  cycle: "Monthly" | "Annual";
  category: string;
  icon: string;
  nextDate: string;
};

export const SUBSCRIPTIONS: Subscription[] = [
  { id: "s1",  name: "Netflix",         amount: 15.99, cardId: "card-1", cycle: "Monthly", category: "Entertainment", icon: "🎬", nextDate: "2026-04-01" },
  { id: "s2",  name: "Spotify",         amount: 9.99,  cardId: "card-2", cycle: "Monthly", category: "Music",         icon: "🎵", nextDate: "2026-04-05" },
  { id: "s3",  name: "Amazon Prime",    amount: 14.99, cardId: "card-1", cycle: "Monthly", category: "Shopping",      icon: "📦", nextDate: "2026-04-03" },
  { id: "s4",  name: "iCloud+",         amount: 2.99,  cardId: "card-3", cycle: "Monthly", category: "Storage",       icon: "☁️", nextDate: "2026-04-10" },
  { id: "s5",  name: "Disney+",         amount: 13.99, cardId: "card-2", cycle: "Monthly", category: "Entertainment", icon: "✨", nextDate: "2026-04-12" },
  { id: "s6",  name: "YouTube Premium", amount: 13.99, cardId: "card-1", cycle: "Monthly", category: "Video",         icon: "▶️", nextDate: "2026-04-08" },
  { id: "s7",  name: "Adobe CC",        amount: 54.99, cardId: "card-3", cycle: "Monthly", category: "Creative",      icon: "🎨", nextDate: "2026-04-15" },
  { id: "s8",  name: "Hulu",            amount: 17.99, cardId: "card-2", cycle: "Monthly", category: "Entertainment", icon: "📺", nextDate: "2026-04-07" },
  { id: "s9",  name: "Apple TV+",       amount: 9.99,  cardId: "card-3", cycle: "Monthly", category: "Entertainment", icon: "🍎", nextDate: "2026-04-18" },
  { id: "s10", name: "Xbox Game Pass",  amount: 14.99, cardId: "card-1", cycle: "Monthly", category: "Gaming",        icon: "🎮", nextDate: "2026-04-20" },
  { id: "s11", name: "New York Times",  amount: 4.00,  cardId: "card-2", cycle: "Monthly", category: "News",          icon: "📰", nextDate: "2026-04-22" },
  { id: "s12", name: "Duolingo Plus",   amount: 6.99,  cardId: "card-3", cycle: "Monthly", category: "Education",     icon: "🦉", nextDate: "2026-04-25" },
  { id: "s13", name: "GitHub Pro",      amount: 4.00,  cardId: "card-1", cycle: "Monthly", category: "Developer",     icon: "🐙", nextDate: "2026-04-02" },
  { id: "s14", name: "1Password",       amount: 2.99,  cardId: "card-2", cycle: "Monthly", category: "Security",      icon: "🔑", nextDate: "2026-04-14" },
  { id: "s15", name: "Dropbox Plus",    amount: 11.99, cardId: "card-3", cycle: "Monthly", category: "Storage",       icon: "💧", nextDate: "2026-04-06" },
];

export const CARD_COLORS: Record<string, string> = {
  "card-1": "#9B5CF5",
  "card-2": "#3E8EDD",
  "card-3": "#3EC48A",
};
