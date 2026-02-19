"use client";

import { useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";
import { PlusCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const CreateCategoryForm = () => {
    const [name, setName] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();

    const onSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;
        try {
            setIsLoading(true);
            await axios.post("/api/categories", { name: name.trim() });
            toast.success(`Category "${name.trim()}" created`);
            setName("");
            router.refresh();
        } catch {
            toast.error("Something went wrong");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <form onSubmit={onSubmit} className="flex items-center gap-x-2">
            <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Web Development"
                disabled={isLoading}
                className="flex-1"
            />
            <Button type="submit" disabled={isLoading || !name.trim()}>
                <PlusCircle className="h-4 w-4 mr-2" />
                Add
            </Button>
        </form>
    );
};
