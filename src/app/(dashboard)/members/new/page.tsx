import Link from "next/link";
import { MirrorBanner } from "@/components/mirror-banner";
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
      <MirrorBanner />
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Member mirror record</CardTitle>
          <CardDescription>
            Prefer roster import for master fields. Use this form for contact
            info the official tools cannot store.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <MemberForm />
        </CardContent>
      </Card>
    </div>
  );
}
