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
          is_admin: boolean;
          feedback_prompt_dismissed_at: string | null;
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
          is_admin?: boolean;
          feedback_prompt_dismissed_at?: string | null;
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
          is_admin?: boolean;
          feedback_prompt_dismissed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };

      feedback: {
        Row: {
          id: string;
          user_id: string;
          type: "bug" | "feature" | "general" | "rating";
          message: string | null;
          rating: number | null;
          page: string | null;
          app_version: string | null;
          user_agent: string | null;
          screenshot_path: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          type: "bug" | "feature" | "general" | "rating";
          message?: string | null;
          rating?: number | null;
          page?: string | null;
          app_version?: string | null;
          user_agent?: string | null;
          screenshot_path?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          type?: "bug" | "feature" | "general" | "rating";
          message?: string | null;
          rating?: number | null;
          page?: string | null;
          app_version?: string | null;
          user_agent?: string | null;
          screenshot_path?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };

      analytics_events: {
        Row: {
          id: string;
          user_id: string | null;
          event_name: string;
          properties: Record<string, unknown>;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          event_name: string;
          properties?: Record<string, unknown>;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          event_name?: string;
          properties?: Record<string, unknown>;
          created_at?: string;
        };
        Relationships: [];
      };

      crash_reports: {
        Row: {
          id: string;
          user_id: string | null;
          message: string;
          stack: string | null;
          component_name: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          message: string;
          stack?: string | null;
          component_name?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          message?: string;
          stack?: string | null;
          component_name?: string | null;
          created_at?: string;
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
          active_exercise_index: number | null;
          // Phase 11B: stable row-id pointer (see active_workout_exercises.id
          // below), kept alongside active_exercise_index rather than
          // replacing it — see 0015_active_workout_editing.sql's header
          // comment for why both columns coexist.
          active_exercise_id: string | null;
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
          active_exercise_index?: number | null;
          active_exercise_id?: string | null;
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
          active_exercise_index?: number | null;
          active_exercise_id?: string | null;
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
          exercise_id: string | null;
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
          exercise_id?: string | null;
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
          exercise_id?: string | null;
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
          exercise_id: string | null;
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
          exercise_id?: string | null;
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
          exercise_id?: string | null;
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
          timer_sound: boolean;
          vibration: boolean;
          default_rest_seconds: number;
          show_exercise_guide_automatically: boolean;
          dark_mode: boolean;
          compact_mode: boolean;
          larger_text: boolean;
          workout_reminders: boolean;
          weekly_summary: boolean;
          streak_reminders: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          auto_start_rest_timer?: boolean;
          weight_unit?: "lbs" | "kg";
          timer_sound?: boolean;
          vibration?: boolean;
          default_rest_seconds?: number;
          show_exercise_guide_automatically?: boolean;
          dark_mode?: boolean;
          compact_mode?: boolean;
          larger_text?: boolean;
          workout_reminders?: boolean;
          weekly_summary?: boolean;
          streak_reminders?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          auto_start_rest_timer?: boolean;
          weight_unit?: "lbs" | "kg";
          timer_sound?: boolean;
          vibration?: boolean;
          default_rest_seconds?: number;
          show_exercise_guide_automatically?: boolean;
          dark_mode?: boolean;
          compact_mode?: boolean;
          larger_text?: boolean;
          workout_reminders?: boolean;
          weekly_summary?: boolean;
          streak_reminders?: boolean;
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

      workout_templates: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          description: string | null;
          goal: string;
          days_per_week: number;
          is_favorite: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          description?: string | null;
          goal: string;
          days_per_week: number;
          is_favorite?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          description?: string | null;
          goal?: string;
          days_per_week?: number;
          is_favorite?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };

      workout_template_days: {
        Row: {
          id: string;
          user_id: string;
          template_id: string;
          day_number: number;
          day_name: string;
          focus: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          template_id: string;
          day_number: number;
          day_name: string;
          focus?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          template_id?: string;
          day_number?: number;
          day_name?: string;
          focus?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };

      workout_template_exercises: {
        Row: {
          id: string;
          user_id: string;
          template_day_id: string;
          exercise_name: string;
          exercise_id: string | null;
          sets: number;
          reps: string;
          rest_seconds: number;
          notes: string;
          order_index: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          template_day_id: string;
          exercise_name: string;
          exercise_id?: string | null;
          sets: number;
          reps: string;
          rest_seconds: number;
          notes?: string;
          order_index: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          template_day_id?: string;
          exercise_name?: string;
          exercise_id?: string | null;
          sets?: number;
          reps?: string;
          rest_seconds?: number;
          notes?: string;
          order_index?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };

      exercise_favorites: {
        Row: {
          id: string;
          user_id: string;
          exercise_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          exercise_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          exercise_id?: string;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    // supabase/migrations/0007_template_favorites.sql — atomic multi-table
    // template writes (create/replace/duplicate the full day/exercise tree
    // in one transaction) and order-only reorders. Every jsonb `days`
    // argument matches TemplateDayInput[] (see
    // lib/repositories/supabase/template-repository.ts).
    Functions: {
      create_template_tree: {
        Args: {
          p_id: string;
          p_name: string;
          p_description: string | null;
          p_goal: string;
          p_days_per_week: number;
          p_days: Json;
        };
        Returns: string;
      };
      replace_template_tree: {
        Args: {
          p_template_id: string;
          p_name: string;
          p_description: string | null;
          p_goal: string;
          p_days_per_week: number;
          p_days: Json;
        };
        Returns: undefined;
      };
      duplicate_template_tree: {
        Args: { p_source_template_id: string; p_new_name: string };
        Returns: string;
      };
      reorder_template_days: {
        Args: { p_template_id: string; p_day_ids: string[] };
        Returns: undefined;
      };
      reorder_template_exercises: {
        Args: { p_template_day_id: string; p_exercise_ids: string[] };
        Returns: undefined;
      };
      // Phase 11B: mid-workout exercise editing (0015_active_workout_editing.sql)
      // — see lib/repositories/supabase/active-workout-repository.ts for the
      // callers.
      add_active_workout_exercise: {
        Args: {
          p_active_workout_id: string;
          p_name: string;
          p_exercise_id: string | null;
          p_target_sets: number;
          p_target_reps: string;
          p_target_rest_seconds: number;
          p_note?: string;
          // Phase 11C (0016_active_workout_insert_position.sql) — null/omitted
          // appends (0015's original and still-default behavior).
          p_insert_after_exercise_id?: string | null;
        };
        Returns: string;
      };
      delete_active_workout_exercise: {
        Args: { p_active_workout_id: string; p_exercise_id: string };
        Returns: undefined;
      };
      reorder_active_workout_exercises: {
        Args: { p_active_workout_id: string; p_exercise_ids: string[] };
        Returns: undefined;
      };
      replace_active_workout_exercise: {
        Args: {
          p_active_workout_id: string;
          p_exercise_id: string;
          p_keep_completed: boolean;
          p_name: string;
          p_new_exercise_id: string | null;
          p_target_sets: number;
          p_target_reps: string;
          p_target_rest_seconds: number;
        };
        Returns: Json;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
