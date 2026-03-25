'use client';

import * as z from 'zod';
import axios from 'axios';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Plus, X } from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import { BlogPost } from '@prisma/client';

import { Form } from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Combobox } from '@/components/ui/combobox';

interface RelatedCoursesFormProps {
  initialData: BlogPost;
  blogId: string;
  options: { label: string; value: string }[];
}

const formSchema = z.object({
  courseIds: z.string().array()
});

export const RelatedCoursesForm = ({ initialData, blogId, options }: RelatedCoursesFormProps) => {
  const [isEditing, setIsEditing] = useState(false);

  const toggleEdit = () => setIsEditing((current) => !current);

  const router = useRouter();

  const defaultCourseIds = initialData.courseIds || [];

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      courseIds: defaultCourseIds
    }
  });

  const { isSubmitting } = form.formState;

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      await axios.patch(`/api/blogs/${blogId}`, values);
      toast.success('Related courses updated');
      toggleEdit();
      router.refresh();
    } catch {
      toast.error('Something went wrong');
    }
  };

  const selectedCourses = options.filter((option) =>
    form.watch('courseIds')?.includes(option.value)
  );

  const addCourse = (courseId: string) => {
    const current = form.getValues('courseIds');
    if (current.includes(courseId)) return;

    form.setValue('courseIds', [...current, courseId], { shouldValidate: true });
  };

  const removeCourse = (courseId: string) => {
    const current = form.getValues('courseIds');
    form.setValue(
      'courseIds',
      current.filter((id) => id !== courseId),
      { shouldValidate: true }
    );
  };

  return (
    <div className="mt-6 border bg-slate-100 dark:bg-slate-900 rounded-md p-4">
      <div className="font-medium flex items-center justify-between">
        Related Courses
        <Button onClick={toggleEdit} variant="ghost">
          {isEditing ? (
            <>Cancel</>
          ) : (
            <>
              <Plus className="h-4 w-4 mr-2" />
              Manage courses
            </>
          )}
        </Button>
      </div>
      {!isEditing && (
        <div className="mt-2 flex flex-wrap gap-2">
          {selectedCourses.length === 0 && (
            <p className="text-sm text-slate-500 italic">No related courses selected</p>
          )}
          {selectedCourses.map((course) => (
            <div
              key={course.value}
              className="bg-sky-100 text-sky-700 dark:bg-sky-900 dark:text-sky-300 px-2 py-1 rounded-md text-xs border border-sky-200"
            >
              {course.label}
            </div>
          ))}
        </div>
      )}
      {isEditing && (
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-4">
            <Combobox
              options={options.filter((opt) => !form.watch('courseIds')?.includes(opt.value))}
              onChange={(value) => addCourse(value)}
              value=""
            />

            <div className="flex flex-wrap gap-2 mt-4">
              {selectedCourses.map((course) => (
                <div
                  key={course.value}
                  className="flex items-center gap-x-1 bg-sky-50 text-sky-600 border border-sky-100 px-2 py-1 rounded text-sm"
                >
                  {course.label}
                  <button
                    type="button"
                    onClick={() => removeCourse(course.value)}
                    className="hover:text-red-500 transition"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-x-2">
              <Button disabled={isSubmitting} type="submit">
                Save Changes
              </Button>
            </div>
          </form>
        </Form>
      )}
    </div>
  );
};
