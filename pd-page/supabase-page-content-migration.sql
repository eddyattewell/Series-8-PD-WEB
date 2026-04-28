-- Create page_content table for storing edited page HTML
CREATE TABLE IF NOT EXISTS page_content (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    page_path TEXT NOT NULL UNIQUE,
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_page_content_path ON page_content(page_path);

-- Enable RLS
ALTER TABLE page_content ENABLE ROW LEVEL SECURITY;

-- Allow public read access (optional - adjust as needed)
CREATE POLICY "Allow public read" ON page_content FOR SELECT USING (true);
