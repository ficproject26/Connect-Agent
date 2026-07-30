import Agent from '../models/Agent';

export async function seedAgents() {
  try {
    const count = await Agent.countDocuments();
    if (count > 0) {
      console.log('Database already has data. Skipping agent seeding.');
      return;
    }

    console.log('Seeding sandbox agents...');

    const defaultAgents = [
      {
        name: 'Rajesh Kumar (State Agent)',
        email: 'state@forge.in',
        password: 'password123',
        phone: '9876543210',
        role: 'state',
        territory: { state: 'Tamil Nadu' },
        kycStatus: 'approved',
        registrationFeePaid: true,
        performanceScore: 85
      },
      {
        name: 'Muthu Swamy (District Agent)',
        email: 'district@forge.in',
        password: 'password123',
        phone: '9876543212',
        role: 'district',
        territory: { state: 'Tamil Nadu', district: 'Krishnagiri District' },
        kycStatus: 'approved',
        registrationFeePaid: true,
        performanceScore: 92
      },
      {
        name: 'Suresh Patil (Division Agent)',
        email: 'division@forge.in',
        password: 'password123',
        phone: '9876543211',
        role: 'division',
        territory: { state: 'Tamil Nadu', district: 'Krishnagiri District', division: 'Hosur Division' },
        kycStatus: 'approved',
        registrationFeePaid: true,
        performanceScore: 78
      },
      {
        name: 'Vijay Naidu (Pincode Agent)',
        email: 'pincode@forge.in',
        password: 'password123',
        phone: '9876543213',
        role: 'pincode',
        territory: { state: 'Tamil Nadu', district: 'Krishnagiri District', division: 'Hosur Division', pincode: '635109' },
        kycStatus: 'approved',
        registrationFeePaid: true,
        performanceScore: 65
      }
    ];

    for (const agentData of defaultAgents) {
      const agent = new Agent(agentData);
      await agent.save();
    }

    console.log('Successfully seeded 4 sandbox agents!');
  } catch (error) {
    console.error('Error seeding database:', error);
  }
}
