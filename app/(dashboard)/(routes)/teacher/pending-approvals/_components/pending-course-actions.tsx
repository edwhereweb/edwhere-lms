"use client";

import { useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";
import { CheckCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export const PendingCourseActions = ({ courseId }: { courseId: string }) => {
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();

    const onApprove = async () => {
        try {
            setIsLoading(true);
            await axios.patch(`/api/courses/${courseId}/approve`);
            toast.success("Course approved and published!");
            router.refresh();
        } catch {
            toast.error("Something went wrong");
        } finally {
            setIsLoading(false);
        }
    };

    const onReject = async () => {
        try {
            setIsLoading(true);
            await axios.patch(`/api/courses/${courseId}/reject`);
            toast.success("Course rejected");
            router.refresh();
        } catch {
            toast.error("Something went wrong");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex items-center gap-x-2">
            <Button
                onClick={onApprove}
                disabled={isLoading}
                size="sm"
                className="bg-green-600 hover:bg-green-700 text-white h-8"
            >
                <CheckCircle className="h-4 w-4 mr-1" />
                Approve
            </Button>
            <Button
                onClick={onReject}
                disabled={isLoading}
                variant="destructive"
                size="sm"
                className="h-8"
            >
                <XCircle className="h-4 w-4 mr-1" />
                Reject
            </Button>
        </div>
    );
};
