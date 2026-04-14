require('dotenv').config();

const { getAllocations, getUser } = require('./function/prisma.js');
const { PrismaClient } = require('./generated/prisma/client.ts');
const { PrismaMariaDb } = require('@prisma/adapter-mariadb');

const requiredEnv = [
    'DATABASE_HOST',
    'DATABASE_PORT',
    'DATABASE_USER',
    'DATABASE_PASSWORD',
    'DATABASE_NAME'
];

const missingEnv = requiredEnv.filter(key => !process.env[key]);
if (missingEnv.length > 0) {
    console.error('[DB TEST] Missing environment variables:', missingEnv.join(', '));
    process.exit(1);
}

const adapter = new PrismaMariaDb({
    host: process.env.DATABASE_HOST,
    port: Number(process.env.DATABASE_PORT),
    user: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE_NAME
});

const prisma = new PrismaClient({ adapter });

async function run() {
    try {
        await prisma.$connect();

        const ports = [3000, 25566, 25567];

        for (const port of ports) {
            const alloc = await getAllocations(4, port)
            console.log(await alloc)
        }

        console.log(locationCount)

    } catch (error) {
        console.error('[DB TEST] Connection failed:', error.message);
        process.exitCode = 1;


    } finally {
        await prisma.$disconnect();
    }
}

run();