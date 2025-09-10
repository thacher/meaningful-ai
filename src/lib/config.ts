import { ProfileConfig } from '@/types/profile';
import profileData from '@/config/profile.json';

export const getProfileConfig = (): ProfileConfig => {
  return profileData as ProfileConfig;
};

export const updateProfileConfig = (newConfig: Partial<ProfileConfig>): ProfileConfig => {
  const currentConfig = getProfileConfig();
  return { ...currentConfig, ...newConfig };
};

// Environment variables for API keys and database
export const config = {
  openai: {
    apiKey: process.env.OPENAI_API_KEY || '',
    model: 'gpt-3.5-turbo', // More cost-effective model
  },
  anthropic: {
    apiKey: process.env.ANTHROPIC_API_KEY || '',
    model: 'claude-3-5-sonnet-20241022', // Updated to current model
  },
  supabase: {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
  },
  app: {
    name: 'Meaningful AI',
    description: 'Behavioral insight engine for meaningful connections',
    adminPassword: process.env.ADMIN_PASSWORD || 'admin123', // Change this!
  },
};
