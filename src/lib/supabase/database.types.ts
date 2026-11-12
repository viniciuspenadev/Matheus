// Arquivo gerado automaticamente a partir das migrações. Não edite à mão.
// Atualize com: npm run db:types

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  __InternalSupabase: { PostgrestVersion: "12" };
  public: {
    Tables: {
      allowed_emails: {
        Row: {
          email: string;
          note: string | null;
          created_at: string;
        };
        Insert: {
          email: string;
          note?: string | null;
          created_at?: string;
        };
        Update: {
          email?: string;
          note?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      audio_parts: {
        Row: {
          id: string;
          user_id: string;
          upload_id: string;
          part_index: number;
          size_bytes: number;
          sha256: string;
          storage_path: string;
          status: string;
          uploaded_at: string | null;
          verified_at: string | null;
          deleted_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          upload_id: string;
          part_index: number;
          size_bytes: number;
          sha256: string;
          storage_path: string;
          status?: string;
          uploaded_at?: string | null;
          verified_at?: string | null;
          deleted_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          upload_id?: string;
          part_index?: number;
          size_bytes?: number;
          sha256?: string;
          storage_path?: string;
          status?: string;
          uploaded_at?: string | null;
          verified_at?: string | null;
          deleted_at?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "audio_parts_upload_id_user_id_fkey";
            columns: ["upload_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "audio_uploads";
            referencedColumns: ["id", "user_id"];
          },
        ];
      };
      audio_uploads: {
        Row: {
          id: string;
          user_id: string;
          lesson_id: string;
          original_filename: string;
          mime_type: string | null;
          size_bytes: number;
          part_size_bytes: number;
          total_parts: number;
          duration_seconds: number | null;
          status: string;
          storage_bucket: string;
          storage_prefix: string;
          retain_until: string | null;
          deletion_confirmed_at: string | null;
          deleted_at: string | null;
          cleanup_report: Json;
          last_error: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          lesson_id: string;
          original_filename: string;
          mime_type?: string | null;
          size_bytes: number;
          part_size_bytes: number;
          total_parts: number;
          duration_seconds?: number | null;
          status?: string;
          storage_bucket?: string;
          storage_prefix: string;
          retain_until?: string | null;
          deletion_confirmed_at?: string | null;
          deleted_at?: string | null;
          cleanup_report?: Json;
          last_error?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          lesson_id?: string;
          original_filename?: string;
          mime_type?: string | null;
          size_bytes?: number;
          part_size_bytes?: number;
          total_parts?: number;
          duration_seconds?: number | null;
          status?: string;
          storage_bucket?: string;
          storage_prefix?: string;
          retain_until?: string | null;
          deletion_confirmed_at?: string | null;
          deleted_at?: string | null;
          cleanup_report?: Json;
          last_error?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "audio_uploads_lesson_id_user_id_fkey";
            columns: ["lesson_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "lessons";
            referencedColumns: ["id", "user_id"];
          },
        ];
      };
      courses: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          institution: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          name: string;
          institution?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          institution?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      lesson_sources: {
        Row: {
          id: string;
          user_id: string;
          lesson_id: string;
          source_id: string;
          topic: string;
          query: string | null;
          relevance_score: number | null;
          relevance_note: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          lesson_id: string;
          source_id: string;
          topic: string;
          query?: string | null;
          relevance_score?: number | null;
          relevance_note?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          lesson_id?: string;
          source_id?: string;
          topic?: string;
          query?: string | null;
          relevance_score?: number | null;
          relevance_note?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "lesson_sources_lesson_id_user_id_fkey";
            columns: ["lesson_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "lessons";
            referencedColumns: ["id", "user_id"];
          },
          {
            foreignKeyName: "lesson_sources_source_id_user_id_fkey";
            columns: ["source_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "scientific_sources";
            referencedColumns: ["id", "user_id"];
          },
        ];
      };
      lessons: {
        Row: {
          id: string;
          user_id: string;
          subject_id: string;
          title: string;
          lesson_date: string | null;
          notes: string | null;
          source_type: string | null;
          status: string;
          status_message: string | null;
          last_error: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          subject_id: string;
          title: string;
          lesson_date?: string | null;
          notes?: string | null;
          source_type?: string | null;
          status?: string;
          status_message?: string | null;
          last_error?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          subject_id?: string;
          title?: string;
          lesson_date?: string | null;
          notes?: string | null;
          source_type?: string | null;
          status?: string;
          status_message?: string | null;
          last_error?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "lessons_subject_id_user_id_fkey";
            columns: ["subject_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "subjects";
            referencedColumns: ["id", "user_id"];
          },
        ];
      };
      processing_jobs: {
        Row: {
          id: string;
          user_id: string;
          lesson_id: string | null;
          job_type: string;
          status: string;
          priority: number;
          payload: Json;
          progress: Json;
          result: Json | null;
          attempts: number;
          max_attempts: number;
          run_after: string;
          locked_by: string | null;
          locked_at: string | null;
          heartbeat_at: string | null;
          last_error: string | null;
          started_at: string | null;
          finished_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          lesson_id?: string | null;
          job_type: string;
          status?: string;
          priority?: number;
          payload?: Json;
          progress?: Json;
          result?: Json | null;
          attempts?: number;
          max_attempts?: number;
          run_after?: string;
          locked_by?: string | null;
          locked_at?: string | null;
          heartbeat_at?: string | null;
          last_error?: string | null;
          started_at?: string | null;
          finished_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          lesson_id?: string | null;
          job_type?: string;
          status?: string;
          priority?: number;
          payload?: Json;
          progress?: Json;
          result?: Json | null;
          attempts?: number;
          max_attempts?: number;
          run_after?: string;
          locked_by?: string | null;
          locked_at?: string | null;
          heartbeat_at?: string | null;
          last_error?: string | null;
          started_at?: string | null;
          finished_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "processing_jobs_lesson_id_user_id_fkey";
            columns: ["lesson_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "lessons";
            referencedColumns: ["id", "user_id"];
          },
        ];
      };
      profiles: {
        Row: {
          id: string;
          display_name: string | null;
          auto_delete_audio: boolean;
          audio_retention_hours: number;
          monthly_budget_usd: number | null;
          max_audio_hours_per_month: number | null;
          max_lessons_per_month: number | null;
          max_research_topics_per_lesson: number | null;
          max_sources_per_topic: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          display_name?: string | null;
          auto_delete_audio?: boolean;
          audio_retention_hours?: number;
          monthly_budget_usd?: number | null;
          max_audio_hours_per_month?: number | null;
          max_lessons_per_month?: number | null;
          max_research_topics_per_lesson?: number | null;
          max_sources_per_topic?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          display_name?: string | null;
          auto_delete_audio?: boolean;
          audio_retention_hours?: number;
          monthly_budget_usd?: number | null;
          max_audio_hours_per_month?: number | null;
          max_lessons_per_month?: number | null;
          max_research_topics_per_lesson?: number | null;
          max_sources_per_topic?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      quiz_attempts: {
        Row: {
          id: string;
          user_id: string;
          quiz_id: string;
          answers: Json;
          score: number;
          total: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          quiz_id: string;
          answers: Json;
          score: number;
          total: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          quiz_id?: string;
          answers?: Json;
          score?: number;
          total?: number;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "quiz_attempts_quiz_id_user_id_fkey";
            columns: ["quiz_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "quizzes";
            referencedColumns: ["id", "user_id"];
          },
        ];
      };
      quiz_questions: {
        Row: {
          id: string;
          user_id: string;
          quiz_id: string;
          position: number;
          statement: string;
          options: string[];
          correct_index: number;
          explanation: string;
          source_reference: string | null;
          origin: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          quiz_id: string;
          position: number;
          statement: string;
          options: string[];
          correct_index: number;
          explanation: string;
          source_reference?: string | null;
          origin?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          quiz_id?: string;
          position?: number;
          statement?: string;
          options?: string[];
          correct_index?: number;
          explanation?: string;
          source_reference?: string | null;
          origin?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "quiz_questions_quiz_id_user_id_fkey";
            columns: ["quiz_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "quizzes";
            referencedColumns: ["id", "user_id"];
          },
        ];
      };
      quizzes: {
        Row: {
          id: string;
          user_id: string;
          lesson_id: string;
          title: string;
          model: string | null;
          prompt_version: string | null;
          transcription_sha256: string | null;
          question_count: number;
          generated_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          lesson_id: string;
          title: string;
          model?: string | null;
          prompt_version?: string | null;
          transcription_sha256?: string | null;
          question_count: number;
          generated_at?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          lesson_id?: string;
          title?: string;
          model?: string | null;
          prompt_version?: string | null;
          transcription_sha256?: string | null;
          question_count?: number;
          generated_at?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "quizzes_lesson_id_user_id_fkey";
            columns: ["lesson_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "lessons";
            referencedColumns: ["id", "user_id"];
          },
        ];
      };
      saved_books: {
        Row: {
          id: string;
          user_id: string;
          source_id: string;
          lesson_id: string | null;
          topic: string | null;
          note: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          source_id: string;
          lesson_id?: string | null;
          topic?: string | null;
          note?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          source_id?: string;
          lesson_id?: string | null;
          topic?: string | null;
          note?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "saved_books_lesson_id_user_id_fkey";
            columns: ["lesson_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "lessons";
            referencedColumns: ["id", "user_id"];
          },
          {
            foreignKeyName: "saved_books_source_id_user_id_fkey";
            columns: ["source_id", "user_id"];
            isOneToOne: true;
            referencedRelation: "scientific_sources";
            referencedColumns: ["id", "user_id"];
          },
        ];
      };
      scientific_sources: {
        Row: {
          id: string;
          user_id: string;
          source_type: string;
          provider: string;
          external_id: string;
          doi: string | null;
          isbn: string[];
          title: string;
          authors: Json;
          publication_year: number | null;
          venue: string | null;
          publisher: string | null;
          edition: string | null;
          landing_url: string | null;
          open_access_url: string | null;
          abstract: string | null;
          evidence_level: string;
          is_retracted: boolean;
          has_correction: boolean;
          verification: Json;
          verified_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          source_type: string;
          provider: string;
          external_id: string;
          doi?: string | null;
          isbn?: string[];
          title: string;
          authors?: Json;
          publication_year?: number | null;
          venue?: string | null;
          publisher?: string | null;
          edition?: string | null;
          landing_url?: string | null;
          open_access_url?: string | null;
          abstract?: string | null;
          evidence_level?: string;
          is_retracted?: boolean;
          has_correction?: boolean;
          verification?: Json;
          verified_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          source_type?: string;
          provider?: string;
          external_id?: string;
          doi?: string | null;
          isbn?: string[];
          title?: string;
          authors?: Json;
          publication_year?: number | null;
          venue?: string | null;
          publisher?: string | null;
          edition?: string | null;
          landing_url?: string | null;
          open_access_url?: string | null;
          abstract?: string | null;
          evidence_level?: string;
          is_retracted?: boolean;
          has_correction?: boolean;
          verification?: Json;
          verified_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      study_materials: {
        Row: {
          id: string;
          user_id: string;
          lesson_id: string;
          kind: string;
          schema_version: number;
          content: Json;
          content_markdown: string | null;
          model: string | null;
          prompt_version: string | null;
          transcription_sha256: string | null;
          generated_at: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          lesson_id: string;
          kind: string;
          schema_version?: number;
          content: Json;
          content_markdown?: string | null;
          model?: string | null;
          prompt_version?: string | null;
          transcription_sha256?: string | null;
          generated_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          lesson_id?: string;
          kind?: string;
          schema_version?: number;
          content?: Json;
          content_markdown?: string | null;
          model?: string | null;
          prompt_version?: string | null;
          transcription_sha256?: string | null;
          generated_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "study_materials_lesson_id_user_id_fkey";
            columns: ["lesson_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "lessons";
            referencedColumns: ["id", "user_id"];
          },
        ];
      };
      subjects: {
        Row: {
          id: string;
          user_id: string;
          course_id: string | null;
          name: string;
          code: string | null;
          professor: string | null;
          description: string | null;
          keywords: string[];
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          course_id?: string | null;
          name: string;
          code?: string | null;
          professor?: string | null;
          description?: string | null;
          keywords?: string[];
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          course_id?: string | null;
          name?: string;
          code?: string | null;
          professor?: string | null;
          description?: string | null;
          keywords?: string[];
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "subjects_course_id_user_id_fkey";
            columns: ["course_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "courses";
            referencedColumns: ["id", "user_id"];
          },
        ];
      };
      transcription_segments: {
        Row: {
          id: string;
          user_id: string;
          lesson_id: string;
          upload_id: string;
          segment_index: number;
          start_seconds: number;
          end_seconds: number;
          overlap_seconds: number;
          status: string;
          text: string | null;
          model: string | null;
          attempts: number;
          last_error: string | null;
          review_flags: Json;
          usage: Json;
          completed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          lesson_id: string;
          upload_id: string;
          segment_index: number;
          start_seconds: number;
          end_seconds: number;
          overlap_seconds?: number;
          status?: string;
          text?: string | null;
          model?: string | null;
          attempts?: number;
          last_error?: string | null;
          review_flags?: Json;
          usage?: Json;
          completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          lesson_id?: string;
          upload_id?: string;
          segment_index?: number;
          start_seconds?: number;
          end_seconds?: number;
          overlap_seconds?: number;
          status?: string;
          text?: string | null;
          model?: string | null;
          attempts?: number;
          last_error?: string | null;
          review_flags?: Json;
          usage?: Json;
          completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "transcription_segments_lesson_id_user_id_fkey";
            columns: ["lesson_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "lessons";
            referencedColumns: ["id", "user_id"];
          },
          {
            foreignKeyName: "transcription_segments_upload_id_user_id_fkey";
            columns: ["upload_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "audio_uploads";
            referencedColumns: ["id", "user_id"];
          },
        ];
      };
      transcriptions: {
        Row: {
          id: string;
          user_id: string;
          lesson_id: string;
          source: string;
          original_text: string;
          edited_text: string | null;
          edited_at: string | null;
          language: string | null;
          model: string | null;
          source_filename: string | null;
          segment_count: number | null;
          integrity_status: string;
          integrity_report: Json;
          review_flags: Json;
          word_count: number;
          char_count: number;
          content_sha256: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          lesson_id: string;
          source: string;
          original_text: string;
          edited_text?: string | null;
          edited_at?: string | null;
          language?: string | null;
          model?: string | null;
          source_filename?: string | null;
          segment_count?: number | null;
          integrity_status?: string;
          integrity_report?: Json;
          review_flags?: Json;
          word_count: number;
          char_count: number;
          content_sha256: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          lesson_id?: string;
          source?: string;
          original_text?: string;
          edited_text?: string | null;
          edited_at?: string | null;
          language?: string | null;
          model?: string | null;
          source_filename?: string | null;
          segment_count?: number | null;
          integrity_status?: string;
          integrity_report?: Json;
          review_flags?: Json;
          word_count?: number;
          char_count?: number;
          content_sha256?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "transcriptions_lesson_id_user_id_fkey";
            columns: ["lesson_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "lessons";
            referencedColumns: ["id", "user_id"];
          },
        ];
      };
      usage_records: {
        Row: {
          id: string;
          user_id: string;
          lesson_id: string | null;
          job_id: string | null;
          provider: string;
          operation: string;
          model: string | null;
          audio_seconds: number | null;
          input_tokens: number | null;
          output_tokens: number | null;
          cached_input_tokens: number | null;
          request_count: number;
          estimated_cost_usd: number;
          cost_is_estimate: boolean;
          pricing: Json;
          occurred_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          lesson_id?: string | null;
          job_id?: string | null;
          provider: string;
          operation: string;
          model?: string | null;
          audio_seconds?: number | null;
          input_tokens?: number | null;
          output_tokens?: number | null;
          cached_input_tokens?: number | null;
          request_count?: number;
          estimated_cost_usd?: number;
          cost_is_estimate?: boolean;
          pricing?: Json;
          occurred_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          lesson_id?: string | null;
          job_id?: string | null;
          provider?: string;
          operation?: string;
          model?: string | null;
          audio_seconds?: number | null;
          input_tokens?: number | null;
          output_tokens?: number | null;
          cached_input_tokens?: number | null;
          request_count?: number;
          estimated_cost_usd?: number;
          cost_is_estimate?: boolean;
          pricing?: Json;
          occurred_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "usage_records_job_id_fkey";
            columns: ["job_id"];
            isOneToOne: false;
            referencedRelation: "processing_jobs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "usage_records_lesson_id_user_id_fkey";
            columns: ["lesson_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "lessons";
            referencedColumns: ["id", "user_id"];
          },
        ];
      };
    };
    Views: { [_ in never]: never };
    Functions: {
      claim_next_job: {
        Args: {
          p_worker_id: string;
          p_job_types?: string[];
          p_stale_after_seconds?: number;
        };
        Returns: Database["public"]["Tables"]["processing_jobs"]["Row"][];
      };
      complete_job: {
        Args: {
          p_job_id: string;
          p_worker_id: string;
          p_result?: Json;
        };
        Returns: boolean;
      };
      enqueue_job: {
        Args: {
          p_user_id: string;
          p_lesson_id: string;
          p_job_type: string;
          p_payload?: Json;
          p_priority?: number;
          p_max_attempts?: number;
          p_run_after?: string;
        };
        Returns: Database["public"]["Tables"]["processing_jobs"]["Row"];
      };
      fail_job: {
        Args: {
          p_job_id: string;
          p_worker_id: string;
          p_error: string;
          p_retry?: boolean;
        };
        Returns: Database["public"]["Tables"]["processing_jobs"]["Row"];
      };
      heartbeat_job: {
        Args: {
          p_job_id: string;
          p_worker_id: string;
          p_progress?: Json;
        };
        Returns: boolean;
      };
      import_transcription: {
        Args: {
          p_text: string;
          p_source: string;
          p_lesson_id?: string;
          p_subject_id?: string;
          p_title?: string;
          p_lesson_date?: string;
          p_source_filename?: string;
        };
        Returns: string;
      };
      request_job_retry: {
        Args: {
          p_job_id: string;
        };
        Returns: Database["public"]["Tables"]["processing_jobs"]["Row"];
      };
    };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};

type PublicSchema = Database["public"];

export type Tables<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Row"];
export type TablesInsert<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Insert"];
export type TablesUpdate<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Update"];
