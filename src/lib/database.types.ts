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
      };
    };
  };
};

export type LinkRow = Database["public"]["Tables"]["links"]["Row"];
export type ClickRow = Database["public"]["Tables"]["clicks"]["Row"];
