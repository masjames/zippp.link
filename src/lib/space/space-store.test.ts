import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import {
  __resetSpaceStoreForTests,
  addMember,
  createSpace,
  getSpace,
  joinSpaceByInvite,
  leaveSpace,
  listSpacesForUser,
  removeMember,
  renameSpace,
} from "./space-store";
import {
  __resetInviteStoreForTests,
  consumeInvite,
  createInvite,
} from "./invite-store";

function fresh(): void {
  __resetSpaceStoreForTests();
  __resetInviteStoreForTests();
}

test("create a Space with a display name and list it for the owner", async () => {
  fresh();
  const space = await createSpace({
    ownerUserId: "u1",
    displayName: "  Our   Space  ",
    ownerEmail: "Owner@Example.com",
  });
  assert.equal(space.display_name, "Our Space");
  assert.equal(space.members.length, 1);
  assert.equal(space.members[0].role, "owner");
  assert.equal(space.members[0].email, "owner@example.com");
  assert.equal(space.owner_user_id, "u1");

  const listed = await listSpacesForUser("u1");
  assert.equal(listed.length, 1);
  assert.equal(listed[0].space_id, space.space_id);
});

test("create rejects an empty display name", async () => {
  fresh();
  await assert.rejects(
    () => createSpace({ ownerUserId: "u1", displayName: "   " }),
    /INVALID_NAME/
  );
});

test("invite joins a mate and both list the same Space", async () => {
  fresh();
  const space = await createSpace({
    ownerUserId: "owner",
    displayName: "Shared Space",
    ownerEmail: "owner@example.com",
  });
  const { code } = await createInvite({
    spaceId: space.space_id,
    createdBy: "owner",
  });

  const joined = await joinSpaceByInvite({
    code,
    userId: "mate",
    email: "mate@example.com",
  });
  assert.equal(joined.space.space_id, space.space_id);
  assert.equal(joined.alreadyMember, false);

  const ownerView = (await listSpacesForUser("owner"))[0];
  const mateView = (await listSpacesForUser("mate"))[0];
  assert.equal(ownerView.space_id, mateView.space_id);
  assert.equal(ownerView.display_name, mateView.display_name);
  assert.deepEqual(
    ownerView.members.map((m) => m.user_id).sort(),
    ["mate", "owner"]
  );
});

test("email-bound invite refuses another address and stays usable", async () => {
  fresh();
  const space = await createSpace({
    ownerUserId: "owner",
    displayName: "Invite Space",
  });
  const { code } = await createInvite({
    spaceId: space.space_id,
    createdBy: "owner",
    email: "mate@example.com",
  });

  await assert.rejects(
    () => joinSpaceByInvite({ code, userId: "other", email: "other@example.com" }),
    /INVITE_EMAIL_MISMATCH/
  );
  assert.equal((await listSpacesForUser("other")).length, 0);

  const joined = await joinSpaceByInvite({
    code,
    userId: "mate",
    email: "mate@example.com",
  });
  assert.equal(joined.space.space_id, space.space_id);
});

test("invite is single use and expired invites are rejected", async () => {
  fresh();
  const space = await createSpace({
    ownerUserId: "owner",
    displayName: "Once",
  });
  const { code } = await createInvite({
    spaceId: space.space_id,
    createdBy: "owner",
  });
  await joinSpaceByInvite({ code, userId: "mate", email: null });
  await assert.rejects(
    () => joinSpaceByInvite({ code, userId: "late", email: null }),
    /INVALID_INVITE/
  );

  const expired = await createInvite({
    spaceId: space.space_id,
    createdBy: "owner",
    ttlSeconds: -1,
  });
  assert.equal(await consumeInvite(expired.code), null);
  await assert.rejects(
    () => joinSpaceByInvite({ code: expired.code, userId: "mate2", email: null }),
    /INVALID_INVITE/
  );
});

test("addMember is idempotent", async () => {
  fresh();
  const space = await createSpace({
    ownerUserId: "owner",
    displayName: "Idem",
  });
  await addMember(space.space_id, "mate", "member", "mate@example.com");
  const again = await addMember(space.space_id, "mate", "member");
  assert.equal(again?.members.length, 2);
  assert.equal((await listSpacesForUser("mate")).length, 1);
});

test("a member can leave; the owner cannot", async () => {
  fresh();
  const space = await createSpace({
    ownerUserId: "owner",
    displayName: "Leave",
  });
  await addMember(space.space_id, "mate", "member");

  await assert.rejects(
    () => leaveSpace(space.space_id, "owner"),
    /OWNER_CANNOT_LEAVE/
  );
  await leaveSpace(space.space_id, "mate");
  assert.equal((await listSpacesForUser("mate")).length, 0);
  assert.equal((await getSpace(space.space_id))?.members.length, 1);
});

test("the owner can remove a member; others cannot", async () => {
  fresh();
  const space = await createSpace({
    ownerUserId: "owner",
    displayName: "Remove",
  });
  await addMember(space.space_id, "mate", "member");
  await addMember(space.space_id, "third", "member");

  await assert.rejects(
    () => removeMember(space.space_id, "mate", "third"),
    /FORBIDDEN/
  );
  await assert.rejects(
    () => removeMember(space.space_id, "owner", "owner"),
    /CANNOT_REMOVE_OWNER/
  );

  const after = await removeMember(space.space_id, "owner", "mate");
  assert.deepEqual(
    after?.members.map((m) => m.user_id).sort(),
    ["owner", "third"]
  );
  assert.equal((await listSpacesForUser("mate")).length, 0);
  assert.equal((await listSpacesForUser("third")).length, 1);
});

test("only the owner can rename a Space", async () => {
  fresh();
  const space = await createSpace({
    ownerUserId: "owner",
    displayName: "Old",
  });
  await addMember(space.space_id, "mate", "member");

  await assert.rejects(
    () => renameSpace(space.space_id, "mate", "Hijack"),
    /FORBIDDEN/
  );
  const renamed = await renameSpace(space.space_id, "owner", "New");
  assert.equal(renamed?.display_name, "New");
});

test("Space wording uses Space, not family", () => {
  const raw = readFileSync(
    path.join(process.cwd(), "spec", "wording.txt"),
    "utf8"
  );
  const entries = raw
    .split(/^## /m)
    .slice(1)
    .map((block) => {
      const newline = block.indexOf("\n");
      return {
        key: block.slice(0, newline).trim(),
        value: block.slice(newline + 1).trim(),
      };
    })
    .filter((entry) => entry.key.startsWith("app.space."));

  assert.ok(entries.length > 0, "app.space.* wording keys must exist");
  for (const entry of entries) {
    assert.ok(
      !/\bfamily\b|\bkeluarga\b/i.test(entry.value),
      `${entry.key} must not use family wording`
    );
  }
  for (const key of ["app.space.join.button", "app.space.invite.title"]) {
    assert.ok(
      entries.some((entry) => entry.key === `${key}.en`),
      `${key}.en must exist`
    );
    assert.ok(
      entries.some((entry) => entry.key === `${key}.id`),
      `${key}.id must exist`
    );
  }
});
