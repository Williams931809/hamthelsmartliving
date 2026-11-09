import { sqliteTable, text, primaryKey } from 'drizzle-orm/sqlite-core';
export const records = sqliteTable('records', { entity: text('entity').notNull(), id: text('id').notNull(), payload: text('payload').notNull() }, t => [primaryKey({columns:[t.entity,t.id]})]);
export const siteState = sqliteTable('site_state', { key: text('key').primaryKey(), value: text('value').notNull() });
