'use client';

import { useEffect, useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import { UserPlus, X, Users } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface Profile {
  id: string;
  name: string;
  email: string;
  imageUrl?: string | null;
}

interface CourseInstructorsFormProps {
  courseId: string;
}

export const CourseInstructorsForm = ({ courseId }: CourseInstructorsFormProps) => {
  const [instructors, setInstructors] = useState<Profile[]>([]);
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState<Profile[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  // Load current instructors
  useEffect(() => {
    axios
      .get(`/api/courses/${courseId}/instructors`)
      .then((res) => setInstructors(res.data))
      .catch(() => toast.error('Failed to load instructors'));
  }, [courseId]);

  const onSearch = async () => {
    if (!search.trim()) return;
    try {
      setIsSearching(true);
      const res = await axios.get(`/api/profiles/search?q=${encodeURIComponent(search)}`);
      setSearchResults(res.data);
    } catch {
      toast.error('Search failed');
    } finally {
      setIsSearching(false);
    }
  };

  const onAdd = async (profile: Profile) => {
    try {
      setIsLoading(true);
      const res = await axios.post(`/api/courses/${courseId}/instructors`, {
        profileId: profile.id
      });
      setInstructors((prev) => [...prev, res.data]);
      setSearchResults([]);
      setSearch('');
      toast.success(`${profile.name} added as instructor`);
      router.refresh();
    } catch (err: unknown) {
      if (
        err &&
        typeof err === 'object' &&
        'response' in err &&
        (err as { response: { status: number } }).response?.status === 409
      ) {
        toast.error('Already an instructor');
      } else {
        toast.error('Something went wrong');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const onRemove = async (profile: Profile) => {
    try {
      setIsLoading(true);
      await axios.delete(`/api/courses/${courseId}/instructors`, {
        data: { profileId: profile.id }
      });
      setInstructors((prev) => prev.filter((i) => i.id !== profile.id));
      toast.success(`${profile.name} removed`);
      router.refresh();
    } catch {
      toast.error('Something went wrong');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="mt-6 border bg-slate-100 rounded-md p-4 dark:bg-gray-800 dark:text-slate-300">
      <div className="font-medium flex items-center gap-x-2 mb-4">
        <Users className="h-4 w-4" />
        Course Instructors
      </div>

      {/* Current instructors */}
      {instructors.length === 0 ? (
        <p className="text-sm text-muted-foreground mb-3">No instructors assigned yet.</p>
      ) : (
        <ul className="space-y-2 mb-4">
          {instructors.map((inst) => (
            <li
              key={inst.id}
              className="flex items-center justify-between rounded-md border px-3 py-2 bg-white dark:bg-gray-700 text-sm"
            >
              <div>
                <p className="font-medium">{inst.name}</p>
                <p className="text-xs text-muted-foreground">{inst.email}</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                disabled={isLoading}
                onClick={() => onRemove(inst)}
                className="text-red-500 hover:text-red-700 h-7 w-7 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </li>
          ))}
        </ul>
      )}

      {/* Search to add */}
      <div className="flex gap-x-2">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && onSearch()}
          placeholder="Search by name or email..."
          className="flex-1 dark:bg-gray-700"
          disabled={isSearching || isLoading}
        />
        <Button onClick={onSearch} disabled={isSearching || !search.trim()} size="sm">
          <UserPlus className="h-4 w-4 mr-1" />
          Search
        </Button>
      </div>

      {/* Search results */}
      {searchResults.length > 0 && (
        <ul className="mt-2 border rounded-md divide-y dark:divide-gray-600">
          {searchResults.map((p) => (
            <li
              key={p.id}
              className="flex items-center justify-between px-3 py-2 text-sm hover:bg-slate-50 dark:hover:bg-gray-700"
            >
              <div>
                <p className="font-medium">{p.name}</p>
                <p className="text-xs text-muted-foreground">{p.email}</p>
              </div>
              <Button size="sm" disabled={isLoading} onClick={() => onAdd(p)}>
                Add
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
