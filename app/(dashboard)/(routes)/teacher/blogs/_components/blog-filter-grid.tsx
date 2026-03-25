'use client';

import { useState } from 'react';
import { Search, MoreVertical, Pencil, ExternalLink, Power, PowerOff } from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const InputField = (props: React.InputHTMLAttributes<HTMLInputElement>) => (
  <input
    className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-800 dark:bg-slate-950 dark:ring-offset-slate-950 dark:placeholder:text-slate-400 dark:focus-visible:ring-slate-300"
    {...props}
  />
);

interface Blog {
  id: string;
  title: string;
  isPublished: boolean;
  createdAt: Date;
  category: string | null;
  author: string;
  slug: string;
}

interface BlogFilterGridProps {
  blogs: Blog[];
  categories: { id: string; name: string }[];
}

export const BlogFilterGrid = ({ blogs, categories }: BlogFilterGridProps) => {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [isLoading, setIsLoading] = useState<string | null>(null);

  const filteredBlogs = blogs.filter((blog) => {
    const matchesSearch = blog.title.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || blog.category === selectedCategory;
    const matchesStatus =
      selectedStatus === 'all' ||
      (selectedStatus === 'published' ? blog.isPublished : !blog.isPublished);

    return matchesSearch && matchesCategory && matchesStatus;
  });

  const onTogglePublish = async (id: string, isPublished: boolean) => {
    try {
      setIsLoading(id);
      await axios.patch(`/api/blogs/${id}`, { isPublished: !isPublished });
      toast.success(isPublished ? 'Blog unpublished' : 'Blog published');
      router.refresh();
    } catch {
      toast.error('Something went wrong');
    } finally {
      setIsLoading(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <InputField
            placeholder="Search blogs..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950"
          />
        </div>
        <select
          className="h-10 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none ring-offset-white focus:ring-2 focus:ring-slate-950"
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
        >
          <option value="all">All Categories</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.name}>
              {cat.name}
            </option>
          ))}
        </select>
        <select
          className="h-10 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none ring-offset-white focus:ring-2 focus:ring-slate-950"
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
        >
          <option value="all">All Status</option>
          <option value="published">Published</option>
          <option value="draft">Draft</option>
        </select>
      </div>

      <div className="rounded-md border bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b">
            <tr>
              <th className="text-left p-4 font-medium text-slate-500">Title</th>
              <th className="text-left p-4 font-medium text-slate-500">Author</th>
              <th className="text-left p-4 font-medium text-slate-500">Category</th>
              <th className="text-left p-4 font-medium text-slate-500">Status</th>
              <th className="text-left p-4 font-medium text-slate-500">Created At</th>
              <th className="text-right p-4 font-medium text-slate-500">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filteredBlogs.map((blog) => (
              <tr key={blog.id} className="hover:bg-slate-50 transition-colors">
                <td className="p-4 font-medium">{blog.title}</td>
                <td className="p-4 text-slate-600">{blog.author}</td>
                <td className="p-4">
                  {blog.category ? <Badge variant="secondary">{blog.category}</Badge> : '-'}
                </td>
                <td className="p-4">
                  <Badge
                    className={
                      blog.isPublished
                        ? 'bg-sky-500 hover:bg-sky-600'
                        : 'bg-slate-500 hover:bg-slate-600'
                    }
                  >
                    {blog.isPublished ? 'Published' : 'Draft'}
                  </Badge>
                </td>
                <td className="p-4 text-slate-600">
                  {format(new Date(blog.createdAt), 'MMM d, yyyy')}
                </td>
                <td className="p-4 text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <Link href={`/teacher/blogs/${blog.id}`}>
                        <DropdownMenuItem className="cursor-pointer">
                          <Pencil className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                      </Link>
                      <Link href={`/blog/${blog.slug}`} target="_blank">
                        <DropdownMenuItem className="cursor-pointer">
                          <ExternalLink className="h-4 w-4 mr-2" />
                          Preview
                        </DropdownMenuItem>
                      </Link>
                      <DropdownMenuItem
                        className="cursor-pointer"
                        disabled={isLoading === blog.id}
                        onClick={() => onTogglePublish(blog.id, blog.isPublished)}
                      >
                        {blog.isPublished ? (
                          <>
                            <PowerOff className="h-4 w-4 mr-2 text-rose-500" />
                            Unpublish
                          </>
                        ) : (
                          <>
                            <Power className="h-4 w-4 mr-2 text-emerald-500" />
                            Publish
                          </>
                        )}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredBlogs.length === 0 && (
          <div className="p-20 text-center text-slate-500">No blogs found.</div>
        )}
      </div>
    </div>
  );
};
