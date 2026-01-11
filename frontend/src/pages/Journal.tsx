import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { PlusCircle, Trash2, BookOpen } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { api, Journal } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';

export function JournalPage() {
  const { token } = useAuth();
  const [entries, setEntries] = useState<Journal[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchEntries = async () => {
    if (!token) return;
    
    try {
      const data = await api.getJournals(token);
      setEntries(data.entries);
    } catch (err) {
      console.error('Failed to fetch journals:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEntries();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!token) return;

    const formData = new FormData(e.currentTarget);
    
    setSaving(true);

    try {
      await api.createJournal(token, {
        date: new Date(formData.get('date') as string).toISOString(),
        content: formData.get('content') as string,
        mood: parseInt(formData.get('mood') as string) || undefined,
        lessons: formData.get('lessons') as string || undefined,
      });
      setDialogOpen(false);
      fetchEntries();
    } catch (err) {
      console.error('Failed to save journal:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!token || !confirm('Are you sure you want to delete this entry?')) return;
    
    try {
      await api.deleteJournal(token, id);
      fetchEntries();
    } catch (err) {
      console.error('Failed to delete journal:', err);
    }
  };

  const getMoodEmoji = (mood?: number) => {
    if (!mood) return '😐';
    if (mood <= 2) return '😢';
    if (mood <= 4) return '😕';
    if (mood <= 6) return '😐';
    if (mood <= 8) return '🙂';
    return '😄';
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">Trading Journal</h1>
          <p className="text-sm text-muted-foreground sm:text-base">Reflect on your trading day</p>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="w-full sm:w-auto">
              <PlusCircle className="mr-2 h-4 w-4" />
              New Entry
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>New Journal Entry</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="date">Date</Label>
                  <Input
                    id="date"
                    name="date"
                    type="date"
                    defaultValue={new Date().toISOString().split('T')[0]}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="mood">Mood (1-10)</Label>
                  <Input
                    id="mood"
                    name="mood"
                    type="number"
                    min="1"
                    max="10"
                    placeholder="5"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="content">Journal Entry</Label>
                <textarea
                  id="content"
                  name="content"
                  required
                  className="flex min-h-[150px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  placeholder="How was your trading day? What went well? What could be improved?"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="lessons">Key Lessons</Label>
                <textarea
                  id="lessons"
                  name="lessons"
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  placeholder="What did you learn today?"
                />
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving ? 'Saving...' : 'Save Entry'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">Loading...</div>
        </div>
      ) : entries.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">No journal entries yet</p>
            <Button onClick={() => setDialogOpen(true)}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Create First Entry
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {entries.map((entry) => (
            <Card key={entry.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2 sm:gap-3 min-w-0 flex-1">
                    <span className="text-xl sm:text-2xl flex-shrink-0">{getMoodEmoji(entry.mood)}</span>
                    <div className="min-w-0 flex-1">
                      <CardTitle className="text-base sm:text-lg">
                        {format(new Date(entry.date), 'EEEE, MMMM d, yyyy')}
                      </CardTitle>
                      {entry.mood && (
                        <p className="text-xs sm:text-sm text-muted-foreground">
                          Mood: {entry.mood}/10
                        </p>
                      )}
                    </div>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="text-destructive hover:text-destructive flex-shrink-0"
                    onClick={() => handleDelete(entry.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm sm:text-base whitespace-pre-wrap">{entry.content}</p>
                
                {entry.lessons && (
                  <div className="mt-4 p-3 rounded-lg bg-accent">
                    <p className="text-sm font-medium mb-1">Key Lessons:</p>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {entry.lessons}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
