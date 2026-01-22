const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createTestUser() {
  try {
    // Check if test user exists
    let user = await prisma.user.findUnique({
      where: { id: 'test-user-001' },
    });

    if (!user) {
      // Create test user
      user = await prisma.user.create({
        data: {
          id: 'test-user-001',
          clerkId: 'clerk_test_user_001',
          email: 'test@nobada.com',
          username: 'testuser',
          profileImage: 'https://avatar.vercel.sh/test',
          hearts: 100,
          diamonds: 10,
        },
      });
      console.log('Test user created:', user);
    } else {
      console.log('Test user already exists:', user);
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestUser();