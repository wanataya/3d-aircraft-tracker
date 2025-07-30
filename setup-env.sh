#!/bin/bash

# Aircraft Tracker 3D - Environment Setup Script
echo "🛰️ Aircraft Tracker 3D - Environment Setup"
echo "=========================================="

# Check if .env exists
if [ -f .env ]; then
    echo "✅ .env file already exists"
    echo "📝 Current configuration:"
    cat .env | grep -E "^[A-Z_]+" | sed 's/=.*/=***/' 
else
    echo "📁 Creating .env file from template..."
    cp .env.example .env
    echo "✅ .env file created from .env.example"
    echo ""
    echo "⚠️  IMPORTANT: Edit .env file to configure your IoT sensor:"
    echo "   - TCP_HOST: Your IoT sensor IP address"
    echo "   - TCP_PORT: Your IoT sensor port (usually 30003)"
    echo ""
    echo "📝 Current .env file contains demo values:"
    cat .env
fi

echo ""
echo "🔧 Next steps:"
echo "1. Edit .env file with your actual IoT sensor details"
echo "2. Run 'npm install' to install dependencies"  
echo "3. Run 'npm run dev' to start the application"
echo "4. For real IoT connection, see TCP-CONNECTION-GUIDE.md"
echo ""
echo "🚀 Ready to track aircraft!"
