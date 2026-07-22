import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { MemberForm } from "../member-form";
import { getMember } from "../actions";

export default async function MemberDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  if (!process.env.DATABASE_URL) {
    return (
      <p className="text-destructive text-sm">Database not configured.</p>
    );
  }

  let member;
  try {
    member = await getMember(id);
  } catch {
    return (
      <p className="text-destructive text-sm">
        Could not load member (schema may not be pushed yet).
      </p>
    );
  }
  if (!member) notFound();

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-primary">
            {member.lastName}, {member.firstName}
          </h1>
          <p className="text-muted-foreground font-mono text-sm">
            #{member.memberNumber}
            {member.syncedAt
              ? ` · roster synced ${member.syncedAt.toISOString().slice(0, 10)}`
              : ""}
          </p>
        </div>
        <Button variant="outline" render={<Link href="/members" />}>
          Back
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Member details</CardTitle>
          <CardDescription>
            {member.source
              ? `Source: ${member.source}`
              : "Contact info and notes for this member."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <MemberForm member={member} />
        </CardContent>
      </Card>
    </div>
  );
}
