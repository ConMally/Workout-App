// Shared shape for every auth/profile Server Action's useActionState
// result. Kept in its own plain module (not the "use server" actions
// files) because a "use server" file may only export async functions —
// no plain constants or types.

export interface ActionResult {
  status: "idle" | "error" | "success";
  message?: string;
  fieldErrors?: Record<string, string[] | undefined>;
}

export const initialActionState: ActionResult = { status: "idle" };
