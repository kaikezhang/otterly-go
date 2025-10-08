import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

  // Load template data from JSON file
  const templateDataPath = path.join(__dirname, 'template-data.json');
  const templateData = JSON.parse(fs.readFileSync(templateDataPath, 'utf-8'));

  // Transform templates to include userId and ensure correct types
  const templates = templateData.map((template: any) => ({
    userId: user.id,
    title: template.title,
    destination: template.destination,
    startDate: new Date(template.startDate),
    endDate: new Date(template.endDate),
    dataJson: template.dataJson,
    isTemplate: true,
    isPublic: true,
    templateCategory: template.templateCategory,
    estimatedBudget: template.estimatedBudget,
    season: template.season,
    interests: template.interests,
    duration: template.duration,
    status: 'completed'
  }));

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
