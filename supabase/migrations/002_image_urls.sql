-- Store the public URLs of the source images uploaded for each analysis.
-- Populated by the API route after uploading to the 'aesthetic-images'
-- storage bucket; rendered as the "Source material" gallery in DnaReport.
alter table public.aesthetic_profiles
  add column if not exists image_urls text[] default '{}';
