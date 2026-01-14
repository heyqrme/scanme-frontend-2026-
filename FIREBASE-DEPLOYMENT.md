# Firebase Setup & Deployment Guide

## Firebase Backend Setup

### 1. Deploy Firestore Rules
```bash
firebase deploy --only firestore:rules
```

### 2. Deploy Storage Rules
```bash
firebase deploy --only storage
```

### 3. Deploy Firestore Indexes
```bash
firebase deploy --only firestore:indexes
```

## Your Deployment Options

### Option 1: Replace ScanMe Project Entirely (New Project)
**Use this if you want a completely fresh start with QRConnect**

1. Keep your existing `scanme` project running
2. Use the QRConnect project (studio-6205573390-be680) we're already configured for
3. Deploy this code to QRConnect:
   ```bash
   firebase use studio-6205573390-be680
   firebase deploy
   ```
4. Your new site will be at: `studio-6205573390-be680.web.app`
5. Point your custom domain to the new project
6. Once stable, delete the old `scanme` project

**Pros:** Clean slate, no legacy data/config
**Cons:** Need to migrate users/data if any exist

### Option 2: Update ScanMe Project (Same Project)
**Use this if you want to keep your existing Firebase project/domain**

1. Update the Firebase config in `vite.config.ts` (line 241-246) to use your `scanme` credentials:
   ```typescript
   firebaseConfig: {
     apiKey: "YOUR_SCANME_API_KEY",
     authDomain: "scanme.firebaseapp.com",
     projectId: "scanme",
     storageBucket: "scanme.firebasestorage.app",
     messagingSenderId: "YOUR_MESSAGING_ID",
     appId: "YOUR_APP_ID"
   }
   ```

2. Switch Firebase CLI to scanme project:
   ```bash
   firebase use scanme
   ```

3. Deploy rules and build:
   ```bash
   firebase deploy --only firestore:rules,storage,firestore:indexes
   yarn build
   firebase deploy --only hosting
   ```

**Pros:** Keep existing domain, users, analytics
**Cons:** Legacy code/data mixed with new features

## Recommended Approach

I recommend **Option 2** (update ScanMe) because:
- You keep your existing domain/branding
- No user migration needed
- Simpler deployment workflow
- The new Flip feature just adds to what you have

## Next Steps

1. **Deploy Firebase Rules** (do this first):
   ```bash
   firebase deploy --only firestore:rules,storage,firestore:indexes
   ```

2. **Test locally** with real uploads (we can do this now)

3. **Build for production**:
   ```bash
   yarn build
   ```

4. **Deploy to Firebase Hosting**:
   ```bash
   firebase deploy --only hosting
   ```

## Files Created

- `firestore.rules` - Database security rules
- `storage.rules` - File storage security rules  
- `firestore.indexes.json` - Query performance indexes
- `src/services/flipService.ts` - All Firebase CRUD operations for Flip

All set! Ready to deploy rules?
