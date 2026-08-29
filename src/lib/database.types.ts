export type Database = {
  public: {
    Tables: {
      links: {
        Row: {
          id: string;
          slug: string;
          target_url: string;
          expires_at: string | null;
          password_hash: string | null;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          target_url: string;
          expires_at?: string | null;
          password_hash?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          slug?: string;
          target_url?: string;
          expires_at?: string | null;
          password_hash?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      clicks: {
        Row: {
          id: string;
          link_id: string;
          created_at: string;
          referrer: string | null;
        };
        Insert: {
          id?: string;
          link_id: string;
          created_at?: string;
          referrer?: string | null;
        };
        Update: {
          id?: string;
          link_id?: string;
          created_at?: string;
          referrer?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "clicks_link_id_fkey";
            columns: ["link_id"];
            referencedRelation: "links";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          id: string;
          role: "super_admin" | "admin";
          must_change_password: boolean;
          created_at: string;
        };
        Insert: {
          id: string;
          role?: "super_admin" | "admin";
          must_change_password?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          role?: "super_admin" | "admin";
          must_change_password?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      oauth_clients: {
        Row: {
          id: string;
          name: string;
          client_id: string;
          client_secret_hash: string;
          redirect_uris: string[];
          created_by: string | null;
          created_at: string;
          revoked_at: string | null;
        };
        Insert: {
          id?: string;
          name: string;
          client_id: string;
          client_secret_hash: string;
          redirect_uris: string[];
          created_by?: string | null;
          created_at?: string;
          revoked_at?: string | null;
        };
        Update: {
          id?: string;
          name?: string;
          client_id?: string;
          client_secret_hash?: string;
          redirect_uris?: string[];
          created_by?: string | null;
          created_at?: string;
          revoked_at?: string | null;
        };
        Relationships: [];
      };
      oauth_authorization_codes: {
        Row: {
          code: string;
          client_id: string;
          redirect_uri: string;
          code_challenge: string;
          code_challenge_method: string;
          scope: string;
          user_id: string;
          created_at: string;
          expires_at: string;
          used: boolean;
        };
        Insert: {
          code: string;
          client_id: string;
          redirect_uri: string;
          code_challenge: string;
          code_challenge_method?: string;
          scope?: string;
          user_id: string;
          created_at?: string;
          expires_at: string;
          used?: boolean;
        };
        Update: {
          code?: string;
          client_id?: string;
          redirect_uri?: string;
          code_challenge?: string;
          code_challenge_method?: string;
          scope?: string;
          user_id?: string;
          created_at?: string;
          expires_at?: string;
          used?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: "oauth_authorization_codes_client_id_fkey";
            columns: ["client_id"];
            referencedRelation: "oauth_clients";
            referencedColumns: ["id"];
          },
        ];
      };
      oauth_refresh_tokens: {
        Row: {
          token_hash: string;
          client_id: string;
          user_id: string;
          scope: string;
          created_at: string;
          expires_at: string;
          revoked_at: string | null;
        };
        Insert: {
          token_hash: string;
          client_id: string;
          user_id: string;
          scope?: string;
          created_at?: string;
          expires_at: string;
          revoked_at?: string | null;
        };
        Update: {
          token_hash?: string;
          client_id?: string;
          user_id?: string;
          scope?: string;
          created_at?: string;
          expires_at?: string;
          revoked_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "oauth_refresh_tokens_client_id_fkey";
            columns: ["client_id"];
            referencedRelation: "oauth_clients";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

export type LinkRow = Database["public"]["Tables"]["links"]["Row"];
export type ClickRow = Database["public"]["Tables"]["clicks"]["Row"];
export type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];
export type OAuthClientRow = Database["public"]["Tables"]["oauth_clients"]["Row"];
export type OAuthAuthorizationCodeRow =
  Database["public"]["Tables"]["oauth_authorization_codes"]["Row"];
export type OAuthRefreshTokenRow =
  Database["public"]["Tables"]["oauth_refresh_tokens"]["Row"];
