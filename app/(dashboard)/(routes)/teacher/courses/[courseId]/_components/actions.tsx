"use client";

import axios from "axios";
import { ConfirmModal } from "@/components/modals/confirm-modal";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Trash, Clock, CheckCircle } from "lucide-react";
import toast from "react-hot-toast";
import { Badge } from "@/components/ui/badge";

interface ActionsProps {
    disabled: boolean;
    courseId: string;
    isPublished: boolean;
    pendingApproval: boolean;
    isAdmin: boolean;
}

export const Actions = ({
    disabled,
    courseId,
    isPublished,
    pendingApproval,
    isAdmin,
}: ActionsProps) => {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);

    const onSubmitForReview = async () => {
        try {
            setIsLoading(true);
            await axios.patch(`/api/courses/${courseId}/publish`);
            toast.success("Course submitted for admin review");
            router.refresh();
        } catch {
            toast.error("Something went wrong");
        } finally {
            setIsLoading(false);
        }
    };

    const onUnpublish = async () => {
        try {
            setIsLoading(true);
            await axios.patch(`/api/courses/${courseId}/unpublish`);
            toast.success("Course unpublished");
            router.refresh();
        } catch {
            toast.error("Something went wrong");
        } finally {
            setIsLoading(false);
        }
    };

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
            toast.success("Course review rejected");
            router.refresh();
        } catch {
            toast.error("Something went wrong");
        } finally {
            setIsLoading(false);
        }
    };

    const onDelete = async () => {
        try {
            setIsLoading(true);
            await axios.delete(`/api/courses/${courseId}`);
            toast.success("Course deleted");
            router.refresh();
            router.push(`/teacher/courses`);
        } catch {
            toast.error("Something went wrong");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex items-center gap-x-2">
            {/* Published: Unpublish button (admin only) */}
            {isPublished && isAdmin && (
                <Button
                    onClick={onUnpublish}
                    disabled={isLoading}
                    variant="outline"
                    size="sm"
                >
                    Unpublish
                </Button>
            )}

            {/* Pending approval: Admin sees Approve + Reject */}
            {pendingApproval && isAdmin && (
                <>
                    <Button
                        onClick={onApprove}
                        disabled={isLoading}
                        size="sm"
                        className="bg-green-600 hover:bg-green-700 text-white"
                    >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Approve
                    </Button>
                    <Button
                        onClick={onReject}
                        disabled={isLoading}
                        variant="destructive"
                        size="sm"
                    >
                        Reject
                    </Button>
                </>
            )}

            {/* Pending approval: non-admin sees status badge */}
            {pendingApproval && !isAdmin && (
                <Badge variant="secondary" className="flex items-center gap-x-1 px-3 py-1">
                    <Clock className="h-3 w-3" />
                    Pending Approval
                </Badge>
            )}

            {/* Not published, not pending: Submit for Review */}
            {!isPublished && !pendingApproval && (
                <Button
                    onClick={onSubmitForReview}
                    disabled={disabled || isLoading}
                    variant="outline"
                    size="sm"
                >
                    Submit for Review
                </Button>
            )}

            <ConfirmModal onConfirm={onDelete}>
                <Button size="sm" disabled={isLoading}>
                    <Trash className="h-4 w-4" />
                </Button>
            </ConfirmModal>
        </div>
    );
};