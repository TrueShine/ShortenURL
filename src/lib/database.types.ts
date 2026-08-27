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
