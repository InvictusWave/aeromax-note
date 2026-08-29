import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { relations } from 'drizzle-orm';

export const events = sqliteTable('events', {
  id: integer('id').primaryKey({ autoIncrement: true }), name: text('name').notNull(), date: text('date').notNull(), location: text('location').notNull(), organizer: text('organizer').notNull(), type: text('type').notNull(), nextActions: text('next_actions', { mode: 'json' }).$type<string[]>().notNull().default([]), generalNotes: text('general_notes').notNull().default(''), followUpDone: integer('follow_up_done', { mode: 'boolean' }).notNull().default(false), createdAt: text('created_at').notNull(),
});
export const networking = sqliteTable('networking', { id: integer('id').primaryKey({ autoIncrement: true }), eventId: integer('event_id').notNull().references(() => events.id, { onDelete: 'cascade' }), name: text('name').notNull(), company: text('company').notNull().default(''), position: text('position').notNull().default(''), contact: text('contact').notNull().default(''), social: text('social').notNull().default(''), chatSummary: text('chat_summary').notNull().default(''), potential: text('potential').notNull().default(''), followUp: integer('follow_up', { mode: 'boolean' }).notNull().default(false) });
export const prospects = sqliteTable('prospects', { id: integer('id').primaryKey({ autoIncrement: true }), eventId: integer('event_id').notNull().references(() => events.id, { onDelete: 'cascade' }), companyName: text('company_name').notNull(), industry: text('industry').notNull().default(''), personMet: text('person_met').notNull().default(''), potentialSummary: text('potential_summary').notNull().default(''), notes: text('notes').notNull().default('') });
export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  username: text('username').notNull().unique(),
  pinHash: text('pin_hash').notNull(),
  active: integer('active', { mode: 'boolean' }).notNull().default(true),
  createdAt: text('created_at').notNull(),
  createdBy: integer('created_by'),
});
export const sessions = sqliteTable('sessions', {
  id: text('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  expiresAt: text('expires_at').notNull(),
  createdAt: text('created_at').notNull(),
});
export const eventRelations = relations(events, ({ many }) => ({ networking: many(networking), prospects: many(prospects) }));
export const networkingRelations = relations(networking, ({ one }) => ({ event: one(events, { fields: [networking.eventId], references: [events.id] }) }));
export const prospectRelations = relations(prospects, ({ one }) => ({ event: one(events, { fields: [prospects.eventId], references: [events.id] }) }));
export const userRelations = relations(users, ({ many }) => ({ sessions: many(sessions) }));
export const sessionRelations = relations(sessions, ({ one }) => ({ user: one(users, { fields: [sessions.userId], references: [users.id] }) }));
