'use client';

import { type Module, type Chapter, type Course } from '@prisma/client';
import { useEffect, useState } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { Grip, Pencil } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ChaptersForm } from './chapters-form';

interface ModulesListProps {
  items: (Module & { chapters: Chapter[] })[];
  onReorder: (updateData: { id: string; position: number }[]) => void;
  onEdit: (id: string) => void;
  courseId: string;
  course: Course;
}

export const ModulesList = ({ items, onReorder, onEdit, courseId, course }: ModulesListProps) => {
  const [isMounted, setIsMounted] = useState(false);
  const [modules, setModules] = useState(items);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    setModules(items);
  }, [items]);

  const onDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const sourceIndex = result.source.index;
    const destIndex = result.destination.index;

    const updatedModules = Array.from(modules);
    const [reorderedModule] = updatedModules.splice(sourceIndex, 1);
    updatedModules.splice(destIndex, 0, reorderedModule);

    const startIndex = Math.min(sourceIndex, destIndex);
    const endIndex = Math.max(sourceIndex, destIndex);

    const changedModules = updatedModules.slice(startIndex, endIndex + 1);

    setModules(updatedModules);

    const bulkUpdateData = changedModules.map((module) => ({
      id: module.id,
      position: updatedModules.findIndex((item) => item.id === module.id)
    }));

    onReorder(bulkUpdateData);
  };

  if (!isMounted) {
    return null;
  }
  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <Droppable droppableId="modules">
        {(provided) => (
          <div {...provided.droppableProps} ref={provided.innerRef}>
            {modules.map((module, index) => (
              <Draggable key={module.id} draggableId={module.id} index={index}>
                {(provided) => (
                  <div
                    className="mb-4 bg-white dark:bg-neutral-900 border rounded-md overflow-hidden"
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                  >
                    <div
                      className={`flex items-center gap-x-2 bg-neutral-100 border-b border-neutral-200 text-neutral-700 py-3 px-2 text-sm
                                            ${
                                              module.isPublished &&
                                              'bg-blue-100/30 border-sky-200 text-[#171717]'
                                            }
                                            dark:bg-neutral-800 dark:border-neutral-700 dark:text-neutral-300
                                            dark:${
                                              module.isPublished &&
                                              'bg-black/30 border-black text-[#171717]'
                                            }
                                        `}
                    >
                      <div
                        className={`px-2 hover:bg-slate-300 rounded transition
                                                  ${module.isPublished && 'hover:bg-sky-200'}
                                                  dark:hover:bg-slate-700
                                                  dark:${module.isPublished && 'hover:bg-sky-800'}
                                              `}
                        {...provided.dragHandleProps}
                      >
                        <Grip className="h-5 w-5" />
                      </div>
                      <span className="font-semibold">{module.title}</span>
                      <div className="ml-auto pr-2 flex items-center gap-x-2">
                        {module.isFree && <Badge>Free</Badge>}
                        <Badge
                          className={`bg-slate-500
                                                    ${module.isPublished && 'bg-green-600'}
                                                    dark:bg-slate-500
                                                    dark:${module.isPublished && 'bg-green-600'}
                                                    `}
                        >
                          {module.isPublished ? 'Published' : 'Draft'}
                        </Badge>
                        <Pencil
                          onClick={() => onEdit(module.id)}
                          className="w-4 h-4 cursor-pointer hover:opacity-75 transition"
                        />
                      </div>
                    </div>
                    <div className="p-4 bg-slate-50 dark:bg-slate-950">
                      {/* Nested Chapters Form for this specific module */}
                      <div className="text-xs text-muted-foreground mb-2">
                        Chapters in this module:
                      </div>
                      <ChaptersForm
                        initialData={{ ...course, chapters: module.chapters }}
                        courseId={courseId}
                        moduleId={module.id}
                      />
                    </div>
                  </div>
                )}
              </Draggable>
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </DragDropContext>
  );
};
