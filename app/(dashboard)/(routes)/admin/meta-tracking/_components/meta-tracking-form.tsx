'use client';

import { useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import {
  Save,
  Send,
  Eye,
  EyeOff,
  Activity,
  CheckCircle2,
  AlertCircle,
  Sliders,
  Shield,
  Zap,
  Loader2
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { MetaTrackingSettingsData, MetaTrackingMode } from '@/lib/meta-tracking/types';

interface MetaTrackingFormProps {
  initialSettings: MetaTrackingSettingsData & {
    hasAccessToken?: boolean;
    maskedAccessToken?: string | null;
  };
}

export function MetaTrackingForm({ initialSettings }: MetaTrackingFormProps) {
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [showToken, setShowToken] = useState(false);

  // General Settings
  const [enabled, setEnabled] = useState(initialSettings.metaTrackingEnabled);
  const [pixelId, setPixelId] = useState(initialSettings.metaPixelId ?? '');
  const [accessToken, setAccessToken] = useState('');
  const [hasExistingToken, setHasExistingToken] = useState(
    initialSettings.hasAccessToken ?? Boolean(initialSettings.metaAccessToken)
  );
  const [maskedToken, setMaskedToken] = useState(initialSettings.maskedAccessToken ?? '');
  const [testEventCode, setTestEventCode] = useState(initialSettings.metaTestEventCode ?? '');
  const [mode, setMode] = useState<MetaTrackingMode>(initialSettings.metaTrackingMode || 'OFF');

  // Event Toggles
  const [trackPageView, setTrackPageView] = useState(initialSettings.trackPageView);
  const [trackViewContent, setTrackViewContent] = useState(initialSettings.trackViewContent);
  const [trackCompleteRegistration, setTrackCompleteRegistration] = useState(
    initialSettings.trackCompleteRegistration
  );
  const [trackInitiateCheckout, setTrackInitiateCheckout] = useState(
    initialSettings.trackInitiateCheckout
  );
  const [trackPurchase, setTrackPurchase] = useState(initialSettings.trackPurchase);
  const [trackSearch, setTrackSearch] = useState(initialSettings.trackSearch);
  const [trackLead, setTrackLead] = useState(initialSettings.trackLead);
  const [trackAddToCart, setTrackAddToCart] = useState(initialSettings.trackAddToCart);
  const [trackContact, setTrackContact] = useState(initialSettings.trackContact);

  // Privacy & Advanced
  const [advancedMatching, setAdvancedMatching] = useState(initialSettings.advancedMatchingEnabled);
  const [consentRequired, setConsentRequired] = useState(initialSettings.consentRequired);
  const [debugEnabled, setDebugEnabled] = useState(initialSettings.debugEnabled);

  const [lastUpdated, setLastUpdated] = useState<string | null>(
    initialSettings.updatedAt ? new Date(initialSettings.updatedAt).toLocaleString() : null
  );

  const onSave = async () => {
    try {
      setLoading(true);

      const payload: Record<string, unknown> = {
        metaTrackingEnabled: enabled,
        metaPixelId: pixelId.trim() || null,
        metaTestEventCode: testEventCode.trim() || null,
        metaTrackingMode: mode,
        trackPageView,
        trackViewContent,
        trackCompleteRegistration,
        trackInitiateCheckout,
        trackPurchase,
        trackSearch,
        trackLead,
        trackAddToCart,
        trackContact,
        advancedMatchingEnabled: advancedMatching,
        consentRequired,
        debugEnabled
      };

      if (accessToken.trim()) {
        payload.metaAccessToken = accessToken.trim();
      }

      const response = await axios.patch('/api/admin/meta-tracking', payload);
      const data = response.data;

      setHasExistingToken(Boolean(data.hasAccessToken));
      setMaskedToken(data.maskedAccessToken || '');
      setAccessToken('');
      setLastUpdated(new Date().toLocaleString());

      toast.success('Meta tracking settings saved successfully');
    } catch (error: unknown) {
      const err = error as { response?: { data?: string } };
      toast.error(err.response?.data || 'Failed to save settings');
    } finally {
      setLoading(false);
    }
  };

  const onTestConnection = async () => {
    try {
      setTesting(true);
      const res = await axios.post('/api/admin/meta-tracking/test', {
        eventName: 'PageView',
        testEventCode: testEventCode.trim() || undefined
      });

      toast.success(
        res.data.message || 'Test event dispatched successfully to Meta Conversions API!'
      );
    } catch (error: unknown) {
      const err = error as { response?: { data?: string } };
      toast.error(err.response?.data || 'Test event failed. Check Pixel ID and Access Token.');
    } finally {
      setTesting(false);
    }
  };

  const getStatusBadge = () => {
    if (!enabled || mode === 'OFF') {
      return (
        <Badge variant="outline" className="border-zinc-500 text-zinc-500 gap-1 font-medium">
          <AlertCircle className="h-3 w-3" /> Inactive
        </Badge>
      );
    }
    if (mode === 'HYBRID') {
      return (
        <Badge variant="default" className="bg-emerald-600 hover:bg-emerald-600 gap-1 font-medium">
          <CheckCircle2 className="h-3 w-3" /> Hybrid (Pixel + CAPI)
        </Badge>
      );
    }
    if (mode === 'PIXEL') {
      return (
        <Badge variant="secondary" className="gap-1 font-medium text-blue-600 border-blue-200">
          <Activity className="h-3 w-3" /> Pixel Only
        </Badge>
      );
    }
    if (mode === 'CAPI') {
      return (
        <Badge variant="secondary" className="gap-1 font-medium text-purple-600 border-purple-200">
          <Zap className="h-3 w-3" /> CAPI Only
        </Badge>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Top Bar Summary */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-lg bg-card border shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400">
            <Activity className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold">Meta Tracking Status</h2>
              {getStatusBadge()}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {lastUpdated ? `Last updated: ${lastUpdated}` : 'Not configured yet'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onTestConnection}
            disabled={testing || (!hasExistingToken && !accessToken) || !pixelId}
            className="gap-1.5 text-xs"
          >
            {testing ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Send className="h-3.5 w-3.5" />
            )}
            Test CAPI Connection
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={onSave}
            disabled={loading}
            className="gap-1.5 text-xs"
          >
            {loading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Save className="h-3.5 w-3.5" />
            )}
            Save Changes
          </Button>
        </div>
      </div>

      {/* 1. Core Connection Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Sliders className="h-5 w-5 text-primary" />
            General & Connection Settings
          </CardTitle>
          <CardDescription>
            Configure your Meta Dataset / Pixel ID, Conversions API Access Token, and tracking mode.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Enable Master Toggle */}
          <div className="flex items-center justify-between p-3.5 rounded-lg border bg-muted/30">
            <div className="space-y-0.5">
              <Label htmlFor="master-toggle" className="text-sm font-semibold cursor-pointer">
                Enable Meta Tracking
              </Label>
              <p className="text-xs text-muted-foreground">
                Master toggle for all Meta Pixel and Conversions API events.
              </p>
            </div>
            <Checkbox
              id="master-toggle"
              checked={enabled}
              onCheckedChange={(c) => setEnabled(Boolean(c))}
              className="h-5 w-5"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Tracking Mode */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold">Tracking Mode</Label>
              <Select value={mode} onValueChange={(val) => setMode(val as MetaTrackingMode)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select tracking mode" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="OFF">OFF (Disabled)</SelectItem>
                  <SelectItem value="HYBRID">
                    Hybrid (Browser Pixel + Server CAPI) — Recommended
                  </SelectItem>
                  <SelectItem value="PIXEL">Pixel Only (Browser)</SelectItem>
                  <SelectItem value="CAPI">CAPI Only (Server-Side)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Hybrid tracking ensures maximum ad attribution accuracy and event deduplication.
              </p>
            </div>

            {/* Pixel ID */}
            <div className="space-y-2">
              <Label htmlFor="pixelId" className="text-xs font-semibold">
                Meta Pixel ID / Dataset ID
              </Label>
              <Input
                id="pixelId"
                placeholder="e.g. 123456789012345"
                value={pixelId}
                onChange={(e) => setPixelId(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Found in Meta Events Manager &gt; Data Sources &gt; Settings.
              </p>
            </div>

            {/* Conversions API Access Token */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="accessToken" className="text-xs font-semibold">
                  Conversions API Access Token
                </Label>
                {hasExistingToken && (
                  <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" /> Token saved
                  </span>
                )}
              </div>
              <div className="relative">
                <Input
                  id="accessToken"
                  type={showToken ? 'text' : 'password'}
                  placeholder={
                    hasExistingToken
                      ? maskedToken || '••••••••••••••••••••••••'
                      : 'Paste EAAB... access token here'
                  }
                  value={accessToken}
                  onChange={(e) => setAccessToken(e.target.value)}
                  className="pr-10 font-mono text-xs"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 hover:bg-transparent text-muted-foreground"
                  onClick={() => setShowToken(!showToken)}
                >
                  {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Generated from Events Manager &gt; Settings &gt; Conversions API &gt; Generate
                access token. Leave empty to keep existing token.
              </p>
            </div>

            {/* Test Event Code */}
            <div className="space-y-2">
              <Label htmlFor="testCode" className="text-xs font-semibold">
                Test Event Code (Optional)
              </Label>
              <Input
                id="testCode"
                placeholder="e.g. TEST12345"
                value={testEventCode}
                onChange={(e) => setTestEventCode(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Use for debugging in Events Manager &gt; Test Events. Remove before live production
                ads.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 2. Event Toggles Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            Standard Event Toggles
          </CardTitle>
          <CardDescription>
            Enable or disable individual Meta standard events. Only enabled events will be
            dispatched.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* PageView */}
            <div className="flex items-start space-x-3 p-3 rounded-lg border bg-card">
              <Checkbox
                id="trackPageView"
                checked={trackPageView}
                onCheckedChange={(c) => setTrackPageView(Boolean(c))}
                className="mt-0.5"
              />
              <div className="space-y-1">
                <Label htmlFor="trackPageView" className="text-sm font-semibold cursor-pointer">
                  PageView
                </Label>
                <p className="text-xs text-muted-foreground">
                  Track client-side page views on route changes.
                </p>
              </div>
            </div>

            {/* ViewContent */}
            <div className="flex items-start space-x-3 p-3 rounded-lg border bg-card">
              <Checkbox
                id="trackViewContent"
                checked={trackViewContent}
                onCheckedChange={(c) => setTrackViewContent(Boolean(c))}
                className="mt-0.5"
              />
              <div className="space-y-1">
                <Label htmlFor="trackViewContent" className="text-sm font-semibold cursor-pointer">
                  ViewContent
                </Label>
                <p className="text-xs text-muted-foreground">
                  Track course details and landing page views.
                </p>
              </div>
            </div>

            {/* CompleteRegistration */}
            <div className="flex items-start space-x-3 p-3 rounded-lg border bg-card">
              <Checkbox
                id="trackCompleteRegistration"
                checked={trackCompleteRegistration}
                onCheckedChange={(c) => setTrackCompleteRegistration(Boolean(c))}
                className="mt-0.5"
              />
              <div className="space-y-1">
                <Label
                  htmlFor="trackCompleteRegistration"
                  className="text-sm font-semibold cursor-pointer"
                >
                  CompleteRegistration
                </Label>
                <p className="text-xs text-muted-foreground">
                  Track successful student account signups.
                </p>
              </div>
            </div>

            {/* InitiateCheckout */}
            <div className="flex items-start space-x-3 p-3 rounded-lg border bg-card">
              <Checkbox
                id="trackInitiateCheckout"
                checked={trackInitiateCheckout}
                onCheckedChange={(c) => setTrackInitiateCheckout(Boolean(c))}
                className="mt-0.5"
              />
              <div className="space-y-1">
                <Label
                  htmlFor="trackInitiateCheckout"
                  className="text-sm font-semibold cursor-pointer"
                >
                  InitiateCheckout
                </Label>
                <p className="text-xs text-muted-foreground">
                  Track when a learner opens payment checkout.
                </p>
              </div>
            </div>

            {/* Purchase */}
            <div className="flex items-start space-x-3 p-3 rounded-lg border bg-card">
              <Checkbox
                id="trackPurchase"
                checked={trackPurchase}
                onCheckedChange={(c) => setTrackPurchase(Boolean(c))}
                className="mt-0.5"
              />
              <div className="space-y-1">
                <Label htmlFor="trackPurchase" className="text-sm font-semibold cursor-pointer">
                  Purchase
                </Label>
                <p className="text-xs text-muted-foreground">
                  Track verified Razorpay course purchases (INR).
                </p>
              </div>
            </div>

            {/* Search */}
            <div className="flex items-start space-x-3 p-3 rounded-lg border bg-card">
              <Checkbox
                id="trackSearch"
                checked={trackSearch}
                onCheckedChange={(c) => setTrackSearch(Boolean(c))}
                className="mt-0.5"
              />
              <div className="space-y-1">
                <Label htmlFor="trackSearch" className="text-sm font-semibold cursor-pointer">
                  Search
                </Label>
                <p className="text-xs text-muted-foreground">
                  Track course catalog searches and keywords.
                </p>
              </div>
            </div>

            {/* Lead */}
            <div className="flex items-start space-x-3 p-3 rounded-lg border bg-card">
              <Checkbox
                id="trackLead"
                checked={trackLead}
                onCheckedChange={(c) => setTrackLead(Boolean(c))}
                className="mt-0.5"
              />
              <div className="space-y-1">
                <Label htmlFor="trackLead" className="text-sm font-semibold cursor-pointer">
                  Lead
                </Label>
                <p className="text-xs text-muted-foreground">
                  Track inquiry form and demo request submissions.
                </p>
              </div>
            </div>

            {/* AddToCart */}
            <div className="flex items-start space-x-3 p-3 rounded-lg border bg-card">
              <Checkbox
                id="trackAddToCart"
                checked={trackAddToCart}
                onCheckedChange={(c) => setTrackAddToCart(Boolean(c))}
                className="mt-0.5"
              />
              <div className="space-y-1">
                <Label htmlFor="trackAddToCart" className="text-sm font-semibold cursor-pointer">
                  AddToCart
                </Label>
                <p className="text-xs text-muted-foreground">
                  Track add to cart actions where applicable.
                </p>
              </div>
            </div>

            {/* Contact */}
            <div className="flex items-start space-x-3 p-3 rounded-lg border bg-card">
              <Checkbox
                id="trackContact"
                checked={trackContact}
                onCheckedChange={(c) => setTrackContact(Boolean(c))}
                className="mt-0.5"
              />
              <div className="space-y-1">
                <Label htmlFor="trackContact" className="text-sm font-semibold cursor-pointer">
                  Contact
                </Label>
                <p className="text-xs text-muted-foreground">
                  Track contact support or mentor connect messages.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 3. Privacy & Advanced Matching Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Privacy & Advanced Settings
          </CardTitle>
          <CardDescription>
            Configure user matching, consent gating, and debug diagnostics.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Advanced Matching */}
          <div className="flex items-start justify-between p-3.5 rounded-lg border bg-card">
            <div className="space-y-0.5 pr-4">
              <Label htmlFor="advancedMatching" className="text-sm font-semibold cursor-pointer">
                Advanced Matching
              </Label>
              <p className="text-xs text-muted-foreground">
                SHA-256 hashes and passes customer email/phone/name to Meta to improve Event Match
                Quality score and ad attribution.
              </p>
            </div>
            <Checkbox
              id="advancedMatching"
              checked={advancedMatching}
              onCheckedChange={(c) => setAdvancedMatching(Boolean(c))}
              className="mt-1"
            />
          </div>

          {/* Consent Gating */}
          <div className="flex items-start justify-between p-3.5 rounded-lg border bg-card">
            <div className="space-y-0.5 pr-4">
              <Label htmlFor="consentRequired" className="text-sm font-semibold cursor-pointer">
                Consent Gating
              </Label>
              <p className="text-xs text-muted-foreground">
                When enabled, marketing tracking events will not fire in the browser until user
                consent has been explicitly granted.
              </p>
            </div>
            <Checkbox
              id="consentRequired"
              checked={consentRequired}
              onCheckedChange={(c) => setConsentRequired(Boolean(c))}
              className="mt-1"
            />
          </div>

          {/* Debug Logging */}
          <div className="flex items-start justify-between p-3.5 rounded-lg border bg-card">
            <div className="space-y-0.5 pr-4">
              <Label htmlFor="debugEnabled" className="text-sm font-semibold cursor-pointer">
                Debug Logging
              </Label>
              <p className="text-xs text-muted-foreground">
                Outputs detailed CAPI payload dispatches and responses using the application debug
                logger. Keep disabled in standard production.
              </p>
            </div>
            <Checkbox
              id="debugEnabled"
              checked={debugEnabled}
              onCheckedChange={(c) => setDebugEnabled(Boolean(c))}
              className="mt-1"
            />
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" onClick={onSave} disabled={loading} className="px-6 gap-2">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save Tracking Settings
        </Button>
      </div>
    </div>
  );
}
