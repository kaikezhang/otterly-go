import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedTemplates() {
  console.log('🌱 Seeding template data...');

  // Get the first user
  const user = await prisma.user.findFirst();

  if (!user) {
    console.error('❌ No users found! Please create a user first by logging in.');
    return;
  }

  console.log(`✅ Found user: ${user.name} (${user.email})`);

  // Create sample templates
  const templates = [
    {
      userId: user.id,
      title: 'Epic Peru Adventure',
      destination: 'Peru',
      startDate: new Date('2025-06-01'),
      endDate: new Date('2025-06-10'),
      dataJson: {
        days: [
          {
            date: '2025-06-01',
            items: [
              { id: '1', type: 'activity', title: 'Arrive in Lima', time: '14:00', description: 'Check into hotel and explore Miraflores' },
              { id: '2', type: 'food', title: 'Dinner at Central', time: '19:00', description: 'Fine dining at world-renowned restaurant' }
            ]
          },
          {
            date: '2025-06-02',
            items: [
              { id: '3', type: 'activity', title: 'City Tour', time: '09:00', description: 'Historic center and Plaza de Armas' },
              { id: '4', type: 'food', title: 'Ceviche at La Mar', time: '13:00' }
            ]
          }
        ]
      },
      isTemplate: true,
      isPublic: true,
      templateCategory: 'adventure',
      estimatedBudget: 'moderate',
      season: ['summer', 'spring'],
      interests: ['culture', 'food', 'hiking'],
      duration: 10,
      status: 'completed'
    },
    {
      userId: user.id,
      title: 'Tokyo Food & Culture Tour',
      destination: 'Tokyo, Japan',
      startDate: new Date('2025-04-15'),
      endDate: new Date('2025-04-22'),
      dataJson: {
        days: [
          {
            date: '2025-04-15',
            items: [
              { id: '1', type: 'activity', title: 'Arrive in Tokyo', time: '10:00' },
              { id: '2', type: 'food', title: 'Ramen at Ichiran', time: '19:00' }
            ]
          },
          {
            date: '2025-04-16',
            items: [
              { id: '3', type: 'activity', title: 'Tsukiji Market', time: '06:00' },
              { id: '4', type: 'activity', title: 'Senso-ji Temple', time: '10:00' }
            ]
          }
        ]
      },
      isTemplate: true,
      isPublic: true,
      templateCategory: 'food_culture',
      estimatedBudget: 'moderate',
      season: ['spring', 'fall'],
      interests: ['food', 'culture', 'photography'],
      duration: 7,
      status: 'completed'
    },
    {
      userId: user.id,
      title: 'European Cities Backpacking',
      destination: 'Europe',
      startDate: new Date('2025-07-01'),
      endDate: new Date('2025-07-21'),
      dataJson: {
        days: [
          {
            date: '2025-07-01',
            items: [
              { id: '1', type: 'activity', title: 'Arrive in Paris', time: '12:00' },
              { id: '2', type: 'activity', title: 'Eiffel Tower', time: '17:00' }
            ]
          }
        ]
      },
      isTemplate: true,
      isPublic: true,
      templateCategory: 'backpacking',
      estimatedBudget: 'budget',
      season: ['summer'],
      interests: ['culture', 'architecture', 'nightlife'],
      duration: 21,
      status: 'draft'
    },
    {
      userId: user.id,
      title: 'Bali Wellness Retreat',
      destination: 'Bali, Indonesia',
      startDate: new Date('2025-09-10'),
      endDate: new Date('2025-09-17'),
      dataJson: {
        days: [
          {
            date: '2025-09-10',
            items: [
              { id: '1', type: 'activity', title: 'Arrive in Ubud', time: '14:00' },
              { id: '2', type: 'activity', title: 'Yoga at sunset', time: '18:00' }
            ]
          }
        ]
      },
      isTemplate: true,
      isPublic: true,
      templateCategory: 'relaxation',
      estimatedBudget: 'luxury',
      season: ['summer', 'fall'],
      interests: ['wellness', 'yoga', 'nature'],
      duration: 7,
      status: 'draft'
    },
  ];

  for (const template of templates) {
    const created = await prisma.trip.create({
      data: template as any,
    });
    console.log(`✅ Created template: ${created.title}`);
  }

  console.log(`\n🎉 Successfully seeded ${templates.length} templates!`);
  console.log('Visit http://localhost:5175 and go to Template Marketplace to see them.');
}

seedTemplates()
  .catch((e) => {
    console.error('❌ Error seeding templates:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
