import {
  ChatRequest,
  ChatWithGuideData,
  ChatWithGuideError,
  CheckCodeData,
  CheckCodeError,
  CheckCodeParams,
  CheckHealthData,
  ClaimCodeData,
  ClaimCodeError,
  ClaimCodeRequest,
  DeleteUserData,
  DeleteUserError,
  DeleteUserParams,
  ExportActivityCsvData,
  GenerateCodesData,
  GenerateCodesError,
  GenerateCodesRequest,
  GetActivityFeedData,
  GetActivityFeedError,
  GetActivityFeedParams,
  GetBinaryFileData,
  GetBinaryFileError,
  GetBinaryFileParams,
  GetFirebaseConfigData,
  GetManifestData,
  GetManifestError,
  GetManifestParams,
  GetOfflinePageData,
  GetProductsData,
  GetServiceWorkerData,
  GetUserAnalyticsData,
  LikePostData,
  LikePostError,
  LikePostRequest,
  MakeUserAdminData,
  MakeUserAdminError,
  MakeUserAdminParams,
  NotifyFriendRequestData,
  NotifyFriendRequestError,
  NotifyFriendRequestRequest,
  ReverseGeocodeData,
  ReverseGeocodeError,
  ReverseGeocodeRequest,
  UnlikePostData,
  UnlikePostError,
} from "./data-contracts";
import { ContentType, HttpClient, RequestParams } from "./http-client";

export class Apiclient<SecurityDataType = unknown> extends HttpClient<SecurityDataType> {
  /**
   * @description Check health of application. Returns 200 when OK, 500 when not.
   *
   * @name check_health
   * @summary Check Health
   * @request GET:/_healthz
   */
  check_health = (params: RequestParams = {}) =>
    this.request<CheckHealthData, any>({
      path: `/_healthz`,
      method: "GET",
      ...params,
    });

  /**
   * @description Serve a binary file from storage
   *
   * @tags dbtn/module:binary
   * @name get_binary_file
   * @summary Get Binary File
   * @request GET:/routes/file/{file_key}
   */
  get_binary_file = ({ fileKey, ...query }: GetBinaryFileParams, params: RequestParams = {}) =>
    this.request<GetBinaryFileData, GetBinaryFileError>({
      path: `/routes/file/${fileKey}`,
      method: "GET",
      ...params,
    });

  /**
   * @description Send an email notification to the user about a new friend request. Also logs the scan activity.
   *
   * @tags dbtn/module:social
   * @name notify_friend_request
   * @summary Notify Friend Request
   * @request POST:/routes/notify-friend-request
   */
  notify_friend_request = (data: NotifyFriendRequestRequest, params: RequestParams = {}) =>
    this.request<NotifyFriendRequestData, NotifyFriendRequestError>({
      path: `/routes/notify-friend-request`,
      method: "POST",
      body: data,
      type: ContentType.Json,
      ...params,
    });

  /**
   * @description Like a post using backend privileges to bypass client-side restrictions.
   *
   * @tags dbtn/module:social
   * @name like_post
   * @summary Like Post
   * @request POST:/routes/like-post
   */
  like_post = (data: LikePostRequest, params: RequestParams = {}) =>
    this.request<LikePostData, LikePostError>({
      path: `/routes/like-post`,
      method: "POST",
      body: data,
      type: ContentType.Json,
      ...params,
    });

  /**
   * @description Unlike a post using backend privileges.
   *
   * @tags dbtn/module:social
   * @name unlike_post
   * @summary Unlike Post
   * @request POST:/routes/unlike-post
   */
  unlike_post = (data: LikePostRequest, params: RequestParams = {}) =>
    this.request<UnlikePostData, UnlikePostError>({
      path: `/routes/unlike-post`,
      method: "POST",
      body: data,
      type: ContentType.Json,
      ...params,
    });

  /**
   * @description Get Firebase configuration from secrets
   *
   * @tags dbtn/module:firebase_config
   * @name get_firebase_config
   * @summary Get Firebase Config
   * @request GET:/routes/firebase-config
   */
  get_firebase_config = (params: RequestParams = {}) =>
    this.request<GetFirebaseConfigData, any>({
      path: `/routes/firebase-config`,
      method: "GET",
      ...params,
    });

  /**
   * No description
   *
   * @tags dbtn/module:shopify
   * @name get_products
   * @summary Get Products
   * @request GET:/routes/products
   */
  get_products = (params: RequestParams = {}) =>
    this.request<GetProductsData, any>({
      path: `/routes/products`,
      method: "GET",
      ...params,
    });

  /**
   * No description
   *
   * @tags dbtn/module:sw
   * @name get_service_worker
   * @summary Get Service Worker
   * @request GET:/routes/sw/worker
   */
  get_service_worker = (params: RequestParams = {}) =>
    this.request<GetServiceWorkerData, any>({
      path: `/routes/sw/worker`,
      method: "GET",
      ...params,
    });

  /**
   * No description
   *
   * @tags dbtn/module:sw
   * @name get_offline_page
   * @summary Get Offline Page
   * @request GET:/routes/sw/offline
   */
  get_offline_page = (params: RequestParams = {}) =>
    this.request<GetOfflinePageData, any>({
      path: `/routes/sw/offline`,
      method: "GET",
      ...params,
    });

