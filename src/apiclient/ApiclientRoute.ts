import {
  ChatRequest,
  ChatWithGuideData,
  CheckCodeData,
  CheckHealthData,
  ClaimCodeData,
  ClaimCodeRequest,
  DeleteUserData,
  ExportActivityCsvData,
  GenerateCodesData,
  GenerateCodesRequest,
  GetActivityFeedData,
  GetBinaryFileData,
  GetFirebaseConfigData,
  GetManifestData,
  GetOfflinePageData,
  GetProductsData,
  GetServiceWorkerData,
  GetUserAnalyticsData,
  LikePostData,
  LikePostRequest,
  MakeUserAdminData,
  NotifyFriendRequestData,
  NotifyFriendRequestRequest,
  ReverseGeocodeData,
  ReverseGeocodeRequest,
  UnlikePostData,
} from "./data-contracts";

export namespace Apiclient {
  /**
   * @description Check health of application. Returns 200 when OK, 500 when not.
   * @name check_health
   * @summary Check Health
   * @request GET:/_healthz
   */
  export namespace check_health {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = CheckHealthData;
  }

  /**
   * @description Serve a binary file from storage
   * @tags dbtn/module:binary
   * @name get_binary_file
   * @summary Get Binary File
   * @request GET:/routes/file/{file_key}
   */
  export namespace get_binary_file {
    export type RequestParams = {
      /** File Key */
      fileKey: string;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = GetBinaryFileData;
  }

  /**
   * @description Send an email notification to the user about a new friend request. Also logs the scan activity.
   * @tags dbtn/module:social
   * @name notify_friend_request
   * @summary Notify Friend Request
   * @request POST:/routes/notify-friend-request
   */
  export namespace notify_friend_request {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = NotifyFriendRequestRequest;
    export type RequestHeaders = {};
    export type ResponseBody = NotifyFriendRequestData;
  }

  /**
   * @description Like a post using backend privileges to bypass client-side restrictions.
   * @tags dbtn/module:social
   * @name like_post
   * @summary Like Post
   * @request POST:/routes/like-post
   */
  export namespace like_post {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = LikePostRequest;
    export type RequestHeaders = {};
    export type ResponseBody = LikePostData;
  }

  /**
   * @description Unlike a post using backend privileges.
   * @tags dbtn/module:social
   * @name unlike_post
   * @summary Unlike Post
   * @request POST:/routes/unlike-post
   */
  export namespace unlike_post {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = LikePostRequest;
    export type RequestHeaders = {};
    export type ResponseBody = UnlikePostData;
  }

  /**
   * @description Get Firebase configuration from secrets
   * @tags dbtn/module:firebase_config
   * @name get_firebase_config
   * @summary Get Firebase Config
   * @request GET:/routes/firebase-config
   */
  export namespace get_firebase_config {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = GetFirebaseConfigData;
  }

  /**
   * No description
   * @tags dbtn/module:shopify
   * @name get_products
   * @summary Get Products
   * @request GET:/routes/products
   */
  export namespace get_products {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = GetProductsData;
  }

  /**
   * No description
   * @tags dbtn/module:sw
   * @name get_service_worker
   * @summary Get Service Worker
   * @request GET:/routes/sw/worker
   */
  export namespace get_service_worker {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = GetServiceWorkerData;
  }

  /**
   * No description
   * @tags dbtn/module:sw
   * @name get_offline_page
   * @summary Get Offline Page
   * @request GET:/routes/sw/offline
   */
  export namespace get_offline_page {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = GetOfflinePageData;
  }

  /**
   * No description
   * @tags dbtn/module:manifest
   * @name get_manifest
   * @summary Get Manifest
   * @request GET:/routes/manifest/file
   */
  export namespace get_manifest {
    export type RequestParams = {};
    export type RequestQuery = {
      /**
       * Start Url
       * @default "/scan-me"
       */
      start_url?: string;
    };
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = GetManifestData;
  }

