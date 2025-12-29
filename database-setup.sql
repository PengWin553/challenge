-- IP Geolocation Database Setup Script
-- Run this script in your MySQL client to set up the database

CREATE DATABASE IF NOT EXISTS ip_geo_app;
USE ip_geo_app;

CREATE TABLE users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  email VARCHAR(100) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE search_history (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT,
  ip_address VARCHAR(45),
  country VARCHAR(100),
  city VARCHAR(100),
  isp VARCHAR(255),
  searched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

SELECT 'Database setup completed successfully!' AS status;