import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiClient } from "app";
import { firebaseApp, firebaseAuth } from "app"; // Use the central firebase instance
import { signInAnonymously, onAuthStateChanged } from "firebase/auth";

export default function FirebaseTest() {
  const [status, setStatus] = useState<string>("Initializing...");
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [firebaseConfig, setFirebaseConfig] = useState<any>(null);

  useEffect(() => {
    const fetchAndTestFirebase = async () => {
      setStatus("Fetching Firebase config...");
      setError(null);
      try {
        const response = await apiClient.get_firebase_config();
        if (!response.ok) {
          throw new Error("Failed to fetch Firebase config from backend");
        }
        const config = await response.json();
        setFirebaseConfig(config);
        console.log("Using Firebase config:", config);

        // Now that we have the config, let's test the connection
        // The app is already initialized in firebase.ts, so we just use the imported instances
        setStatus("Firebase already initialized, attempting anonymous sign-in...");
        await signInAnonymously(firebaseAuth);

        onAuthStateChanged(firebaseAuth, (user) => {
          if (user) {
            console.log("Anonymous user signed in:", user);
            setStatus("Firebase connection successful: Anonymous user signed in.");
            setUser(user);
          } else {
            console.log("User is signed out.");
            setStatus("Firebase connection check complete. User is not signed in.");
            setUser(null);
          }
        });
      } catch (err: any) {
        console.error("Firebase test failed:", err);
        setError(err.message || "An unknown error occurred during Firebase test.");
        setStatus("Firebase connection failed.");
      }
    };

    fetchAndTestFirebase();
  }, []);

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>Firebase Connection Test</CardTitle>
          <CardDescription>
            This page tests the connection to Firebase services.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Status:</Label>
            <p
              className={`p-2 mt-1 rounded-md ${
                error ? "bg-destructive/20 text-destructive-foreground" : "bg-muted"
              }`}
            >
              {status}
            </p>
          </div>
          {error && (
            <div>
              <Label>Error Details:</Label>
              <p className="p-2 mt-1 bg-destructive/20 text-destructive-foreground rounded-md">
                {error}
              </p>
            </div>
          )}
          {user && (
            <div>
              <Label>User Info:</Label>
              <div className="p-2 mt-1 bg-muted rounded-md">
                <pre className="text-xs whitespace-pre-wrap">
                  {JSON.stringify(user, null, 2)}
                </pre>
              </div>
            </div>
          )}
          {firebaseConfig && (
            <div>
              <Label htmlFor="config">Live Firebase Config:</Label>
              <div className="p-2 mt-1 bg-muted rounded-md">
                <pre className="text-xs whitespace-pre-wrap">
                  {JSON.stringify(firebaseConfig, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </CardContent>
        <CardFooter>
          <p className="text-sm text-muted-foreground">
            This test runs automatically on page load.
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
