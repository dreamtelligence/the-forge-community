'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, FileText, Database, Loader2, CheckCircle, ExternalLink } from 'lucide-react';
// Note: Toast notifications would be added here when toast component is available
import { cn } from '@/lib/utils';

interface NotionSyncDialogProps {
  ventureId: string;
  ventureName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface NotionPage {
  id: string;
  title: string;
  url?: string;
}

export function NotionSyncDialog({
  ventureId,
  ventureName,
  open,
  onOpenChange,
}: NotionSyncDialogProps) {
  // Toast notifications would be used here when available
  const showError = (message: string) => alert(message);
  const showSuccess = (message: string) => alert(message);
  const [activeTab, setActiveTab] = useState('brand-dna');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<NotionPage[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [selectedPage, setSelectedPage] = useState<NotionPage | null>(null);
  const [syncResult, setSyncResult] = useState<{ url: string } | null>(null);

  const searchPages = async () => {
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    try {
      const response = await fetch(
        `/api/integrations/notion/search?q=${encodeURIComponent(searchQuery)}`
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to search pages');
      }

      const data = await response.json();
      setSearchResults(data.results || []);
    } catch (error) {
      showError(error instanceof Error ? error.message : 'Failed to search Notion pages');
    } finally {
      setIsSearching(false);
    }
  };

  const syncBrandDNA = async () => {
    if (!selectedPage) return;

    setIsSyncing(true);
    try {
      const response = await fetch('/api/integrations/notion/pages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          parentPageId: selectedPage.id,
          ventureId,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to sync Brand DNA');
      }

      const data = await response.json();
      setSyncResult({ url: data.page?.url || selectedPage.url });
      
      showSuccess('Your Brand DNA has been exported to Notion.');
    } catch (error) {
      showError(error instanceof Error ? error.message : 'Failed to sync Brand DNA');
    } finally {
      setIsSyncing(false);
    }
  };

  const syncRoadmap = async () => {
    if (!selectedPage) return;

    setIsSyncing(true);
    try {
      const response = await fetch('/api/integrations/notion/databases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          databaseId: selectedPage.id,
          ventureId,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to sync Roadmap');
      }

      const data = await response.json();
      setSyncResult({ url: data.databaseUrl || selectedPage.url });
      
      showSuccess(`${data.tasksCreated || 0} tasks exported to Notion.`);
    } catch (error) {
      showError(error instanceof Error ? error.message : 'Failed to sync Roadmap');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSync = () => {
    if (activeTab === 'brand-dna') {
      syncBrandDNA();
    } else {
      syncRoadmap();
    }
  };

  const reset = () => {
    setSearchQuery('');
    setSearchResults([]);
    setSelectedPage(null);
    setSyncResult(null);
    setActiveTab('brand-dna');
  };

  return (
    <Dialog open={open} onOpenChange={(open) => {
      if (!open) reset();
      onOpenChange(open);
    }}>
      <DialogContent className="sm:max-w-[600px] border-white/10 bg-[#0F1113] text-white shadow-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <svg className="h-5 w-5" viewBox="0 0 100 100" fill="currentColor">
              <path d="M6.017 4.313l55.333-4.087c6.797-.583 8.543-.19 12.817 2.917l17.663 12.443c2.913 2.14 3.883 2.723 3.883 5.053v68.243c0 4.277-1.553 6.807-6.99 7.193L24.467 99.967c-4.08.193-6.023-.39-8.16-3.113L3.3 79.94c-2.333-3.113-3.3-5.443-3.3-8.167V11.113c0-3.497 1.553-6.413 6.017-6.8z" fillOpacity=".2"/>
              <path d="M61.35 1.227l-55.3 4.08c-4.493.387-6.053 3.307-6.053 6.807v60.663c0 2.727.967 5.053 3.3 8.167l13.007 16.913c2.137 2.723 4.08 3.307 8.16 3.113l64.257-3.89c5.433-.387 6.99-2.917 6.99-7.193V20.64c0-2.21-.873-2.847-3.443-4.733L74.167 3.147c-4.273-3.107-6.02-3.5-12.817-2.92zM25.92 19.523c-5.247.353-6.437.433-9.417-1.99L8.927 11.507c-.77-.78-.383-1.753 1.557-1.947l53.193-3.887c4.467-.387 6.793 1.167 8.54 2.527l9.123 6.61c.39.197 1.36 1.36.193 1.36l-54.933 3.307-.193.047zM19.803 88.3V30.367c0-2.53.777-3.697 3.103-3.893L81.8 22.58c2.14-.193 3.107 1.167 3.107 3.693v57.547c0 2.53-.39 4.67-3.883 4.863l-60.377 3.5c-3.493.193-5.043-.967-5.043-3.883zM74.9 33.767c.387 1.75 0 3.5-1.75 3.7l-2.91.577v42.773c-2.527 1.36-4.853 2.137-6.797 2.137-3.107 0-3.883-.973-6.21-3.887l-19.03-29.94v28.967l6.02 1.363s0 3.5-4.857 3.5l-13.397.777c-.39-.777 0-2.723 1.357-3.11l3.497-.97v-38.3L30.48 40.667c-.39-1.75.58-4.277 3.3-4.473l14.367-.967 19.8 30.327v-26.83l-5.047-.58c-.39-2.143 1.163-3.7 3.103-3.89l13.4-.78z"/>
            </svg>
            Export to Notion
          </DialogTitle>
          <DialogDescription>
            Sync {ventureName} data to your Notion workspace
          </DialogDescription>
        </DialogHeader>

        {syncResult ? (
          <div className="space-y-6 py-8 text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
              <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">Sync Complete!</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Your {activeTab === 'brand-dna' ? 'Brand DNA' : 'Roadmap'} has been exported to Notion
              </p>
            </div>
            {syncResult.url && (
              <Button asChild className="gap-2">
                <a href={syncResult.url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4" />
                  Open in Notion
                </a>
              </Button>
            )}
            <Button variant="outline" onClick={() => { reset(); onOpenChange(false); }} className="ml-2">
              Close
            </Button>
          </div>
        ) : (
          <>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-2 bg-[#0C0E10] text-white/60 border border-white/10">
                <TabsTrigger
                  value="brand-dna"
                  className="gap-2 data-[state=active]:bg-[#1A1D21] data-[state=active]:text-white data-[state=active]:shadow-none"
                >
                  <FileText className="h-4 w-4" />
                  Brand DNA
                </TabsTrigger>
                <TabsTrigger
                  value="roadmap"
                  className="gap-2 data-[state=active]:bg-[#1A1D21] data-[state=active]:text-white data-[state=active]:shadow-none"
                >
                  <Database className="h-4 w-4" />
                  Roadmap
                </TabsTrigger>
              </TabsList>

              <TabsContent value="brand-dna" className="space-y-4 mt-4">
                <p className="text-sm text-muted-foreground">
                  Export your Brand DNA (Mission, Vision, Values, Persona) as a structured Notion page.
                </p>
              </TabsContent>

              <TabsContent value="roadmap" className="space-y-4 mt-4">
                <p className="text-sm text-muted-foreground">
                  Sync your venture roadmap tasks to a Notion database.
                </p>
              </TabsContent>
            </Tabs>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label>
                  {activeTab === 'brand-dna' 
                    ? 'Search for a parent page' 
                    : 'Search for a database'}
                </Label>
                <div className="flex gap-2">
                  <Input
                    placeholder={activeTab === 'brand-dna' ? "Search pages..." : "Search databases..."}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && searchPages()}
                  />
                  <Button 
                    onClick={searchPages} 
                    disabled={isSearching || !searchQuery.trim()}
                    size="icon"
                  >
                    {isSearching ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Search className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              {searchResults.length > 0 && (
                <div className="border rounded-md divide-y max-h-48 overflow-auto">
                  {searchResults.map((page) => (
                    <button
                      key={page.id}
                      onClick={() => setSelectedPage(page)}
                      className={cn(
                        "w-full px-4 py-3 text-left text-sm hover:bg-muted transition-colors flex items-center gap-2",
                        selectedPage?.id === page.id && "bg-muted"
                      )}
                    >
                      {activeTab === 'brand-dna' ? (
                        <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                      ) : (
                        <Database className="h-4 w-4 text-muted-foreground shrink-0" />
                      )}
                      <span className="truncate">{page.title}</span>
                      {selectedPage?.id === page.id && (
                        <CheckCircle className="h-4 w-4 text-green-600 ml-auto shrink-0" />
                      )}
                    </button>
                  ))}
                </div>
              )}

              {selectedPage && (
                <div className="bg-muted rounded-md p-3 flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium truncate">{selectedPage.title}</span>
                </div>
              )}

              <Button
                onClick={handleSync}
                disabled={!selectedPage || isSyncing}
                className="w-full gap-2"
              >
                {isSyncing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Syncing...
                  </>
                ) : (
                  <>
                    <ExternalLink className="h-4 w-4" />
                    Export {activeTab === 'brand-dna' ? 'Brand DNA' : 'Roadmap'}
                  </>
                )}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
