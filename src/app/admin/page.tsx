'use client';

import React, { useState, useEffect } from 'react';
import { UserProfile, AnalyticsData } from '@/types/profile';
import { databaseService } from '@/lib/database';
import { 
  ChartBarIcon, 
  UserGroupIcon, 
  ChatBubbleLeftRightIcon,
  HeartIcon,
  XMarkIcon,
  EyeIcon,
  FunnelIcon
} from '@heroicons/react/24/outline';
import { motion } from 'framer-motion';

export default function AdminDashboard() {
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [selectedProfile, setSelectedProfile] = useState<UserProfile | null>(null);
  const [filterRecommendation, setFilterRecommendation] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isAuthenticated) {
      loadData();
    }
  }, [isAuthenticated]);

  const authenticate = () => {
    // Simple password check - in production, use proper authentication
    if (password === 'admin123') {
      setIsAuthenticated(true);
      localStorage.setItem('admin-authenticated', 'true');
    } else {
      alert('Invalid password');
    }
  };

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [profilesData, analyticsData] = await Promise.all([
        databaseService.getAllProfiles(),
        databaseService.getAnalytics(),
      ]);
      setProfiles(profilesData);
      setAnalytics(analyticsData);
    } catch (error) {
      console.error('Error loading admin data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getRecommendationColor = (recommendation: string) => {
    switch (recommendation) {
      case 'highly_compatible': return 'bg-green-100 text-green-800';
      case 'compatible': return 'bg-blue-100 text-blue-800';
      case 'neutral': return 'bg-gray-100 text-gray-800';
      case 'incompatible': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredProfiles = profiles.filter(profile => 
    filterRecommendation === 'all' || profile.evaluation.recommendation === filterRecommendation
  );

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="bg-white p-8 rounded-2xl shadow-lg w-full max-w-md">
          <h1 className="text-2xl font-bold text-gray-900 mb-6 text-center">Admin Access</h1>
          <div className="space-y-4">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && authenticate()}
              placeholder="Enter admin password"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              onClick={authenticate}
              className="w-full bg-blue-500 text-white py-3 rounded-lg hover:bg-blue-600 transition-colors"
            >
              Access Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-gray-200 p-6 shadow-sm">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
                <ChartBarIcon className="h-8 w-8 text-blue-500" />
                Admin Dashboard
              </h1>
              <p className="text-sm text-amber-600 mt-1">
                💾 Using local storage (configure Supabase for cloud storage)
              </p>
            </div>
            <button
              onClick={() => {
                setIsAuthenticated(false);
                localStorage.removeItem('admin-authenticated');
              }}
              className="px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6 space-y-8">
        {/* Analytics Cards */}
        {analytics && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-xl p-6 shadow-sm border border-gray-200"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Interactions</p>
                  <p className="text-2xl font-bold text-gray-900">{analytics.total_interactions}</p>
                </div>
                <UserGroupIcon className="h-8 w-8 text-blue-500" />
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white rounded-xl p-6 shadow-sm border border-gray-200"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Avg. Conversation</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {Math.round(analytics.average_conversation_length)} msgs
                  </p>
                </div>
                <ChatBubbleLeftRightIcon className="h-8 w-8 text-green-500" />
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white rounded-xl p-6 shadow-sm border border-gray-200"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">High Compatibility</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {analytics.compatibility_distribution.highly_compatible || 0}
                  </p>
                </div>
                <HeartIcon className="h-8 w-8 text-red-500" />
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-white rounded-xl p-6 shadow-sm border border-gray-200"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Compatible</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {analytics.compatibility_distribution.compatible || 0}
                  </p>
                </div>
                <HeartIcon className="h-8 w-8 text-blue-500" />
              </div>
            </motion.div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-center gap-4">
            <FunnelIcon className="h-5 w-5 text-gray-600" />
            <span className="text-sm font-medium text-gray-700">Filter by recommendation:</span>
            <select
              value={filterRecommendation}
              onChange={(e) => setFilterRecommendation(e.target.value)}
              className="px-3 py-1 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All</option>
              <option value="highly_compatible">Highly Compatible</option>
              <option value="compatible">Compatible</option>
              <option value="neutral">Neutral</option>
              <option value="incompatible">Incompatible</option>
            </select>
          </div>
        </div>

        {/* Profiles List */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">
              User Interactions ({filteredProfiles.length})
            </h2>
          </div>
          
          <div className="divide-y divide-gray-200">
            {filteredProfiles.map((profile, index) => (
              <motion.div
                key={profile.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="p-6 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getRecommendationColor(profile.evaluation.recommendation)}`}>
                        {profile.evaluation.recommendation.replace('_', ' ')}
                      </span>
                      <span className="text-sm text-gray-500">
                        Score: {profile.evaluation.compatibility_score}/100
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">Messages:</span>
                        <span className="ml-2 font-medium">{profile.conversation_history.length}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Created:</span>
                        <span className="ml-2">{new Date(profile.created_at).toLocaleDateString()}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Last Active:</span>
                        <span className="ml-2">{new Date(profile.last_interaction).toLocaleDateString()}</span>
                      </div>
                    </div>
                    
                    {(profile.evaluation.flags.red.length > 0 || profile.evaluation.flags.green.length > 0) && (
                      <div className="mt-3 flex gap-4">
                        {profile.evaluation.flags.green.length > 0 && (
                          <div>
                            <span className="text-xs text-green-600 font-medium">Green flags:</span>
                            <span className="ml-2 text-xs text-gray-600">
                              {profile.evaluation.flags.green.slice(0, 2).join(', ')}
                              {profile.evaluation.flags.green.length > 2 && '...'}
                            </span>
                          </div>
                        )}
                        {profile.evaluation.flags.red.length > 0 && (
                          <div>
                            <span className="text-xs text-red-600 font-medium">Red flags:</span>
                            <span className="ml-2 text-xs text-gray-600">
                              {profile.evaluation.flags.red.slice(0, 2).join(', ')}
                              {profile.evaluation.flags.red.length > 2 && '...'}
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  
                  <button
                    onClick={() => setSelectedProfile(profile)}
                    className="ml-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-2"
                  >
                    <EyeIcon className="h-4 w-4" />
                    View
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Profile Detail Modal */}
      {selectedProfile && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-xl max-w-4xl w-full max-h-[80vh] overflow-y-auto"
          >
            <div className="p-6 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-xl font-semibold">Conversation Details</h3>
              <button
                onClick={() => setSelectedProfile(null)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Evaluation Summary */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-3">Evaluation Summary</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Compatibility Score:</span>
                    <span className="ml-2 font-bold">{selectedProfile.evaluation.compatibility_score}/100</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Recommendation:</span>
                    <span className={`ml-2 px-2 py-1 rounded text-xs ${getRecommendationColor(selectedProfile.evaluation.recommendation)}`}>
                      {selectedProfile.evaluation.recommendation.replace('_', ' ')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Conversation History */}
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Conversation History</h4>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {selectedProfile.conversation_history.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-sm px-4 py-3 rounded-lg ${
                          message.type === 'user'
                            ? 'bg-blue-500 text-white'
                            : 'bg-gray-100 text-gray-900'
                        }`}
                      >
                        <p className="text-sm">{message.content}</p>
                        <p className="text-xs mt-1 opacity-70">
                          {new Date(message.timestamp).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
