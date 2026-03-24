export type RightsType = "ORIGINAL" | "LICENSED";
export type AssetKind =
  | "HERO"
  | "CARD"
  | "THUMB"
  | "WALLPAPER"
  | "AVATAR_FRAME"
  | "PROFILE_THEME";
export type AssetWorkflowStatus =
  | "UPLOADED"
  | "NORMALIZED"
  | "TAGGED"
  | "RIGHTS_CHECKED"
  | "REVIEWED"
  | "PUBLISHED"
  | "PULLED";
export type CurrencyType = "SOFT" | "PREMIUM";
export type LedgerReferenceType =
  | "STARTER_GRANT"
  | "DAILY_REWARD"
  | "AD_REWARD"
  | "BUY_SUPPORT"
  | "SELL_SUPPORT"
  | "SHOP_PURCHASE";
export type NotificationType = "SYSTEM" | "REWARD" | "TRADE" | "SOCIAL" | "SHOP";
export type SourceKind = "MANUAL" | "BANGUMI";
export type UserRole = "USER" | "ADMIN";

export interface Series {
  id: string;
  slug: string;
  title: string;
  summary: string;
  rightsType: RightsType;
  metadataOnly: boolean;
  bangumiUrl?: string;
}

export interface User {
  id: string;
  email?: string;
  name: string;
  image?: string;
  role: UserRole;
}

export interface Profile {
  id: string;
  userId: string;
  handle: string;
  displayName: string;
  bio: string;
  holdingsVisibility: boolean;
  favoriteTags: string[];
  pinnedCharacterIds: string[];
  equippedFrameAsset?: string;
  equippedThemeAsset?: string;
}

export interface Wallet {
  id: string;
  userId: string;
  softBalance: number;
  premiumBalance: number;
}

export interface LedgerEntry {
  id: string;
  walletId: string;
  currencyType: CurrencyType;
  delta: number;
  balanceAfter: number;
  referenceType: LedgerReferenceType;
  referenceId: string;
  idempotencyKey: string;
  createdAt: string;
}

export interface AttributeDefinition {
  id: string;
  key: string;
  label: string;
  valueType: "enum" | "multi" | "number" | "boolean" | "text";
  filterable: boolean;
  sortable: boolean;
  displayable: boolean;
  sensitive: boolean;
  spoiler: boolean;
  displayOrder: number;
  options?: string[];
}

export interface CharacterAttributeValue {
  definitionId: string;
  value: string;
}

export interface RightsGrant {
  id: string;
  seriesId?: string;
  characterId?: string;
  licensor: string;
  contractReference: string;
  territories: string[];
  salesChannels: string[];
  allowedUseTypes: string[];
  attributionText: string;
  takedownContact: string;
  embargoAt?: string;
  expiresAt?: string;
  commercialUse: boolean;
}

export interface SourceAttribution {
  id: string;
  characterId: string;
  sourceKind: SourceKind;
  sourceLabel: string;
  sourceUrl: string;
  licenseName: string;
  attributionText: string;
  importedText?: string;
  originalAuthor?: string;
  importedAt: string;
}

export interface CharacterAsset {
  id: string;
  characterId?: string;
  kind: AssetKind;
  label: string;
  storageKey: string;
  altText: string;
  workflowStatus: AssetWorkflowStatus;
  publishedAt?: string;
  version: number;
  rightsGrantId?: string;
  metadata?: Record<string, string | number | boolean>;
}

export interface Character {
  id: string;
  seriesId: string;
  slug: string;
  name: string;
  title: string;
  summary: string;
  fandomPrompt: string;
  mood: string;
  rightsType: RightsType;
  metadataOnly: boolean;
  basePrice: number;
  priceStep: number;
  unitsPerStep: number;
  circulatingUnits: number;
  supporterCount: number;
  isFeatured: boolean;
  tags: string[];
  accentFrom: string;
  accentTo: string;
  relatedCharacterIds: string[];
  attributeValues: CharacterAttributeValue[];
  assetIds: string[];
  rightsGrantIds: string[];
  sourceAttributionId?: string;
}

export interface SupportPosition {
  id: string;
  userId: string;
  characterId: string;
  units: number;
  averageCost: number;
  updatedAt: string;
}

export interface Trade {
  id: string;
  userId: string;
  characterId: string;
  side: "BUY" | "SELL";
  quantity: number;
  totalCost: number;
  unitPrice: number;
  createdAt: string;
}

export interface DailyRewardClaim {
  id: string;
  userId: string;
  dayKey: string;
  amount: number;
  claimedAt: string;
}

export interface AdRewardClaim {
  id: string;
  userId: string;
  dayKey: string;
  amount: number;
  claimedAt: string;
}

export interface WatchlistItem {
  id: string;
  userId: string;
  characterId: string;
  createdAt: string;
}

export interface Comment {
  id: string;
  userId: string;
  characterId: string;
  content: string;
  createdAt: string;
}

export interface Reaction {
  id: string;
  userId: string;
  characterId: string;
  kind: "CHEER" | "HEART" | "HYPE";
  createdAt: string;
}

export interface Report {
  id: string;
  userId: string;
  characterId?: string;
  commentId?: string;
  reason: string;
  detail?: string;
  createdAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  body: string;
  type: NotificationType;
  readAt?: string;
  createdAt: string;
}

export interface ShopCollection {
  id: string;
  slug: string;
  title: string;
  description: string;
}

export interface ShopItem {
  id: string;
  collectionId: string;
  slug: string;
  title: string;
  description: string;
  kind: AssetKind;
  currencyType: CurrencyType;
  price: number;
  previewLabel: string;
  unlockPayload: Record<string, string>;
  published: boolean;
}

export interface InventoryItem {
  id: string;
  userId: string;
  shopItemId: string;
  equipped: boolean;
  createdAt: string;
}

export interface SeedSnapshot {
  users: User[];
  profiles: Profile[];
  wallets: Wallet[];
  ledgerEntries: LedgerEntry[];
  series: Series[];
  attributeDefinitions: AttributeDefinition[];
  rightsGrants: RightsGrant[];
  sourceAttributions: SourceAttribution[];
  assets: CharacterAsset[];
  characters: Character[];
  positions: SupportPosition[];
  trades: Trade[];
  dailyRewardClaims: DailyRewardClaim[];
  adRewardClaims: AdRewardClaim[];
  watchlistItems: WatchlistItem[];
  comments: Comment[];
  reactions: Reaction[];
  reports: Report[];
  notifications: Notification[];
  shopCollections: ShopCollection[];
  shopItems: ShopItem[];
  inventoryItems: InventoryItem[];
}

export interface CharacterView {
  character: Character;
  series: Series;
  assets: CharacterAsset[];
  rightsGrants: RightsGrant[];
  sourceAttribution?: SourceAttribution;
  attributes: Array<AttributeDefinition & { value: string }>;
  quote: number;
  sellQuote: number;
  relatedCharacters: Character[];
  comments: Array<Comment & { author: Profile | undefined }>;
  reactions: Reaction[];
}

export interface PortfolioView {
  profile: Profile;
  wallet: Wallet;
  positions: Array<
    SupportPosition & {
      character: Character;
      currentQuote: number;
      currentValue: number;
    }
  >;
  inventory: Array<InventoryItem & { item: ShopItem }>;
  watchlist: Character[];
  notifications: Notification[];
}
