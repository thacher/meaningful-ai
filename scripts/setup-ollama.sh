#!/bin/bash

# Ollama Setup Script for Meaningful AI
# This script helps users set up Ollama with a recommended model for offline AI conversations

echo "🚀 Setting up Ollama for Meaningful AI Offline Mode"
echo "=================================================="

# Check if Ollama is already installed
if command -v ollama &> /dev/null; then
    echo "✅ Ollama is already installed"
    ollama --version
else
    echo "📥 Installing Ollama..."
    
    # Detect OS and install Ollama
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        echo "Installing Ollama for macOS..."
        curl -fsSL https://ollama.ai/install.sh | sh
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        # Linux
        echo "Installing Ollama for Linux..."
        curl -fsSL https://ollama.ai/install.sh | sh
    else
        echo "❌ Unsupported operating system. Please install Ollama manually from https://ollama.ai"
        exit 1
    fi
fi

echo ""
echo "🔄 Starting Ollama service..."
ollama serve &
OLLAMA_PID=$!

# Wait for Ollama to start
echo "⏳ Waiting for Ollama to start..."
sleep 5

# Check if Ollama is running
if ! curl -s http://localhost:11434/api/tags > /dev/null; then
    echo "❌ Failed to start Ollama service"
    exit 1
fi

echo "✅ Ollama service is running"

echo ""
echo "📦 Downloading recommended models for Meaningful AI"
echo "This may take several minutes depending on your internet connection..."

# Download primary model: Llama 3.1 8B
echo "Downloading Llama 3.1 8B (primary model)..."
ollama pull llama3.1:8b

# Check if other models are available and download them
echo ""
echo "Checking for additional recommended models..."

# Download Llama 3 latest if not already present
if ! ollama list | grep -q "llama3:latest"; then
    echo "Downloading Llama 3 latest (fallback model)..."
    ollama pull llama3:latest
else
    echo "✅ Llama 3 latest already available"
fi

# Download Mistral 7B as an alternative (smaller, faster)
echo "Downloading Mistral 7B (lightweight alternative)..."
ollama pull mistral:7b

echo ""
echo "🎉 Setup complete!"
echo ""
echo "Available models:"
ollama list

echo ""
echo "🔧 Configuration:"
echo "- Ollama runs on: http://localhost:11434"
echo "- Default model: llama3.1:8b"
echo "- Your Meaningful AI app will automatically use this for offline conversations"
echo ""
echo "💡 Tips:"
echo "- Keep Ollama running in the background for offline AI"
echo "- You can download other models with: ollama pull <model-name>"
echo "- Popular alternatives: mistral:7b, codellama:7b, phi3:3.8b"
echo ""
echo "🛑 To stop Ollama: kill $OLLAMA_PID"
echo "🔄 To restart: ollama serve"

# Keep the script running to maintain Ollama service
echo ""
echo "🔄 Ollama service is running. Press Ctrl+C to stop."
wait $OLLAMA_PID
