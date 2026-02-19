"use client";

import * as z from "zod";
import axios from "axios";
import { Youtube, Pencil, PlusCircle, X } from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";
import { Chapter } from "@prisma/client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface ChapterYoutubeFormProps {
    initialData: Chapter;
    courseId: string;
    chapterId: string;
}

// Extract video ID from any YouTube URL format
function extractYoutubeId(url: string): string | null {
    if (!url) return null;
    // Handle youtu.be/ID
    const shortMatch = url.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
    if (shortMatch) return shortMatch[1];
    // Handle youtube.com/watch?v=ID
    const watchMatch = url.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
    if (watchMatch) return watchMatch[1];
    // Handle youtube.com/embed/ID or youtube-nocookie.com/embed/ID
    const embedMatch = url.match(/embed\/([a-zA-Z0-9_-]{11})/);
    if (embedMatch) return embedMatch[1];
    // If it looks like a plain 11-char ID
    if (/^[a-zA-Z0-9_-]{11}$/.test(url.trim())) return url.trim();
    return null;
}

export const ChapterYoutubeForm = ({
    initialData,
    courseId,
    chapterId,
}: ChapterYoutubeFormProps) => {
    const [isEditing, setIsEditing] = useState(false);
    const [inputValue, setInputValue] = useState("");
    const router = useRouter();

    const toggleEdit = () => {
        setIsEditing((c) => !c);
        setInputValue("");
    };

    const onSubmit = async () => {
        const videoId = extractYoutubeId(inputValue.trim());
        if (!videoId) {
            toast.error("Please enter a valid YouTube URL or video ID");
            return;
        }
        try {
            await axios.patch(`/api/courses/${courseId}/chapters/${chapterId}`, {
                youtubeVideoId: videoId,
            });
            toast.success("YouTube video saved");
            toggleEdit();
            router.refresh();
        } catch {
            toast.error("Something went wrong");
        }
    };

    const onRemove = async () => {
        try {
            await axios.patch(`/api/courses/${courseId}/chapters/${chapterId}`, {
                youtubeVideoId: null,
            });
            toast.success("YouTube video removed");
            router.refresh();
        } catch {
            toast.error("Something went wrong");
        }
    };

    const currentId = initialData.youtubeVideoId;

    return (
        <div className="mt-6 border bg-slate-100 rounded-md p-4 dark:bg-gray-800 dark:text-slate-300">
            <div className="font-medium flex items-center justify-between">
                <span className="flex items-center gap-x-2">
                    <Youtube className="h-4 w-4 text-red-500" />
                    YouTube Video
                </span>
                <Button onClick={toggleEdit} variant="ghost">
                    {isEditing ? (
                        <>Cancel</>
                    ) : !currentId ? (
                        <>
                            <PlusCircle className="h-4 w-4 mr-2" />
                            Add YouTube video
                        </>
                    ) : (
                        <>
                            <Pencil className="h-4 w-4 mr-2" />
                            Change
                        </>
                    )}
                </Button>
            </div>

            {!isEditing && !currentId && (
                <div className="flex items-center justify-center h-20 bg-slate-200 rounded-md dark:bg-gray-700 mt-2">
                    <p className="text-sm text-slate-500 dark:text-slate-400">No YouTube video added</p>
                </div>
            )}

            {!isEditing && currentId && (
                <div className="mt-2">
                    <div className="relative aspect-video rounded-md overflow-hidden">
                        <iframe
                            src={`https://www.youtube-nocookie.com/embed/${currentId}?rel=0&modestbranding=1&iv_load_policy=3`}
                            className="w-full h-full"
                            allow="autoplay; fullscreen; picture-in-picture"
                            allowFullScreen
                        />
                    </div>
                    <div className="flex items-center justify-between mt-2">
                        <p className="text-xs text-muted-foreground">
                            Video ID: <code className="bg-slate-200 dark:bg-gray-700 px-1 rounded">{currentId}</code>
                        </p>
                        <Button
                            onClick={onRemove}
                            variant="ghost"
                            size="sm"
                            className="text-red-500 hover:text-red-700"
                        >
                            <X className="h-4 w-4 mr-1" /> Remove
                        </Button>
                    </div>
                </div>
            )}

            {isEditing && (
                <div className="mt-2 space-y-2">
                    <Input
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        placeholder="Paste YouTube URL or video ID (e.g. dQw4w9WgXcQ)"
                        className="dark:bg-gray-700"
                    />
                    <p className="text-xs text-muted-foreground">
                        Accepts: youtube.com/watch?v=..., youtu.be/..., or a bare video ID
                    </p>
                    <Button onClick={onSubmit} disabled={!inputValue.trim()}>
                        Save
                    </Button>
                </div>
            )}
        </div>
    );
};
