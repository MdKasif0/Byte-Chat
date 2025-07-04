
"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Star } from "lucide-react";

import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { submitFeedback } from "@/lib/feedback";
import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";

const formSchema = z.object({
  rating: z.number().min(1, "Please select a rating.").max(5),
  report: z.string().min(10, "Please provide at least 10 characters.").max(1000, "Your report is too long."),
});

type FeedbackDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const StarRating = ({ value, onChange }: { value: number; onChange: (value: number) => void; }) => {
    const [hoverValue, setHoverValue] = useState(0);
    return (
        <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
                <button
                    key={star}
                    type="button"
                    onClick={() => onChange(star)}
                    onMouseEnter={() => setHoverValue(star)}
                    onMouseLeave={() => setHoverValue(0)}
                    className="p-1 rounded-full transition-colors hover:bg-accent"
                >
                    <Star
                        className={cn(
                            "h-7 w-7 transition-all",
                            (hoverValue || value) >= star
                                ? "text-yellow-400 fill-yellow-400"
                                : "text-muted-foreground"
                        )}
                    />
                </button>
            ))}
        </div>
    );
}

export default function FeedbackDialog({ open, onOpenChange }: FeedbackDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      rating: 0,
      report: "",
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!user) return;
    try {
      await submitFeedback(user.id, values.rating, values.report, navigator.userAgent);
      toast({
        title: "Feedback Submitted!",
        description: "Thank you for helping us improve ByteChat.",
      });
      onOpenChange(false);
      form.reset();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Submission Failed",
        description: error.message || "Could not submit feedback.",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Submit Feedback</DialogTitle>
          <DialogDescription>
            Have a suggestion or found a bug? Let us know!
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="rating"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>How would you rate your experience?</FormLabel>
                  <FormControl>
                    <StarRating value={field.value} onChange={field.onChange} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="report"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tell us more</FormLabel>
                  <FormControl>
                    <Textarea
                        {...field}
                        placeholder="Describe your experience, suggest an improvement, or report a bug..."
                        className="min-h-[120px]"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="ghost">Cancel</Button>
              </DialogClose>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "Submitting..." : "Submit Feedback"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