  /**
   * No description
   * @tags dbtn/module:ai_guide
   * @name chat_with_guide
   * @summary Chat With Guide
   * @request POST:/routes/chat
   */
  export namespace chat_with_guide {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = ChatRequest;
    export type RequestHeaders = {};
    export type ResponseBody = ChatWithGuideData;
  }

  /**
   * @description Generate a batch of unique activation codes. Admin only.
   * @tags dbtn/module:activation
   * @name generate_codes
   * @summary Generate Codes
   * @request POST:/routes/activation/generate
   */
  export namespace generate_codes {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = GenerateCodesRequest;
    export type RequestHeaders = {};
    export type ResponseBody = GenerateCodesData;
  }

  /**
   * @description Check the status of an activation code. Publicly accessible.
   * @tags dbtn/module:activation
   * @name check_code
   * @summary Check Code
   * @request GET:/routes/activation/check/{code}
   */
  export namespace check_code {
    export type RequestParams = {
      /** Code */
      code: string;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = CheckCodeData;
  }

  /**
   * @description Claim an activation code and link it to the current user.
   * @tags dbtn/module:activation
   * @name claim_code
   * @summary Claim Code
   * @request POST:/routes/activation/claim
   */
  export namespace claim_code {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = ClaimCodeRequest;
    export type RequestHeaders = {};
    export type ResponseBody = ClaimCodeData;
  }

  /**
   * @description Get users ranked by engagement score based on activity log. Only accessible by admins.
   * @tags dbtn/module:admin_tools
   * @name get_user_analytics
   * @summary Get User Analytics
   * @request GET:/routes/admin-tools/analytics/users
   */
  export namespace get_user_analytics {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = GetUserAnalyticsData;
  }

  /**
   * @description Get recent activity feed.
   * @tags dbtn/module:admin_tools
   * @name get_activity_feed
   * @summary Get Activity Feed
   * @request GET:/routes/admin-tools/analytics/activity
   */
  export namespace get_activity_feed {
    export type RequestParams = {};
    export type RequestQuery = {
      /**
       * Limit
       * @default 50
       */
      limit?: number;
    };
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = GetActivityFeedData;
  }

  /**
   * @description Sets the isAdmin flag to true for a given user UID in Firestore. This endpoint uses the backend's admin privileges and bypasses security rules. It will create the user document if it doesn't exist, or merge the field if it does.
   * @tags dbtn/module:admin_tools
   * @name make_user_admin
   * @summary Make User Admin
   * @request GET:/routes/admin-tools/make-admin
   */
  export namespace make_user_admin {
    export type RequestParams = {};
    export type RequestQuery = {
      /**
       * Uid
       * The UID of the user to make an admin.
       */
      uid: string;
    };
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = MakeUserAdminData;
  }

  /**
   * @description Deletes a user from Firebase Authentication and their Firestore profile. Requires the requester to be an admin.
   * @tags dbtn/module:admin_tools
   * @name delete_user
   * @summary Delete User
   * @request DELETE:/routes/admin-tools/delete-user
   */
  export namespace delete_user {
    export type RequestParams = {};
    export type RequestQuery = {
      /**
       * Uid
       * The UID of the user to delete.
       */
      uid: string;
    };
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = DeleteUserData;
  }

  /**
   * @description Export all user activities to CSV.
   * @tags stream, dbtn/module:admin_tools
   * @name export_activity_csv
   * @summary Export Activity Csv
   * @request GET:/routes/admin-tools/analytics/export
   */
  export namespace export_activity_csv {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = ExportActivityCsvData;
  }

  /**
   * @description Convert latitude and longitude to a readable address using Google Maps Geocoding API. Returns the formatted address and potentially a location name (e.g. business name) if available/relevant.
   * @tags dbtn/module:location
   * @name reverse_geocode
   * @summary Reverse Geocode
   * @request POST:/routes/reverse-geocode
   */
  export namespace reverse_geocode {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = ReverseGeocodeRequest;
    export type RequestHeaders = {};
    export type ResponseBody = ReverseGeocodeData;
  }
}
