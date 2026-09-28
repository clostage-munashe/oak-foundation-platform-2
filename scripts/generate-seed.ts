import { writeFileSync } from 'node:fs';
import { partners, sessions, initialNotes, resources } from '../src/lib/data';
const sql = (value: unknown) => `'${JSON.stringify(value).replaceAll("'", "''")}'::jsonb`;
const rows = [
  '-- Reference-derived sample content. Review before a real event.',
  '-- Day 2/3 schedules and unspecified partner descriptions are illustrative.',
];
for (const [table, data] of [
  ['partners', partners],
  ['sessions', sessions],
] as const)
  data.forEach((item, index) =>
    rows.push(
      `insert into public.${table} (id, position, data) values ('${item.id}', ${index}, ${sql(item)}) on conflict (id) do nothing;`,
    ),
  );
initialNotes.forEach((n) =>
  rows.push(
    `insert into public.notes (id, data) values ('${n.id}', ${sql(n)}) on conflict (id) do nothing;`,
  ),
);
resources.forEach((r) =>
  rows.push(
    `insert into public.resources (id, name) values ('${r.id}', '${r.name.replaceAll("'", "''")}') on conflict (id) do nothing;`,
  ),
);
writeFileSync('supabase/seed.sql', rows.join('\n') + '\n');
