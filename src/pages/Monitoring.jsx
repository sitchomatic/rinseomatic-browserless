import React, { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import PageHeader from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { MonitorPlay, Image as ImageIcon, Video, RefreshCw, Eye, ExternalLink, Activity, Network, CheckCircle2, AlertCircle, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import StatusPill from "@/components/shared/StatusPill";

export default function Monitoring() {
  return (
    <div className="px-6 md:px-10 py-8 max-w-[1400px] mx-auto">
      <PageHeader
        eyebrow="07 · Telemetry"
        title="Browser Monitoring"
        description="Monitor connected browser automation services. View live sessions, screenshots, recordings, and connection statuses."
      />

      <div className="space-y-12">
        <BrowserlessSection />
        
        <div className="h-px bg-border/60 w-full" />
        
        <ScrapingBeeSection />
      </div>
    </div>
  );
}

function BrowserlessSection() {
  const { data: browserlessData, isLoading: isLoadingSessions, refetch: refetchSessions, isRefetching } = useQuery({
    queryKey: ["browserlessSessions"],
    queryFn: () => base44.functions.invoke("getBrowserlessSessions", {}).then(r => r.data),
    refetchInterval: 5000,
  });

  const { data: screenshots = [], isLoading: isLoadingShots } = useQuery({
    queryKey: ["screenshots"],
    queryFn: () => base44.entities.Screenshot.list("-captured_at", 100),
  });

  const { data: recordings = [], isLoading: isLoadingRecordings } = useQuery({
    queryKey: ["recordings"],
    queryFn: () => base44.entities.RunRecording.list("-captured_at", 50),
  });

  const activePages = browserlessData?.pages || [];
  const activeSessions = browserlessData?.sessions || [];
  const isConnected = browserlessData?.ok && !browserlessData?.error;

  return (
    <section className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <MonitorPlay className="h-5 w-5 text-primary" /> Browserless
          </h2>
          <p className="text-sm text-muted-foreground mt-1">Primary headless CDP cluster for live automation and replays.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-sm bg-secondary/30 px-3 py-1.5 rounded-full border border-border">
            {isConnected ? (
              <><CheckCircle2 className="h-4 w-4 text-emerald-500" /> <span className="text-emerald-500 font-medium">Connected</span></>
            ) : (
              <><AlertCircle className="h-4 w-4 text-destructive" /> <span className="text-destructive font-medium">Disconnected</span></>
            )}
          </div>
          <Button size="sm" variant="outline" className="gap-2" onClick={() => refetchSessions()} disabled={isLoadingSessions || isRefetching}>
            <Network className={`h-3.5 w-3.5 ${isRefetching ? "animate-spin" : ""}`} /> Status Check
          </Button>
        </div>
      </div>

      <Tabs defaultValue="live" className="w-full">
        <TabsList className="grid w-full grid-cols-3 max-w-[500px] mb-6">
          <TabsTrigger value="live" className="gap-2">
            <Activity className="h-4 w-4" /> Live Look-in
          </TabsTrigger>
          <TabsTrigger value="recordings" className="gap-2">
            <Video className="h-4 w-4" /> Recordings
          </TabsTrigger>
          <TabsTrigger value="screenshots" className="gap-2">
            <ImageIcon className="h-4 w-4" /> Screenshots
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="live" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {isLoadingSessions && activePages.length === 0 && activeSessions.length === 0 && (
               <div className="col-span-full rounded-xl border border-dashed border-border bg-secondary/20 p-8 text-center text-sm text-muted-foreground animate-pulse">
                 Connecting to Browserless cluster...
               </div>
            )}
            
            {!isLoadingSessions && activePages.length === 0 && activeSessions.length === 0 && (
               <div className="col-span-full rounded-xl border border-dashed border-border bg-secondary/20 p-12 text-center flex flex-col items-center justify-center">
                 <Activity className="h-8 w-8 text-muted-foreground/50 mb-4" />
                 <h3 className="text-sm font-semibold text-foreground mb-1">No active automation sessions</h3>
                 <p className="text-xs text-muted-foreground max-w-md">
                   There are currently no live browsers running on the cluster. Launch a new credential test run to observe the session in real-time.
                 </p>
                 {browserlessData?.error && (
                   <div className="mt-4 p-3 bg-destructive/10 border border-destructive/20 rounded-md text-xs text-destructive text-left max-w-lg mx-auto whitespace-pre-wrap">
                     {browserlessData.error}
                   </div>
                 )}
               </div>
            )}

            {activePages.map((page, idx) => (
              <Card key={page.id || idx} className="bg-card/80 border-border overflow-hidden group">
                <div className="px-4 py-3 bg-secondary/30 border-b border-border/60 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="live-dot text-emerald-500 w-1.5 h-1.5" />
                    <span className="text-xs font-semibold text-foreground">Target {page.id?.substring(0, 8) || idx}</span>
                  </div>
                  <StatusPill status="running" />
                </div>
                <CardContent className="p-4 space-y-3">
                  <div className="text-xs text-muted-foreground truncate" title={page.url || page.title}>
                    {page.title || page.url || "about:blank"}
                  </div>
                  {page.devtoolsFrontendUrl ? (
                    <Button variant="secondary" size="sm" className="w-full gap-2 mt-2 border-border hover:bg-secondary" asChild>
                      <a href={`https://production-sfo.browserless.io${page.devtoolsFrontendUrl.startsWith('/') ? '' : '/'}${page.devtoolsFrontendUrl}`} target="_blank" rel="noopener noreferrer">
                        <Eye className="h-3.5 w-3.5" /> Live Inspector
                      </a>
                    </Button>
                  ) : (
                     <Button variant="secondary" size="sm" className="w-full gap-2 mt-2" disabled>Inspector Unavailable</Button>
                  )}
                </CardContent>
              </Card>
            ))}

            {activeSessions.map((sess, idx) => (
              <Card key={sess.id || idx} className="bg-card/80 border-border overflow-hidden group">
                <div className="px-4 py-3 bg-secondary/30 border-b border-border/60 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="live-dot text-emerald-500 w-1.5 h-1.5" />
                    <span className="text-xs font-semibold text-foreground">Session {sess.id?.substring(0, 8) || idx}</span>
                  </div>
                  <StatusPill status="working" variant="info">connected</StatusPill>
                </div>
                <CardContent className="p-4 space-y-3">
                  <div className="grid grid-cols-2 gap-2 text-[10px] font-mono text-muted-foreground">
                    <div>IP: {sess.ip || "—"}</div>
                    <div>Duration: {sess.time ? `${Math.round(sess.time/1000)}s` : "—"}</div>
                  </div>
                  {sess.devtoolsUrl ? (
                    <Button variant="outline" size="sm" className="w-full gap-2 mt-2 border-primary/30 text-primary hover:bg-primary/10" asChild>
                      <a href={sess.devtoolsUrl.startsWith('http') ? sess.devtoolsUrl : `https://production-sfo.browserless.io${sess.devtoolsUrl.startsWith('/') ? '' : '/'}${sess.devtoolsUrl}`} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-3.5 w-3.5" /> Live View
                      </a>
                    </Button>
                  ) : (
                     <div className="text-xs text-center text-muted-foreground pt-2">No debugger URL exposed</div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="recordings">
          {isLoadingRecordings ? (
             <div className="space-y-3 animate-pulse">
               {[1,2,3].map(i => <div key={i} className="h-16 bg-secondary/20 rounded-xl border border-border" />)}
             </div>
          ) : recordings.length === 0 ? (
             <div className="rounded-xl border border-dashed border-border bg-secondary/20 p-12 text-center text-sm text-muted-foreground">
               No recordings available. Run a test with "Video" or "Session Replay" mode enabled.
             </div>
          ) : (
            <div className="grid gap-3">
              {recordings.map(rec => (
                <div key={rec.id} className="rounded-xl border border-border bg-card p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                      <Video className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-sm">{rec.site}</span>
                        <StatusPill status={rec.mode === 'video' ? 'completed' : 'info'} variant={rec.mode === 'video' ? 'success' : 'info'}>
                          {rec.mode}
                        </StatusPill>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground font-mono">
                        <span>{format(new Date(rec.captured_at), "MMM d, HH:mm:ss")}</span>
                        <span>·</span>
                        <span className="truncate max-w-[120px]">{rec.username}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="shrink-0 flex gap-2 w-full md:w-auto mt-2 md:mt-0">
                    {rec.mode === 'replay' && rec.dashboard_url && (
                      <Button size="sm" variant="outline" className="w-full md:w-auto gap-2" asChild>
                        <a href={rec.dashboard_url} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-3.5 w-3.5" /> View in Browserless
                        </a>
                      </Button>
                    )}
                    {rec.mode === 'video' && rec.video_url && (
                      <Button size="sm" className="w-full md:w-auto gap-2 bg-primary/20 hover:bg-primary/30 text-primary border border-primary/30" asChild>
                        <a href={rec.video_url} target="_blank" rel="noopener noreferrer">
                          <MonitorPlay className="h-3.5 w-3.5" /> Play WebM Video
                        </a>
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="screenshots">
          {isLoadingShots ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 animate-pulse">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="aspect-video bg-secondary/20 rounded-lg border border-border" />
              ))}
            </div>
          ) : screenshots.length === 0 ? (
             <div className="rounded-xl border border-dashed border-border bg-secondary/20 p-12 text-center text-sm text-muted-foreground">
               No screenshots captured yet.
             </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
              {screenshots.map(shot => (
                <div key={shot.id} className="group relative rounded-xl border border-border bg-card overflow-hidden">
                  <div className="aspect-video bg-black/40 flex items-center justify-center overflow-hidden">
                    {shot.image_url ? (
                      <img src={shot.image_url} alt={shot.step_label} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" />
                    ) : (
                      <ImageIcon className="h-8 w-8 text-muted-foreground/30" />
                    )}
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                       {shot.image_url && (
                         <Button size="sm" variant="secondary" className="gap-2" asChild>
                           <a href={shot.image_url} target="_blank" rel="noopener noreferrer">
                             <ExternalLink className="h-3.5 w-3.5" /> Open
                           </a>
                         </Button>
                       )}
                    </div>
                  </div>
                  <div className="p-3 border-t border-border/50">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-xs font-semibold truncate">{shot.site}</span>
                      <span className="text-[10px] font-mono text-muted-foreground">{format(new Date(shot.captured_at), "HH:mm:ss")}</span>
                    </div>
                    <div className="text-[10px] text-muted-foreground truncate">{shot.step_label}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </section>
  );
}

function ScrapingBeeSection() {
  const { data: usageData, isLoading: isLoadingUsage, refetch: refetchUsage, isRefetching } = useQuery({
    queryKey: ["scrapingbeeUsage"],
    queryFn: () => base44.functions.invoke("getScrapingBeeUsage", {}).then(r => r.data),
    refetchInterval: 15000,
  });

  const [testUrl, setTestUrl] = useState("https://example.com");
  const captureMut = useMutation({
    mutationFn: (url) => base44.functions.invoke("captureScrapingBeeScreenshot", { url }).then(r => r.data),
  });

  const isConnected = usageData?.ok && !usageData?.error;

  return (
    <section className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Camera className="h-5 w-5 text-primary" /> ScrapingBee
          </h2>
          <p className="text-sm text-muted-foreground mt-1">Fallback scraping & screenshot service (REST-only).</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-sm bg-secondary/30 px-3 py-1.5 rounded-full border border-border">
            {isConnected ? (
              <><CheckCircle2 className="h-4 w-4 text-emerald-500" /> <span className="text-emerald-500 font-medium">Connected</span></>
            ) : (
              <><AlertCircle className="h-4 w-4 text-destructive" /> <span className="text-destructive font-medium">Disconnected</span></>
            )}
          </div>
          <Button size="sm" variant="outline" className="gap-2" onClick={() => refetchUsage()} disabled={isLoadingUsage || isRefetching}>
            <Network className={`h-3.5 w-3.5 ${isRefetching ? "animate-spin" : ""}`} /> Status Check
          </Button>
        </div>
      </div>

      <div className="grid lg:grid-cols-[1fr_2fr] gap-6">
        <Card className="bg-card">
          <CardHeader>
            <CardTitle className="text-sm">Usage & Limits</CardTitle>
            <CardDescription>Current billing cycle API usage</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingUsage ? (
              <div className="animate-pulse space-y-3">
                <div className="h-4 bg-secondary/30 rounded w-1/2" />
                <div className="h-4 bg-secondary/30 rounded w-3/4" />
              </div>
            ) : usageData?.error ? (
               <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">{usageData.error}</div>
            ) : usageData?.data ? (
               <div className="space-y-4">
                 <div className="grid grid-cols-2 gap-4">
                   <div className="p-3 bg-secondary/20 rounded-lg border border-border">
                     <div className="text-xs text-muted-foreground mb-1">API Credits Used</div>
                     <div className="text-xl font-semibold text-foreground">{usageData.data.used_api_credit || 0}</div>
                   </div>
                   <div className="p-3 bg-secondary/20 rounded-lg border border-border">
                     <div className="text-xs text-muted-foreground mb-1">Max Credits Limit</div>
                     <div className="text-xl font-semibold text-foreground">{usageData.data.max_api_credit || 0}</div>
                   </div>
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                   <div className="p-3 bg-secondary/20 rounded-lg border border-border">
                     <div className="text-xs text-muted-foreground mb-1">Active Concurrency</div>
                     <div className="text-xl font-semibold text-foreground">{usageData.data.concurrency_used || 0} <span className="text-muted-foreground text-sm font-normal">/ {usageData.data.max_concurrency || 0}</span></div>
                   </div>
                 </div>
               </div>
            ) : (
               <div className="text-sm text-muted-foreground">Unable to fetch usage data</div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-card">
          <CardHeader>
            <CardTitle className="text-sm">Live Screenshot Test</CardTitle>
            <CardDescription>Verify ScrapingBee API rendering capabilities directly via REST</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input 
                value={testUrl} 
                onChange={(e) => setTestUrl(e.target.value)} 
                placeholder="https://example.com"
                className="flex-1 font-mono text-sm"
              />
              <Button 
                onClick={() => captureMut.mutate(testUrl)}
                disabled={captureMut.isPending || !testUrl || !isConnected}
                className="gap-2 shrink-0"
              >
                {captureMut.isPending ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
                Capture Page
              </Button>
            </div>

            <div className="aspect-video rounded-lg border border-border bg-secondary/20 overflow-hidden flex items-center justify-center relative shadow-inner">
              {captureMut.isPending ? (
                <div className="text-sm text-muted-foreground flex flex-col items-center gap-3">
                  <RefreshCw className="h-6 w-6 animate-spin text-primary" />
                  Requesting render from ScrapingBee...
                </div>
              ) : captureMut.data?.error ? (
                <div className="text-sm text-destructive p-4 text-center max-w-lg">{captureMut.data.error}</div>
              ) : captureMut.data?.screenshot_base64 ? (
                <>
                  <img src={captureMut.data.screenshot_base64} alt="ScrapingBee Result" className="w-full h-full object-contain bg-black/40" />
                  <Button size="sm" variant="secondary" className="absolute bottom-3 right-3 gap-2 opacity-50 hover:opacity-100 transition-opacity backdrop-blur-sm bg-background/80" asChild>
                    <a href={captureMut.data.screenshot_base64} download={`scrapingbee-${Date.now()}.png`}>
                      <ExternalLink className="h-3.5 w-3.5" /> Download
                    </a>
                  </Button>
                </>
              ) : (
                <ImageIcon className="h-8 w-8 text-muted-foreground/20" />
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}