alter table app_settings
  add column if not exists show_gpx_download_participant bool not null default true,
  add column if not exists show_gpx_download_benevoles   bool not null default true;
