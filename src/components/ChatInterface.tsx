'use client';

import React, { useState, useEffect, useRef } from 'react';
import { ChatMessage, UserProfile } from '@/types/profile';
import { databaseService } from '@/lib/database';
import { formatMessageTime } from '@/lib/date-utils';
import { motion, AnimatePresence } from 'framer-motion';
import { PaperAirplaneIcon, SparklesIcon } from '@heroicons/react/24/outline';

interface ChatInterfaceProps {
  sessionId: string;
}

export default function ChatInterface({ sessionId }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  
  // AI Mode Selection State
  const [aiModes, setAiModes] = useState({
    local: true,      // Default to local mode
    openai: false,
    anthropic: false
  });
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    initializeChat();
  }, [sessionId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const initializeChat = async () => {
    try {
      console.log('Initializing chat with sessionId:', sessionId);
      let profile = await databaseService.getUserProfile(sessionId);
      
      if (!profile) {
        console.log('Creating new profile');
        profile = await databaseService.createUserProfile(sessionId);
        
        // Add welcome message
        const welcomeMessage: ChatMessage = {
          id: crypto.randomUUID ? crypto.randomUUID() : `msg-${Date.now()}`,
          type: 'ai',
          content: "Hi there! I'm here as a thoughtful representation of someone who values deep connection and authentic conversation. I'm curious about who you are beyond the surface - what makes you laugh, what challenges you, what you're passionate about. Ready for a real conversation?",
          timestamp: new Date(),
        };
        
        await databaseService.addMessage(sessionId, welcomeMessage);
        setMessages([welcomeMessage]);
      } else {
        console.log('Loading existing profile with', profile.conversation_history.length, 'messages');
        setMessages(profile.conversation_history);
      }
      
      setUserProfile(profile);
      setIsInitialized(true);
      console.log('Chat initialized successfully');
    } catch (error) {
      console.error('Error initializing chat:', error);
      setIsInitialized(true);
      
      // Set a fallback welcome message if initialization fails
      const fallbackMessage: ChatMessage = {
        id: `msg-${Date.now()}`,
        type: 'ai',
        content: "Hi there! I'm having a small technical hiccup, but I'm ready to chat. What's on your mind?",
        timestamp: new Date(),
      };
      setMessages([fallbackMessage]);
    }
  };

  const clearConversation = async () => {
    try {
      // Clear messages from state
      setMessages([]);
      
      // Create a new welcome message
      const welcomeMessage: ChatMessage = {
        id: crypto.randomUUID ? crypto.randomUUID() : `msg-${Date.now()}`,
        type: 'ai',
        content: "Hi there! I'm here as a thoughtful representation of someone who values deep connection and authentic conversation. I'm curious about who you are beyond the surface - what makes you laugh, what challenges you, what you're passionate about. Ready for a real conversation?",
        timestamp: new Date(),
      };
      
      setMessages([welcomeMessage]);
      
      // Clear conversation history from database
      if (userProfile) {
        await databaseService.clearConversationHistory(sessionId);
      }
      
      console.log('Conversation cleared successfully');
    } catch (error) {
      console.error('Error clearing conversation:', error);
    }
  };

  const sendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      type: 'user',
      content: inputValue.trim(),
      timestamp: new Date(),
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInputValue('');
    setIsLoading(true);

    try {
      // Save user message
      await databaseService.addMessage(sessionId, userMessage);

      // Generate AI response via API
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId,
          messages: [userMessage],
          aiModes, // Include AI mode preferences
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get AI response');
      }

      const { message: aiMessage, analysis } = await response.json();
      
      const finalMessages = [...newMessages, aiMessage];
      setMessages(finalMessages);
      
      if (userProfile && analysis.compatibility_score) {
        const updatedFlags = {
          red: [...userProfile.evaluation.flags.red, ...(analysis.flags?.filter((f: string) => f.includes('red')) || [])],
          green: [...userProfile.evaluation.flags.green, ...(analysis.flags?.filter((f: string) => f.includes('green')) || [])],
        };

        await databaseService.updateCompatibilityScore(
          sessionId,
          analysis.compatibility_score,
          updatedFlags,
          [...(userProfile.evaluation.notes || []), analysis.reasoning || '']
        );
      }
    } catch (error) {
      console.error('Error sending message:', error);
      
      const errorMessage: ChatMessage = {
        id: crypto.randomUUID(),
        type: 'ai',
        content: 'I apologize, but I\'m having trouble responding right now. Could you try again?',
        timestamp: new Date(),
      };
      
      setMessages([...newMessages, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleAiModeChange = (mode: 'local' | 'openai' | 'anthropic') => {
    setAiModes(prev => ({
      ...prev,
      [mode]: !prev[mode]
    }));
  };

  if (!isInitialized) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="text-center">
          <SparklesIcon className="h-12 w-12 text-blue-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Initializing conversation...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <div className="bg-white/95 backdrop-blur-sm border-b border-gray-200 p-6 shadow-md">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <SparklesIcon className="h-8 w-8 text-blue-500" />
            Rob AI
          </h1>
          <p className="text-base text-gray-700 mt-2 font-medium">
            An authentic conversation with thoughtful questions
          </p>
        </div>
      </div>

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto bg-gradient-to-b from-slate-50/50 to-blue-50/30">
        <div className="max-w-4xl mx-auto p-6 space-y-6">
          <AnimatePresence>
            {messages.map((message) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-xs lg:max-w-2xl px-5 py-4 rounded-2xl shadow-md ${
                    message.type === 'user'
                      ? 'bg-blue-500 text-white shadow-blue-200'
                      : 'bg-white text-gray-800 shadow-gray-200 border border-gray-100'
                  }`}
                >
                  <p className="text-base leading-relaxed font-medium">{message.content}</p>
                  <p className={`text-xs mt-3 ${
                    message.type === 'user' ? 'text-blue-100' : 'text-gray-500'
                  }`}>
                    {formatMessageTime(message.timestamp)}
                  </p>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {isLoading && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex justify-start"
            >
              <div className="bg-white text-gray-800 shadow-md border border-gray-100 max-w-xs lg:max-w-2xl px-5 py-4 rounded-2xl shadow-gray-200">
                <div className="flex items-center space-x-2">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce delay-100"></div>
                    <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce delay-200"></div>
                  </div>
                  <span className="text-sm text-gray-600">AI is thinking...</span>
                </div>
              </div>
            </motion.div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <div className="bg-white/90 backdrop-blur-sm border-t border-gray-200 p-6 shadow-lg">
        <div className="max-w-4xl mx-auto">
          {/* AI Mode Selection and Clear Conversation */}
          <div className="flex justify-between items-center mb-4">
            {/* AI Mode Selection */}
            <div className="flex items-center space-x-4">
              <span className="text-sm font-medium text-gray-700">AI Mode:</span>
              <div className="flex items-center space-x-3">
                {/* Local Mode */}
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={aiModes.local}
                    onChange={() => handleAiModeChange('local')}
                    className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                  />
                  <span className="text-sm text-gray-700">Local (Fast)</span>
                </label>
                
                {/* OpenAI Mode */}
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={aiModes.openai}
                    onChange={() => handleAiModeChange('openai')}
                    className="w-4 h-4 text-green-600 bg-gray-100 border-gray-300 rounded focus:ring-green-500 focus:ring-2"
                  />
                  <span className="text-sm text-gray-700">OpenAI</span>
                </label>
                
                {/* Anthropic Mode */}
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={aiModes.anthropic}
                    onChange={() => handleAiModeChange('anthropic')}
                    className="w-4 h-4 text-purple-600 bg-gray-100 border-gray-300 rounded focus:ring-purple-500 focus:ring-2"
                  />
                  <span className="text-sm text-gray-700">Anthropic</span>
                </label>
              </div>
            </div>
            
            {/* Clear Conversation Button */}
            <button
              onClick={clearConversation}
              className="px-4 py-2 text-sm text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors duration-200 border border-gray-200 hover:border-red-200"
            >
              Clear Conversation
            </button>
          </div>
          
          <div className="flex space-x-4">
            <div className="flex-1">
              <textarea
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Share your thoughts and let's have a meaningful conversation..."
                className="w-full px-5 py-4 border border-gray-300 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none bg-white shadow-sm text-gray-800 placeholder-gray-500 text-base leading-relaxed"
                rows={1}
                disabled={isLoading}
              />
            </div>
            <button
              onClick={sendMessage}
              disabled={!inputValue.trim() || isLoading}
              className={`px-8 py-4 rounded-2xl font-semibold transition-all duration-200 flex items-center gap-2 shadow-md ${
                inputValue.trim() && !isLoading
                  ? 'bg-blue-500 text-white hover:bg-blue-600 hover:shadow-lg transform hover:-translate-y-0.5'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              <PaperAirplaneIcon className="h-5 w-5" />
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
