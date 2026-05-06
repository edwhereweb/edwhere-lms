'use client';

import { useState } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { LandingPageDataTable } from './landing-page-data-table';
import { createColumns, LandingPage } from './landing-page-columns';
import { useRouter } from 'next/navigation';

interface LandingPagesClientProps {
  data: LandingPage[];
  newPath?: string;
  isAdmin?: boolean;
}

export const LandingPagesClient = ({ data, newPath, isAdmin }: LandingPagesClientProps) => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const onPublish = async (id: string, isPublished: boolean) => {
    try {
      setIsLoading(true);
      await axios.patch(`/api/landing-pages/${id}/publish`, { isPublished });
      toast.success(isPublished ? 'Page published' : 'Page unpublished');
      router.refresh();
    } catch (error) {
      let message = 'Something went wrong';
      if (axios.isAxiosError(error) && error.response?.data?.error) {
        message = error.response.data.error;
      }
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const onApprove = async (id: string) => {
    try {
      setIsLoading(true);
      await axios.patch(`/api/landing-pages/${id}/approve`);
      toast.success('Page approved');
      router.refresh();
    } catch {
      toast.error('Something went wrong');
    } finally {
      setIsLoading(false);
    }
  };

  const columns = createColumns({ onPublish, onApprove, isAdmin });

  return (
    <div className={isLoading ? 'opacity-50 pointer-events-none' : ''}>
      <LandingPageDataTable columns={columns} data={data} newPath={newPath} />
    </div>
  );
};
