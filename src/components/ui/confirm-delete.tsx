import * as React from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface ConfirmDeleteProps {
  /** The trigger element — usually the delete button */
  children: React.ReactNode;
  /** Called when the user confirms */
  onConfirm: () => void;
  /** Item label, e.g. "this hotel", "row", "flight" */
  itemName?: string;
  /** Custom title override */
  title?: string;
  /** Custom description override */
  description?: string;
  /** Confirm button label */
  confirmLabel?: string;
  /** Disable opening (e.g. while another action is running) */
  disabled?: boolean;
}

/**
 * Universal confirm-delete wrapper.
 * Wrap any delete trigger to require user confirmation.
 *
 * @example
 * <ConfirmDelete itemName="this row" onConfirm={() => removeRow(idx)}>
 *   <Button variant="ghost" size="icon"><X /></Button>
 * </ConfirmDelete>
 */
export function ConfirmDelete({
  children,
  onConfirm,
  itemName,
  title,
  description,
  confirmLabel = "Delete",
  disabled,
}: ConfirmDeleteProps) {
  if (disabled) return <>{children}</>;
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>{children}</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title ?? "Are you sure?"}</AlertDialogTitle>
          <AlertDialogDescription>
            {description ??
              `This will permanently delete ${itemName ?? "this item"}. This action cannot be undone.`}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
