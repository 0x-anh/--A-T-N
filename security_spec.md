# Security Specification - DEBUG_OS (KANBUG LIGHT)

## 1. Data Invariants
- A **Project** must have an `ownerId` matching the creator and a non-empty `name`.
- A **Bug** must be associated with a valid `projectId`. Only project members or the owner can create/view bugs in that project.
- A **Comment** must reference a valid `bugId`.
- An **ActivityLog** record is immutable after creation and must reference a valid `bugId`.
- A **UserProfile** can only be modified by the user themselves.

## 2. The "Dirty Dozen" Payloads (Wicked Payloads)

### Project Collection
1. **Identity Spoofing**: Create project with `ownerId` of another user.
2. **Title Injection**: Create project with a 2MB string as `name`.
3. **Orphaned Metadata**: Update project to remove `ownerId`.

### Bug Collection
4. **Project Hijacking**: Create bug with a `projectId` that the user does not belong to.
5. **Status Bypass**: Directly update bug status to 'done' without being the assignee or owner.
6. **Shadow Field Injection**: Update bug with a field `isSystemVerified: true`.
7. **ID Poisoning**: Create bug with document ID `../../../etc/passwd`.

### Comment Collection
8. **Comment Spoofing**: Create comment as another `userId`.
9. **Mass Delete**: Delete a comment created by another user.

### ActivityLog Collection
10. **History Rewriting**: Update an existing activity log entry.
11. **Log Injection**: Create log entry for a bug that doesn't exist.

### User Collection
12. **Profile Theft**: Update another user's display name.

## 3. Test Runner (Mock Tests)
*Tests will verify that all above payloads return PERMISSION_DENIED.*
