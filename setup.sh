#!/bin/bash

# Meaningful AI - Quick Setup Script
# This script helps you get started with your behavioral insight engine

echo "🧠 Meaningful AI - Quick Setup"
echo "=============================="
echo ""

# Check if .env.local exists
if [ ! -f ".env.local" ]; then
    echo "📝 Creating .env.local from template..."
    cp env.template .env.local
    echo "✅ Created .env.local"
else
    echo "✅ .env.local already exists"
fi

echo ""
echo "🔧 Setup Status:"
echo "=================="

# Check OpenAI API Key
if grep -q "OPENAI_API_KEY=sk-" .env.local; then
    echo "✅ OpenAI API Key: Configured"
    AI_READY=true
else
    echo "⚠️  OpenAI API Key: Not set (required for cloud AI features)"
    AI_READY=false
fi

# Check Anthropic API Key (optional fallback)
if grep -q "ANTHROPIC_API_KEY=sk-ant-" .env.local; then
    echo "✅ Anthropic API Key: Configured (fallback service)"
else
    echo "💡 Anthropic API Key: Not set (fallback service not available)"
fi

# Check Supabase (optional)
if grep -q "NEXT_PUBLIC_SUPABASE_URL=https://" .env.local; then
    echo "✅ Supabase: Configured (cloud storage)"
else
    echo "💾 Supabase: Not configured (using local storage)"
fi

# Check Ollama (offline AI)
if command -v ollama &> /dev/null; then
    if ollama list | grep -q "llama3.1:8b\|llama3:latest\|mistral:7b"; then
        echo "✅ Ollama: Configured with AI models (offline conversations)"
        OFFLINE_AI=true
    else
        echo "💡 Ollama: Installed but no models found (run 'npm run setup:ollama')"
        OFFLINE_AI=false
    fi
else
    echo "💡 Ollama: Not installed (run 'npm run setup:ollama' for offline AI)"
    OFFLINE_AI=false
fi

# Check dependencies
if [ -d "node_modules" ]; then
    echo "✅ Dependencies: Installed"
else
    echo "📦 Installing dependencies..."
    npm install
    echo "✅ Dependencies: Installed"
fi

echo ""
echo "🚀 Ready to Launch!"
echo "==================="

if [ "$AI_READY" = true ] || [ "$OFFLINE_AI" = true ]; then
    echo "✅ Your app is fully configured and ready!"
    echo ""
    echo "🎯 Quick Start:"
    echo "   npm run dev"
    echo ""
    echo "📱 URLs:"
    echo "   Chat Interface: http://localhost:3000"
    echo "   Admin Dashboard: http://localhost:3000/admin (password: admin123)"
    echo ""
    if [ "$OFFLINE_AI" = true ]; then
        echo "🤖 AI Services Available:"
        echo "   ✅ Cloud AI (OpenAI/Anthropic) - when API keys are valid"
        echo "   ✅ Offline AI (Ollama) - always available, privacy-focused"
    fi
else
    echo "⚠️  To enable AI conversations:"
    echo "   1. Get an OpenAI API key: https://platform.openai.com/api-keys"
    echo "   2. Add it to .env.local: OPENAI_API_KEY=your_key_here"
    echo "   3. OR install offline AI: npm run setup:ollama"
    echo "   4. Restart the app"
    echo ""
    echo "🎯 You can still test the UI:"
    echo "   npm run dev"
fi

echo ""
echo "🎨 Customize Your AI:"
echo "   Edit src/config/profile.json to change personality, values, and questions"
echo ""
echo "📚 Full documentation: README.md"
echo ""

# Ask if user wants to start the dev server
read -p "🚀 Start the development server now? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🚀 Starting development server..."
    npm run dev
fi
