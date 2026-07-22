"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import type { Member } from "@/db/schema";
import { upsertMember, type ActionResult } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Saving…" : label}
    </Button>
  );
}

export function MemberForm({ member }: { member?: Member | null }) {
  const [state, action] = useActionState(
    upsertMember,
    null as ActionResult | null,
  );

  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2">
      {member ? <input type="hidden" name="id" value={member.id} /> : null}

      <div className="space-y-2">
        <Label htmlFor="memberNumber">Member number</Label>
        <Input
          id="memberNumber"
          name="memberNumber"
          defaultValue={member?.memberNumber ?? ""}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="status">Status</Label>
        <select
          id="status"
          name="status"
          defaultValue={member?.status ?? "active"}
          className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm"
        >
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
          <option value="withdrawn">Withdrawn</option>
          <option value="deceased">Deceased</option>
          <option value="transferred">Transferred</option>
        </select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="firstName">First name</Label>
        <Input
          id="firstName"
          name="firstName"
          defaultValue={member?.firstName ?? ""}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="lastName">Last name</Label>
        <Input
          id="lastName"
          name="lastName"
          defaultValue={member?.lastName ?? ""}
          required
        />
      </div>
      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor="addressLine1">Address</Label>
        <Input
          id="addressLine1"
          name="addressLine1"
          defaultValue={member?.addressLine1 ?? ""}
        />
      </div>
      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor="addressLine2">Address line 2</Label>
        <Input
          id="addressLine2"
          name="addressLine2"
          defaultValue={member?.addressLine2 ?? ""}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="city">City</Label>
        <Input id="city" name="city" defaultValue={member?.city ?? ""} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="state">State</Label>
          <Input id="state" name="state" defaultValue={member?.state ?? ""} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="zip">ZIP</Label>
          <Input id="zip" name="zip" defaultValue={member?.zip ?? ""} />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="phone">Phone</Label>
        <Input id="phone" name="phone" defaultValue={member?.phone ?? ""} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          defaultValue={member?.email ?? ""}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="contactPref">Contact preference</Label>
        <select
          id="contactPref"
          name="contactPref"
          defaultValue={member?.contactPref ?? "email"}
          className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm"
        >
          <option value="email">Email</option>
          <option value="mail">Mail</option>
          <option value="phone">Phone</option>
          <option value="none">None</option>
        </select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="memberType">Member type</Label>
        <select
          id="memberType"
          name="memberType"
          defaultValue={member?.memberType ?? "associate"}
          className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm"
        >
          <option value="associate">Associate</option>
          <option value="insurance">Insurance</option>
          <option value="inactive">Inactive</option>
          <option value="honorary">Honorary</option>
          <option value="honorary_life">Honorary life</option>
          <option value="disabled">Disabled</option>
        </select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="degree">Degree</Label>
        <Input
          id="degree"
          name="degree"
          type="number"
          min={1}
          max={4}
          defaultValue={member?.degree ?? ""}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="duesRate">Dues rate</Label>
        <Input
          id="duesRate"
          name="duesRate"
          type="number"
          step="0.01"
          defaultValue={member?.duesRate ?? ""}
        />
      </div>
      <div className="flex items-center gap-2 sm:col-span-2">
        <input
          id="addressRestricted"
          name="addressRestricted"
          type="checkbox"
          value="true"
          defaultChecked={member?.addressRestricted ?? false}
          className="size-4 rounded border"
        />
        <Label htmlFor="addressRestricted" className="font-normal">
          Address restricted / returned mail (roster *)
        </Label>
      </div>
      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor="notes">Notes (no tax IDs)</Label>
        <Textarea
          id="notes"
          name="notes"
          rows={3}
          defaultValue={member?.notes ?? ""}
          placeholder="Contact history, preferences — never SSN/tax ID"
        />
      </div>

      {state?.ok === false ? (
        <div
          role="alert"
          className="border-destructive/30 bg-destructive/10 text-destructive sm:col-span-2 rounded-md border px-3 py-2 text-sm"
        >
          <p className="font-medium">Could not save</p>
          <p className="mt-0.5 leading-relaxed">{state.error}</p>
        </div>
      ) : null}
      {state?.ok === true ? (
        <p className="sm:col-span-2 rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">
          {state.message}
        </p>
      ) : null}

      <div className="sm:col-span-2">
        <Submit label={member ? "Update member" : "Add member"} />
      </div>
    </form>
  );
}
