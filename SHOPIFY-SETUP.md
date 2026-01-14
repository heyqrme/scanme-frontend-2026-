# Shopify Integration Setup Guide

## Overview
Your site now uses Shopify Storefront API to display products directly from your Shopify store.

## Setup Steps

### 1. Create a Shopify Store (if you don't have one)
- Go to https://www.shopify.com
- Sign up for a store (free trial available)
- Your store URL will be: `your-store-name.myshopify.com`

### 2. Create a Custom App in Shopify
1. **Go to Shopify Admin**
   - Log into your Shopify store admin panel

2. **Navigate to Apps**
   - Settings → Apps and sales channels → **Develop apps**

3. **Create App**
   - Click "Create an app"
   - Name: "ScanMe Website"
   - Click "Create app"

4. **Configure Storefront API Access**
   - Click "Configure Storefront API scopes"
   - Enable these permissions:
     - `unauthenticated_read_product_listings`
     - `unauthenticated_read_product_inventory`
     - `unauthenticated_read_product_tags`
     - `unauthenticated_write_checkouts` (for cart/checkout)
   - Click "Save"

5. **Install App**
   - Click "Install app"
   - Confirm installation

6. **Get API Credentials**
   - Go to "API credentials" tab
   - Copy your **Storefront API access token**
   - It looks like: `shpat_1234567890abcdef...`

### 3. Configure Your Website

1. **Create `.env` file** in `c:\frontend\` folder:
   ```env
   VITE_SHOPIFY_STORE_DOMAIN=your-store-name.myshopify.com
   VITE_SHOPIFY_STOREFRONT_TOKEN=shpat_your_token_here
   ```

2. **Example**:
   ```env
   VITE_SHOPIFY_STORE_DOMAIN=scanme-shop.myshopify.com
   VITE_SHOPIFY_STOREFRONT_TOKEN=shpat_a1b2c3d4e5f6g7h8i9j0
   ```

3. **Rebuild and Deploy**:
   ```powershell
   yarn build
   firebase deploy --only hosting
   ```

### 4. Add Products to Shopify
1. In Shopify Admin, go to **Products**
2. Click **Add product**
3. Fill in:
   - Title
   - Description
   - Price
   - Images
   - Inventory
4. Make sure product is **Active** and available on "Online Store" sales channel

### 5. Test Integration
- Visit your store page: https://studio-6205573390-be680.web.app/store
- Products should load automatically from Shopify

## Features Enabled

✅ **Product Listing** - Display all products with images, prices, descriptions
✅ **Product Details** - Individual product pages with variants
✅ **Direct Checkout** - Users can buy directly through Shopify
✅ **Real-time Sync** - Products update automatically when changed in Shopify
✅ **Multi-currency** - Supports all Shopify currencies
✅ **Variants** - Colors, sizes, options

## Pages Using Shopify

- `/store` - Main store page
- `/shopify-product-detail` - Product detail pages

## Troubleshooting

**"Shopify not configured"**
- Check `.env` file exists with correct credentials
- Rebuild: `yarn build`

**Products not loading**
- Verify Storefront API token is correct
- Check products are "Active" in Shopify
- Verify products are available on "Online Store" channel

**CORS errors**
- Shopify Storefront API should work from any domain
- If issues, check API permissions in Shopify Admin

## Security Notes

- ✅ Storefront API token is **public-safe** (read-only access)
- ✅ No sensitive data exposed
- ✅ Checkout handled securely by Shopify
- ❌ Never use Admin API token on frontend

## Next Steps

1. **Add more products** in Shopify Admin
2. **Customize store design** in `src/pages/Store.tsx`
3. **Enable checkout** for actual purchases
4. **Add payment methods** in Shopify Settings

Need help? Contact Shopify Support or check documentation:
https://shopify.dev/docs/api/storefront
