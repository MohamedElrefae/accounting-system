-- SQL-based email sending for invitations using Postgres http extension (Resend)
-- IMPORTANT: Replace placeholders before running:
-- 1) Replace YOUR_RESEND_API_KEY with your actual Resend API key
-- 2) Replace YOUR_APP_BASE_URL with your app base URL, e.g. https://accounting.yourdomain.com or http://localhost:3000

-- Enable http extension (safe if already enabled)
CREATE EXTENSION IF NOT EXISTS http;

-- Create internal schema to store secrets securely and helper functions
CREATE SCHEMA IF NOT EXISTS internal;

-- Secrets table (RLS disabled; only functions with SECURITY DEFINER may access)
CREATE TABLE IF NOT EXISTS internal.secrets (
  key text PRIMARY KEY,
  value text NOT NULL
);

-- Upsert secrets (EDIT THESE VALUES BEFORE RUNNING!)
INSERT INTO internal.secrets(key, value) VALUES
  ('RESEND_API_KEY', 'YOUR_RESEND_API_KEY'),
  ('APP_BASE_URL', 'YOUR_APP_BASE_URL')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- Helper to read a secret by key
CREATE OR REPLACE FUNCTION internal.get_secret(p_key text)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, internal
AS $$
  SELECT value FROM internal.secrets WHERE key = p_key;
$$;

-- Email logs for diagnostics
CREATE TABLE IF NOT EXISTS internal.email_logs (
  id bigserial PRIMARY KEY,
  created_at timestamptz DEFAULT now(),
  recipient text NOT NULL,
  link text,
  status int,
  response text,
  error text
);

-- Function to send invite via Resend
CREATE OR REPLACE FUNCTION internal.send_invite_resend(p_to text, p_link text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, internal
AS $$
DECLARE
  v_api_key text;
  v_from text := coalesce(internal.get_secret('INVITE_FROM_EMAIL'), 'onboarding@resend.dev');
  v_payload jsonb;
  v_http jsonb;
  v_status int;
  v_content text;
BEGIN
  v_api_key := internal.get_secret('RESEND_API_KEY');
  IF v_api_key IS NULL OR v_api_key = '' THEN
    INSERT INTO internal.email_logs(recipient, link, error) VALUES (p_to, p_link, 'RESEND_API_KEY not set');
    RETURN false;
  END IF;

  v_payload := jsonb_build_object(
    'from', v_from,
    'to', p_to,
    'subject', 'دعوتك للانضمام للنظام',
    'html', concat(
      '<p>تمت دعوتك للانضمام للنظام.</p>',
      '<p><a href="', p_link, '">اضغط هنا لإكمال التسجيل</a></p>',
      '<p>إذا لم تتوقع هذه الرسالة فتجاهلها.</p>'
    )
  );

  -- Call Resend and capture status + content
  SELECT jsonb_build_object('status', status, 'content', content)
    INTO v_http
  FROM http( (
    'POST',
    'https://api.resend.com/emails',
    ARRAY[
      ('Authorization', 'Bearer ' || v_api_key),
      ('Content-Type', 'application/json')
    ]::http_header[],
    v_payload::text
  ) );

  v_status := (v_http->>'status')::int;
  v_content := v_http->>'content';

  INSERT INTO internal.email_logs(recipient, link, status, response)
  VALUES (p_to, p_link, v_status, v_content);

  IF v_status BETWEEN 200 AND 299 THEN
    RETURN true;
  ELSE
    RETURN false;
  END IF;
EXCEPTION WHEN OTHERS THEN
  INSERT INTO internal.email_logs(recipient, link, error)
  VALUES (p_to, p_link, SQLERRM);
  RETURN false;
END;
$$;

-- Trigger function: after insert on user_invitations, send email if status is pending
CREATE OR REPLACE FUNCTION internal.after_user_invitation_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, internal
AS $$
DECLARE
  v_base_url text;
  v_link text;
  v_sent boolean;
BEGIN
  -- Only fire for pending invitations
  IF NEW.status IS DISTINCT FROM 'pending' THEN
    RETURN NEW;
  END IF;

  v_base_url := internal.get_secret('APP_BASE_URL');
  IF v_base_url IS NULL OR v_base_url = '' THEN
    RAISE WARNING 'APP_BASE_URL not set';
    RETURN NEW;
  END IF;

  v_link := v_base_url || '/register?token=' || NEW.invitation_token;
  v_sent := internal.send_invite_resend(NEW.email, v_link);

  IF v_sent THEN
    UPDATE user_invitations
      SET status = 'sent', sent_at = now()
      WHERE id = NEW.id;
  ELSE
    -- Optionally record error state
    UPDATE user_invitations
      SET status = 'error'
      WHERE id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_after_user_invitation_insert ON public.user_invitations;
CREATE TRIGGER trg_after_user_invitation_insert
AFTER INSERT ON public.user_invitations
FOR EACH ROW EXECUTE FUNCTION internal.after_user_invitation_insert();

-- Done. After running this script:
-- - Update internal.secrets with your actual keys/URL.
-- - Any new row inserted into user_invitations with status='pending' will trigger an email via Resend.

