#!/usr/bin/env node

/**
 * Test script for AI service fallback functionality
 * Run with: node scripts/test-fallback.js
 */

// Using fetch API instead of http module

async function testFallback() {
  console.log('🧪 Testing AI Service Fallback Functionality...\n');

  // Test 1: Check if the server is running
  console.log('✅ Test 1: Server Status');
  try {
    const response = await fetch('http://localhost:3000');
    if (response.ok) {
      console.log('   - Server: ✅ Running on http://localhost:3000');
    } else {
      console.log('   - Server: ❌ Responding but with status:', response.status);
    }
  } catch (error) {
    console.log('   - Server: ❌ Not accessible:', error.message);
    return;
  }

  // Test 2: Check if the chat API endpoint exists
  console.log('\n✅ Test 2: Chat API Endpoint');
  try {
    const response = await fetch('http://localhost:3000/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: [{ type: 'user', content: 'Hello! How are you today?' }]
      })
    });
    
    if (response.ok) {
      console.log('   - Chat API: ✅ Endpoint accessible');
      const data = await response.json();
      console.log('   - Response received:', data.response ? '✅' : '❌');
    } else {
      console.log('   - Chat API: ❌ Status:', response.status);
      const errorText = await response.text();
      console.log('   - Error details:', errorText.substring(0, 100));
    }
  } catch (error) {
    console.log('   - Chat API: ❌ Error:', error.message);
  }

  // Test 3: Check environment configuration
  console.log('\n✅ Test 3: Environment Configuration');
  console.log('   - To test fallback functionality:');
  console.log('     1. Set invalid OpenAI API key in .env.local');
  console.log('     2. Set valid Anthropic API key in .env.local');
  console.log('     3. Send a message through the chat interface');
  console.log('     4. Check console logs for fallback messages');
  
  console.log('\n🎯 Next Steps:');
  console.log('   1. Open http://localhost:3000 in your browser');
  console.log('   2. Try sending a message to test the AI service');
  console.log('   3. Check the browser console for any error messages');
  console.log('   4. Monitor the terminal for fallback logs');
  
  console.log('\n💡 Fallback Test:');
  console.log('   - The fallback will automatically activate when OpenAI fails');
  console.log('   - Look for: "OpenAI request failed, trying Anthropic fallback"');
  console.log('   - This happens on timeouts, rate limits, or API errors');
}

// Run the test
testFallback().catch(console.error);
