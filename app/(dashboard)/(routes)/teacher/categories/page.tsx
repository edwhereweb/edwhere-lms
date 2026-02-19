import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { Tag } from "lucide-react";

import { db } from "@/lib/db";
import getSafeProfile from "@/actions/get-safe-profile";
import { CreateCategoryForm } from "./_components/create-category-form";

const CategoriesPage = async () => {
    const { userId } = await auth();
    if (!userId) return redirect("/sign-in");

    const profile = await getSafeProfile();
    if (!profile || !["ADMIN", "TEACHER"].includes(profile.role)) {
        return redirect("/dashboard");
    }

    const categories = await db.category.findMany({
        orderBy: { name: "asc" },
    });

    return (
        <div className="p-6 max-w-2xl mx-auto">
            <div className="flex items-center gap-x-2 mb-6">
                <Tag className="h-6 w-6" />
                <h1 className="text-2xl font-bold">Course Categories</h1>
            </div>
            <p className="text-sm text-muted-foreground mb-6">
                Manage category tags that teachers can apply to courses. Categories
                appear in the course search filter.
            </p>

            <CreateCategoryForm />

            <div className="mt-8">
                <h2 className="text-lg font-semibold mb-3">Existing categories ({categories.length})</h2>
                {categories.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                        No categories yet. Add one above, or run the seed script.
                    </p>
                ) : (
                    <ul className="space-y-2">
                        {categories.map((cat) => (
                            <li
                                key={cat.id}
                                className="flex items-center justify-between p-3 rounded-md border bg-slate-50 dark:bg-gray-800"
                            >
                                <span className="text-sm font-medium">{cat.name}</span>
                                <span className="text-xs text-muted-foreground">{cat.id}</span>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
};

export default CategoriesPage;
