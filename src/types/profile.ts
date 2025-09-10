export interface ProfileConfig {
  name: string;
  description: string;
  tone: string[];
  values: string[];
  communication_style: string;
  personality_traits: string[];
  filters: {
    redFlags: string[];
    greenFlags: string[];
    dealBreakers: string[];
  };
  questions: {
    icebreakers: string[];
    values_assessment: string[];
    compatibility_deep_dive: string[];
  };
  responses: {
    welcoming_message: string;
    follow_up_prompts: string[];
    closing_messages: string[];
  };
  evaluation_criteria: {
    compatibility_factors: string[];
    scoring_weights: Record<string, number>;
  };
}

export interface ChatMessage {
  id: string;
  type: 'user' | 'ai';
  content: string;
  timestamp: Date | string; // Can be Date object or ISO string from API
  metadata?: {
    sentiment?: number;
    flags_detected?: string[];
    compatibility_score?: number;
  };
}

export interface UserProfile {
  id: string;
  session_id: string;
  basic_info?: {
    name?: string;
    age?: number;
    location?: string;
  };
  conversation_history: ChatMessage[];
  evaluation: {
    compatibility_score: number;
    flags: {
      red: string[];
      green: string[];
    };
    notes: string[];
    recommendation: 'highly_compatible' | 'compatible' | 'neutral' | 'incompatible' | 'blocked';
  };
  created_at: Date | string; // Can be Date object or ISO string from API
  last_interaction: Date | string; // Can be Date object or ISO string from API
}

export interface AnalyticsData {
  total_interactions: number;
  compatibility_distribution: Record<string, number>;
  common_red_flags: Record<string, number>;
  common_green_flags: Record<string, number>;
  average_conversation_length: number;
  peak_interaction_times: string[];
}

export interface AnalysisResult {
  sentiment: number;
  flags: string[];
  compatibility_score: number;
  reasoning?: string;
  factors?: Record<string, number>;
}
