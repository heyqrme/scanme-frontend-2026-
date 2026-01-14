/** ChatRequest */
export interface ChatRequest {
  /** Message */
  message: string;
  /**
   * History
   * @default []
   */
  history?: Record<string, any>[];
}

/** ChatResponse */
export interface ChatResponse {
  /** Reply */
  reply: string;
}

/** CheckCodeResponse */
export interface CheckCodeResponse {
  /** Status */
  status: string;
  /** Ownerid */
  ownerId?: string | null;
}

/** ClaimCodeRequest */
export interface ClaimCodeRequest {
  /** Code */
  code: string;
}

/** ClaimCodeResponse */
export interface ClaimCodeResponse {
  /** Success */
  success: boolean;
  /** Message */
  message: string;
}

/** GenerateCodesRequest */
export interface GenerateCodesRequest {
  /** Quantity */
  quantity: number;
  /** Batchname */
  batchName: string;
}

/** GenerateCodesResponse */
export interface GenerateCodesResponse {
  /** Codes */
  codes: string[];
  /** Message */
  message: string;
}

/** HTTPValidationError */
export interface HTTPValidationError {
  /** Detail */
  detail?: ValidationError[];
}

/** HealthResponse */
export interface HealthResponse {
  /** Status */
  status: string;
}

/** LikePostRequest */
export interface LikePostRequest {
  /** Post Id */
  post_id: string;
}

/** LikePostResponse */
export interface LikePostResponse {
  /** Success */
  success: boolean;
  /** Likes Count */
  likes_count: number;
}

/** NotifyFriendRequestRequest */
export interface NotifyFriendRequestRequest {
  /** Receiver Email */
  receiver_email: string;
  /** Sender Name */
  sender_name: string;
  /** Profile Url */
  profile_url: string;
  /** Scan Location */
  scan_location?: string | null;
  /** Receiver Id */
  receiver_id?: string | null;
}

/** NotifyFriendRequestResponse */
export interface NotifyFriendRequestResponse {
  /** Success */
  success: boolean;
}

/** ReverseGeocodeRequest */
export interface ReverseGeocodeRequest {
  /** Lat */
  lat: number;
  /** Lng */
  lng: number;
}

/** ReverseGeocodeResponse */
export interface ReverseGeocodeResponse {
  /** Address */
  address: string | null;
  /** Location Name */
  location_name: string | null;
}

/** ShopifyImage */
export interface ShopifyImage {
  /** Url */
  url: string;
  /** Alttext */
  altText?: string | null;
}

/** ShopifyOption */
export interface ShopifyOption {
  /** Id */
  id: string;
  /** Name */
  name: string;
  /** Values */
  values: string[];
}

/** ShopifyPrice */
export interface ShopifyPrice {
  /** Amount */
  amount: string;
  /** Currencycode */
  currencyCode: string;
}

/** ShopifyProduct */
export interface ShopifyProduct {
  /** Id */
  id: string;
  /** Title */
  title: string;
  /** Description */
  description: string;
  /** Handle */
  handle: string;
  featuredImage?: ShopifyImage | null;
  /** Images */
  images: ShopifyImage[];
  /** Variants */
  variants: ShopifyVariant[];
  /** Options */
  options: ShopifyOption[];
  /** Onlinestoreurl */
  onlineStoreUrl?: string | null;
}

/** ShopifyProductListResponse */
export interface ShopifyProductListResponse {
  /** Products */
  products: ShopifyProduct[];
}

/** ShopifyVariant */
export interface ShopifyVariant {
  /** Id */
  id: string;
  price: ShopifyPrice;
  /** Title */
  title: string;
  /** Availableforsale */
  availableForSale: boolean;
  /** Selectedoptions */
  selectedOptions?: Record<string, any>[] | null;
  image?: ShopifyImage | null;
}

/** ValidationError */
export interface ValidationError {
  /** Location */
  loc: (string | number)[];
  /** Message */
  msg: string;
  /** Error Type */
  type: string;
}

export type CheckHealthData = HealthResponse;

export interface GetBinaryFileParams {
  /** File Key */
  fileKey: string;
}

export type GetBinaryFileData = any;

export type GetBinaryFileError = HTTPValidationError;

export type NotifyFriendRequestData = NotifyFriendRequestResponse;

export type NotifyFriendRequestError = HTTPValidationError;

export type LikePostData = LikePostResponse;

export type LikePostError = HTTPValidationError;

export type UnlikePostData = LikePostResponse;

export type UnlikePostError = HTTPValidationError;

export type GetFirebaseConfigData = any;

export type GetProductsData = ShopifyProductListResponse;

export type GetServiceWorkerData = any;

export type GetOfflinePageData = any;

export interface GetManifestParams {
  /**
   * Start Url
   * @default "/scan-me"
   */
  start_url?: string;
}

export type GetManifestData = any;

export type GetManifestError = HTTPValidationError;

export type ChatWithGuideData = ChatResponse;

export type ChatWithGuideError = HTTPValidationError;

export type GenerateCodesData = GenerateCodesResponse;

export type GenerateCodesError = HTTPValidationError;

export interface CheckCodeParams {
  /** Code */
  code: string;
}

export type CheckCodeData = CheckCodeResponse;

export type CheckCodeError = HTTPValidationError;

export type ClaimCodeData = ClaimCodeResponse;

export type ClaimCodeError = HTTPValidationError;

export type GetUserAnalyticsData = any;

export interface GetActivityFeedParams {
  /**
   * Limit
   * @default 50
   */
  limit?: number;
}

export type GetActivityFeedData = any;

export type GetActivityFeedError = HTTPValidationError;

export interface MakeUserAdminParams {
  /**
   * Uid
   * The UID of the user to make an admin.
   */
  uid: string;
}

export type MakeUserAdminData = any;

export type MakeUserAdminError = HTTPValidationError;

export interface DeleteUserParams {
  /**
   * Uid
   * The UID of the user to delete.
   */
  uid: string;
}

export type DeleteUserData = any;

export type DeleteUserError = HTTPValidationError;

export type ExportActivityCsvData = any;

export type ReverseGeocodeData = ReverseGeocodeResponse;

export type ReverseGeocodeError = HTTPValidationError;
