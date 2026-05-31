import { PrismaClient, BadgeCategory } from '@prisma/client';

const prisma = new PrismaClient();

const badges = [
  {
    key: 'first_fifty',
    name: 'Half Century Hero',
    nameHi: 'अर्धशतक हीरो',
    description: 'Score your first 50 in a match',
    descHi: 'अपना पहला अर्धशतक बनाओ',
    iconUrl: '/badges/first_fifty.png',
    category: BadgeCategory.BATTING,
  },
  {
    key: 'century_scorer',
    name: 'Century Club',
    nameHi: 'शतक क्लब',
    description: 'Score a century in a match',
    descHi: 'एक मैच में शतक बनाओ',
    iconUrl: '/badges/century_scorer.png',
    category: BadgeCategory.BATTING,
  },
  {
    key: 'five_wicket_haul',
    name: 'Fifer King',
    nameHi: 'पांच विकेट किंग',
    description: 'Take 5 or more wickets in a match',
    descHi: 'एक मैच में 5 या अधिक विकेट लो',
    iconUrl: '/badges/five_wicket_haul.png',
    category: BadgeCategory.BOWLING,
  },
  {
    key: 'iron_man',
    name: 'Iron Man',
    nameHi: 'आयरन मैन',
    description: 'Play 50 matches on CricMate',
    descHi: 'CricMate पर 50 मैच खेलो',
    iconUrl: '/badges/iron_man.png',
    category: BadgeCategory.MILESTONE,
  },
  {
    key: 'reliable_100',
    name: 'Mr. Reliable',
    nameHi: 'भरोसेमंद खिलाड़ी',
    description: 'Play 100 matches with zero no-shows',
    descHi: '100 मैच खेलो बिना किसी अनुपस्थिति के',
    iconUrl: '/badges/reliable_100.png',
    category: BadgeCategory.RELIABILITY,
  },
  {
    key: 'team_player',
    name: 'Team Player',
    nameHi: 'टीम प्लेयर',
    description: 'Play 10+ matches with a trust score of 4.5+',
    descHi: '4.5+ ट्रस्ट स्कोर के साथ 10+ मैच खेलो',
    iconUrl: '/badges/team_player.png',
    category: BadgeCategory.SOCIAL,
  },
  {
    key: 'ground_explorer',
    name: 'Ground Explorer',
    nameHi: 'ग्राउंड एक्सप्लोरर',
    description: 'Play at 10 different grounds',
    descHi: '10 अलग-अलग मैदानों पर खेलो',
    iconUrl: '/badges/ground_explorer.png',
    category: BadgeCategory.GROUND,
  },
  {
    key: 'hat_trick',
    name: 'Hat-Trick Hero',
    nameHi: 'हैट-ट्रिक हीरो',
    description: 'Take a hat-trick in a match',
    descHi: 'एक मैच में हैट-ट्रिक लो',
    iconUrl: '/badges/hat_trick.png',
    category: BadgeCategory.BOWLING,
  },
  {
    key: 'first_match',
    name: 'Welcome to CricMate',
    nameHi: 'CricMate में स्वागत',
    description: 'Complete your first match',
    descHi: 'अपना पहला मैच पूरा करो',
    iconUrl: '/badges/first_match.png',
    category: BadgeCategory.MILESTONE,
  },
  {
    key: 'social_butterfly',
    name: 'Social Butterfly',
    nameHi: 'सोशल बटरफ्लाई',
    description: 'Play with 50 different players',
    descHi: '50 अलग-अलग खिलाड़ियों के साथ खेलो',
    iconUrl: '/badges/social_butterfly.png',
    category: BadgeCategory.SOCIAL,
  },
];

async function main() {
  console.log('🌱 Seeding badges...');

  for (const badge of badges) {
    await prisma.badge.upsert({
      where: { key: badge.key },
      update: badge,
      create: badge,
    });
    console.log(`   ✅ Badge: ${badge.name}`);
  }

  console.log(`\n🏏 Seeded ${badges.length} badges successfully!`);
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
