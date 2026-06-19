import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const adminPassword = await bcrypt.hash('admin123', 12);
  await prisma.user.upsert({
    where: { email: 'admin@agrilink.com' },
    update: {},
    create: {
      email: 'admin@agrilink.com',
      password: adminPassword,
      name: 'Admin',
      role: 'ADMIN',
      isVerified: true,
      trustScore: 100,
    },
  });

  const farmerPassword = await bcrypt.hash('farmer123', 12);
  const farmer = await prisma.user.upsert({
    where: { email: 'farmer@agrilink.com' },
    update: {},
    create: {
      email: 'farmer@agrilink.com',
      password: farmerPassword,
      name: 'Rajesh Kumar',
      phone: '+91-9876543210',
      role: 'FARMER',
      state: 'Punjab',
      district: 'Ludhiana',
      bio: 'Third generation farmer specializing in organic wheat and rice.',
      isVerified: true,
      trustScore: 85,
      isOrganic: true,
    },
  });

  const buyerPassword = await bcrypt.hash('buyer123', 12);
  await prisma.user.upsert({
    where: { email: 'buyer@agrilink.com' },
    update: {},
    create: {
      email: 'buyer@agrilink.com',
      password: buyerPassword,
      name: 'Priya Sharma',
      phone: '+91-9876543211',
      role: 'RETAIL_BUYER',
      state: 'Delhi',
      district: 'New Delhi',
      trustScore: 70,
    },
  });

  const listings = [
    { cropName: 'Organic Wheat', variety: 'Sharbati', quantity: 5000, unit: 'kg', price: 25, state: 'Punjab', district: 'Ludhiana', organicCertified: true, description: 'Premium quality organic wheat, freshly harvested.' },
    { cropName: 'Basmati Rice', variety: '1121', quantity: 2000, unit: 'kg', price: 85, state: 'Punjab', district: 'Amritsar', organicCertified: true, description: 'Long grain basmati rice, export quality.' },
    { cropName: 'Tomatoes', variety: 'Hybrid', quantity: 1000, unit: 'kg', price: 18, state: 'Karnataka', district: 'Kolar', organicCertified: false, description: 'Fresh farm tomatoes, daily harvest.' },
    { cropName: 'Onions', variety: 'Red', quantity: 3000, unit: 'kg', price: 22, state: 'Maharashtra', district: 'Nashik', organicCertified: false, description: 'Premium red onions from Nashik.' },
    { cropName: 'Mangoes', variety: 'Alphonso', quantity: 500, unit: 'kg', price: 120, state: 'Maharashtra', district: 'Ratnagiri', organicCertified: true, description: 'Sweet Alphonso mangoes, organic certified.' },
  ];

  for (const listing of listings) {
    await prisma.cropListing.create({
      data: { ...listing, farmerId: farmer.id },
    });
  }

  console.log('Seed data created successfully');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
