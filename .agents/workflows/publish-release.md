---
description: Formal protocol for syncing and pushing from private Shima to public shima_wf
---

# 🚀 Public Publishing Protocol (Shima → Shima.wf)

// turbo-all

This workflow is MANDATORY for all agents. It ensures that code is moved to the public repository safely, in batches, and only with explicit user approval.

## 🟢 Pre-requisites
- All logic changes must be committed in the private `Shima` repository.
- The `Shima` repo should be in a "stable" state (e.g., after a feature is completed).

## 1. Local Staging (The Audit Gate)
Before pushing to GitHub, you MUST sync to the local public folder and audit for leaks.

```powershell
# Run the hardened sync script
powershell -ExecutionPolicy Bypass -File e:\ComfyDev\Shima\scripts\sync-public.ps1
```

## 2. Verification
1. Review the `git status` in the public repository:
```powershell
cd e:\ComfyDev\shima_wf
git status
```
2. If any sensitive files (like `.env`, `auth.json`, or leaked `docs/`) appear in the untracked/modified list, STOP and fix the `.gitignore` or sync script.

## 3. Approval Checkpoint
You must notify the user and ask for "LUZ VERDE" (Green Light) to push.

**Message Template:**
> [!IMPORTANT]
> **Public Push Requested**
> I have synced the latest changes (list features/fixes) to the local staging folder `shima_wf`. 
> I have audited for secrets and the results were clean. 
> Do I have **LUZ VERDE** to push these changes to the public GitHub repository?

## 4. Public Release
ONLY after explicit approval, execute the push:

```powershell
cd e:\ComfyDev\shima_wf
git add .
git commit -m "Relese: [Brief description of batched changes]"
git push origin main
```

## 5. Batching Note
Avoid pushing every small tweak. Aim for **one push per day** or **one push per major milestone** to keep the public history clean and meaningful.
