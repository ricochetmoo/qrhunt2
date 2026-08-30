import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  isAnonymous: boolean("is_anonymous").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at").notNull(),
    token: text("token").notNull().unique(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [index("session_user_id_idx").on(table.userId)],
);

export const account = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at"),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("account_user_id_idx").on(table.userId),
    uniqueIndex("account_provider_account_idx").on(
      table.providerId,
      table.accountId,
    ),
  ],
);

export const verification = pgTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [index("verification_identifier_idx").on(table.identifier)],
);

export const authSchema = { user, session, account, verification };

export const games = pgTable(
  "games",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    status: text("status").notNull().default("draft"),
    pauseReason: text("pause_reason"),
    // Code players type (or embed in a QR) to join the game.
    gameCode: text("game_code").notNull().unique(),
    // Player sign-up rules.
    allowSelfSignup: boolean("allow_self_signup").notNull().default(true),
    allowTeamCreation: boolean("allow_team_creation").notNull().default(true),
    allowTeamNames: boolean("allow_team_names").notNull().default(true),
    allowTeamPhotos: boolean("allow_team_photos").notNull().default(false),
    routeSignupEnabled: boolean("route_signup_enabled").notNull().default(false),
    // Wildcard object that can be scanned outside the ordered route.
    wildcardEnabled: boolean("wildcard_enabled").notNull().default(false),
    wildcardName: text("wildcard_name"),
    // Start behaviour and poster details.
    staggeredStart: boolean("staggered_start").notNull().default(false),
    qrRemoveBy: timestamp("qr_remove_by"),
    issueContactPhone: text("issue_contact_phone"),
    // Set the first time the game enters `started` / `finished`.
    startedAt: timestamp("started_at"),
    finishedAt: timestamp("finished_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [index("games_name_idx").on(table.name)],
);

/**
 * A player who has joined a game (by game code, route QR, or team code).
 * Separate from team membership: a player joins the game first, then creates
 * or joins a team within it.
 */
export const game_players = pgTable(
  "game_players",
  {
    id: text("id").primaryKey(),
    gameId: text("game_id")
      .notNull()
      .references(() => games.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    joinedVia: text("joined_via").notNull(), // game_code | route_qr | team_code
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("game_players_game_id_user_id_idx").on(table.gameId, table.userId),
    index("game_players_user_id_idx").on(table.userId),
  ],
);

export const game_admins = pgTable(
  "game_admins",
  {
    id: text("id").primaryKey(),
    gameId: text("game_id")
      .notNull()
      .references(() => games.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("game_admins_game_id_idx").on(table.gameId),
    index("game_admins_user_id_idx").on(table.userId),
  ],
);

export const teams = pgTable(
  "teams",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    gameId: text("game_id")
      .notNull()
      .references(() => games.id, { onDelete: "cascade" }),
    // Code other devices enter to join this team.
    teamCode: text("team_code").notNull().unique(),
    // https URL or a small `data:image/...;base64,` payload.
    photoUrl: text("photo_url"),
    // Staggered start: when the team was released. Finished: route complete.
    startedAt: timestamp("started_at"),
    finishedAt: timestamp("finished_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [index("teams_game_id_idx").on(table.gameId)],
);

export const team_memberships = pgTable(
  "team_memberships",
  {
    id: text("id").primaryKey(),
    teamId: text("team_id")
      .notNull()
      .references(() => teams.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("team_memberships_team_id_idx").on(table.teamId),
    index("team_memberships_user_id_idx").on(table.userId),
  ],
);

export const qr_codes = pgTable(
  "qr_codes",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    hint: text("hint").notNull(),
    latitude: text("latitude"),
    longitude: text("longitude"),
    code: text("code").notNull().unique(),
    sortOrder: integer("sort_order").notNull().default(0),
    // The optional wildcard object sits outside the ordered route.
    isWildcard: boolean("is_wildcard").notNull().default(false),
    gameId: text("game_id")
      .notNull()
      .references(() => games.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("qr_codes_game_id_idx").on(table.gameId),
    index("qr_codes_game_id_sort_order_idx").on(table.gameId, table.sortOrder),
  ],
);

export const qr_code_scans = pgTable(
  "qr_code_scans",
  {
    id: text("id").primaryKey(),
    qrCodeId: text("qr_code_id")
      .notNull()
      .references(() => qr_codes.id, { onDelete: "cascade" }),
    teamId: text("team_id")
      .notNull()
      .references(() => teams.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    // Authoritative outcome (see `src/lib/scan-results.ts`).
    result: text("result").notNull().default("accepted"),
    // Client-generated idempotency key for offline sync; unique per team.
    clientScanId: text("client_scan_id"),
    // When the device scanned it (untrusted); `createdAt` is server receipt.
    clientScannedAt: timestamp("client_scanned_at"),
    latitude: text("latitude"),
    longitude: text("longitude"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("qr_code_scans_qr_code_id_idx").on(table.qrCodeId),
    index("qr_code_scans_team_id_idx").on(table.teamId),
    index("qr_code_scans_user_id_idx").on(table.userId),
    uniqueIndex("qr_code_scans_team_client_scan_idx").on(table.teamId, table.clientScanId),
    // A team can be credited for each code at most once, even under
    // concurrent syncs from several devices.
    uniqueIndex("qr_code_scans_team_credit_once_idx")
      .on(table.teamId, table.qrCodeId)
      .where(sql`result in ('accepted', 'wildcard')`),
  ],
);

export const gameSchema = {
  games,
  game_admins,
  game_players,
  teams,
  team_memberships,
  qr_codes,
  qr_code_scans,
};

export type User = typeof user.$inferSelect;
export type NewUser = typeof user.$inferInsert;
export type Session = typeof session.$inferSelect;
export type NewSession = typeof session.$inferInsert;
export type Account = typeof account.$inferSelect;
export type NewAccount = typeof account.$inferInsert;
export type Verification = typeof verification.$inferSelect;
export type NewVerification = typeof verification.$inferInsert;
export type Game = typeof games.$inferSelect;
export type NewGame = typeof games.$inferInsert;
export type GameAdmin = typeof game_admins.$inferSelect;
export type NewGameAdmin = typeof game_admins.$inferInsert;
export type GamePlayer = typeof game_players.$inferSelect;
export type NewGamePlayer = typeof game_players.$inferInsert;
export type Team = typeof teams.$inferSelect;
export type NewTeam = typeof teams.$inferInsert;
export type TeamMembership = typeof team_memberships.$inferSelect;
export type NewTeamMembership = typeof team_memberships.$inferInsert;
export type QrCode = typeof qr_codes.$inferSelect;
export type NewQrCode = typeof qr_codes.$inferInsert;
export type QrCodeScan = typeof qr_code_scans.$inferSelect;
export type NewQrCodeScan = typeof qr_code_scans.$inferInsert;