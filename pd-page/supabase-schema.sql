create table if not exists discipline_officers (
    id bigint generated always as identity primary key,
    display_name text not null,
    badge_number text not null unique,
    flagged boolean not null default false,
    flagged_at timestamptz null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table if not exists discipline_incidents (
    id bigint generated always as identity primary key,
    officer_id bigint null references discipline_officers (id) on delete set null,
    officer_name text not null,
    badge_number text not null,
    reason text not null,
    type text not null check (type in ('warning', 'strike')),
    active boolean not null default true,
    flagged boolean not null default false,
    flagged_at timestamptz null,
    auto_generated boolean not null default false,
    converted_to_strike boolean not null default false,
    created_by text null,
    created_at timestamptz not null default now(),
    expires_at timestamptz not null,
    expired_at timestamptz null
);

create index if not exists discipline_incidents_officer_id_idx on discipline_incidents (officer_id);
create index if not exists discipline_incidents_badge_number_idx on discipline_incidents (badge_number);
create index if not exists discipline_incidents_active_idx on discipline_incidents (active);
create index if not exists discipline_incidents_type_idx on discipline_incidents (type);
create index if not exists discipline_incidents_expires_at_idx on discipline_incidents (expires_at);

create table if not exists discipline_panels (
    id bigint generated always as identity primary key,
    panel_name text not null unique,
    channel_id text null,
    message_id text null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);
