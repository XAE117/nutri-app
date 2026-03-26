"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

interface BarcodeResult {
  name: string;
  serving_size: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;
  image_url?: string;
}

export default function BarcodePage() {
  const [code, setCode] = useState("");
  const [scanning, setScanning] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<BarcodeResult | null>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const scannerRef = useRef<{ stop: () => void } | null>(null);
  const router = useRouter();

  async function startScanner() {
    setScanning(true);
    setError("");
    try {
      const { Html5Qrcode } = await import("html5-qrcode");
      const scanner = new Html5Qrcode("barcode-reader");
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 150 } },
        (decodedText) => {
          scanner.stop().catch(() => {});
          scannerRef.current = null;
          setScanning(false);
          setCode(decodedText);
          lookupCode(decodedText);
        },
        () => {} // ignore scan failures
      );
    } catch (err) {
      setScanning(false);
      setError("Could not access camera. Try entering the code manually.");
      console.error("Scanner error:", err);
    }
  }

  function stopScanner() {
    if (scannerRef.current) {
      scannerRef.current.stop();
      scannerRef.current = null;
    }
    setScanning(false);
  }

  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop();
      }
    };
  }, []);

  async function lookupCode(barcode: string) {
    setLoading(true);
    setError("");
    setResult(null);

    try {
      const res = await fetch(`/api/barcode/${barcode}`);
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Product not found");
        return;
      }
      setResult(await res.json());
    } catch {
      setError("Lookup failed. Check your connection.");
    } finally {
      setLoading(false);
    }
  }

  async function saveEntry() {
    if (!result) return;
    setSaving(true);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const { error: dbError } = await supabase.from("food_logs").insert({
      user_id: user.id,
      description: result.name,
      meal_type: "snack",
      items: [
        {
          name: result.name,
          quantity: 1,
          unit: result.serving_size,
          calories: result.calories,
          protein_g: result.protein_g,
          carbs_g: result.carbs_g,
          fat_g: result.fat_g,
          fiber_g: result.fiber_g,
        },
      ],
      calories: result.calories,
      protein_g: result.protein_g,
      carbs_g: result.carbs_g,
      fat_g: result.fat_g,
      fiber_g: result.fiber_g,
      confidence: 0.95,
      source: "barcode",
    });

    if (dbError) {
      setError("Failed to save");
      setSaving(false);
      return;
    }

    router.push("/");
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Scan Barcode</h1>

      {!result && (
        <>
          <div
            id="barcode-reader"
            className={scanning ? "rounded-lg overflow-hidden" : "hidden"}
          />

          {!scanning && (
            <Button onClick={startScanner} className="w-full">
              Open Camera Scanner
            </Button>
          )}
          {scanning && (
            <Button variant="outline" onClick={stopScanner} className="w-full">
              Stop Scanner
            </Button>
          )}

          <div className="flex gap-2">
            <Input
              placeholder="Or enter barcode manually"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              inputMode="numeric"
            />
            <Button
              onClick={() => lookupCode(code)}
              disabled={!code || loading}
            >
              {loading ? "..." : "Look up"}
            </Button>
          </div>
        </>
      )}

      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}

      {loading && (
        <div className="py-8 text-center text-muted-foreground">
          Looking up product...
        </div>
      )}

      {result && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{result.name}</CardTitle>
            <p className="text-sm text-muted-foreground">
              Serving: {result.serving_size}
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>Calories: <span className="font-medium">{result.calories}</span></div>
              <div>Protein: <span className="font-medium">{result.protein_g}g</span></div>
              <div>Carbs: <span className="font-medium">{result.carbs_g}g</span></div>
              <div>Fat: <span className="font-medium">{result.fat_g}g</span></div>
              <div>Fiber: <span className="font-medium">{result.fiber_g}g</span></div>
            </div>

            <div className="flex gap-2">
              <Button onClick={saveEntry} disabled={saving} className="flex-1">
                {saving ? "Saving..." : "Add to Log"}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setResult(null);
                  setCode("");
                }}
              >
                Scan Another
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
