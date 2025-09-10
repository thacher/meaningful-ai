'use client';

import { useEffect, useState } from 'react';
import ChatInterface from '@/components/ChatInterface';

// Fallback UUID generator if crypto.randomUUID is not available
function generateUUID() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for older browsers
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

export default function Home() {
  const [sessionId, setSessionId] = useState<string>('');
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    // Set client flag
    setIsClient(true);
    
    // Use a timeout to ensure this runs after hydration
    const timer = setTimeout(() => {
      try {
        let storedSessionId = localStorage.getItem('ai-me-session-id');
        if (!storedSessionId) {
          storedSessionId = generateUUID();
          localStorage.setItem('ai-me-session-id', storedSessionId);
        }
        console.log('Setting session ID:', storedSessionId);
        setSessionId(storedSessionId);
      } catch (error) {
        console.error('Error setting up session:', error);
        const fallbackId = generateUUID();
        console.log('Using fallback session ID:', fallbackId);
        setSessionId(fallbackId);
      }
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  // Show loading until we're on the client and have a session ID
  if (!isClient || !sessionId) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
          {isClient && <p className="text-xs text-gray-400 mt-2">Session ID: {sessionId || 'Generating...'}</p>}
        </div>
      </div>
    );
  }

  return <ChatInterface sessionId={sessionId} />;
}
