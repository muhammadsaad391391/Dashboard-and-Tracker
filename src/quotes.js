// Curated motivational quotes for high-performers, builders, and thinkers.

export const quotes = [
  { text: "You do not rise to the level of your goals. You fall to the level of your systems.", author: "James Clear" },
  { text: "Excellence, then, is not an act, but a habit.", author: "Aristotle" },
  { text: "Amor Fati — Seek not that the things which happen should happen as you wish, but wish the things which happen to be as they are.", author: "Epictetus" },
  { text: "The secret of getting ahead is getting started.", author: "Mark Twain" },
  { text: "Focus is a matter of deciding what things you're not going to do.", author: "John Carmack" },
  { text: "A fit body, a calm mind, a house full of love. These things cannot be bought — they must be earned.", author: "Naval Ravikant" },
  { text: "Your time is limited, so don't waste it living someone else's life.", author: "Steve Jobs" },
  { text: "Easy choices, hard life. Hard choices, easy life.", author: "Jerzy Gregorek" },
  { text: "How long are you going to wait before you demand the best for yourself?", author: "Epictetus" },
  { text: "If you want to respect yourself, you must respect one rule: Never lie to yourself.", author: "Paulo Coelho" },
  { text: "Waste no more time arguing about what a good man should be. Be one.", author: "Marcus Aurelius" },
  { text: "It is not that we have a short time to live, but that we waste a lot of it.", author: "Seneca" },
  { text: "The man who moves a mountain begins by carrying away small stones.", author: "Confucius" },
  { text: "Concentrate all your thoughts upon the work at hand. The sun's rays do not burn until brought to a focus.", author: "Alexander Graham Bell" },
  { text: "Great things are done by a series of small things brought together.", author: "Vincent Van Gogh" },
  { text: "He who has a why to live can bear almost any how.", author: "Friedrich Nietzsche" },
  { text: "The only limit to our realization of tomorrow will be our doubts of today.", author: "Franklin D. Roosevelt" },
  { text: "No man is free who is not master of himself.", author: "Epictetus" },
  { text: "Do not seek to follow in the footsteps of the wise. Seek what they sought.", author: "Basho" }
];

export function getRandomQuote() {
  const idx = Math.floor(Math.random() * quotes.length);
  return quotes[idx];
}
