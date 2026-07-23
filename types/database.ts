// Hand-maintained TypeScript types matching supabase/migrations/0001_init.sql
// and 0002_profile_fields.sql. Shaped exactly like the output of
// `supabase gen types typescript`, so running that CLI command later can
// replace this file as a drop-in (verify no shape drift if you do — this
// file is the source of truth until then).
//
// Only the profiles table is read/written by the running app so far (via
// lib/repositories/supabase/profile-repository.ts). Every other table
// remains inert.

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          display_name: string | null;
          preferred_weight_unit: "lbs" | "kg";
          experience_level: "beginner" | "intermediate" | "advanced" | null;
          weekly_training_target: number | null;
          onboarding_completed: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          display_name?: string | null;
          preferred_weight_unit?: "lbs" | "kg";
          experience_level?: "beginner" | "intermediate" | "advanced" | null;
          weekly_training_target?: number | null;
          onboarding_completed?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          display_name?: string | null;
          preferred_weight_unit?: "lbs" | "kg";
          experience_level?: "beginner" | "intermediate" | "advanced" | null;
          weekly_training_target?: number | null;
          onboarding_completed?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };

      workout_plans: {
        Row: {
          id: string;
          user_id: string;
          goal: string;
          experience_level: string;
          days_per_week: number;
          equipment: string[];
          session_duration_minutes: number;
          injuries_or_limitations: string;
          exercise_preferences: string;
          progression_guidance: string[];
          safety_notes: string[];
          injury_warning: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          goal: string;
          experience_level: string;
          days_per_week: number;
          equipment: string[];
          session_duration_minutes: number;
          injuries_or_limitations?: string;
          exercise_preferences?: string;
          progression_guidance?: string[];
          safety_notes?: string[];
          injury_warning?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          goal?: string;
          experience_level?: string;
          days_per_week?: number;
          equipment?: string[];
          session_duration_minutes?: number;
          injuries_or_limitations?: string;
          exercise_preferences?: string;
          progression_guidance?: string[];
          safety_notes?: string[];
          injury_warning?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };

      workout_plan_days: {
        Row: {
          id: string;
          user_id: string;
          workout_plan_id: string;
          day_index: number;
          day_label: string;
          title: string;
          focus: string;
          estimated_duration_minutes: number;
          warmup: Json;
          cooldown: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          workout_plan_id: string;
          day_index: number;
          day_label: string;
          title: string;
          focus: string;
          estimated_duration_minutes: number;
          warmup?: Json;
          cooldown?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          workout_plan_id?: string;
          day_index?: number;
          day_label?: string;
          title?: string;
          focus?: string;
          estimated_duration_minutes?: number;
          warmup?: Json;
          cooldown?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };

      workout_plan_exercises: {
        Row: {
          id: string;
          user_id: string;
          workout_plan_day_id: string;
          sort_order: number;
          name: string;
          sets: number;
          reps: string;
          rest_seconds: number;
          notes: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          workout_plan_day_id: string;
          sort_order: number;
          name: string;
          sets: number;
          reps: string;
          rest_seconds: number;
          notes?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          workout_plan_day_id?: string;
          sort_order?: number;
          name?: string;
          sets?: number;
          reps?: string;
          rest_seconds?: number;
          notes?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };

      active_workouts: {
        Row: {
          id: string;
          user_id: string;
          workout_plan_id: string | null;
          day_index: number;
          day_label: string;
          day_title: string;
          day_focus: string;
          started_at: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          workout_plan_id?: string | null;
          day_index: number;
          day_label: string;
          day_title: string;
          day_focus: string;
          started_at: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          workout_plan_id?: string | null;
          day_index?: number;
          day_label?: string;
          day_title?: string;
          day_focus?: string;
          started_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };

      active_workout_exercises: {
        Row: {
          id: string;
          user_id: string;
          active_workout_id: string;
          sort_order: number;
          name: string;
          target_sets: number;
          target_reps: string;
          target_rest_seconds: number;
          completed: boolean;
          note: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          active_workout_id: string;
          sort_order: number;
          name: string;
          target_sets: number;
          target_reps: string;
          target_rest_seconds: number;
          completed?: boolean;
          note?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          active_workout_id?: string;
          sort_order?: number;
          name?: string;
          target_sets?: number;
          target_reps?: string;
          target_rest_seconds?: number;
          completed?: boolean;
          note?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };

      active_workout_sets: {
        Row: {
          id: string;
          user_id: string;
          active_workout_exercise_id: string;
          set_number: number;
          weight: number | null;
          reps: number | null;
          completed: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          active_workout_exercise_id: string;
          set_number: number;
          weight?: number | null;
          reps?: number | null;
          completed?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          active_workout_exercise_id?: string;
          set_number?: number;
          weight?: number | null;
          reps?: number | null;
          completed?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };

      completed_workouts: {
        Row: {
          id: string;
          user_id: string;
          workout_plan_id: string | null;
          day_index: number;
          day_label: string;
          day_title: string;
          day_focus: string;
          completed_at: string;
          duration_seconds: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          workout_plan_id?: string | null;
          day_index: number;
          day_label: string;
          day_title: string;
          day_focus: string;
          completed_at: string;
          duration_seconds?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          workout_plan_id?: string | null;
          day_index?: number;
          day_label?: string;
          day_title?: string;
          day_focus?: string;
          completed_at?: string;
          duration_seconds?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };

      completed_workout_exercises: {
        Row: {
          id: string;
          user_id: string;
          completed_workout_id: string;
          sort_order: number;
          name: string;
          target_sets: number;
          target_reps: string;
          target_rest_seconds: number;
          completed: boolean;
          note: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          completed_workout_id: string;
          sort_order: number;
          name: string;
          target_sets: number;
          target_reps: string;
          target_rest_seconds: number;
          completed?: boolean;
          note?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          completed_workout_id?: string;
          sort_order?: number;
          name?: string;
          target_sets?: number;
          target_reps?: string;
          target_rest_seconds?: number;
          completed?: boolean;
          note?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };

      completed_workout_sets: {
        Row: {
          id: string;
          user_id: string;
          completed_workout_exercise_id: string;
          set_number: number;
          weight: number | null;
          reps: number | null;
          completed: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          completed_workout_exercise_id: string;
          set_number: number;
          weight?: number | null;
          reps?: number | null;
          completed?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          completed_workout_exercise_id?: string;
          set_number?: number;
          weight?: number | null;
          reps?: number | null;
          completed?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };

      personal_records: {
        Row: {
          id: string;
          user_id: string;
          completed_workout_id: string | null;
          exercise_name: string;
          record_type: "heaviest_weight" | "most_reps_at_weight" | "estimated_one_rep_max";
          value: number;
          previous_value: number;
          achieved_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          completed_workout_id?: string | null;
          exercise_name: string;
          record_type: "heaviest_weight" | "most_reps_at_weight" | "estimated_one_rep_max";
          value: number;
          previous_value?: number;
          achieved_at: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          completed_workout_id?: string | null;
          exercise_name?: string;
          record_type?: "heaviest_weight" | "most_reps_at_weight" | "estimated_one_rep_max";
          value?: number;
          previous_value?: number;
          achieved_at?: string;
          created_at?: string;
        };
        Relationships: [];
      };

      goals: {
        Row: {
          id: string;
          user_id: string;
          type: "exercise_weight" | "exercise_one_rep_max" | "workout_count" | "weekly_frequency" | "streak";
          title: string;
          exercise_name: string | null;
          target_value: number;
          target_date: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          type: "exercise_weight" | "exercise_one_rep_max" | "workout_count" | "weekly_frequency" | "streak";
          title: string;
          exercise_name?: string | null;
          target_value: number;
          target_date?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          type?: "exercise_weight" | "exercise_one_rep_max" | "workout_count" | "weekly_frequency" | "streak";
          title?: string;
          exercise_name?: string | null;
          target_value?: number;
          target_date?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };

      readiness_checkins: {
        Row: {
          id: string;
          user_id: string;
          completed_workout_id: string;
          difficulty: number | null;
          energy: number | null;
          soreness: number | null;
          sleep_quality: number | null;
          satisfaction: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          completed_workout_id: string;
          difficulty?: number | null;
          energy?: number | null;
          soreness?: number | null;
          sleep_quality?: number | null;
          satisfaction?: number | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          completed_workout_id?: string;
          difficulty?: number | null;
          energy?: number | null;
          soreness?: number | null;
          sleep_quality?: number | null;
          satisfaction?: number | null;
          created_at?: string;
        };
        Relationships: [];
      };

      exercise_notes: {
        Row: {
          id: string;
          user_id: string;
          exercise_name: string;
          note: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          exercise_name: string;
          note: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          exercise_name?: string;
          note?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };

      user_settings: {
        Row: {
          user_id: string;
          auto_start_rest_timer: boolean;
          weight_unit: "lbs" | "kg";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          auto_start_rest_timer?: boolean;
          weight_unit?: "lbs" | "kg";
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          auto_start_rest_timer?: boolean;
          weight_unit?: "lbs" | "kg";
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };

      migration_status: {
        Row: {
          user_id: string;
          status: "not_started" | "offered" | "deferred" | "importing" | "partially_failed" | "completed" | "declined";
          started_at: string | null;
          completed_at: string | null;
          item_counts: Json | null;
          error_message: string | null;
          batch_id: string | null;
          source_storage_version: number | null;
          current_stage: string | null;
          imported_counts: Json | null;
          skipped_counts: Json | null;
          failed_counts: Json | null;
          retry_count: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          status?: "not_started" | "offered" | "deferred" | "importing" | "partially_failed" | "completed" | "declined";
          started_at?: string | null;
          completed_at?: string | null;
          item_counts?: Json | null;
          error_message?: string | null;
          batch_id?: string | null;
          source_storage_version?: number | null;
          current_stage?: string | null;
          imported_counts?: Json | null;
          skipped_counts?: Json | null;
          failed_counts?: Json | null;
          retry_count?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          status?: "not_started" | "offered" | "deferred" | "importing" | "partially_failed" | "completed" | "declined";
          started_at?: string | null;
          completed_at?: string | null;
          item_counts?: Json | null;
          error_message?: string | null;
          batch_id?: string | null;
          source_storage_version?: number | null;
          current_stage?: string | null;
          imported_counts?: Json | null;
          skipped_counts?: Json | null;
          failed_counts?: Json | null;
          retry_count?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };

      plan_substitution_history: {
        Row: {
          user_id: string;
          history: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          history?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          history?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