  /**
   * No description
   *
   * @tags dbtn/module:manifest
   * @name get_manifest
   * @summary Get Manifest
   * @request GET:/routes/manifest/file
   */
  get_manifest = (query: GetManifestParams, params: RequestParams = {}) =>
    this.request<GetManifestData, GetManifestError>({
      path: `/routes/manifest/file`,
      method: "GET",
      query: query,
      ...params,
    });

  /**
   * No description
   *
   * @tags dbtn/module:ai_guide
   * @name chat_with_guide
   * @summary Chat With Guide
   * @request POST:/routes/chat
   */
  chat_with_guide = (data: ChatRequest, params: RequestParams = {}) =>
    this.request<ChatWithGuideData, ChatWithGuideError>({
      path: `/routes/chat`,
      method: "POST",
      body: data,
      type: ContentType.Json,
      ...params,
    });

  /**
   * @description Generate a batch of unique activation codes. Admin only.
   *
   * @tags dbtn/module:activation
   * @name generate_codes
   * @summary Generate Codes
   * @request POST:/routes/activation/generate
   */
  generate_codes = (data: GenerateCodesRequest, params: RequestParams = {}) =>
    this.request<GenerateCodesData, GenerateCodesError>({
      path: `/routes/activation/generate`,
      method: "POST",
      body: data,
      type: ContentType.Json,
      ...params,
    });

  /**
   * @description Check the status of an activation code. Publicly accessible.
   *
   * @tags dbtn/module:activation
   * @name check_code
   * @summary Check Code
   * @request GET:/routes/activation/check/{code}
   */
  check_code = ({ code, ...query }: CheckCodeParams, params: RequestParams = {}) =>
    this.request<CheckCodeData, CheckCodeError>({
      path: `/routes/activation/check/${code}`,
      method: "GET",
      ...params,
    });

  /**
   * @description Claim an activation code and link it to the current user.
   *
   * @tags dbtn/module:activation
   * @name claim_code
   * @summary Claim Code
   * @request POST:/routes/activation/claim
   */
  claim_code = (data: ClaimCodeRequest, params: RequestParams = {}) =>
    this.request<ClaimCodeData, ClaimCodeError>({
      path: `/routes/activation/claim`,
      method: "POST",
      body: data,
      type: ContentType.Json,
      ...params,
    });

  /**
   * @description Get users ranked by engagement score based on activity log. Only accessible by admins.
   *
   * @tags dbtn/module:admin_tools
   * @name get_user_analytics
   * @summary Get User Analytics
   * @request GET:/routes/admin-tools/analytics/users
   */
  get_user_analytics = (params: RequestParams = {}) =>
    this.request<GetUserAnalyticsData, any>({
      path: `/routes/admin-tools/analytics/users`,
      method: "GET",
      ...params,
    });

  /**
   * @description Get recent activity feed.
   *
   * @tags dbtn/module:admin_tools
   * @name get_activity_feed
   * @summary Get Activity Feed
   * @request GET:/routes/admin-tools/analytics/activity
   */
  get_activity_feed = (query: GetActivityFeedParams, params: RequestParams = {}) =>
    this.request<GetActivityFeedData, GetActivityFeedError>({
      path: `/routes/admin-tools/analytics/activity`,
      method: "GET",
      query: query,
      ...params,
    });

  /**
   * @description Sets the isAdmin flag to true for a given user UID in Firestore. This endpoint uses the backend's admin privileges and bypasses security rules. It will create the user document if it doesn't exist, or merge the field if it does.
   *
   * @tags dbtn/module:admin_tools
   * @name make_user_admin
   * @summary Make User Admin
   * @request GET:/routes/admin-tools/make-admin
   */
  make_user_admin = (query: MakeUserAdminParams, params: RequestParams = {}) =>
    this.request<MakeUserAdminData, MakeUserAdminError>({
      path: `/routes/admin-tools/make-admin`,
      method: "GET",
      query: query,
      ...params,
    });

  /**
   * @description Deletes a user from Firebase Authentication and their Firestore profile. Requires the requester to be an admin.
   *
   * @tags dbtn/module:admin_tools
   * @name delete_user
   * @summary Delete User
   * @request DELETE:/routes/admin-tools/delete-user
   */
  delete_user = (query: DeleteUserParams, params: RequestParams = {}) =>
    this.request<DeleteUserData, DeleteUserError>({
      path: `/routes/admin-tools/delete-user`,
      method: "DELETE",
      query: query,
      ...params,
    });

  /**
   * @description Export all user activities to CSV.
   *
   * @tags stream, dbtn/module:admin_tools
   * @name export_activity_csv
   * @summary Export Activity Csv
   * @request GET:/routes/admin-tools/analytics/export
   */
  export_activity_csv = (params: RequestParams = {}) =>
    this.requestStream<ExportActivityCsvData, any>({
      path: `/routes/admin-tools/analytics/export`,
      method: "GET",
      ...params,
    });

  /**
   * @description Convert latitude and longitude to a readable address using Google Maps Geocoding API. Returns the formatted address and potentially a location name (e.g. business name) if available/relevant.
   *
   * @tags dbtn/module:location
   * @name reverse_geocode
   * @summary Reverse Geocode
   * @request POST:/routes/reverse-geocode
   */
  reverse_geocode = (data: ReverseGeocodeRequest, params: RequestParams = {}) =>
    this.request<ReverseGeocodeData, ReverseGeocodeError>({
      path: `/routes/reverse-geocode`,
      method: "POST",
      body: data,
      type: ContentType.Json,
      ...params,
    });
}
