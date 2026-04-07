'use client';

import { useMemo } from 'react';
import { BlogPost } from '@prisma/client';
import { CheckCircle2, AlertCircle, Info, BarChart3 } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

interface SEOAnalyzerProps {
  initialData: BlogPost;
}

interface Suggestion {
  title: string;
  points: number;
  isMet: boolean;
  message: string;
  type: 'error' | 'warning' | 'success';
}

export const SEOAnalyzer = ({ initialData }: SEOAnalyzerProps) => {
  const analysis = useMemo(() => {
    const suggestions: Suggestion[] = [];
    let score = 0;

    // 1. Meta Title (10 pts)
    const titleLen = initialData.metaTitle?.length || 0;
    if (titleLen >= 50 && titleLen <= 60) {
      score += 10;
      suggestions.push({
        title: 'Meta Title',
        points: 10,
        isMet: true,
        message: 'Great length for meta title.',
        type: 'success'
      });
    } else if (titleLen > 0) {
      score += 5;
      suggestions.push({
        title: 'Meta Title',
        points: 5,
        isMet: false,
        message: `Meta title is ${titleLen} chars. Aim for 50-60.`,
        type: 'warning'
      });
    } else {
      suggestions.push({
        title: 'Meta Title',
        points: 0,
        isMet: false,
        message: 'Meta title is missing.',
        type: 'error'
      });
    }

    // 2. Meta Description (10 pts)
    const descLen = initialData.metaDescription?.length || 0;
    if (descLen >= 120 && descLen <= 160) {
      score += 10;
      suggestions.push({
        title: 'Meta Description',
        points: 10,
        isMet: true,
        message: 'Meta description length is optimal.',
        type: 'success'
      });
    } else if (descLen > 0) {
      score += 5;
      suggestions.push({
        title: 'Meta Description',
        points: 5,
        isMet: false,
        message: `Description is ${descLen} chars. Aim for 120-160.`,
        type: 'warning'
      });
    } else {
      suggestions.push({
        title: 'Meta Description',
        points: 0,
        isMet: false,
        message: 'Meta description is missing.',
        type: 'error'
      });
    }

    // 3. Slug (10 pts)
    const slug = initialData.slug || '';
    if (slug.length >= 3 && slug.length <= 50) {
      score += 10;
      suggestions.push({
        title: 'URL Slug',
        points: 10,
        isMet: true,
        message: 'Slug is clean and descriptive.',
        type: 'success'
      });
    } else {
      score += 5;
      suggestions.push({
        title: 'URL Slug',
        points: 5,
        isMet: false,
        message: 'Consider a shorter, more keyword-focused slug.',
        type: 'warning'
      });
    }

    // 4. Image Alt Text (5 pts)
    if (initialData.imageAlt) {
      score += 5;
      suggestions.push({
        title: 'Cover Alt Text',
        points: 5,
        isMet: true,
        message: 'Cover image has alt text.',
        type: 'success'
      });
    } else {
      suggestions.push({
        title: 'Cover Alt Text',
        points: 0,
        isMet: false,
        message: 'Cover image is missing alt text.',
        type: 'error'
      });
    }

    // Parse Content for more checks
    const content = initialData.content || '';
    const plainText = content.replace(/<[^>]*>/g, '');
    const wordCount = plainText.trim().split(/\s+/).length;

    // 5. Content Length (20 pts)
    if (wordCount >= 1000) {
      score += 20;
      suggestions.push({
        title: 'Content Depth',
        points: 20,
        isMet: true,
        message: 'Excellent content depth (>1000 words).',
        type: 'success'
      });
    } else if (wordCount >= 600) {
      score += 15;
      suggestions.push({
        title: 'Content Depth',
        points: 15,
        isMet: true,
        message: 'Good content length (>600 words).',
        type: 'success'
      });
    } else if (wordCount >= 300) {
      score += 10;
      suggestions.push({
        title: 'Content Depth',
        points: 10,
        isMet: false,
        message: 'Content is a bit short. Aim for 600+ words.',
        type: 'warning'
      });
    } else {
      score += 5;
      suggestions.push({
        title: 'Content Depth',
        points: 5,
        isMet: false,
        message: 'Content is very thin (<300 words).',
        type: 'error'
      });
    }

    // 6. Headings (15 pts)
    const h2Count = (content.match(/<h2/g) || []).length;
    const h3Count = (content.match(/<h3/g) || []).length;
    if (h2Count >= 2) {
      score += 10;
      suggestions.push({
        title: 'Headings (H2)',
        points: 10,
        isMet: true,
        message: 'Good use of subheadings.',
        type: 'success'
      });
    } else {
      suggestions.push({
        title: 'Headings (H2)',
        points: 0,
        isMet: false,
        message: 'Add more H2 tags to structure your content.',
        type: 'warning'
      });
    }
    if (h3Count >= 1) score += 5;

    // 7. Links (20 pts)
    const hrefs = (content.match(/href="([^"]*)"/g) || []).map((m) => m.split('"')[1]);
    const internalLinks = hrefs.filter((h) => h.startsWith('/') || h.includes('edwhere.in'));
    const externalLinks = hrefs.filter((h) => !h.startsWith('/') && !h.includes('edwhere.in'));

    if (internalLinks.length >= 1) {
      score += 10;
      suggestions.push({
        title: 'Internal Links',
        points: 10,
        isMet: true,
        message: 'Good job linking to other pages.',
        type: 'success'
      });
    } else {
      suggestions.push({
        title: 'Internal Links',
        points: 0,
        isMet: false,
        message: 'Add at least one internal link.',
        type: 'warning'
      });
    }

    if (externalLinks.length >= 1) {
      score += 10;
      suggestions.push({
        title: 'External Links',
        points: 10,
        isMet: true,
        message: 'External links add credibility.',
        type: 'success'
      });
    } else {
      suggestions.push({
        title: 'External Links',
        points: 0,
        isMet: false,
        message: 'Consider linking to external high-authority sources.',
        type: 'warning'
      });
    }

    return { score: Math.min(100, score), suggestions };
  }, [initialData]);

  return (
    <div className="mt-6 border bg-white dark:bg-slate-900 rounded-md p-6 shadow-sm">
      <div className="flex items-center gap-x-2 mb-4">
        <BarChart3 className="h-5 w-5 text-sky-700 dark:text-sky-300" />
        <h2 className="text-lg font-semibold">SEO Analysis</h2>
        <div
          className={cn(
            'ml-auto px-3 py-1 rounded-full text-white font-bold text-sm',
            analysis.score >= 80
              ? 'bg-emerald-500'
              : analysis.score >= 50
                ? 'bg-amber-500'
                : 'bg-rose-500'
          )}
        >
          Score: {analysis.score}/100
        </div>
      </div>

      <Progress value={analysis.score} className="h-3 mb-6" />

      <div className="space-y-4">
        {analysis.suggestions.map((suggestion, index) => (
          <div key={index} className="flex items-start gap-x-3 text-sm">
            {suggestion.type === 'success' && (
              <CheckCircle2 className="h-5 w-5 text-emerald-500 mt-0.5" />
            )}
            {suggestion.type === 'warning' && <Info className="h-5 w-5 text-amber-500 mt-0.5" />}
            {suggestion.type === 'error' && (
              <AlertCircle className="h-5 w-5 text-rose-500 mt-0.5" />
            )}
            <div>
              <p className="font-medium">{suggestion.title}</p>
              <p className="text-slate-600 dark:text-slate-400">{suggestion.message}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
