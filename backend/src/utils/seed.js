/* eslint-disable no-console */
import mongoose from 'mongoose';
import config from '../config/index.js';
import { connectDB, disconnectDB } from '../config/db.js';
import { slugify } from './helpers.js';
import {
  ROLES,
  ORCHARD_STATUS,
  BOOKING_STATUS,
  PAYMENT_STATUS,
  RENT_TYPE,
  AREA_UNIT,
  FRUIT_TYPES,
  AMENITIES,
} from './constants.js';

import User from '../models/User.js';
import Orchard from '../models/Orchard.js';
import Booking from '../models/Booking.js';
import Review from '../models/Review.js';
import Setting from '../models/Setting.js';

const STATES = [
  ['Maharashtra', 'Nashik'],
  ['Himachal Pradesh', 'Shimla'],
  ['Karnataka', 'Belagavi'],
  ['Uttar Pradesh', 'Saharanpur'],
  ['Jammu & Kashmir', 'Anantnag'],
  ['Gujarat', 'Valsad'],
];

const rand = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const monthsAgo = (n) => {
  const d = new Date();
  d.setMonth(d.getMonth() - n);
  d.setDate(randInt(1, 27));
  return d;
};

const run = async () => {
  await connectDB();
  console.log('Clearing existing data...');
  await Promise.all([
    User.deleteMany({}),
    Orchard.deleteMany({}),
    Booking.deleteMany({}),
    Review.deleteMany({}),
    Setting.deleteMany({}),
  ]);

  await Setting.getSingleton();

  console.log('Creating users...');
  const sellers = await User.create(
    Array.from({ length: 6 }).map((_, i) => ({
      name: `Seller ${i + 1}`,
      email: `seller${i + 1}@orchardlease.com`,
      password: 'Password123',
      role: ROLES.SELLER,
      isEmailVerified: true,
      bio: 'Experienced orchard owner offering premium fruit gardens for lease.',
      createdAt: monthsAgo(randInt(2, 11)),
    }))
  );

  const renters = await User.create(
    Array.from({ length: 12 }).map((_, i) => ({
      name: `Renter ${i + 1}`,
      email: `renter${i + 1}@orchardlease.com`,
      password: 'Password123',
      role: ROLES.RENTER,
      isEmailVerified: true,
      createdAt: monthsAgo(randInt(0, 11)),
    }))
  );

  console.log('Creating orchards...');
  const orchards = [];
  for (let i = 0; i < 30; i += 1) {
    const seller = rand(sellers);
    const [state, district] = rand(STATES);
    const name = `${rand(['Green', 'Sunrise', 'Royal', 'Valley', 'Golden', 'Hillside'])} ${rand(
      ['Orchard', 'Gardens', 'Grove', 'Estate', 'Farm']
    )} ${i + 1}`;
    const fruits = Array.from({ length: randInt(1, 3) }).map(() => rand(FRUIT_TYPES));
    const trees = randInt(50, 1200);
    const statuses = [
      ORCHARD_STATUS.PUBLISHED,
      ORCHARD_STATUS.PUBLISHED,
      ORCHARD_STATUS.PUBLISHED,
      ORCHARD_STATUS.PENDING,
      ORCHARD_STATUS.DRAFT,
    ];
    const status = rand(statuses);

    const SEEDED_HARVESTS = {
      mango: { startMonth: 4, peakStartMonth: 5, peakEndMonth: 6, endMonth: 7 },
      litchi: { startMonth: 5, peakStartMonth: 5, peakEndMonth: 6, endMonth: 6 },
      apple: { startMonth: 8, peakStartMonth: 8, peakEndMonth: 9, endMonth: 10 },
      orange: { startMonth: 11, peakStartMonth: 12, peakEndMonth: 1, endMonth: 2 },
      grapes: { startMonth: 1, peakStartMonth: 2, peakEndMonth: 3, endMonth: 4 },
      pomegranate: { startMonth: 9, peakStartMonth: 10, peakEndMonth: 12, endMonth: 2 },
      banana: { startMonth: 1, peakStartMonth: 4, peakEndMonth: 9, endMonth: 12 },
    };

    const uniqueFruits = [...new Set(fruits)];
    const harvestSeasons = uniqueFruits.map((f) => {
      const configVal = SEEDED_HARVESTS[f.toLowerCase()] || { startMonth: 6, peakStartMonth: 7, peakEndMonth: 8, endMonth: 9 };
      return {
        fruitName: f,
        ...configVal,
      };
    });

    // eslint-disable-next-line no-await-in-loop
    const orchard = await Orchard.create({
      sellerId: seller._id,
      gardenName: name,
      slug: slugify(name),
      description: `A beautiful ${fruits.join(', ')} orchard in ${district}, ${state} with ${trees} healthy trees.`,
      district,
      state,
      country: 'India',
      latitude: 18 + Math.random() * 15,
      longitude: 72 + Math.random() * 12,
      address: `${randInt(1, 200)}, ${district} rural area`,
      fruitTypes: uniqueFruits,
      harvestSeasons,
      totalTrees: trees,
      averageFruitPerTree: randInt(20, 200),
      expectedYield: trees * randInt(20, 100),
      estimatedHarvestDate: monthsAgo(-randInt(1, 5)),
      totalArea: randInt(2, 40),
      areaUnit: AREA_UNIT.ACRE,
      rentType: rand(Object.values(RENT_TYPE)),
      price: randInt(20000, 500000),
      images: [{ url: `https://placehold.co/800x600?text=${encodeURIComponent(name)}`, alt: name }],
      thumbnail: `https://placehold.co/800x600?text=${encodeURIComponent(name)}`,
      amenities: Array.from({ length: randInt(2, 5) }).map(() => rand(AMENITIES)),
      available: true,
      isFeatured: i < 6 && status === ORCHARD_STATUS.PUBLISHED,
      status,
      publishedAt: status === ORCHARD_STATUS.PUBLISHED ? monthsAgo(randInt(0, 6)) : undefined,
      viewCount: randInt(0, 2000),
      favouriteCount: randInt(0, 200),
      createdAt: monthsAgo(randInt(0, 8)),
    });
    orchards.push(orchard);
  }

  const publishedOrchards = orchards.filter((o) => o.status === ORCHARD_STATUS.PUBLISHED);

  console.log('Creating bookings...');
  for (let i = 0; i < 60; i += 1) {
    const orchard = rand(publishedOrchards);
    const renter = rand(renters);
    const start = monthsAgo(randInt(0, 6));
    const end = new Date(start);
    end.setDate(end.getDate() + randInt(15, 120));
    const status = rand([
      BOOKING_STATUS.APPROVED,
      BOOKING_STATUS.COMPLETED,
      BOOKING_STATUS.REQUESTED,
      BOOKING_STATUS.REJECTED,
      BOOKING_STATUS.CANCELLED,
    ]);
    const paid = [BOOKING_STATUS.APPROVED, BOOKING_STATUS.COMPLETED].includes(status);

    // eslint-disable-next-line no-await-in-loop
    await Booking.create({
      orchardId: orchard._id,
      renterId: renter._id,
      sellerId: orchard.sellerId,
      startDate: start,
      endDate: end,
      bookingStatus: status,
      paymentStatus: paid ? PAYMENT_STATUS.PAID : PAYMENT_STATUS.UNPAID,
      totalAmount: orchard.price,
      createdAt: start,
      timeline: [{ status: BOOKING_STATUS.REQUESTED, note: 'Seeded booking', at: start }],
    });
  }

  console.log('Creating reviews...');
  for (let i = 0; i < 40; i += 1) {
    const orchard = rand(publishedOrchards);
    const renter = rand(renters);
    try {
      // eslint-disable-next-line no-await-in-loop
      await Review.create({
        orchardId: orchard._id,
        renterId: renter._id,
        rating: randInt(3, 5),
        comment: rand([
          'Great orchard, healthy trees and good yield.',
          'Owner was very helpful. Recommended.',
          'Decent location, fair pricing.',
          'Excellent harvest this season!',
        ]),
      });
    } catch {
      /* duplicate (renter,orchard) — skip */
    }
  }

  console.log('\n✅ Seed complete');
  console.log('--------------------------------------------------');
  console.log(`Admin login:   ${config.admin.email} / (from .env)`);
  console.log('Seller login:  seller1@orchardlease.com / Password123');
  console.log('Renter login:  renter1@orchardlease.com / Password123');
  console.log('--------------------------------------------------');

  process.exit(0);
};

run().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
