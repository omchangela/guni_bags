#!/bin/bash
# Gunny Bags Manager - Database Setup Script
# Run with: bash setup-db.sh

echo "🗄️  Gunny Bags Manager - Database Setup"
echo "========================================"

# Try to start MySQL
echo "Starting MySQL service..."
sudo systemctl start mysql 2>/dev/null || sudo service mysql start 2>/dev/null || echo "⚠️  Could not auto-start MySQL. Please start it manually."

sleep 2

# Check if MySQL is running
if ! mysqladmin -u root status 2>/dev/null; then
  echo ""
  echo "❌ MySQL is not accessible. Please:"
  echo "   1. Start MySQL:  sudo systemctl start mysql"
  echo "   2. Then run this script again"
  exit 1
fi

echo "✅ MySQL is running"

# Run schema
echo "Creating database and tables..."
mysql -u root < "$(dirname "$0")/backend/src/config/schema.sql"

if [ $? -eq 0 ]; then
  echo "✅ Database setup complete!"
  echo ""
  echo "📋 Default credentials:"
  echo "   Mobile: 9876543210"
  echo "   OTP:    123456 (dev mode)"
else
  echo "❌ Database setup failed. Check MySQL credentials in .env"
fi
