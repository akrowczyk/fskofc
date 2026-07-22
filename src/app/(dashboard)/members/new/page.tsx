import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { MemberForm } from "../member-form";

export default function NewMemberPage() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-primary">Add member</h1>
        <Button variant="outline" render={<Link href="/members" />}>
          Back
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">New member</CardTitle>
          <CardDescription>
            Prefer roster import for bulk updates. Use this form for a single
            member or contact details.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <MemberForm />
        </CardContent>
      </Card>
    </div>
  );
}
