import bcrypt from 'bcryptjs';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

async function seed() {
    const pool = mysql.createPool({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    });

    const password = await bcrypt.hash('password123', 10);

    try {
        await pool.execute(
            'INSERT INTO users (email, password) VALUES (?, ?)',
            ['test@example.com', password]
        );
        console.log('✅ User created: test@example.com / password123');
    } catch (error) {
        console.log('User already exists or error:', error.message);
    }

    await pool.end();
}

seed();