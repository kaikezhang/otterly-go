# Template Seeding Scripts

This directory contains scripts to seed the database with high-quality trip templates for the Template Marketplace.

## Files

- **`seed-templates.ts`** - Main seeding script that creates template trips in the database
- **`template-data.json`** - Comprehensive trip itinerary data for all 4 templates

## Templates Included

### 1. Epic Peru Adventure (10 days)
- **Category**: Adventure
- **Budget**: Moderate
- **Highlights**: Lima, Cusco, Sacred Valley, Machu Picchu, Lake Titicaca
- **Activities**: 45 detailed items covering flights, accommodations, tours, food, and transportation
- **Season**: Spring, Summer, Fall
- **Interests**: Adventure, culture, food, hiking, history

### 2. Tokyo Food & Culture Tour (8 days)
- **Category**: Food Tour
- **Budget**: Moderate
- **Highlights**: Tokyo neighborhoods, Nikko day trip, Kamakura day trip, food experiences
- **Activities**: 45 detailed items including temples, markets, restaurants, and cultural sites
- **Season**: Spring (cherry blossoms)
- **Interests**: Food, culture, shopping, temples, photography

### 3. European Cities Backpacking (21 days)
- **Category**: Backpacking
- **Budget**: Budget
- **Highlights**: Paris, Amsterdam, Berlin, Prague, Vienna, Budapest, Venice, Florence, Rome
- **Activities**: 103 detailed items with budget-friendly hostels, free tours, and cheap eats
- **Season**: Summer
- **Interests**: Backpacking, culture, budget travel, history, nightlife, art

### 4. Bali Wellness Retreat (8 days)
- **Category**: Relaxation/Wellness
- **Budget**: Luxury
- **Highlights**: Ubud (yoga, temples, rice terraces), Canggu (beach, surfing, wellness)
- **Activities**: 45 detailed items covering yoga, spa treatments, healthy food, and relaxation
- **Season**: Spring, Summer, Fall
- **Interests**: Wellness, yoga, spa, healthy-food, relaxation, beach

## Usage

### Seeding Templates

1. **Ensure you have a user in the database** (login via the web app first)

2. **Run the seed script:**
   ```bash
   npx tsx scripts/seed-templates.ts
   ```

3. **Verify in the app:**
   - Visit http://localhost:5173
   - Navigate to Template Marketplace
   - You should see all 4 templates

### Re-seeding

The script creates new templates each time it runs. If you want to update existing templates instead:

1. Delete existing templates from the database:
   ```bash
   npx tsx -e "
   import { PrismaClient } from '@prisma/client';
   const prisma = new PrismaClient();
   prisma.trip.deleteMany({ where: { isTemplate: true } })
     .then(() => console.log('✅ Deleted all templates'))
     .finally(() => prisma.\$disconnect());
   "
   ```

2. Re-run the seed script

### Updating Template Data

To modify the template itineraries:

1. **Edit `template-data.json`** directly, OR
2. **Update templates in the database** using Prisma Studio:
   ```bash
   npx prisma studio
   ```
   Then export them:
   ```bash
   npx tsx -e "
   import { PrismaClient } from '@prisma/client';
   const prisma = new PrismaClient();
   const fs = require('fs');

   prisma.trip.findMany({
     where: { isTemplate: true },
     select: {
       title: true,
       destination: true,
       startDate: true,
       endDate: true,
       dataJson: true,
       templateCategory: true,
       estimatedBudget: true,
       season: true,
       interests: true,
       duration: true
     }
   }).then(templates => {
     fs.writeFileSync('scripts/template-data.json', JSON.stringify(templates, null, 2));
     console.log('✅ Exported template data');
   }).finally(() => prisma.\$disconnect());
   "
   ```

## Deployment

For production deployment:

1. **Include `scripts/` directory** in your deployment
2. **Run seed script** after database migration:
   ```bash
   npm run migrate:deploy  # or your migration command
   npx tsx scripts/seed-templates.ts
   ```

## Template Data Structure

Each template includes:

```typescript
{
  title: string;
  destination: string;
  startDate: Date;
  endDate: Date;
  dataJson: {
    days: Array<{
      date: string;  // YYYY-MM-DD format
      items: Array<{
        id: string;
        time: string;  // HH:MM format
        type: 'flight' | 'accommodation' | 'activity' | 'food' | 'transportation';
        title: string;
        description?: string;
      }>
    }>
  };
  templateCategory: string;
  estimatedBudget: 'budget' | 'moderate' | 'luxury';
  season: string[];
  interests: string[];
  duration: number;  // days
}
```

## Quality Standards

All templates follow these standards:
- ✅ **Complete itineraries** - Every day has 3-6 activities
- ✅ **Realistic timing** - Proper time allocations for activities
- ✅ **Diverse activities** - Mix of flights, accommodations, activities, food, transportation
- ✅ **Detailed descriptions** - Each item has helpful context
- ✅ **Budget-appropriate** - Recommendations match the budget tier
- ✅ **Seasonally relevant** - Activities suit the recommended seasons
- ✅ **Accurate metadata** - Correct duration, interests, and categories

## Maintenance

These templates should be reviewed and updated:
- **Quarterly** - Verify restaurant/hotel recommendations are still valid
- **Annually** - Update dates to future years
- **As needed** - Incorporate user feedback from reviews
